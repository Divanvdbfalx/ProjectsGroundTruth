const state = {
  data: null,
  userWorkspace: null,
  userWorkspaceError: null,
  selectedEntityId: null,
  selectedRelationshipId: null,
  entityFormBaseline: null,
  transform: { x: 0, y: 0, scale: 1 },
  layoutMode: 'radial',
  nodeScale: 2.2,
  lastPointerClient: null
};

const mapEl = document.getElementById('map');
const viewportEl = document.getElementById('viewport');
const tooltipEl = document.getElementById('tooltip');
const toastEl = document.getElementById('toast');

const entityForm = document.getElementById('entityForm');
const relationshipForm = document.getElementById('relationshipForm');
const entityList = document.getElementById('entityList');
const relationshipList = document.getElementById('relationshipList');
const entityListSection = document.getElementById('entityListSection');
const relationshipListSection = document.getElementById('relationshipListSection');
const toggleEntityListBtn = document.getElementById('toggleEntityListBtn');
const toggleRelationshipListBtn = document.getElementById('toggleRelationshipListBtn');
const contextSummaryEl = document.getElementById('contextSummary');
const userTaskFilterEl = document.getElementById('userTaskFilter');
const userTaskListEl = document.getElementById('userTaskList');

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
  if (status === 'in_progress') return 'In Progress';
  if (status === 'todo') return 'Todo';
  if (status === 'blocked') return 'Blocked';
  if (status === 'done') return 'Done';
  return status || 'Unknown';
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
  const entityIds = new Set(entities.map(entity => entity.id));
  const inProgressIds = new Set();

  (state.data?.tasks || []).forEach(task => {
    if (normalizeStatus(task.status) !== 'in_progress') return;
    if (entityIds.has(task.entity_id)) {
      inProgressIds.add(task.entity_id);
    }
  });

  (state.userWorkspace?.tasks || []).forEach(task => {
    if (normalizeStatus(task.status) !== 'in_progress') return;
    const resolved = resolveEntityIdFromLinkedEntity(task.linkedEntity, entities);
    if (resolved) inProgressIds.add(resolved);
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
      positions[sub.id] = {
        x: catPos.x + offset.x,
        y: catPos.y + offset.y
      };
    });
  });

  resolveNodeCollisions(positions, entities);
  return positions;
}

function layoutHorizontalPositions() {
  const positions = {};
  const entities = state.data.entities;
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
      positions[sub.id] = { x: 520, y: subStartY + subIndex * subGap };
    });
  });

  resolveNodeCollisions(positions, entities);
  return positions;
}

function layoutVerticalPositions() {
  const positions = {};
  const entities = state.data.entities;
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
      positions[sub.id] = { x: subStartX + subIndex * subGapX, y: 620 };
    });
  });

  resolveNodeCollisions(positions, entities);
  return positions;
}

