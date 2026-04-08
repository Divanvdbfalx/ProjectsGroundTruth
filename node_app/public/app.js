const state = {
  data: null,
  userWorkspace: null,
  userWorkspaceError: null,
  viewMode: 'mindmap',
  selectedEntityId: null,
  selectedRelationshipId: null,
  selectedTaskNodeId: null,
  selectedTaskMeta: null,
  entityFormBaseline: null,
  transform: { x: 0, y: 0, scale: 1 },
  layoutMode: 'radial',
  taskNodeStatusFilter: 'all',
  nodeScale: 2.2,
  lastPointerClient: null
};

const mapEl = document.getElementById('map');
const viewportEl = document.getElementById('viewport');
const tooltipEl = document.getElementById('tooltip');
const toastEl = document.getElementById('toast');
const leftTaskFilterEl = document.querySelector('.left-task-filter');
const kanbanBoardEl = document.getElementById('kanbanBoard');
const viewModeSelectEl = document.getElementById('viewModeSelect');
const boardLegendEl = document.getElementById('boardLegend');
const fitViewBtn = document.getElementById('fitViewBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const layoutSelect = document.getElementById('layoutSelect');
const nodeSizeRange = document.getElementById('nodeSizeRange');

const entityForm = document.getElementById('entityForm');
const relationshipForm = document.getElementById('relationshipForm');
const entityList = document.getElementById('entityList');
const relationshipList = document.getElementById('relationshipList');
const entityListSection = document.getElementById('entityListSection');
const relationshipListSection = document.getElementById('relationshipListSection');
const toggleEntityListBtn = document.getElementById('toggleEntityListBtn');
const toggleRelationshipListBtn = document.getElementById('toggleRelationshipListBtn');
const contextSummaryEl = document.getElementById('contextSummary');
const selectedTaskDetailsEl = document.getElementById('selectedTaskDetails');
const taskNodeStatusFilterEl = document.getElementById('taskNodeStatusFilter');

const entityTab = document.getElementById('entityTab');
const relationshipTab = document.getElementById('relationshipTab');

function showToast(text, isError = false) {
  toastEl.textContent = text;
  toastEl.style.color = isError ? '#ff979a' : '#9eb3d6';
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

function byIdMap() {
  return new Map(state.data.entities.map(entity => [entity.id, entity]));
}

function normalizeStatus(status) {
  const value = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (value === 'inprogress') return 'in_progress';
  if (value === 'in_progress' || value === 'todo' || value === 'blocked' || value === 'done') {
    return value;
  }
  return value || 'todo';
}

function statusLabel(status) {
  const value = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (!value) return 'Unknown';
  if (value === 'in_progress' || value === 'inprogress') return 'In Progress';
  if (value === 'in_review' || value === 'inreview' || value === 'review') return 'In Review';
  if (value === 'todo') return 'Todo';
  if (value === 'blocked') return 'Blocked';
  if (value === 'done' || value === 'completed') return 'Completed';
  if (value === 'open') return 'Open';
  return value
    .split('_')
    .map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : '')
    .join(' ')
    .trim() || 'Unknown';
}

const TASK_NODE_PREFIX = 'task_node__';

const TASK_NODE_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'uncompleted', label: 'Uncompleted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In Review' }
];

function normalizeTaskNodeStatus(status) {
  const value = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (!value) return 'open';
  if (value === 'inprogress') return 'in_progress';
  if (value === 'inreview' || value === 'review') return 'in_review';
  if (value === 'completed') return 'done';
  return value;
}

function isCompletedTaskStatus(status) {
  return status === 'done' || status === 'closed' || status === 'resolved';
}

function isOpenTaskStatus(status) {
  return status === 'open'
    || status === 'todo'
    || status === 'backlog'
    || status === 'planned'
    || status === 'ready';
}

function taskStatusMatchesFilter(status, filter) {
  if (!filter || filter === 'all') return true;
  if (filter === 'completed') return isCompletedTaskStatus(status);
  if (filter === 'uncompleted') return !isCompletedTaskStatus(status);
  if (filter === 'in_progress') return status === 'in_progress';
  if (filter === 'open') return isOpenTaskStatus(status);
  if (filter === 'in_review') return status === 'in_review';
  if (filter.startsWith('status:')) return status === filter.slice('status:'.length);
  return true;
}

function taskNodeFilterLabel(filterValue) {
  const preset = TASK_NODE_FILTER_OPTIONS.find(option => option.value === filterValue);
  if (preset) return preset.label;
  if (filterValue?.startsWith('status:')) {
    return `Status ${statusLabel(filterValue.slice('status:'.length))}`;
  }
  return 'All';
}

