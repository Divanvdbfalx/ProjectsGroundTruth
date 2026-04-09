const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const KB_RAW_SOURCES_DIR = path.join(ROOT, 'knowledge_base', 'raw', 'sources');
const COMBINED_TASKS_FILE = path.join(KB_RAW_SOURCES_DIR, 'src_tasks.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 4311);
const QUERY_TOOL = path.join(ROOT, 'local_tool', 'query.py');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const AGENT_MAX_CHUNKS = 5;
const AGENT_MAX_CONTEXT_TOKENS = 1500;
const AGENT_RESPONSE_MAX_TOKENS = Number(process.env.AGENT_RESPONSE_MAX_TOKENS || 700);

const retrievalCache = new Map();

const DATA_FILES = {
  entities: path.join(KB_RAW_SOURCES_DIR, 'src_data_entities.json'),
  relationships: path.join(KB_RAW_SOURCES_DIR, 'src_data_relationships.json'),
  tasks: COMBINED_TASKS_FILE
};

const USER_FILES = {
  context: path.join(KB_RAW_SOURCES_DIR, 'src_user_current_context.md')
};

const USER_TASK_COLUMNS = {
  id: 'Task ID',
  status: 'Status',
  priority: 'Priority',
  pointsEstimate: 'Points Estimate',
  timeEstimate: 'Time Estimate',
  timeEstimateRolledUp: 'Time Estimate Rolled Up',
  dueDate: 'Due Date',
  sprints: 'Sprints',
  itemType: 'Item Type (drop down)',
  progressAuto: '📚 Progress (Auto) (automatic progress)',
  taskCategory: 'Task Category',
  category: 'Category',
  subcategory: 'Subcategory'
};

function safeReadText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function readCombinedTasks() {
  const text = safeReadText(COMBINED_TASKS_FILE).trim();
  if (!text) {
    return {
      source_id: 'src_tasks',
      schema_version: '1.0',
      tasks: [],
      columns: []
    };
  }
  const payload = JSON.parse(text);
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid src_tasks.json payload');
  }
  if (!Array.isArray(payload.tasks)) payload.tasks = [];
  if (!Array.isArray(payload.columns)) payload.columns = [];
  return payload;
}

