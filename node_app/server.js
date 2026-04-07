const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const KB_RAW_SOURCES_DIR = path.join(ROOT, 'knowledge_base', 'raw', 'sources');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 4311);

const DATA_FILES = {
  entities: path.join(KB_RAW_SOURCES_DIR, 'src_data_entities.json'),
  relationships: path.join(KB_RAW_SOURCES_DIR, 'src_data_relationships.json'),
  tasks: path.join(KB_RAW_SOURCES_DIR, 'src_data_tasks.json')
};

const USER_FILES = {
  tasks: path.join(KB_RAW_SOURCES_DIR, 'src_user_tasks.md'),
  context: path.join(KB_RAW_SOURCES_DIR, 'src_user_current_context.md')
};

function safeReadText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function normalizeStatus(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (value === 'inprogress') return 'in_progress';
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

function parseUserTasksMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex(line => line.includes('| ID |') && line.includes('Linked Entity'));
  if (headerIndex < 0 || !lines[headerIndex + 1]) return [];

  const headers = splitMarkdownRow(lines[headerIndex]);
  if (!headers.length) return [];

  const tasks = [];
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

    const status = normalizeStatus(row.Status);
    tasks.push({
      id: row.ID || '',
      title: row.Task || '',
      linkedEntity: row['Linked Entity'] || '',
      groundTruthTask: row['Ground-Truth Task'] || '',
      status,
      priority: (row.Priority || '').toLowerCase(),
      createdDate: row['Created (Date)'] || '',
      updatedDate: row['Updated (Date)'] || '',
      completedDate: row['Completed (Date)'] || '',
      estHours: Number.parseFloat(row['Est (h)']),
      actualHours: Number.parseFloat(row['Actual (h)']),
      owner: row.Owner || '',
      description: row.Notes || row['Ground-Truth Task'] || ''
    });
  }

  return tasks.map(task => ({
    ...task,
    estHours: Number.isFinite(task.estHours) ? task.estHours : null,
    actualHours: Number.isFinite(task.actualHours) ? task.actualHours : null
  }));
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
  const tasksMarkdown = safeReadText(USER_FILES.tasks);
  const contextMarkdown = safeReadText(USER_FILES.context);
  return {
    tasks: parseUserTasksMarkdown(tasksMarkdown),
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

function readData() {
  return {
    entities: JSON.parse(fs.readFileSync(DATA_FILES.entities, 'utf8')),
    relationships: JSON.parse(fs.readFileSync(DATA_FILES.relationships, 'utf8')),
    tasks: JSON.parse(fs.readFileSync(DATA_FILES.tasks, 'utf8'))
  };
}

function writeData(data) {
  fs.writeFileSync(DATA_FILES.entities, JSON.stringify(data.entities, null, 2) + '\n', 'utf8');
  fs.writeFileSync(DATA_FILES.relationships, JSON.stringify(data.relationships, null, 2) + '\n', 'utf8');
  fs.writeFileSync(DATA_FILES.tasks, JSON.stringify(data.tasks, null, 2) + '\n', 'utf8');
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

async function handleApi(req, res, pathname) {
  const segments = pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'GET' && pathname === '/api/user-workspace') {
      sendJson(res, 200, readUserWorkspace());
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
    handleApi(req, res, parsedUrl.pathname);
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