const KANBAN_COLUMNS = [
  { id: 'open', label: 'Open' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' }
];

function kanbanColumnFromStatus(status) {
  const normalized = normalizeTaskNodeStatus(status);
  if (isCompletedTaskStatus(normalized)) return 'done';
  if (normalized === 'blocked') return 'blocked';
  if (normalized === 'in_progress') return 'in_progress';
  if (normalized === 'in_review') return 'review';
  return 'open';
}

function priorityRank(priority) {
  if (priority === 'critical') return 0;
  if (priority === 'high') return 1;
  if (priority === 'medium') return 2;
  if (priority === 'low') return 3;
  return 4;
}

function taskNodeId(taskId) {
  return `${TASK_NODE_PREFIX}${taskId}`;
}

function sourceUserTaskNodes() {
  const entities = state.data?.entities || [];
  const userTasks = state.userWorkspace?.tasks || [];
  return userTasks
    .map((task, index) => {
      const linkedEntityId = resolveEntityIdFromLinkedEntity(task.linkedEntity, entities);
      if (!linkedEntityId) return null;
      const rawId = String(task.id || '').trim() || `user_task_${index + 1}`;
      return {
        id: taskNodeId(rawId),
        kind: 'task',
        type: 'task',
        task_id: rawId,
        parent_id: linkedEntityId,
        entity_id: linkedEntityId,
        name: task.title || rawId,
        status: normalizeTaskNodeStatus(task.status),
        priority: String(task.priority || '').toLowerCase(),
        description: task.description || task.groundTruthTask || task.title || '',
        owner: task.owner || '',
        createdDate: task.createdDate || '',
        updatedDate: task.updatedDate || '',
        completedDate: task.completedDate || '',
        estHours: Number.isFinite(task.estHours) ? task.estHours : null,
        actualHours: Number.isFinite(task.actualHours) ? task.actualHours : null
      };
    })
    .filter(Boolean);
}

function selectedMetaFromUserTask(task) {
  const entities = state.data?.entities || [];
  const linkedEntityId = resolveEntityIdFromLinkedEntity(task.linkedEntity, entities);
  const taskId = String(task.id || '').trim() || 'unknown_task';
  return {
    id: taskNodeId(taskId),
    task_id: taskId,
    name: task.title || taskId,
    status: normalizeTaskNodeStatus(task.status),
    priority: String(task.priority || '').toLowerCase(),
    entity_id: linkedEntityId || String(task.linkedEntity || '').trim(),
    owner: task.owner || '',
    createdDate: task.createdDate || '',
    updatedDate: task.updatedDate || '',
    completedDate: task.completedDate || '',
    estHours: Number.isFinite(task.estHours) ? task.estHours : null,
    actualHours: Number.isFinite(task.actualHours) ? task.actualHours : null,
    description: task.description || task.groundTruthTask || task.title || ''
  };
}

function renderSelectedTaskDetails() {
  if (!selectedTaskDetailsEl) return;
  selectedTaskDetailsEl.innerHTML = '';

  const task = state.selectedTaskMeta;
  if (!task) {
    const empty = document.createElement('p');
    empty.className = 'context-empty';
    empty.textContent = 'Select a map task node or a Kanban card to view task metadata.';
    selectedTaskDetailsEl.appendChild(empty);
    return;
  }

  const fields = [
    ['Task', task.name || 'N/A'],
    ['Task ID', task.task_id || 'N/A'],
    ['Status', statusLabel(task.status)],
    ['Priority', task.priority || 'N/A'],
    ['Linked Entity', task.entity_id || 'N/A'],
    ['Owner', task.owner || 'N/A'],
    ['Created', task.createdDate || 'N/A'],
    ['Updated', task.updatedDate || 'N/A'],
    ['Completed', task.completedDate || 'N/A'],
    ['Estimate (h)', task.estHours ?? 'N/A'],
    ['Actual (h)', task.actualHours ?? 'N/A'],
    ['Description', task.description || 'N/A']
  ];

  fields.forEach(([label, value]) => {
    const row = document.createElement('p');
    row.className = 'context-row';
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    row.appendChild(strong);
    row.appendChild(document.createTextNode(String(value)));
    selectedTaskDetailsEl.appendChild(row);
  });
}

function syncSelectedTaskMeta() {
  if (!state.selectedTaskNodeId) {
    state.selectedTaskMeta = null;
    return;
  }
  const match = sourceUserTaskNodes().find(task => task.id === state.selectedTaskNodeId) || null;
  state.selectedTaskMeta = match;
  if (!match) {
    state.selectedTaskNodeId = null;
  }
}

function applyViewMode() {
  const isKanban = state.viewMode === 'kanban';

  mapEl.style.display = isKanban ? 'none' : 'block';
  kanbanBoardEl?.classList.toggle('active', isKanban);
  if (leftTaskFilterEl) {
    leftTaskFilterEl.style.display = isKanban ? 'none' : 'grid';
  }
  if (boardLegendEl) {
    boardLegendEl.style.display = isKanban ? 'none' : 'flex';
  }
  if (fitViewBtn) fitViewBtn.disabled = isKanban;
  if (zoomInBtn) zoomInBtn.disabled = isKanban;
  if (zoomOutBtn) zoomOutBtn.disabled = isKanban;
  if (layoutSelect) layoutSelect.disabled = isKanban;
  if (nodeSizeRange) nodeSizeRange.disabled = isKanban;
  if (taskNodeStatusFilterEl) taskNodeStatusFilterEl.disabled = isKanban;

  hideTooltip();
}

function renderKanbanBoard() {
  if (!kanbanBoardEl) return;
  kanbanBoardEl.innerHTML = '';

  if (state.userWorkspaceError) {
    const empty = document.createElement('p');
    empty.className = 'kanban-empty';
    empty.textContent = `User tasks unavailable (${state.userWorkspaceError}).`;
    kanbanBoardEl.appendChild(empty);
    return;
  }

  const tasks = state.userWorkspace?.tasks || [];
  if (!tasks.length) {
    const empty = document.createElement('p');
    empty.className = 'kanban-empty';
    empty.textContent = 'No user tasks found.';
    kanbanBoardEl.appendChild(empty);
    return;
  }

  const byColumn = new Map(KANBAN_COLUMNS.map(column => [column.id, []]));
  tasks.forEach(task => {
    byColumn.get(kanbanColumnFromStatus(task.status)).push(task);
  });
  byColumn.forEach(list => {
    list.sort((a, b) => {
      const rankDiff = priorityRank(String(a.priority || '').toLowerCase()) - priorityRank(String(b.priority || '').toLowerCase());
      if (rankDiff !== 0) return rankDiff;
      return String(a.title || a.id || '').localeCompare(String(b.title || b.id || ''));
    });
  });

  KANBAN_COLUMNS.forEach(column => {
    const columnEl = document.createElement('article');
    columnEl.className = 'kanban-column';

    const heading = document.createElement('h3');
    const entries = byColumn.get(column.id) || [];
    heading.textContent = `${column.label} (${entries.length})`;
    columnEl.appendChild(heading);

    const listEl = document.createElement('ul');
    listEl.className = 'kanban-list';

    if (!entries.length) {
      const empty = document.createElement('li');
      empty.className = 'kanban-empty';
      empty.textContent = 'No tasks';
      listEl.appendChild(empty);
    } else {
      entries.forEach(task => {
        const meta = selectedMetaFromUserTask(task);
        const item = document.createElement('li');
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'kanban-card';
        if (state.selectedTaskNodeId === meta.id) card.classList.add('active');
        card.title = meta.description || meta.name;
        card.addEventListener('click', () => {
          state.selectedTaskNodeId = meta.id;
          state.selectedTaskMeta = meta;
          renderSelectedTaskDetails();
          renderKanbanBoard();
        });

        const titleEl = document.createElement('div');
        titleEl.className = 'kanban-card-title';
        titleEl.textContent = meta.name || meta.task_id;

        const metaRow = document.createElement('div');
        metaRow.className = 'kanban-card-meta';
        const priorityEl = document.createElement('span');
        priorityEl.textContent = meta.priority ? `Priority: ${meta.priority}` : 'Priority: n/a';
        const statusEl = document.createElement('span');
        statusEl.textContent = statusLabel(meta.status);
        metaRow.appendChild(priorityEl);
        metaRow.appendChild(statusEl);

        card.appendChild(titleEl);
        card.appendChild(metaRow);
        item.appendChild(card);
        listEl.appendChild(item);
      });
    }

    columnEl.appendChild(listEl);
    kanbanBoardEl.appendChild(columnEl);
  });
}

function taskGraphNodes() {
  const selectedFilter = state.taskNodeStatusFilter || 'all';
  return sourceUserTaskNodes()
    .filter(taskNode => taskStatusMatchesFilter(taskNode.status, selectedFilter));
}

function groupTaskNodesByParent(taskNodes) {
  const grouped = new Map();
  taskNodes.forEach(taskNode => {
    if (!grouped.has(taskNode.parent_id)) grouped.set(taskNode.parent_id, []);
    grouped.get(taskNode.parent_id).push(taskNode);
  });
  grouped.forEach(nodes => {
    nodes.sort((a, b) => (
      String(a.name || '').localeCompare(String(b.name || '')) ||
      String(a.id || '').localeCompare(String(b.id || ''))
    ));
  });
  return grouped;
}

function renderTaskNodeStatusOptions() {
  if (!taskNodeStatusFilterEl) return;
  const taskStatuses = [...new Set(
    sourceUserTaskNodes()
      .map(taskNode => normalizeTaskNodeStatus(taskNode.status))
      .filter(Boolean)
  )].sort();

  const previousValue = state.taskNodeStatusFilter || taskNodeStatusFilterEl.value || 'all';
  taskNodeStatusFilterEl.innerHTML = '';

  TASK_NODE_FILTER_OPTIONS.forEach(option => {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    taskNodeStatusFilterEl.appendChild(el);
  });

  taskStatuses.forEach(status => {
    const el = document.createElement('option');
    el.value = `status:${status}`;
    el.textContent = `Status: ${statusLabel(status)}`;
    taskNodeStatusFilterEl.appendChild(el);
  });

  const allowed = new Set([
    ...TASK_NODE_FILTER_OPTIONS.map(option => option.value),
    ...taskStatuses.map(status => `status:${status}`)
  ]);
  state.taskNodeStatusFilter = allowed.has(previousValue) ? previousValue : 'all';
  taskNodeStatusFilterEl.value = state.taskNodeStatusFilter;
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 3);
}