function writeCombinedTasks(payload) {
  fs.writeFileSync(COMBINED_TASKS_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildTasksCsv(payload) {
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  const preferred = Array.isArray(payload?.columns)
    ? payload.columns.filter(column => typeof column === 'string' && column.trim())
    : [];

  const keySet = new Set(preferred);
  tasks.forEach(task => {
    if (!task || typeof task !== 'object') return;
    Object.keys(task).forEach(key => keySet.add(key));
  });
  const columns = [...preferred, ...[...keySet].filter(key => !preferred.includes(key))];
  if (!columns.length) {
    return '';
  }

  const lines = [];
  lines.push(columns.map(csvEscape).join(','));
  tasks.forEach(task => {
    const row = columns.map(column => csvEscape(task?.[column] ?? ''));
    lines.push(row.join(','));
  });
  return `${lines.join('\n')}\n`;
}

function isProductTaskEntry(task) {
  return Boolean(
    task
    && typeof task === 'object'
    && typeof task.id === 'string'
    && task.id.trim()
    && typeof task.entity_id === 'string'
    && task.entity_id.trim()
    && typeof task.title === 'string'
  );
}

function isUserWorkspaceTaskRow(task) {
  return Boolean(
    task
    && typeof task === 'object'
    && typeof task[USER_TASK_COLUMNS.id] === 'string'
    && task[USER_TASK_COLUMNS.id].trim()
  );
}

function normalizeStatus(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (value === 'inprogress') return 'in_progress';
  if (value === 'inreview') return 'in_review';
  if (value === 'completed') return 'done';
  if (value === 'open') return 'todo';
  if (value === 'in_progress' || value === 'todo' || value === 'blocked' || value === 'done') {
    return value;
  }
  return value || 'todo';
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return [];
  const noStart = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const noEnd = noStart.endsWith('|') ? noStart.slice(0, -1) : noStart;
  return noEnd.split('|').map(part => part.trim());
}

function parseNumber(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePriority(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value || value === 'none') return '';
  if (value === 'normal') return 'medium';
  return value;
}

function parseAssigneeList(raw) {
  const value = String(raw || '').trim();
  if (!value || value === '[]') return '';
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .join(', ');
  }
  return value;
}

function inferCsvStatus(row) {
  const explicitStatus = row.Status || row['Task Status'] || row['Current Status'];
  if (explicitStatus) return normalizeStatus(explicitStatus);

  const progress = parseNumber(row['📚 Progress (Auto) (automatic progress)']);
  if (progress !== null) {
    if (progress >= 100) return 'done';
    if (progress > 0) return 'in_progress';
  }
  return 'todo';
}

function inferTaskCategory(rawCategory, row = {}) {
  const explicit = String(rawCategory || '').trim().toLowerCase();
  if (explicit === 'archived') return 'Archived';
  if (explicit === 'active') return 'Active';
  const progress = parseNumber(row[USER_TASK_COLUMNS.progressAuto]);
  return progress !== null && progress >= 100 ? 'Archived' : 'Active';
}

function inferTaskStatus(rawStatus, row = {}) {
  const explicit = String(rawStatus || '').trim();
  if (explicit) {
    return normalizeStatus(explicit);
  }
  return inferCsvStatus(row);
}

function normalizeParsedTask(task) {
  return {
    ...task,
    status: normalizeStatus(task.status),
    taskCategory: String(task.taskCategory || '').trim() || '',
    categoryId: String(task.categoryId || '').trim(),
    subcategoryId: String(task.subcategoryId || '').trim(),
    estHours: Number.isFinite(task.estHours) ? task.estHours : null,
    actualHours: Number.isFinite(task.actualHours) ? task.actualHours : null
  };
}

function mapLegacyMarkdownTask(row) {
  const progressAuto = String(row[USER_TASK_COLUMNS.progressAuto] || '').trim();
  return normalizeParsedTask({
    id: row.ID || '',
    title: row.Task || '',
    linkedEntity: row['Linked Entity'] || '',
    groundTruthTask: row['Ground-Truth Task'] || '',
    status: inferTaskStatus(row[USER_TASK_COLUMNS.status] || row.Status, row),
    priority: normalizePriority(row.Priority),
    createdDate: row['Created (Date)'] || '',
    updatedDate: row['Updated (Date)'] || '',
    completedDate: row['Completed (Date)'] || '',
    taskCategory: inferTaskCategory(row[USER_TASK_COLUMNS.taskCategory], row),
    pointsEstimate: String(row[USER_TASK_COLUMNS.pointsEstimate] || '').trim(),
    timeEstimate: String(row[USER_TASK_COLUMNS.timeEstimate] || '').trim(),
    timeEstimateRolledUp: String(row[USER_TASK_COLUMNS.timeEstimateRolledUp] || '').trim(),
    dueDate: String(row[USER_TASK_COLUMNS.dueDate] || '').trim(),
    sprints: String(row[USER_TASK_COLUMNS.sprints] || '').trim(),
    itemType: String(row[USER_TASK_COLUMNS.itemType] || '').trim(),
    progressAuto,
    categoryId: String(row[USER_TASK_COLUMNS.category] || '').trim(),
    subcategoryId: String(row[USER_TASK_COLUMNS.subcategory] || '').trim(),
    parentId: String(row['Parent ID'] || '').trim(),
    parentName: String(row['Parent Name'] || '').trim(),
    parentUrl: String(row['Parent URL'] || '').trim(),
    estHours: parseNumber(row['Est (h)']),
    actualHours: parseNumber(row['Actual (h)']),
    owner: row.Owner || '',
    description: row.Notes || row['Ground-Truth Task'] || ''
  });
}

function mapCsvTask(row) {
  const progressAuto = String(row[USER_TASK_COLUMNS.progressAuto] || '').trim();
  const progress = parseNumber(progressAuto);
  const parentId = String(row['Parent ID'] || '').trim();
  const parentName = String(row['Parent Name'] || '').trim();
  const parentUrl = String(row['Parent URL'] || '').trim();
  const itemType = String(row[USER_TASK_COLUMNS.itemType] || '').trim();
  const sprints = String(row[USER_TASK_COLUMNS.sprints] || '').trim();
  const taskCategory = inferTaskCategory(row[USER_TASK_COLUMNS.taskCategory], row);
  const descriptionParts = [];
  if (parentName) descriptionParts.push(`Parent: ${parentName}`);
  if (itemType) descriptionParts.push(`Type: ${itemType}`);
  if (sprints && sprints !== '[]') descriptionParts.push(`Sprints: ${sprints}`);
  if (progress !== null) descriptionParts.push(`Progress: ${progress}%`);

  return normalizeParsedTask({
    id: row['Task ID'] || '',
    title: row['Task Name'] || '',
    linkedEntity: '',
    groundTruthTask: parentName,
    status: inferTaskStatus(row[USER_TASK_COLUMNS.status], row),
    priority: normalizePriority(row.Priority),
    createdDate: '',
    updatedDate: '',
    completedDate: '',
    taskCategory,
    pointsEstimate: String(row[USER_TASK_COLUMNS.pointsEstimate] || '').trim(),
    timeEstimate: String(row[USER_TASK_COLUMNS.timeEstimate] || '').trim(),
    timeEstimateRolledUp: String(row[USER_TASK_COLUMNS.timeEstimateRolledUp] || '').trim(),
    dueDate: String(row[USER_TASK_COLUMNS.dueDate] || '').trim(),
    sprints,
    itemType,
    progressAuto,
    categoryId: String(row[USER_TASK_COLUMNS.category] || '').trim(),
    subcategoryId: String(row[USER_TASK_COLUMNS.subcategory] || '').trim(),
    parentId,
    parentName,
    parentUrl,
    estHours: parseNumber(row['Time Estimate']),
    actualHours: null,
    owner: parseAssigneeList(row.Assignee),
    description: descriptionParts.join(' | '),
    clickupTaskId: row['Task ID'] || '',
    clickupParentId: parentId,
    clickupParentUrl: parentUrl,
    clickupItemType: itemType,
    clickupSprints: sprints,
    clickupProgress: progress,
    clickupPointsEstimate: parseNumber(row['Points Estimate']),
    clickupTimeEstimateRolledUp: parseNumber(row['Time Estimate Rolled Up'])
  });
}

function parseMarkdownTableRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  let headerIndex = -1;

  for (let i = 0; i < lines.length - 1; i += 1) {
    const line = lines[i];
    const next = lines[i + 1] || '';
    if (!line.trim().startsWith('|')) continue;
    if (!next.trim().startsWith('|')) continue;
    if (!next.includes('---')) continue;
    headerIndex = i;
    break;
  }

  if (headerIndex < 0) return { headers: [], rows: [] };
  const headers = splitMarkdownRow(lines[headerIndex]);
  if (!headers.length) return { headers: [], rows: [] };

  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) break;
    if (line.includes('|---')) continue;
    const cols = splitMarkdownRow(line);
    if (!cols.length) continue;
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseUserTasksMarkdown(markdown) {
  const { headers, rows } = parseMarkdownTableRows(markdown);
  if (!headers.length || !rows.length) return [];

  if (headers.includes('Task ID') && headers.includes('Task Name')) {
    return rows.map(mapCsvTask);
  }
  if (headers.includes('ID') && headers.includes('Task')) {
    return rows.map(mapLegacyMarkdownTask);
  }
  return [];
}