function layoutOptimizedPositions() {
  const positions = {};
  const entities = state.data.entities;
  const relationships = state.data.relationships || [];
  const byId = new Map(entities.map(item => [item.id, item]));
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
  entities.forEach(entity => {
    const d = depthOf(entity.id);
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d).push(entity.id);
  });
  const depths = [...layers.keys()].sort((a, b) => a - b);

  // Build tree children for tidy-tree style initial placement.
  const children = new Map();
  entities.forEach(entity => children.set(entity.id, []));
  entities.forEach(entity => {
    if (!entity.parent_id || !byId.has(entity.parent_id)) return;
    children.get(entity.parent_id).push(entity.id);
  });
  children.forEach((list, id) => {
    list.sort((a, b) => byId.get(a).name.localeCompare(byId.get(b).name));
  });

  const minGap = 150;
  const layerGapY = 560;
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

  entities.forEach(entity => {
    if (typeof x[entity.id] !== 'number') {
      x[entity.id] = leafCursor;
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
    const requiredGap = depth === 1 ? minGap * 1.4 : minGap;
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

      const requiredGap = depth === 1 ? minGap * 1.4 : minGap;
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

  resolveNodeCollisions(positions, entities);
  return positions;
}

function nodeRadius(entity) {
  const base = entity.type === 'product' ? 28 : entity.type === 'category' ? 20 : 14;
  return Math.round(base * state.nodeScale);
}

function baseNodeRadius(entity) {
  return entity.type === 'product' ? 28 : entity.type === 'category' ? 20 : 14;
}

function labelFontSize(entity) {
  const base = entity.type === 'product' ? 14 : entity.type === 'category' ? 13 : 12;
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
  const relationships = state.data.relationships;
  const positions = layoutPositions();
  const entityMap = byIdMap();

  const childrenByParent = new Map();
  entities.forEach(entity => {
    if (!entity.parent_id || !positions[entity.parent_id] || !positions[entity.id]) return;
    if (!childrenByParent.has(entity.parent_id)) childrenByParent.set(entity.parent_id, []);
    childrenByParent.get(entity.parent_id).push(entity.id);
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
  entities.forEach(entity => {
    if (!entity.parent_id || !positions[entity.parent_id] || !positions[entity.id]) return;
    const siblings = childrenByParent.get(entity.parent_id) || [];
    const idx = siblings.indexOf(entity.id);
    const lane = idx - (siblings.length - 1) / 2;
    const laneOffset = lane * 6;
    const curvature = lane * 22;
    const from = positions[entity.parent_id];
    const to = positions[entity.id];
    const treePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    treePath.setAttribute('d', curvedPath(from, to, laneOffset, curvature));
    treePath.setAttribute('class', 'edge');
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
  entities.forEach(entity => {
    const position = positions[entity.id];
    if (!position) return;
    const radius = nodeRadius(entity);
    nodeCircles.push({
      id: entity.id,
      x: position.x,
      y: position.y,
      r: radius + 2
    });
    const fontSize = labelFontSize(entity);
    const base = labelBaseConfig(entity, position, radius);
    labelConfigs.push({
      id: entity.id,
      text: shortenLabel(entity.name),
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

  entities.forEach(entity => {
    const position = positions[entity.id];
    if (!position) return;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const classes = ['node'];
    if (state.selectedEntityId === entity.id) classes.push('selected');
    if (activeInProgressIds.has(entity.id)) classes.push('in-progress');
    group.setAttribute('class', classes.join(' '));
    group.setAttribute('transform', `translate(${position.x}, ${position.y})`);
    group.addEventListener('mouseenter', evt => {
      const desc = entity.full_context?.description || entity.current_state || '';
      showTooltip(evt, entity.name, desc);
    });
    group.addEventListener('mousemove', evt => {
      tooltipEl.style.left = `${evt.clientX + 10}px`;
      tooltipEl.style.top = `${evt.clientY + 10}px`;
    });
    group.addEventListener('mouseleave', hideTooltip);
    group.addEventListener('click', async () => {
      if (state.selectedEntityId === entity.id && state.selectedRelationshipId === null) return;
      if (!(await confirmSaveBeforeLeavingNode())) return;
      state.selectedEntityId = entity.id;
      state.selectedRelationshipId = null;
      setEntityForm(entity);
      setActiveTab('entity');
      renderLists();
      drawGraph();
    });

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const radius = nodeRadius(entity);
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', healthColor(entity.health));
    group.appendChild(circle);

    const labelCfg = labelsById.get(entity.id);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('text-anchor', labelCfg?.anchor || 'start');
    label.setAttribute('x', String(labelCfg?.x || radius + 10));
    label.setAttribute('y', String((labelCfg?.y || 4) + (labelCfg?.dy || 0)));
    if (labelCfg?.fontSize) {
      label.style.fontSize = `${labelCfg.fontSize}px`;
    }
    label.textContent = labelCfg?.text || entity.name;
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

function renderUserTaskList() {
  if (!userTaskListEl) return;
  userTaskListEl.innerHTML = '';

  if (state.userWorkspaceError) {
    const empty = document.createElement('li');
    empty.className = 'context-empty';
    empty.textContent = 'User tasks unavailable. Restart server and reload.';
    userTaskListEl.appendChild(empty);
    return;
  }

  const allTasks = state.userWorkspace?.tasks || [];
  const selectedFilter = userTaskFilterEl?.value || 'all';
  const tasks = selectedFilter === 'all'
    ? allTasks
    : allTasks.filter(task => normalizeStatus(task.status) === selectedFilter);

  if (!tasks.length) {
    const empty = document.createElement('li');
    empty.className = 'context-empty';
    empty.textContent = 'No tasks for this filter.';
    userTaskListEl.appendChild(empty);
    return;
  }

  tasks.forEach(task => {
    const status = normalizeStatus(task.status);
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'user-task-btn';
    const description = task.description || task.groundTruthTask || 'No description';
    button.title = description;

    const resolvedEntityId = resolveEntityIdFromLinkedEntity(task.linkedEntity, state.data.entities);
    if (resolvedEntityId) {
      button.addEventListener('click', () => focusEntityById(resolvedEntityId));
    } else {
      button.disabled = true;
    }

    const title = document.createElement('span');
    title.className = 'user-task-title';
    title.textContent = task.title || task.id || 'Untitled task';

    const pill = document.createElement('span');
    pill.className = `task-status-pill ${status}`;
    pill.textContent = statusLabel(status);

    button.appendChild(title);
    button.appendChild(pill);
    li.appendChild(button);
    userTaskListEl.appendChild(li);
  });
}

function renderWorkspaceOverview() {
  renderContextSummary();
  renderUserTaskList();
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
  renderWorkspaceOverview();
  renderLists();
  drawGraph({ fit: true });
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

document.getElementById('fitViewBtn').addEventListener('click', () => {
  autoFitGraph();
});

document.getElementById('zoomInBtn').addEventListener('click', () => {
  const pointer = state.lastPointerClient;
  if (pointer) {
    zoomAtClientPoint(1.12, pointer.x, pointer.y);
    return;
  }
  zoomAtMapCenter(1.12);
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
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

const layoutSelect = document.getElementById('layoutSelect');
layoutSelect.addEventListener('change', () => {
  state.layoutMode = layoutSelect.value;
  drawGraph({ fit: true });
  showToast(`Switched to ${state.layoutMode} layout`);
});

const nodeSizeRange = document.getElementById('nodeSizeRange');
nodeSizeRange.addEventListener('input', () => {
  state.nodeScale = Number(nodeSizeRange.value);
  drawGraph();
});

if (userTaskFilterEl) {
  userTaskFilterEl.addEventListener('change', () => {
    renderUserTaskList();
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