function resolveEntityIdFromLinkedEntity(linkedEntity, entities) {
  const raw = String(linkedEntity || '').trim();
  if (!raw) return null;

  const byId = new Map(entities.map(entity => [entity.id, entity.id]));
  if (byId.has(raw)) return raw;

  const normalizedRaw = normalizeKey(raw);
  const normalizedRawFlat = normalizedRaw.replace(/_/g, '');

  for (const entity of entities) {
    const idKey = normalizeKey(entity.id);
    const nameKey = normalizeKey(entity.name);
    if (normalizedRaw === idKey || normalizedRaw === nameKey) {
      return entity.id;
    }
    if (normalizedRawFlat && (idKey.replace(/_/g, '') === normalizedRawFlat || nameKey.replace(/_/g, '') === normalizedRawFlat)) {
      return entity.id;
    }
  }

  const rawTokens = tokenize(raw);
  if (!rawTokens.length) return null;

  let bestId = null;
  let bestScore = 0;
  for (const entity of entities) {
    const entityTokens = new Set([...tokenize(entity.id), ...tokenize(entity.name)]);
    if (!entityTokens.size) continue;

    let overlap = 0;
    rawTokens.forEach(token => {
      if (entityTokens.has(token)) overlap += 1;
      else {
        const partial = [...entityTokens].some(entityToken =>
          entityToken.includes(token) || token.includes(entityToken)
        );
        if (partial) overlap += 0.6;
      }
    });

    if (overlap > bestScore) {
      bestScore = overlap;
      bestId = entity.id;
    }
  }

  return bestScore >= 0.8 ? bestId : null;
}

function inProgressEntityIds() {
  const entities = state.data?.entities || [];
  const inProgressIds = new Set();

  sourceUserTaskNodes().forEach(taskNode => {
    if (normalizeTaskNodeStatus(taskNode.status) !== 'in_progress') return;
    if (taskNode.entity_id) {
      inProgressIds.add(taskNode.entity_id);
    }
  });

  const context = state.userWorkspace?.context;
  if (context?.linkedEntityId) {
    const resolved = resolveEntityIdFromLinkedEntity(context.linkedEntityId, entities);
    const linkedTask = (state.userWorkspace?.tasks || []).find(task => task.id === context.linkedTaskId);
    if (resolved && linkedTask && normalizeStatus(linkedTask.status) === 'in_progress') {
      inProgressIds.add(resolved);
    }
  }

  return inProgressIds;
}

function healthColor(health) {
  if (health === 'green') return '#34c779';
  if (health === 'yellow') return '#ffbc38';
  if (health === 'red') return '#f16f74';
  if (health === 'blue') return '#4da3ff';
  return '#8ba7cd';
}

function relColor(type) {
  if (type === 'blocks') return '#ff8a8a';
  if (type === 'enables') return '#53cf96';
  if (type === 'impacts') return '#72b7ff';
  if (type === 'depends_on') return '#ffc777';
  return '#9bb4d4';
}