function parseUserTasksJson(jsonText) {
  if (!jsonText.trim()) return [];
  let payload;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    return [];
  }

  if (Array.isArray(payload)) {
    if (payload.length && payload[0] && typeof payload[0] === 'object' && 'Task ID' in payload[0]) {
      return payload.map(mapCsvTask);
    }
    if (payload.length && payload[0] && typeof payload[0] === 'object' && 'ID' in payload[0]) {
      return payload.map(mapLegacyMarkdownTask);
    }
    return payload
      .filter(item => item && typeof item === 'object')
      .map(item => normalizeParsedTask({
        id: item.id || '',
        title: item.title || '',
        linkedEntity: item.linkedEntity || '',
        groundTruthTask: item.groundTruthTask || '',
        status: item.status || '',
        priority: normalizePriority(item.priority),
        createdDate: item.createdDate || '',
        updatedDate: item.updatedDate || '',
        completedDate: item.completedDate || '',
        taskCategory: item.taskCategory || item['Task Category'] || '',
        pointsEstimate: String(item.pointsEstimate || item[USER_TASK_COLUMNS.pointsEstimate] || '').trim(),
        timeEstimate: String(item.timeEstimate || item[USER_TASK_COLUMNS.timeEstimate] || '').trim(),
        timeEstimateRolledUp: String(item.timeEstimateRolledUp || item[USER_TASK_COLUMNS.timeEstimateRolledUp] || '').trim(),
        dueDate: String(item.dueDate || item[USER_TASK_COLUMNS.dueDate] || '').trim(),
        sprints: String(item.sprints || item[USER_TASK_COLUMNS.sprints] || '').trim(),
        itemType: String(item.itemType || item[USER_TASK_COLUMNS.itemType] || '').trim(),
        progressAuto: String(item.progressAuto || item[USER_TASK_COLUMNS.progressAuto] || '').trim(),
        categoryId: String(item.categoryId || item[USER_TASK_COLUMNS.category] || '').trim(),
        subcategoryId: String(item.subcategoryId || item[USER_TASK_COLUMNS.subcategory] || '').trim(),
        parentId: String(item.parentId || item['Parent ID'] || '').trim(),
        parentName: String(item.parentName || item['Parent Name'] || '').trim(),
        parentUrl: String(item.parentUrl || item['Parent URL'] || '').trim(),
        estHours: parseNumber(item.estHours),
        actualHours: parseNumber(item.actualHours),
        owner: item.owner || '',
        description: item.description || ''
      }));
  }

  if (payload && typeof payload === 'object' && Array.isArray(payload.rows)) {
    const rows = payload.rows.filter(row => row && typeof row === 'object');
    if (rows.length && 'Task ID' in rows[0]) {
      return rows.map(mapCsvTask);
    }
    if (rows.length && 'ID' in rows[0]) {
      return rows.map(mapLegacyMarkdownTask);
    }
  }

  return [];
}

function isArchivedTask(task) {
  const category = String(task.taskCategory || task['Task Category'] || '')
    .trim()
    .toLowerCase();
  return category === 'archived';
}

function isEpicTask(task) {
  const itemType = String(task.itemType || task[USER_TASK_COLUMNS.itemType] || '')
    .trim()
    .toLowerCase();
  return itemType === 'epic';
}

function ensureTaskColumns(columns) {
  const list = Array.isArray(columns) ? [...columns] : [];
  if (!list.includes(USER_TASK_COLUMNS.status)) {
    list.push(USER_TASK_COLUMNS.status);
  }
  if (!list.includes(USER_TASK_COLUMNS.category)) {
    list.push(USER_TASK_COLUMNS.category);
  }
  if (!list.includes(USER_TASK_COLUMNS.subcategory)) {
    list.push(USER_TASK_COLUMNS.subcategory);
  }
  if (!list.includes(USER_TASK_COLUMNS.taskCategory)) {
    list.push(USER_TASK_COLUMNS.taskCategory);
  }
  const canonicalTail = [
    USER_TASK_COLUMNS.taskCategory,
    USER_TASK_COLUMNS.category,
    USER_TASK_COLUMNS.subcategory,
    USER_TASK_COLUMNS.status
  ];
  const withoutTail = list.filter(column => !canonicalTail.includes(column));
  return [...withoutTail, ...canonicalTail];
}

function orderRowsByCategory(rows) {
  const active = [];
  const archived = [];
  rows.forEach(row => {
    if (inferTaskCategory(row?.[USER_TASK_COLUMNS.taskCategory], row) === 'Archived') {
      archived.push(row);
    } else {
      active.push(row);
    }
  });
  return [...active, ...archived];
}

function escapeMarkdownCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function readUserTasksSourcePayload() {
  let combined;
  try {
    combined = readCombinedTasks();
  } catch {
    return null;
  }
  const payload = {
    source_file: combined.source_file || '',
    columns: ensureTaskColumns(combined.columns || []),
    rows: (combined.tasks || []).filter(isUserWorkspaceTaskRow),
    task_categories: combined.task_categories || {
      Active: 'Tasks not yet complete',
      Archived: 'Completed tasks moved out of active queue'
    },
    category_rule: combined.category_rule
      || 'Archived when auto progress >= 100 or explicit done/completed/closed/resolved status; otherwise Active.'
  };
  payload.columns = ensureTaskColumns(payload.columns || []);
  payload.rows = payload.rows
    .filter(row => row && typeof row === 'object')
    .map(row => {
      const next = { ...row };
      next[USER_TASK_COLUMNS.category] = String(next[USER_TASK_COLUMNS.category] || '').trim();
      next[USER_TASK_COLUMNS.subcategory] = String(next[USER_TASK_COLUMNS.subcategory] || '').trim();
      if (!next[USER_TASK_COLUMNS.category]) {
        next[USER_TASK_COLUMNS.subcategory] = '';
      }
      next[USER_TASK_COLUMNS.status] = inferTaskStatus(next[USER_TASK_COLUMNS.status], next);
      next[USER_TASK_COLUMNS.taskCategory] = inferTaskCategory(next[USER_TASK_COLUMNS.taskCategory], next);
      return next;
    });
  payload.rows = orderRowsByCategory(payload.rows);
  return payload;
}