function polar(r, deg) {
  const rad = deg * Math.PI / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

function layoutPositions() {
  if (state.layoutMode === 'optimized') {
    return layoutOptimizedPositions();
  }
  if (state.layoutMode === 'vertical') {
    return layoutVerticalPositions();
  }
  if (state.layoutMode === 'horizontal') {
    return layoutHorizontalPositions();
  }
  return layoutRadialPositions();
}

function layoutRadialPositions() {
  const positions = {};
  const entities = state.data.entities;
  const taskNodes = taskGraphNodes();
  const taskNodesByParent = groupTaskNodesByParent(taskNodes);
  const root = entities.find(item => item.type === 'product');
  if (!root) return positions;

  positions[root.id] = { x: 0, y: 0 };
  const categories = entities
    .filter(item => item.parent_id === root.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const spreadScale = 1;
  const catStep = 360 / Math.max(1, categories.length);
  categories.forEach((cat, catIndex) => {
    const catAngle = -90 + catIndex * catStep;
    const catPos = polar(620 * spreadScale, catAngle);
    positions[cat.id] = catPos;

    const subcats = entities
      .filter(item => item.parent_id === cat.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const arc = Math.min(110, 23 * Math.max(2, subcats.length));
    subcats.forEach((sub, subIndex) => {
      const subAngle = subcats.length === 1
        ? catAngle
        : catAngle - arc / 2 + (arc * subIndex / (subcats.length - 1));
      const offset = polar(430 * spreadScale, subAngle);
      const subPosition = {
        x: catPos.x + offset.x,
        y: catPos.y + offset.y
      };
      positions[sub.id] = subPosition;

      const linkedTasks = taskNodesByParent.get(sub.id) || [];
      const taskArc = Math.min(90, 22 * Math.max(2, linkedTasks.length));
      linkedTasks.forEach((taskNode, taskIndex) => {
        const taskAngle = linkedTasks.length === 1
          ? subAngle
          : subAngle - taskArc / 2 + (taskArc * taskIndex / (linkedTasks.length - 1));
        const taskOffset = polar(270 * spreadScale, taskAngle);
        positions[taskNode.id] = {
          x: subPosition.x + taskOffset.x,
          y: subPosition.y + taskOffset.y
        };
      });
    });
  });

  resolveNodeCollisions(positions, [...entities, ...taskNodes]);
  return positions;
}

function layoutHorizontalPositions() {
  const positions = {};
  const entities = state.data.entities;
  const taskNodes = taskGraphNodes();
  const taskNodesByParent = groupTaskNodesByParent(taskNodes);
  const root = entities.find(item => item.type === 'product');
  if (!root) return positions;

  positions[root.id] = { x: -1050, y: 0 };

  const categories = entities
    .filter(item => item.parent_id === root.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const catGap = 300;
  const catStartY = -((categories.length - 1) * catGap) / 2;
  categories.forEach((cat, catIndex) => {
    const catY = catStartY + catIndex * catGap;
    positions[cat.id] = { x: -280, y: catY };

    const subcats = entities
      .filter(item => item.parent_id === cat.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const subGap = 150;
    const subStartY = catY - ((subcats.length - 1) * subGap) / 2;
    subcats.forEach((sub, subIndex) => {
      const subPosition = { x: 520, y: subStartY + subIndex * subGap };
      positions[sub.id] = subPosition;

      const linkedTasks = taskNodesByParent.get(sub.id) || [];
      const taskGap = 94;
      const taskStartY = subPosition.y - ((linkedTasks.length - 1) * taskGap) / 2;
      linkedTasks.forEach((taskNode, taskIndex) => {
        positions[taskNode.id] = {
          x: subPosition.x + 520,
          y: taskStartY + taskIndex * taskGap
        };
      });
    });
  });

  resolveNodeCollisions(positions, [...entities, ...taskNodes]);
  return positions;
}

function layoutVerticalPositions() {
  const positions = {};
  const entities = state.data.entities;
  const taskNodes = taskGraphNodes();
  const taskNodesByParent = groupTaskNodesByParent(taskNodes);
  const root = entities.find(item => item.type === 'product');
  if (!root) return positions;

  positions[root.id] = { x: 0, y: -850 };

  const categories = entities
    .filter(item => item.parent_id === root.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const catGapX = 380;
  const catStartX = -((categories.length - 1) * catGapX) / 2;
  categories.forEach((cat, catIndex) => {
    const catX = catStartX + catIndex * catGapX;
    positions[cat.id] = { x: catX, y: -170 };

    const subcats = entities
      .filter(item => item.parent_id === cat.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    const subGapX = 180;
    const subStartX = catX - ((subcats.length - 1) * subGapX) / 2;
    subcats.forEach((sub, subIndex) => {
      const subPosition = { x: subStartX + subIndex * subGapX, y: 620 };
      positions[sub.id] = subPosition;

      const linkedTasks = taskNodesByParent.get(sub.id) || [];
      const taskGapX = 120;
      const taskStartX = subPosition.x - ((linkedTasks.length - 1) * taskGapX) / 2;
      linkedTasks.forEach((taskNode, taskIndex) => {
        positions[taskNode.id] = {
          x: taskStartX + taskIndex * taskGapX,
          y: subPosition.y + 430
        };
      });
    });
  });

  resolveNodeCollisions(positions, [...entities, ...taskNodes]);
  return positions;
}

function layoutOptimizedPositions() {
  const positions = {};
  const entities = state.data.entities;
  const taskNodes = taskGraphNodes();
  const nodes = [...entities, ...taskNodes];
  const relationships = state.data.relationships || [];
  const byId = new Map(nodes.map(item => [item.id, item]));
  const root = entities.find(item => item.type === 'product');
  if (!root) return positions;

  const depthMemo = new Map();
  function depthOf(id) {
    if (depthMemo.has(id)) return depthMemo.get(id);
    const entity = byId.get(id);
    if (!entity || !entity.parent_id) {
      depthMemo.set(id, 0);
      return 0;
    }
    const d = depthOf(entity.parent_id) + 1;
    depthMemo.set(id, d);
    return d;
  }

  const layers = new Map();
  nodes.forEach(node => {
    const d = depthOf(node.id);
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d).push(node.id);
  });
  const depths = [...layers.keys()].sort((a, b) => a - b);

  // Build tree children for tidy-tree style initial placement.
  const children = new Map();
  nodes.forEach(node => children.set(node.id, []));
  nodes.forEach(node => {
    if (!node.parent_id || !byId.has(node.parent_id)) return;
    children.get(node.parent_id).push(node.id);
  });
  children.forEach((list, id) => {
    list.sort((a, b) => {
      const aNode = byId.get(a);
      const bNode = byId.get(b);
      if (aNode?.kind === 'task' && bNode?.kind !== 'task') return 1;
      if (aNode?.kind !== 'task' && bNode?.kind === 'task') return -1;
      return String(aNode?.name || '').localeCompare(String(bNode?.name || ''));
    });
  });

  const minGap = 145;
  const layerGapY = 500;
  const x = {};
  let leafCursor = 0;

  function assignTreeX(id) {
    const kids = children.get(id) || [];
    if (kids.length === 0) {
      x[id] = leafCursor;
      leafCursor += minGap;
      return x[id];
    }
    const childXs = kids.map(assignTreeX);
    x[id] = childXs.reduce((sum, value) => sum + value, 0) / childXs.length;
    return x[id];
  }
  assignTreeX(root.id);

  nodes.forEach(node => {
    if (typeof x[node.id] !== 'number') {
      x[node.id] = leafCursor;
      leafCursor += minGap;
    }
  });

  const relNeighbors = new Map();
  function addRelNeighbor(a, b) {
    if (!relNeighbors.has(a)) relNeighbors.set(a, []);
    relNeighbors.get(a).push(b);
  }
  relationships.forEach(rel => {
    if (!byId.has(rel.from_id) || !byId.has(rel.to_id)) return;
    addRelNeighbor(rel.from_id, rel.to_id);
    addRelNeighbor(rel.to_id, rel.from_id);
  });

  function enforceLayerSpacing(ids, depth) {
    const containsTasks = ids.some(id => byId.get(id)?.kind === 'task');
    const requiredGap = containsTasks ? minGap * 0.82 : depth === 1 ? minGap * 1.4 : minGap;
    ids.sort((a, b) => x[a] - x[b]);
    for (let i = 1; i < ids.length; i += 1) {
      const prev = ids[i - 1];
      const cur = ids[i];
      if (x[cur] - x[prev] < requiredGap) x[cur] = x[prev] + requiredGap;
    }
    for (let i = ids.length - 2; i >= 0; i -= 1) {
      const next = ids[i + 1];
      const cur = ids[i];
      if (x[next] - x[cur] < requiredGap) x[cur] = x[next] - requiredGap;
    }
    const center = ids.reduce((sum, id) => sum + x[id], 0) / Math.max(1, ids.length);
    ids.forEach(id => {
      x[id] -= center;
    });
  }

  // Barycentric layer sweeps: prioritize tree coherence, then relationship alignment.
  for (let sweep = 0; sweep < 8; sweep += 1) {
    depths.forEach(depth => {
      const ids = layers.get(depth);
      ids.sort((a, b) => {
        const parentA = byId.get(a)?.parent_id;
        const parentB = byId.get(b)?.parent_id;
        const pAx = parentA && typeof x[parentA] === 'number' ? x[parentA] : x[a];
        const pBx = parentB && typeof x[parentB] === 'number' ? x[parentB] : x[b];

        const relA = relNeighbors.get(a) || [];
        const relB = relNeighbors.get(b) || [];
        const rAx = relA.length
          ? relA.reduce((sum, id) => sum + (typeof x[id] === 'number' ? x[id] : x[a]), 0) / relA.length
          : x[a];
        const rBx = relB.length
          ? relB.reduce((sum, id) => sum + (typeof x[id] === 'number' ? x[id] : x[b]), 0) / relB.length
          : x[b];

        const scoreA = pAx * 0.72 + rAx * 0.28;
        const scoreB = pBx * 0.72 + rBx * 0.28;
        return scoreA - scoreB;
      });

      const containsTasks = ids.some(id => byId.get(id)?.kind === 'task');
      const requiredGap = containsTasks ? minGap * 0.82 : depth === 1 ? minGap * 1.4 : minGap;
      const start = -((ids.length - 1) * requiredGap) / 2;
      ids.forEach((id, index) => {
        x[id] = start + index * requiredGap;
      });
      enforceLayerSpacing(ids, depth);
    });
  }

  const offsetY = -((depths.length - 1) * layerGapY) / 2;
  depths.forEach(depth => {
    const y = offsetY + depth * layerGapY;
    layers.get(depth).forEach(id => {
      positions[id] = { x: x[id], y };
    });
  });

  resolveNodeCollisions(positions, nodes);
  return positions;
}

function taskStatusColor(status) {
  if (status === 'in_progress') return '#55b8ff';
  if (status === 'in_review') return '#c8b56f';
  if (status === 'blocked') return '#ee9a6f';
  if (isCompletedTaskStatus(status)) return '#5ecf9a';
  if (isOpenTaskStatus(status)) return '#8aa6c8';
  return '#8aa6c8';
}

function nodeRadius(node) {
  if (node?.kind === 'task' || node?.type === 'task') {
    const scaled = 9 * Math.max(0.84, state.nodeScale * 0.82);
    return Math.max(8, Math.round(scaled));
  }
  const base = node.type === 'product' ? 28 : node.type === 'category' ? 20 : 14;
  return Math.round(base * state.nodeScale);
}

function baseNodeRadius(node) {
  if (node?.kind === 'task' || node?.type === 'task') return 9;
  return node.type === 'product' ? 28 : node.type === 'category' ? 20 : 14;
}

function labelFontSize(node) {
  const base = node?.kind === 'task' || node?.type === 'task'
    ? 10
    : node.type === 'product'
      ? 14
      : node.type === 'category'
        ? 13
        : 12;
  return Math.max(10, Math.min(22, Math.round(base * state.nodeScale)));
}

function estimateTextWidth(text, fontSize) {
  return Math.max(18, text.length * fontSize * 0.56);
}

function shortenLabel(text) {
  const scaleFactor = Math.max(0.9, Math.min(1.7, state.nodeScale));
  const optimizedBase = state.nodeScale >= 1.8 ? 18 : 22;
  const base = state.layoutMode === 'radial' ? 30 : state.layoutMode === 'optimized' ? optimizedBase : 24;
  const maxChars = Math.round(base * (state.layoutMode === 'optimized' ? 1 : scaleFactor));
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

function labelBaseConfig(entity, position, radius) {
  if (state.layoutMode === 'radial') {
    const rightSide = position.x >= 0;
    return {
      anchor: rightSide ? 'start' : 'end',
      x: rightSide ? radius + 10 : -(radius + 10),
      y: 4
    };
  }
  if (state.layoutMode === 'horizontal') {
    return {
      anchor: 'middle',
      x: 0,
      y: -(radius + 13)
    };
  }
  if (state.layoutMode === 'optimized') {
    const rightSide = position.x >= 0;
    return {
      anchor: rightSide ? 'start' : 'end',
      x: rightSide ? radius + 12 : -(radius + 12),
      y: 4
    };
  }
  return {
    anchor: 'middle',
    x: 0,
    y: radius + 18
  };
}

function estimateLabelRect(labelCfg) {
  const textWidth = estimateTextWidth(labelCfg.text, labelCfg.fontSize);
  const worldX = labelCfg.position.x + labelCfg.x;
  const worldY = labelCfg.position.y + labelCfg.y + labelCfg.dy;
  const height = Math.max(14, labelCfg.fontSize + 2);
  const top = worldY - Math.max(10, labelCfg.fontSize * 0.78);
  let left;
  if (labelCfg.anchor === 'middle') {
    left = worldX - textWidth / 2;
  } else if (labelCfg.anchor === 'end') {
    left = worldX - textWidth;
  } else {
    left = worldX;
  }
  return {
    left,
    right: left + textWidth,
    top,
    bottom: top + height
  };
}

function labelsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function rectOverlapsCircle(rect, circle) {
  const nearestX = Math.max(rect.left, Math.min(circle.x, rect.right));
  const nearestY = Math.max(rect.top, Math.min(circle.y, rect.bottom));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return (dx * dx + dy * dy) < (circle.r * circle.r);
}

function resolveLabelOverlaps(labelConfigs, nodeCircles) {
  if (labelConfigs.length < 2) return;
  const step = 9;
  for (let iteration = 0; iteration < 180; iteration += 1) {
    let moved = false;
    for (let i = 0; i < labelConfigs.length; i += 1) {
      for (let j = i + 1; j < labelConfigs.length; j += 1) {
        const a = labelConfigs[i];
        const b = labelConfigs[j];
        const rectA = estimateLabelRect(a);
        const rectB = estimateLabelRect(b);
        if (!labelsOverlap(rectA, rectB)) continue;

        moved = true;
        const direction = rectA.top <= rectB.top ? 1 : -1;
        a.dy -= direction * (step / 2);
        b.dy += direction * (step / 2);
        a.dy = Math.max(-180, Math.min(180, a.dy));
        b.dy = Math.max(-180, Math.min(180, b.dy));
      }
    }

    // Prevent any label from overlapping node circles.
    for (let i = 0; i < labelConfigs.length; i += 1) {
      const label = labelConfigs[i];
      const rect = estimateLabelRect(label);
      for (let j = 0; j < nodeCircles.length; j += 1) {
        const circle = nodeCircles[j];
        if (circle.id === label.id) continue;
        if (!rectOverlapsCircle(rect, circle)) continue;

        const dx = rect.left + (rect.right - rect.left) / 2 - circle.x;
        const dy = rect.top + (rect.bottom - rect.top) / 2 - circle.y;
        const pushDir = dy >= 0 ? 1 : -1;
        const lateral = Math.abs(dx) > circle.r ? 0.35 : 1;
        label.dy += pushDir * step * lateral;
        label.dy = Math.max(-220, Math.min(220, label.dy));
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function resolveNodeCollisions(positions, entities) {
  const movable = entities.filter(item => positions[item.id]);
  if (movable.length < 2) return;

  const idToEntity = new Map(entities.map(item => [item.id, item]));
  const getRadius = id => nodeRadius(idToEntity.get(id)) + 16;

  for (let iteration = 0; iteration < 240; iteration += 1) {
    let moved = false;
    for (let i = 0; i < movable.length; i += 1) {
      for (let j = i + 1; j < movable.length; j += 1) {
        const a = movable[i];
        const b = movable[j];
        const pa = positions[a.id];
        const pb = positions[b.id];
        let dx = pb.x - pa.x;
        let dy = pb.y - pa.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.001) {
          // Deterministic micro-jitter for perfectly overlapping nodes.
          const seed = (a.id.length * 17 + b.id.length * 31 + i * 13 + j * 7) % 360;
          const n = polar(0.001, seed);
          dx = n.x;
          dy = n.y;
          dist = 0.001;
        }
        const minDist = getRadius(a.id) + getRadius(b.id) + 20;
        if (dist >= minDist) continue;

        const overlap = (minDist - dist) * 0.52;
        const nx = dx / dist;
        const ny = dy / dist;
        pa.x -= nx * overlap;
        pa.y -= ny * overlap;
        pb.x += nx * overlap;
        pb.y += ny * overlap;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function autoFitGraph() {
  const viewBox = mapEl.viewBox.baseVal;
  const vbCenterX = viewBox.x + viewBox.width / 2;
  const vbCenterY = viewBox.y + viewBox.height / 2;

  let bbox;
  try {
    bbox = viewportEl.getBBox();
  } catch {
    return;
  }
  if (!bbox || bbox.width <= 0 || bbox.height <= 0) return;

  const padding = 180;
  const targetScaleX = viewBox.width / (bbox.width + padding);
  const targetScaleY = viewBox.height / (bbox.height + padding);
  const scale = Math.max(0.35, Math.min(2.2, Math.min(targetScaleX, targetScaleY)));
  const graphCenterX = bbox.x + bbox.width / 2;
  const graphCenterY = bbox.y + bbox.height / 2;

  state.transform.scale = scale;
  state.transform.x = vbCenterX - graphCenterX * scale;
  state.transform.y = vbCenterY - graphCenterY * scale;
  applyTransform();
}

function hideTooltip() {
  tooltipEl.style.display = 'none';
}

function showTooltip(evt, title, description) {
  const safeDesc = description || 'No description';
  tooltipEl.innerHTML = `<strong>${title}</strong><br>${safeDesc}`;
  tooltipEl.style.left = `${evt.clientX + 10}px`;
  tooltipEl.style.top = `${evt.clientY + 10}px`;
  tooltipEl.style.display = 'block';
}

function setActiveTab(name) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === name);
  });
  entityTab.classList.toggle('active', name === 'entity');
  relationshipTab.classList.toggle('active', name === 'relationship');
}

function setEntityForm(entity) {
  entityForm.elements.id.value = entity?.id || '';
  entityForm.elements.name.value = entity?.name || '';
  entityForm.elements.type.value = entity?.type || 'subcategory';
  entityForm.elements.health.value = entity?.health || 'yellow';
  entityForm.elements.parent_id.value = entity?.parent_id || '';
  entityForm.elements.category_id.value = entity?.category_id || '';
  entityForm.elements.product_id.value = entity?.product_id || '';
  entityForm.elements.current_state.value = entity?.current_state || '';
  entityForm.elements.target_state.value = entity?.target_state || '';
  entityForm.elements.description.value = entity?.full_context?.description || '';
  state.entityFormBaseline = JSON.stringify(formToEntity());
}

function setRelationshipForm(rel) {
  relationshipForm.elements.id.value = rel?.id || '';
  relationshipForm.elements.from_id.value = rel?.from_id || '';
  relationshipForm.elements.to_id.value = rel?.to_id || '';
  relationshipForm.elements.type.value = rel?.type || 'blocks';
  relationshipForm.elements.description.value = rel?.description || '';
}

function edgeGeometry(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  return {
    dx,
    dy,
    dist,
    nx: -dy / dist,
    ny: dx / dist,
    tx: dx / dist,
    ty: dy / dist
  };
}

function curvedPath(from, to, laneOffset, curvature) {
  const g = edgeGeometry(from, to);
  const sx = from.x + g.nx * laneOffset;
  const sy = from.y + g.ny * laneOffset;
  const ex = to.x + g.nx * laneOffset;
  const ey = to.y + g.ny * laneOffset;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const cx = mx + g.nx * curvature;
  const cy = my + g.ny * curvature;
  return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
}

function drawGraph(options = {}) {
  const { fit = false } = options;
  viewportEl.innerHTML = '';
  const entities = state.data.entities;
  const taskNodes = taskGraphNodes();
  const graphNodes = [
    ...entities.map(entity => ({ ...entity, kind: 'entity' })),
    ...taskNodes
  ];
  const relationships = state.data.relationships;
  const positions = layoutPositions();
  const entityMap = byIdMap();

  const childrenByParent = new Map();
  graphNodes.forEach(node => {
    if (!node.parent_id || !positions[node.parent_id] || !positions[node.id]) return;
    if (!childrenByParent.has(node.parent_id)) childrenByParent.set(node.parent_id, []);
    childrenByParent.get(node.parent_id).push(node.id);
  });
  childrenByParent.forEach((childIds, parentId) => {
    const parentPos = positions[parentId];
    childIds.sort((aId, bId) => {
      const a = positions[aId];
      const b = positions[bId];
      const aa = Math.atan2(a.y - parentPos.y, a.x - parentPos.x);
      const bb = Math.atan2(b.y - parentPos.y, b.x - parentPos.x);
      return aa - bb;
    });
  });
  graphNodes.forEach(node => {
    if (!node.parent_id || !positions[node.parent_id] || !positions[node.id]) return;
    const siblings = childrenByParent.get(node.parent_id) || [];
    const idx = siblings.indexOf(node.id);
    const lane = idx - (siblings.length - 1) / 2;
    const laneOffset = lane * 6;
    const curvature = node.kind === 'task' ? lane * 16 : lane * 22;
    const from = positions[node.parent_id];
    const to = positions[node.id];
    const treePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    treePath.setAttribute('d', curvedPath(from, to, laneOffset, curvature));
    const edgeClasses = ['edge', 'tree-edge'];
    if (node.kind === 'task') edgeClasses.push('task-edge');
    treePath.setAttribute('class', edgeClasses.join(' '));
    viewportEl.appendChild(treePath);
  });

  const relGroups = new Map();
  relationships.forEach(rel => {
    const a = rel.from_id < rel.to_id ? rel.from_id : rel.to_id;
    const b = rel.from_id < rel.to_id ? rel.to_id : rel.from_id;
    const key = `${a}||${b}`;
    if (!relGroups.has(key)) relGroups.set(key, []);
    relGroups.get(key).push(rel);
  });
  relGroups.forEach(group => {
    group.sort((a, b) => a.id.localeCompare(b.id));
  });

  relationships.forEach(rel => {
    const from = positions[rel.from_id];
    const to = positions[rel.to_id];
    if (!from || !to) return;
    const a = rel.from_id < rel.to_id ? rel.from_id : rel.to_id;
    const b = rel.from_id < rel.to_id ? rel.to_id : rel.from_id;
    const group = relGroups.get(`${a}||${b}`) || [rel];
    const groupIndex = group.findIndex(item => item.id === rel.id);
    const lane = groupIndex - (group.length - 1) / 2;
    const g = edgeGeometry(from, to);
    const directionSign = rel.from_id < rel.to_id ? 1 : -1;
    const baseCurvature = Math.max(52, Math.min(260, g.dist * 0.22));
    const laneOffset = lane * 11;
    const curvature = directionSign * baseCurvature + lane * 34;
    const curve = curvedPath(from, to, laneOffset, curvature);

    const selectRelationship = async () => {
      if (!(await confirmSaveBeforeLeavingNode())) return;
      state.selectedRelationshipId = rel.id;
      state.selectedEntityId = null;
      setRelationshipForm(rel);
      setActiveTab('relationship');
      renderLists();
      drawGraph();
    };

    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', curve);
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '16');
    hitPath.style.cursor = 'pointer';
    hitPath.addEventListener('mouseenter', evt => {
      showTooltip(evt, rel.id, rel.description);
    });
    hitPath.addEventListener('mousemove', evt => {
      tooltipEl.style.left = `${evt.clientX + 10}px`;
      tooltipEl.style.top = `${evt.clientY + 10}px`;
    });
    hitPath.addEventListener('mouseleave', hideTooltip);
    hitPath.addEventListener('click', selectRelationship);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', curve);
    path.setAttribute('class', `edge rel${state.selectedRelationshipId === rel.id ? ' selected' : ''}`);
    path.style.stroke = relColor(rel.type);
    path.addEventListener('click', selectRelationship);
    viewportEl.appendChild(path);
    viewportEl.appendChild(hitPath);
  });

  const labelConfigs = [];
  const nodeCircles = [];
  graphNodes.forEach(node => {
    const position = positions[node.id];
    if (!position) return;
    const radius = nodeRadius(node);
    nodeCircles.push({
      id: node.id,
      x: position.x,
      y: position.y,
      r: radius + 2
    });
    const fontSize = labelFontSize(node);
    const base = labelBaseConfig(node, position, radius);
    labelConfigs.push({
      id: node.id,
      text: shortenLabel(node.name),
      position,
      anchor: base.anchor,
      x: base.x,
      y: base.y,
      dy: 0,
      fontSize
    });
  });
  resolveLabelOverlaps(labelConfigs, nodeCircles);
  const labelsById = new Map(labelConfigs.map(item => [item.id, item]));
  const activeInProgressIds = inProgressEntityIds();

  graphNodes.forEach(node => {
    const position = positions[node.id];
    if (!position) return;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const classes = ['node'];
    if (node.kind === 'task') {
      classes.push('task-node');
      classes.push(`task-status-${normalizeTaskNodeStatus(node.status)}`);
      if (state.selectedEntityId === node.entity_id) classes.push('task-parent-selected');
      if (state.selectedTaskNodeId === node.id) classes.push('selected-task');
    } else {
      if (state.selectedEntityId === node.id) classes.push('selected');
      if (activeInProgressIds.has(node.id)) classes.push('in-progress');
    }
    group.setAttribute('class', classes.join(' '));
    group.setAttribute('transform', `translate(${position.x}, ${position.y})`);
    group.addEventListener('mouseenter', evt => {
      if (node.kind === 'task') {
        const status = statusLabel(normalizeTaskNodeStatus(node.status));
        const details = [`Status: ${status}`];
        if (node.priority) details.push(`Priority: ${node.priority}`);
        if (node.description) details.push(node.description);
        showTooltip(evt, node.name, details.join(' • '));
      } else {
        const desc = node.full_context?.description || node.current_state || '';
        showTooltip(evt, node.name, desc);
      }
    });
    group.addEventListener('mousemove', evt => {
      tooltipEl.style.left = `${evt.clientX + 10}px`;
      tooltipEl.style.top = `${evt.clientY + 10}px`;
    });
    group.addEventListener('mouseleave', hideTooltip);
    group.addEventListener('click', async () => {
      if (node.kind === 'task') {
        state.selectedTaskNodeId = node.id;
        state.selectedTaskMeta = { ...node };
        renderSelectedTaskDetails();
        drawGraph();
        await focusEntityById(node.entity_id);
        return;
      }
      if (state.selectedEntityId === node.id && state.selectedRelationshipId === null) return;
      if (!(await confirmSaveBeforeLeavingNode())) return;
      state.selectedEntityId = node.id;
      state.selectedRelationshipId = null;
      setEntityForm(node);
      setActiveTab('entity');
      renderLists();
      drawGraph();
    });

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const radius = nodeRadius(node);
    circle.setAttribute('r', String(radius));
    const fillColor = node.kind === 'task'
      ? taskStatusColor(normalizeStatus(node.status))
      : healthColor(node.health);
    circle.setAttribute('fill', fillColor);
    group.appendChild(circle);

    const labelCfg = labelsById.get(node.id);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('text-anchor', labelCfg?.anchor || 'start');
    label.setAttribute('x', String(labelCfg?.x || radius + 10));
    label.setAttribute('y', String((labelCfg?.y || 4) + (labelCfg?.dy || 0)));
    if (labelCfg?.fontSize) {
      label.style.fontSize = `${labelCfg.fontSize}px`;
    }
    label.textContent = labelCfg?.text || node.name;
    group.appendChild(label);
    viewportEl.appendChild(group);
  });

  const root = entityMap.get(state.selectedEntityId || '');
  if (!state.selectedEntityId && entities.length > 0) {
    const product = entities.find(item => item.type === 'product');
    if (product) {
      state.selectedEntityId = product.id;
      setEntityForm(product);
    } else if (root) {
      setEntityForm(root);
    }
  }
  if (fit) {
    autoFitGraph();
  } else {
    applyTransform();
  }
}

function renderContextSummary() {
  if (!contextSummaryEl) return;
  contextSummaryEl.innerHTML = '';

  if (state.userWorkspaceError) {
    const empty = document.createElement('p');
    empty.className = 'context-empty';
    empty.textContent = `User workspace unavailable (${state.userWorkspaceError}). Restart the Node server to load user context.`;
    contextSummaryEl.appendChild(empty);
    return;
  }

  const context = state.userWorkspace?.context;
  if (!context) {
    const empty = document.createElement('p');
    empty.className = 'context-empty';
    empty.textContent = 'No user context found.';
    contextSummaryEl.appendChild(empty);
    return;
  }

  const rows = [
    ['Context Date', context.contextDate || 'N/A'],
    ['Version', context.contextVersion || 'N/A'],
    ['Linked Task', context.linkedTaskId || 'N/A'],
    ['Linked Entity', context.linkedEntityId || 'N/A']
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement('p');
    row.className = 'context-row';
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    const text = document.createTextNode(value);
    row.appendChild(strong);
    row.appendChild(text);
    contextSummaryEl.appendChild(row);
  });
}

async function focusEntityById(entityId) {
  if (!entityId) return;
  const entity = state.data?.entities?.find(item => item.id === entityId);
  if (!entity) return;
  if (state.selectedEntityId === entity.id && state.selectedRelationshipId === null) return;
  if (!(await confirmSaveBeforeLeavingNode())) return;
  state.selectedEntityId = entity.id;
  state.selectedRelationshipId = null;
  setEntityForm(entity);
  setActiveTab('entity');
  renderLists();
  drawGraph();
}

function renderWorkspaceOverview() {
  renderContextSummary();
  renderSelectedTaskDetails();
  renderKanbanBoard();
}

function renderLists() {
  entityList.innerHTML = '';
  relationshipList.innerHTML = '';

  [...state.data.entities]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(entity => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = `${entity.name} (${entity.id})`;
      btn.classList.toggle('active', state.selectedEntityId === entity.id);
      btn.addEventListener('click', async () => {
        if (state.selectedEntityId === entity.id && state.selectedRelationshipId === null) return;
        if (!(await confirmSaveBeforeLeavingNode())) return;
        state.selectedEntityId = entity.id;
        state.selectedRelationshipId = null;
        setEntityForm(entity);
        setActiveTab('entity');
        renderLists();
        drawGraph();
      });
      li.appendChild(btn);
      entityList.appendChild(li);
    });

  [...state.data.relationships]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach(rel => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = `${rel.id}: ${rel.from_id} -> ${rel.to_id}`;
      btn.classList.toggle('active', state.selectedRelationshipId === rel.id);
      btn.addEventListener('click', async () => {
        if (!(await confirmSaveBeforeLeavingNode())) return;
        state.selectedRelationshipId = rel.id;
        state.selectedEntityId = null;
        setRelationshipForm(rel);
        setActiveTab('relationship');
        renderLists();
        drawGraph();
      });
      li.appendChild(btn);
      relationshipList.appendChild(li);
    });
}

async function loadData() {
  const mapData = await api('/api/data');
  let workspaceData = null;
  let workspaceError = null;
  try {
    workspaceData = await api('/api/user-workspace');
  } catch (error) {
    workspaceError = error?.message || 'endpoint unavailable';
  }
  state.data = mapData;
  state.userWorkspace = workspaceData;
  state.userWorkspaceError = workspaceError;
  syncSelectedTaskMeta();
  renderTaskNodeStatusOptions();
  if (viewModeSelectEl) {
    viewModeSelectEl.value = state.viewMode;
  }
  renderWorkspaceOverview();
  renderLists();
  drawGraph({ fit: true });
  applyViewMode();
  if (workspaceData && !workspaceError) {
    showToast('Loaded latest data and user workspace context');
  } else {
    showToast(`Loaded map data. User workspace unavailable (${workspaceError || 'unknown error'}). Restart server.`);
  }
}

function formToEntity() {
  const id = entityForm.elements.id.value.trim();
  return {
    id,
    type: entityForm.elements.type.value,
    name: entityForm.elements.name.value.trim(),
    health: entityForm.elements.health.value,
    parent_id: entityForm.elements.parent_id.value.trim() || null,
    category_id: entityForm.elements.category_id.value.trim() || null,
    product_id: entityForm.elements.product_id.value.trim() || null,
    current_state: entityForm.elements.current_state.value.trim(),
    target_state: entityForm.elements.target_state.value.trim(),
    full_context: {
      description: entityForm.elements.description.value.trim()
    }
  };
}

function isEntityFormDirty() {
  if (!state.entityFormBaseline) return false;
  return JSON.stringify(formToEntity()) !== state.entityFormBaseline;
}

async function saveEntityForm() {
  const payload = formToEntity();
  if (!payload.id) {
    throw new Error('Node id is required before saving.');
  }

  const exists = state.data.entities.some(item => item.id === payload.id);
  if (exists) {
    await api(`/api/entities/${encodeURIComponent(payload.id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    showToast(`Updated node ${payload.id}`);
  } else {
    await api('/api/entities', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast(`Created node ${payload.id}`);
  }
  state.selectedEntityId = payload.id;
  await loadData();
}

async function confirmSaveBeforeLeavingNode() {
  if (!isEntityFormDirty()) return true;
  const shouldSave = confirm('This node has unsaved changes. Save before leaving?');
  if (!shouldSave) return true;
  try {
    await saveEntityForm();
    return true;
  } catch (error) {
    showToast(error.message, true);
    return false;
  }
}

function formToRelationship() {
  return {
    id: relationshipForm.elements.id.value.trim(),
    from_id: relationshipForm.elements.from_id.value.trim(),
    to_id: relationshipForm.elements.to_id.value.trim(),
    type: relationshipForm.elements.type.value,
    description: relationshipForm.elements.description.value.trim(),
    full_context: {}
  };
}

entityForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await saveEntityForm();
  } catch (error) {
    showToast(error.message, true);
  }
});

relationshipForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const payload = formToRelationship();
    const exists = state.data.relationships.some(item => item.id === payload.id);
    if (exists) {
      await api(`/api/relationships/${encodeURIComponent(payload.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast(`Updated connection ${payload.id}`);
    } else {
      await api('/api/relationships', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast(`Created connection ${payload.id}`);
    }
    state.selectedRelationshipId = payload.id;
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
});

document.getElementById('newEntityBtn').addEventListener('click', async () => {
  if (!(await confirmSaveBeforeLeavingNode())) return;
  state.selectedEntityId = null;
  setEntityForm({
    type: 'subcategory',
    health: 'yellow'
  });
  setActiveTab('entity');
  renderLists();
});

document.getElementById('newRelationshipBtn').addEventListener('click', async () => {
  if (!(await confirmSaveBeforeLeavingNode())) return;
  state.selectedRelationshipId = null;
  setRelationshipForm({
    type: 'blocks'
  });
  setActiveTab('relationship');
  renderLists();
});

document.getElementById('deleteEntityBtn').addEventListener('click', async () => {
  const id = entityForm.elements.id.value.trim();
  if (!id) return;
  if (!confirm(`Delete entity ${id}? Relationships and tasks linked to it will also be deleted.`)) return;
  try {
    await api(`/api/entities/${encodeURIComponent(id)}`, { method: 'DELETE' });
    state.selectedEntityId = null;
    setEntityForm(null);
    await loadData();
    showToast(`Deleted node ${id}`);
  } catch (error) {
    showToast(error.message, true);
  }
});

document.getElementById('deleteRelationshipBtn').addEventListener('click', async () => {
  const id = relationshipForm.elements.id.value.trim();
  if (!id) return;
  if (!confirm(`Delete connection ${id}?`)) return;
  try {
    await api(`/api/relationships/${encodeURIComponent(id)}`, { method: 'DELETE' });
    state.selectedRelationshipId = null;
    setRelationshipForm(null);
    await loadData();
    showToast(`Deleted connection ${id}`);
  } catch (error) {
    showToast(error.message, true);
  }
});

document.getElementById('reloadBtn').addEventListener('click', async () => {
  try {
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
});

fitViewBtn.addEventListener('click', () => {
  autoFitGraph();
});

zoomInBtn.addEventListener('click', () => {
  const pointer = state.lastPointerClient;
  if (pointer) {
    zoomAtClientPoint(1.12, pointer.x, pointer.y);
    return;
  }
  zoomAtMapCenter(1.12);
});

zoomOutBtn.addEventListener('click', () => {
  const pointer = state.lastPointerClient;
  if (pointer) {
    zoomAtClientPoint(0.88, pointer.x, pointer.y);
    return;
  }
  zoomAtMapCenter(0.88);
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

layoutSelect.addEventListener('change', () => {
  state.layoutMode = layoutSelect.value;
  drawGraph({ fit: true });
  showToast(`Switched to ${state.layoutMode} layout`);
});

nodeSizeRange.addEventListener('input', () => {
  state.nodeScale = Number(nodeSizeRange.value);
  drawGraph();
});

if (viewModeSelectEl) {
  viewModeSelectEl.addEventListener('change', () => {
    state.viewMode = viewModeSelectEl.value === 'kanban' ? 'kanban' : 'mindmap';
    applyViewMode();
    if (state.viewMode === 'kanban') {
      renderKanbanBoard();
      showToast('Switched to Kanban view');
    } else {
      drawGraph({ fit: true });
      showToast('Switched to Mindmap view');
    }
  });
}

if (taskNodeStatusFilterEl) {
  taskNodeStatusFilterEl.addEventListener('change', () => {
    state.taskNodeStatusFilter = taskNodeStatusFilterEl.value || 'all';
    drawGraph();
    showToast(`Task nodes filtered: ${taskNodeFilterLabel(state.taskNodeStatusFilter)}`);
  });
}

function setSectionCollapsed(sectionEl, buttonEl, collapsed) {
  sectionEl.classList.toggle('collapsed', collapsed);
  buttonEl.textContent = collapsed ? 'Expand' : 'Collapse';
  buttonEl.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

toggleEntityListBtn.addEventListener('click', () => {
  const collapsed = !entityListSection.classList.contains('collapsed');
  setSectionCollapsed(entityListSection, toggleEntityListBtn, collapsed);
});

toggleRelationshipListBtn.addEventListener('click', () => {
  const collapsed = !relationshipListSection.classList.contains('collapsed');
  setSectionCollapsed(relationshipListSection, toggleRelationshipListBtn, collapsed);
});

// Ensure toggle button labels and aria state match initial markup classes.
setSectionCollapsed(
  entityListSection,
  toggleEntityListBtn,
  entityListSection.classList.contains('collapsed')
);
setSectionCollapsed(
  relationshipListSection,
  toggleRelationshipListBtn,
  relationshipListSection.classList.contains('collapsed')
);

function applyTransform() {
  const s = state.transform.scale;
  const tx = state.transform.x;
  const ty = state.transform.y;
  viewportEl.setAttribute('transform', `matrix(${s} 0 0 ${s} ${tx} ${ty})`);
}

function clientToSvgPoint(clientX, clientY) {
  const point = mapEl.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = mapEl.getScreenCTM();
  if (!ctm) return null;
  return point.matrixTransform(ctm.inverse());
}

function zoomAtClientPoint(factor, clientX, clientY) {
  const svgPoint = clientToSvgPoint(clientX, clientY);
  if (!svgPoint) return;

  const prevScale = state.transform.scale;
  const nextScale = Math.max(0.3, Math.min(2.8, prevScale * factor));
  if (nextScale === prevScale) return;

  const worldX = (svgPoint.x - state.transform.x) / prevScale;
  const worldY = (svgPoint.y - state.transform.y) / prevScale;
  state.transform.scale = nextScale;
  state.transform.x = svgPoint.x - worldX * nextScale;
  state.transform.y = svgPoint.y - worldY * nextScale;
  applyTransform();
}

function zoomAtMapCenter(factor) {
  const rect = mapEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  zoomAtClientPoint(factor, centerX, centerY);
}

let dragging = false;
let dragStart = null;
mapEl.addEventListener('mousedown', event => {
  event.preventDefault();
  state.lastPointerClient = { x: event.clientX, y: event.clientY };
  const startPoint = clientToSvgPoint(event.clientX, event.clientY);
  if (!startPoint) return;
  dragging = true;
  mapEl.classList.add('dragging');
  dragStart = {
    x: startPoint.x,
    y: startPoint.y,
    tx: state.transform.x,
    ty: state.transform.y
  };
});
window.addEventListener('mousemove', event => {
  state.lastPointerClient = { x: event.clientX, y: event.clientY };
  if (!dragging || !dragStart) return;
  event.preventDefault();
  const currentPoint = clientToSvgPoint(event.clientX, event.clientY);
  if (!currentPoint) return;
  state.transform.x = dragStart.tx + (currentPoint.x - dragStart.x);
  state.transform.y = dragStart.ty + (currentPoint.y - dragStart.y);
  applyTransform();
});
window.addEventListener('mouseup', () => {
  dragging = false;
  dragStart = null;
  mapEl.classList.remove('dragging');
});
mapEl.addEventListener('wheel', event => {
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.08 : 0.92;
  zoomAtClientPoint(factor, event.clientX, event.clientY);
}, { passive: false });

loadData().catch(error => {
  showToast(error.message, true);
});