function writeUserTasksSourcePayload(payload) {
  const combined = readCombinedTasks();
  const existingTasks = Array.isArray(combined.tasks) ? combined.tasks : [];
  const next = { ...(payload || {}) };
  next.columns = ensureTaskColumns(next.columns || []);
  next.rows = orderRowsByCategory((next.rows || []).map(row => {
    const normalized = { ...row };
    normalized[USER_TASK_COLUMNS.category] = String(normalized[USER_TASK_COLUMNS.category] || '').trim();
    normalized[USER_TASK_COLUMNS.subcategory] = String(normalized[USER_TASK_COLUMNS.subcategory] || '').trim();
    if (!normalized[USER_TASK_COLUMNS.category]) {
      normalized[USER_TASK_COLUMNS.subcategory] = '';
    }
    normalized[USER_TASK_COLUMNS.status] = inferTaskStatus(normalized[USER_TASK_COLUMNS.status], normalized);
    normalized[USER_TASK_COLUMNS.taskCategory] = inferTaskCategory(normalized[USER_TASK_COLUMNS.taskCategory], normalized);
    return normalized;
  }));
  const retained = existingTasks.filter(task => !isUserWorkspaceTaskRow(task));
  combined.tasks = [...retained, ...next.rows];
  combined.columns = next.columns;
  if (next.source_file !== undefined) combined.source_file = next.source_file;
  if (next.task_categories !== undefined) combined.task_categories = next.task_categories;
  if (next.category_rule !== undefined) combined.category_rule = next.category_rule;
  writeCombinedTasks(combined);
}

function sectionBullets(markdown, sectionTitle) {
  const escaped = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?:\\n##\\s+|$)`);
  const match = markdown.match(regex);
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.replace(/^- /, '').trim())
    .filter(Boolean);
}

function parseUserContextMarkdown(markdown) {
  const lastUpdatedMatch = markdown.match(/^Last Updated:\s*(.+)$/m);
  const contextDateMatch = markdown.match(/^Context Date:\s*(.+)$/m);
  const contextVersionMatch = markdown.match(/^Context Version:\s*(.+)$/m);
  const linkedEntityMatch = markdown.match(/Linked Entity ID:\s*`([^`]*)`/);
  const linkedTaskMatch = markdown.match(/Linked Task ID:\s*`([^`]*)`/);

  return {
    lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : '',
    contextDate: contextDateMatch ? contextDateMatch[1].trim() : '',
    contextVersion: contextVersionMatch ? contextVersionMatch[1].trim() : '',
    linkedEntityId: linkedEntityMatch ? linkedEntityMatch[1].trim() : '',
    linkedTaskId: linkedTaskMatch ? linkedTaskMatch[1].trim() : '',
    busyNow: sectionBullets(markdown, 'What I Am Busy With Now'),
    sessionGoal: sectionBullets(markdown, 'Session Goal'),
    nextAction: sectionBullets(markdown, 'Next Action'),
    notes: sectionBullets(markdown, 'Notes')
  };
}

function readUserWorkspace() {
  const contextMarkdown = safeReadText(USER_FILES.context);
  const sourcePayload = readUserTasksSourcePayload();
  const allTasks = sourcePayload?.rows?.map(mapCsvTask) || [];
  const visibleTasks = allTasks.filter(task => !isArchivedTask(task) && !isEpicTask(task));
  return {
    tasks: visibleTasks,
    context: parseUserContextMarkdown(contextMarkdown)
  };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text)
  });
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 10 * 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sanitizeRetrievedChunks(chunks) {
  if (!Array.isArray(chunks)) return [];
  // Keep only minimal fields to reduce prompt token overhead.
  return chunks.slice(0, AGENT_MAX_CHUNKS).map(item => ({
    chunk_id: String(item?.chunk_id || ''),
    type: String(item?.type || ''),
    source_file: String(item?.source_file || ''),
    token_count: Number(item?.token_count || 0),
    text: String(item?.text || '')
  }));
}

function buildRetrievedPrompt(query) {
  const key = String(query || '').trim().toLowerCase();
  if (retrievalCache.has(key)) {
    return retrievalCache.get(key);
  }

  const args = [
    QUERY_TOOL,
    'build-prompt',
    query,
    '--max-chunks',
    String(AGENT_MAX_CHUNKS),
    '--max-tokens',
    String(AGENT_MAX_CONTEXT_TOKENS),
    '--json'
  ];
  const run = spawnSync(PYTHON_BIN, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  if (run.error) {
    throw new Error(`Failed to execute retrieval query: ${run.error.message}`);
  }
  if (run.status !== 0) {
    const stderr = (run.stderr || '').trim();
    throw new Error(`Retrieval query failed: ${stderr || `exit ${run.status}`}`);
  }
  const out = JSON.parse(String(run.stdout || '{}'));
  out.chunks = sanitizeRetrievedChunks(out.chunks);
  retrievalCache.set(key, out);
  return out;
}

async function callOpenAIWithRetrievedPrompt(prompt) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      max_tokens: AGENT_RESPONSE_MAX_TOKENS,
      messages: [
        {
          role: 'system',
          content: 'Answer using only provided retrieved context. If context is insufficient, state exactly what is missing.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body}`);
  }
  const payload = await response.json();
  const answer = payload?.choices?.[0]?.message?.content || '';
  const usage = payload?.usage || {};
  return { answer, usage, model: payload?.model || OPENAI_MODEL };
}

function readData() {
  const combinedTasks = readCombinedTasks();
  return {
    entities: JSON.parse(fs.readFileSync(DATA_FILES.entities, 'utf8')),
    relationships: JSON.parse(fs.readFileSync(DATA_FILES.relationships, 'utf8')),
    tasks: (combinedTasks.tasks || []).filter(isProductTaskEntry)
  };
}

function writeData(data) {
  const combinedTasks = readCombinedTasks();
  const existingTasks = Array.isArray(combinedTasks.tasks) ? combinedTasks.tasks : [];
  fs.writeFileSync(DATA_FILES.entities, JSON.stringify(data.entities, null, 2) + '\n', 'utf8');
  fs.writeFileSync(DATA_FILES.relationships, JSON.stringify(data.relationships, null, 2) + '\n', 'utf8');
  const retained = existingTasks.filter(task => !isProductTaskEntry(task));
  const product = Array.isArray(data.tasks) ? data.tasks : [];
  combinedTasks.tasks = [...product, ...retained];
  writeCombinedTasks(combinedTasks);
}

function safeJoinPublic(urlPath) {
  const requestedPath = urlPath === '/' ? '/index.html' : urlPath;
  const normalized = path.normalize(requestedPath).replace(/^([.][.][/\\])+/, '');
  const finalPath = path.join(PUBLIC_DIR, normalized);
  if (!finalPath.startsWith(PUBLIC_DIR)) {
    return null;
  }
  return finalPath;
}

function serveStatic(req, res, urlPath) {
  const filePath = safeJoinPublic(urlPath);
  if (!filePath) {
    sendText(res, 403, 'Forbidden');
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendText(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  });
}

function validateEntity(entity, entitiesById) {
  const required = ['id', 'type', 'name', 'health'];
  for (const key of required) {
    if (!entity[key] || typeof entity[key] !== 'string') {
      return `Entity field '${key}' must be a non-empty string.`;
    }
  }
  if (!['product', 'category', 'subcategory'].includes(entity.type)) {
    return `Invalid entity type: ${entity.type}`;
  }
  if (!['green', 'yellow', 'red', 'blue'].includes(entity.health)) {
    return `Invalid health value: ${entity.health}`;
  }
  if (entity.parent_id && !entitiesById.has(entity.parent_id)) {
    return `parent_id does not exist: ${entity.parent_id}`;
  }
  return null;
}

function validateRelationship(rel, entitiesById) {
  const required = ['id', 'from_id', 'to_id', 'type', 'description'];
  for (const key of required) {
    if (!rel[key] || typeof rel[key] !== 'string') {
      return `Relationship field '${key}' must be a non-empty string.`;
    }
  }
  if (!entitiesById.has(rel.from_id)) return `from_id does not exist: ${rel.from_id}`;
  if (!entitiesById.has(rel.to_id)) return `to_id does not exist: ${rel.to_id}`;
  return null;
}

async function handleApi(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'POST' && pathname === '/api/agent/query') {
      const body = await parseBody(req);
      const query = String(body?.query || '').trim();
      if (!query) {
        sendJson(res, 400, { error: 'query is required' });
        return;
      }

      // Retrieval happens in query.py with strict hard caps (max chunks + max tokens).
      const retrieval = buildRetrievedPrompt(query);
      const prompt = String(retrieval?.prompt || '');
      if (!prompt) {
        sendJson(res, 500, { error: 'failed to build retrieval prompt' });
        return;
      }

      const llm = await callOpenAIWithRetrievedPrompt(prompt);
      sendJson(res, 200, {
        ok: true,
        query,
        answer: llm.answer,
        model: llm.model,
        retrieval: {
          chunk_count: Number(retrieval?.chunk_count || 0),
          retrieved_tokens: Number(retrieval?.retrieved_tokens || 0),
          chunks: retrieval?.chunks || []
        },
        usage: llm.usage
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/agent/retrieve') {
      const body = await parseBody(req);
      const query = String(body?.query || '').trim();
      if (!query) {
        sendJson(res, 400, { error: 'query is required' });
        return;
      }
      const retrieval = buildRetrievedPrompt(query);
      sendJson(res, 200, {
        ok: true,
        query,
        chunk_count: Number(retrieval?.chunk_count || 0),
        retrieved_tokens: Number(retrieval?.retrieved_tokens || 0),
        chunks: retrieval?.chunks || []
      });
      return;
    }

    if (
      req.method === 'GET'
      && (pathname === '/api/exports/tasks' || pathname === '/api/export/tasks')
    ) {
      if (!fs.existsSync(COMBINED_TASKS_FILE)) {
        sendJson(res, 404, { error: 'Task source file not found.' });
        return;
      }
      const payload = readCombinedTasks();
      const csvContent = buildTasksCsv(payload);
      const body = Buffer.from(csvContent, 'utf8');
      const fileName = 'src_tasks.csv';
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Length': body.length,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store'
      });
      res.end(body);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/user-workspace') {
      sendJson(res, 200, readUserWorkspace());
      return;
    }

    if (
      req.method === 'PUT'
      && segments[0] === 'api'
      && segments[1] === 'user-workspace'
      && segments[2] === 'tasks'
      && segments[3]
      && segments[4] === 'hyperparameters'
    ) {
      const taskId = decodeURIComponent(segments[3]);
      const payload = await parseBody(req);
      const sourcePayload = readUserTasksSourcePayload();
      if (!sourcePayload) {
        sendJson(res, 500, { error: 'User task source JSON is unavailable or invalid.' });
        return;
      }

      const row = sourcePayload.rows.find(item => String(item[USER_TASK_COLUMNS.id] || '').trim() === taskId);
      if (!row) {
        sendJson(res, 404, { error: `User task not found: ${taskId}` });
        return;
      }

      const mapping = {
        status: USER_TASK_COLUMNS.status,
        priority: USER_TASK_COLUMNS.priority,
        pointsEstimate: USER_TASK_COLUMNS.pointsEstimate,
        timeEstimate: USER_TASK_COLUMNS.timeEstimate,
        timeEstimateRolledUp: USER_TASK_COLUMNS.timeEstimateRolledUp,
        dueDate: USER_TASK_COLUMNS.dueDate,
        sprints: USER_TASK_COLUMNS.sprints,
        itemType: USER_TASK_COLUMNS.itemType,
        categoryId: USER_TASK_COLUMNS.category,
        subcategoryId: USER_TASK_COLUMNS.subcategory,
        taskCategory: USER_TASK_COLUMNS.taskCategory
      };

      Object.entries(mapping).forEach(([key, column]) => {
        if (payload[key] !== undefined) {
          row[column] = String(payload[key] ?? '').trim();
        }
      });

      if (!String(row[USER_TASK_COLUMNS.category] || '').trim()) {
        row[USER_TASK_COLUMNS.subcategory] = '';
      }
      row[USER_TASK_COLUMNS.status] = inferTaskStatus(row[USER_TASK_COLUMNS.status], row);
      row[USER_TASK_COLUMNS.taskCategory] = inferTaskCategory(row[USER_TASK_COLUMNS.taskCategory], row);
      sourcePayload.task_categories = sourcePayload.task_categories || {
        Active: 'Tasks not yet complete',
        Archived: 'Completed tasks moved out of active queue'
      };
      sourcePayload.category_rule = sourcePayload.category_rule
        || 'Archived when auto progress >= 100 or explicit done/completed/closed/resolved status; otherwise Active.';

      writeUserTasksSourcePayload(sourcePayload);
      sendJson(res, 200, {
        ok: true,
        task: mapCsvTask(row)
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/data') {
      sendJson(res, 200, readData());
      return;
    }

    if (req.method === 'PUT' && segments[0] === 'api' && segments[1] === 'entities' && segments[2]) {
      const id = decodeURIComponent(segments[2]);
      const payload = await parseBody(req);
      const data = readData();
      const index = data.entities.findIndex(item => item.id === id);
      if (index < 0) {
        sendJson(res, 404, { error: `Entity not found: ${id}` });
        return;
      }
      const updated = { ...data.entities[index], ...payload, id };
      const entitiesById = new Map(data.entities.map(item => [item.id, item]));
      entitiesById.set(updated.id, updated);
      const validationError = validateEntity(updated, entitiesById);
      if (validationError) {
        sendJson(res, 400, { error: validationError });
        return;
      }
      data.entities[index] = updated;
      writeData(data);
      sendJson(res, 200, { ok: true, entity: updated });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/entities') {
      const payload = await parseBody(req);
      const data = readData();
      if (!payload.id) {
        sendJson(res, 400, { error: 'Entity id is required.' });
        return;
      }
      if (data.entities.some(item => item.id === payload.id)) {
        sendJson(res, 400, { error: `Entity already exists: ${payload.id}` });
        return;
      }
      const entitiesById = new Map(data.entities.map(item => [item.id, item]));
      const validationError = validateEntity(payload, entitiesById);
      if (validationError) {
        sendJson(res, 400, { error: validationError });
        return;
      }
      data.entities.push(payload);
      writeData(data);
      sendJson(res, 201, { ok: true, entity: payload });
      return;
    }

    if (req.method === 'DELETE' && segments[0] === 'api' && segments[1] === 'entities' && segments[2]) {
      const id = decodeURIComponent(segments[2]);
      const data = readData();
      if (!data.entities.some(item => item.id === id)) {
        sendJson(res, 404, { error: `Entity not found: ${id}` });
        return;
      }
      data.entities = data.entities.filter(item => item.id !== id);
      data.relationships = data.relationships.filter(item => item.from_id !== id && item.to_id !== id);
      data.tasks = data.tasks.filter(item => item.entity_id !== id);
      writeData(data);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'PUT' && segments[0] === 'api' && segments[1] === 'relationships' && segments[2]) {
      const id = decodeURIComponent(segments[2]);
      const payload = await parseBody(req);
      const data = readData();
      const index = data.relationships.findIndex(item => item.id === id);
      if (index < 0) {
        sendJson(res, 404, { error: `Relationship not found: ${id}` });
        return;
      }
      const updated = { ...data.relationships[index], ...payload, id };
      const entitiesById = new Map(data.entities.map(item => [item.id, item]));
      const validationError = validateRelationship(updated, entitiesById);
      if (validationError) {
        sendJson(res, 400, { error: validationError });
        return;
      }
      data.relationships[index] = updated;
      writeData(data);
      sendJson(res, 200, { ok: true, relationship: updated });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/relationships') {
      const payload = await parseBody(req);
      const data = readData();
      if (!payload.id) {
        sendJson(res, 400, { error: 'Relationship id is required.' });
        return;
      }
      if (data.relationships.some(item => item.id === payload.id)) {
        sendJson(res, 400, { error: `Relationship already exists: ${payload.id}` });
        return;
      }
      const entitiesById = new Map(data.entities.map(item => [item.id, item]));
      const validationError = validateRelationship(payload, entitiesById);
      if (validationError) {
        sendJson(res, 400, { error: validationError });
        return;
      }
      data.relationships.push(payload);
      writeData(data);
      sendJson(res, 201, { ok: true, relationship: payload });
      return;
    }

    if (req.method === 'DELETE' && segments[0] === 'api' && segments[1] === 'relationships' && segments[2]) {
      const id = decodeURIComponent(segments[2]);
      const data = readData();
      const before = data.relationships.length;
      data.relationships = data.relationships.filter(item => item.id !== id);
      if (data.relationships.length === before) {
        sendJson(res, 404, { error: `Relationship not found: ${id}` });
        return;
      }
      writeData(data);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: 'API route not found' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Server error' });
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (parsedUrl.pathname.startsWith('/api/')) {
    handleApi(req, res, parsedUrl);
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method not allowed');
    return;
  }
  serveStatic(req, res, parsedUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`Mindmap editor running on http://localhost:${PORT}`);
});
