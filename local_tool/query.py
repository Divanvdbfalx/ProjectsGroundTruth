#!/usr/bin/env python
import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"


def load_json(name: str) -> List[Dict[str, Any]]:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def load_all() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    entities = load_json("entities.json")
    relationships = load_json("relationships.json")
    tasks = load_json("tasks.json")
    return entities, relationships, tasks


def index_entities(entities: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {e["id"]: e for e in entities}


def find_entity(entities: List[Dict[str, Any]], key: str) -> Dict[str, Any]:
    key_lower = key.lower()
    for e in entities:
        if e["id"] == key or e["name"].lower() == key_lower:
            return e
    raise SystemExit(f"Entity not found: {key}")


def cmd_summary(entities: List[Dict[str, Any]], relationships: List[Dict[str, Any]], tasks: List[Dict[str, Any]]) -> None:
    by_health = {"green": 0, "yellow": 0, "red": 0, "blue": 0}
    for e in entities:
        by_health[e["health"]] = by_health.get(e["health"], 0) + 1

    red_subs = [e for e in entities if e["type"] == "subcategory" and e["health"] == "red"]
    print("=== P-Zerø Local Ground Truth Summary ===")
    print(f"Entities: {len(entities)} | Relationships: {len(relationships)} | Tasks: {len(tasks)}")
    print(
        f"Health: green={by_health['green']} yellow={by_health['yellow']} "
        f"red={by_health['red']} blue={by_health['blue']}"
    )
    print("Red subcategories:")
    for e in sorted(red_subs, key=lambda x: x["name"]):
        print(f"- {e['id']}: {e['name']}")


def cmd_show(entity: Dict[str, Any], relationships: List[Dict[str, Any]], tasks: List[Dict[str, Any]], entity_index: Dict[str, Dict[str, Any]]) -> None:
    print(json.dumps(entity, indent=2, ensure_ascii=False))
    print("\nRelationships:")
    linked = [r for r in relationships if r["from_id"] == entity["id"] or r["to_id"] == entity["id"]]
    if not linked:
        print("- none")
    for r in linked:
        src = entity_index.get(r["from_id"], {"name": r["from_id"]})["name"]
        dst = entity_index.get(r["to_id"], {"name": r["to_id"]})["name"]
        print(f"- {r['type']}: {src} -> {dst} | {r['description']}")

    print("\nTasks:")
    linked_tasks = [t for t in tasks if t["entity_id"] == entity["id"]]
    if not linked_tasks:
        print("- none")
    for t in linked_tasks:
        print(f"- [{t['priority']}] {t['title']} ({t['status']})")


def cmd_blockers(entity: Dict[str, Any], relationships: List[Dict[str, Any]], entity_index: Dict[str, Dict[str, Any]]) -> None:
    blockers = [r for r in relationships if r["to_id"] == entity["id"] and r["type"] == "blocks"]
    if not blockers:
        print(f"No explicit blockers found for {entity['name']}.")
        return
    print(f"Blockers for {entity['name']}:")
    for r in blockers:
        src = entity_index.get(r["from_id"], {"name": r["from_id"]})["name"]
        print(f"- {src}: {r['description']}")


def cmd_priorities(entities: List[Dict[str, Any]], tasks: List[Dict[str, Any]], entity_index: Dict[str, Dict[str, Any]]) -> None:
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    red_ids = {e["id"] for e in entities if e["type"] == "subcategory" and e["health"] == "red"}
    selected = [t for t in tasks if t["entity_id"] in red_ids]
    selected.sort(key=lambda t: (order.get(t["priority"], 99), t["entity_id"], t["title"]))

    print("Priority tasks for RED subcategories:")
    for t in selected:
        entity_name = entity_index.get(t["entity_id"], {"name": t["entity_id"]})["name"]
        print(f"- [{t['priority']}] {entity_name}: {t['title']}")


def cmd_what_if(entity: Dict[str, Any], relationships: List[Dict[str, Any]], entity_index: Dict[str, Dict[str, Any]]) -> None:
    outgoing = [r for r in relationships if r["from_id"] == entity["id"]]
    if not outgoing:
        print(f"No explicit downstream effects found for {entity['name']}.")
        return
    print(f"If we fix {entity['name']}, likely downstream improvements:")
    for r in outgoing:
        dst = entity_index.get(r["to_id"], {"name": r["to_id"]})["name"]
        print(f"- ({r['type']}) {dst}: {r['description']}")


def cmd_bundle(entity: Dict[str, Any], relationships: List[Dict[str, Any]], tasks: List[Dict[str, Any]], entities: List[Dict[str, Any]]) -> None:
    related_rel = [r for r in relationships if r["from_id"] == entity["id"] or r["to_id"] == entity["id"]]
    related_ids = {r["from_id"] for r in related_rel} | {r["to_id"] for r in related_rel}
    related_ids.discard(entity["id"])
    related_entities = [e for e in entities if e["id"] in related_ids]
    related_tasks = [t for t in tasks if t["entity_id"] == entity["id"]]

    payload = {
        "entity": entity,
        "related_entities": related_entities,
        "relationships": related_rel,
        "tasks": related_tasks,
    }
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def _mermaid_quote(text: str) -> str:
    return '"' + text.replace('"', '\\"') + '"'


def _entity_label(entity: Dict[str, Any]) -> str:
    return f"{entity['name']} [{entity['health'].upper()}]"


def _task_label(task: Dict[str, Any]) -> str:
    return f"[{task['priority'].upper()}] {task['title']} ({task['status']})"


def cmd_mindmap(
    entities: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    output: str,
) -> None:
    entity_index = index_entities(entities)
    children: Dict[str, List[Dict[str, Any]]] = {}
    tasks_by_entity: Dict[str, List[Dict[str, Any]]] = {}
    by_priority = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for entity in entities:
        parent = entity.get("parent_id")
        if not parent:
            continue
        children.setdefault(parent, []).append(entity)

    for task in tasks:
        tasks_by_entity.setdefault(task["entity_id"], []).append(task)
        priority = task.get("priority", "")
        by_priority[priority] = by_priority.get(priority, 0) + 1

    for group in children.values():
        group.sort(key=lambda e: e["name"])
    for group in tasks_by_entity.values():
        group.sort(key=lambda t: (t["priority"], t["title"]))

    root_entities = [e for e in entities if e["type"] == "product"]
    if not root_entities:
        raise SystemExit("No product entity found to use as mindmap root.")
    root = root_entities[0]

    lines: List[str] = []
    lines.append("mindmap")
    lines.append(f"  root(({root['name']}))")

    for category in children.get(root["id"], []):
        lines.append(f"    {_mermaid_quote(_entity_label(category))}")
        for subcategory in children.get(category["id"], []):
            lines.append(f"      {_mermaid_quote(_entity_label(subcategory))}")
            sub_tasks = tasks_by_entity.get(subcategory["id"], [])
            if sub_tasks:
                lines.append(f"        {_mermaid_quote(f'Tasks ({len(sub_tasks)})')}")
                for task in sub_tasks:
                    lines.append(f"          {_mermaid_quote(_task_label(task))}")

    lines.append(f"    {_mermaid_quote(f'Cross-Entity Relationships ({len(relationships)})')}")
    for rel in relationships:
        src = entity_index.get(rel["from_id"], {"name": rel["from_id"]})["name"]
        dst = entity_index.get(rel["to_id"], {"name": rel["to_id"]})["name"]
        rel_text = f"{src} --{rel['type']}--> {dst}"
        lines.append(f"      {_mermaid_quote(rel_text)}")

    totals = (
        f"Totals: entities={len(entities)}, tasks={len(tasks)}, "
        f"critical={by_priority['critical']}, high={by_priority['high']}, "
        f"medium={by_priority['medium']}, low={by_priority['low']}"
    )
    lines.append(f"    {_mermaid_quote(totals)}")

    output_path = (ROOT / output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote Mermaid mindmap to {output_path}")


def cmd_mindmap_ui(
    entities: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    output: str,
) -> None:
    payload = {
        "entities": entities,
        "relationships": relationships,
        "tasks": tasks,
    }
    data_json = json.dumps(payload, ensure_ascii=False)
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>P-Zerø Data Mindmap</title>
  <style>
    :root {{
      --bg: #0b1320;
      --panel: #111d31;
      --text: #e8eef8;
      --muted: #9fb2cf;
      --line: #2a3a55;
      --green: #28c76f;
      --yellow: #ffb020;
      --red: #ea5455;
      --link-blocks: #f66;
      --link-enables: #4cc38a;
      --link-impacts: #6fb5ff;
      --link-depends: #ffb86b;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: radial-gradient(circle at 20% 10%, #13213a 0%, var(--bg) 52%);
      color: var(--text);
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      height: 100vh;
      overflow: hidden;
    }}
    .layout {{
      display: grid;
      grid-template-columns: 1fr 340px;
      height: 100vh;
    }}
    .canvas-wrap {{
      position: relative;
      border-right: 1px solid var(--line);
    }}
    .controls {{
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 20;
      display: flex;
      gap: 8px;
      align-items: center;
      background: rgba(10, 18, 30, 0.84);
      border: 1px solid #2d4263;
      border-radius: 10px;
      padding: 8px 10px;
      color: var(--muted);
      font-size: 12px;
    }}
    .controls button {{
      border: 1px solid #36537c;
      background: #1a2b45;
      color: var(--text);
      border-radius: 8px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
    }}
    .controls button:hover {{
      background: #223a5f;
    }}
    svg {{
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
    }}
    svg.dragging {{
      cursor: grabbing;
    }}
    .node {{
      cursor: pointer;
      transition: opacity 120ms ease;
    }}
    .node circle {{
      stroke: #0f1726;
      stroke-width: 1.2;
    }}
    .node.task circle {{
      stroke-width: 0.9;
    }}
    .node text {{
      fill: var(--text);
      font-size: 11px;
      paint-order: stroke;
      stroke: #0a1321;
      stroke-width: 2;
      stroke-linejoin: round;
      pointer-events: none;
    }}
    .edge {{
      stroke: #3b5b83;
      stroke-width: 1.2;
      fill: none;
      opacity: 0.5;
    }}
    .edge.rel {{
      stroke-width: 1.8;
      stroke-dasharray: 5 4;
      opacity: 0.9;
      cursor: pointer;
    }}
    .side {{
      background: linear-gradient(180deg, rgba(17,29,49,0.96), rgba(9,16,28,0.96));
      padding: 14px;
      overflow: auto;
    }}
    .side h2 {{
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
    }}
    .meta {{
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 10px;
    }}
    .section-title {{
      font-size: 11px;
      letter-spacing: 0.05em;
      color: #87a0c7;
      text-transform: uppercase;
      margin-top: 12px;
      margin-bottom: 4px;
    }}
    .text {{
      color: var(--text);
      font-size: 13px;
      line-height: 1.35;
      margin: 0;
    }}
    .chip {{
      display: inline-block;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      margin-right: 6px;
      margin-bottom: 6px;
      border: 1px solid transparent;
    }}
    .chip.green {{ color: #0d2b18; background: #6be49b; border-color: #59d88c; }}
    .chip.yellow {{ color: #3f2a02; background: #ffd27a; border-color: #f5c363; }}
    .chip.red {{ color: #3b0d0f; background: #ff9d9d; border-color: #f48b8b; }}
    .tooltip {{
      position: absolute;
      pointer-events: none;
      z-index: 50;
      max-width: 320px;
      background: rgba(12, 21, 36, 0.95);
      border: 1px solid #355177;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 12px;
      color: var(--text);
      display: none;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    }}
  </style>
</head>
<body>
  <div class="layout">
    <div class="canvas-wrap">
      <div class="controls">
        <button id="resetView">Reset View</button>
        <span>Drag to pan, scroll to zoom, hover nodes for descriptions</span>
      </div>
      <div class="tooltip" id="tooltip"></div>
      <svg id="map" viewBox="-1300 -900 2600 1800" aria-label="P-Zerø mindmap">
        <g id="viewport"></g>
      </svg>
    </div>
    <aside class="side" id="detail"></aside>
  </div>

  <script>
    const DATA = {data_json};
    const svg = document.getElementById("map");
    const viewport = document.getElementById("viewport");
    const detail = document.getElementById("detail");
    const tooltip = document.getElementById("tooltip");
    const resetBtn = document.getElementById("resetView");

    const healthColor = {{ green: "#28c76f", yellow: "#ffb020", red: "#ea5455" }};
    const relColor = {{
      blocks: "var(--link-blocks)",
      enables: "var(--link-enables)",
      impacts: "var(--link-impacts)",
      depends_on: "var(--link-depends)"
    }};

    const entitiesById = Object.fromEntries(DATA.entities.map(e => [e.id, e]));
    const tasksByEntity = DATA.tasks.reduce((acc, t) => {{
      if (!acc[t.entity_id]) acc[t.entity_id] = [];
      acc[t.entity_id].push(t);
      return acc;
    }}, {{}});
    Object.values(tasksByEntity).forEach(arr => arr.sort((a, b) => (a.priority + a.title).localeCompare(b.priority + b.title)));

    const root = DATA.entities.find(e => e.type === "product");
    const categories = DATA.entities.filter(e => e.parent_id === root.id).sort((a, b) => a.name.localeCompare(b.name));
    const subcatsByCategory = {{}};
    categories.forEach(cat => {{
      subcatsByCategory[cat.id] = DATA.entities.filter(e => e.parent_id === cat.id).sort((a, b) => a.name.localeCompare(b.name));
    }});

    function mkEl(name, attrs = {{}}, parent = null) {{
      const el = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      if (parent) parent.appendChild(el);
      return el;
    }}

    function polar(r, deg) {{
      const rad = deg * Math.PI / 180;
      return {{ x: Math.cos(rad) * r, y: Math.sin(rad) * r }};
    }}

    const nodes = [];
    const treeEdges = [];
    const positions = {{}};
    const nodeMeta = {{}};
    const interaction = {{ x: 0, y: 0, scale: 1 }};

    function addNode(meta, x, y, r) {{
      positions[meta.id] = {{ x, y }};
      nodeMeta[meta.id] = meta;
      nodes.push({{ ...meta, x, y, r }});
    }}

    addNode({{ id: root.id, kind: "entity", entityType: root.type, name: root.name, health: root.health, description: root.full_context?.description || "", current_state: root.current_state || "", target_state: root.target_state || "", raw: root }}, 0, 0, 24);

    const catRadius = 360;
    const catStep = 360 / Math.max(1, categories.length);
    categories.forEach((cat, idx) => {{
      const catAngle = -90 + idx * catStep;
      const pCat = polar(catRadius, catAngle);
      addNode({{ id: cat.id, kind: "entity", entityType: cat.type, name: cat.name, health: cat.health, description: cat.full_context?.description || "", current_state: cat.current_state || "", target_state: cat.target_state || "", raw: cat }}, pCat.x, pCat.y, 16);
      treeEdges.push({{ from: root.id, to: cat.id }});

      const subs = subcatsByCategory[cat.id] || [];
      const arc = Math.min(80, 18 * Math.max(2, subs.length));
      const subRadius = 290;
      subs.forEach((sub, sIdx) => {{
        const subAngle = subs.length === 1 ? catAngle : catAngle - arc / 2 + (arc * sIdx / (subs.length - 1));
        const pSub = {{ x: pCat.x + polar(subRadius, subAngle).x, y: pCat.y + polar(subRadius, subAngle).y }};
        addNode({{ id: sub.id, kind: "entity", entityType: sub.type, name: sub.name, health: sub.health, description: sub.full_context?.description || "", current_state: sub.current_state || "", target_state: sub.target_state || "", raw: sub }}, pSub.x, pSub.y, 11);
        treeEdges.push({{ from: cat.id, to: sub.id }});

        const tList = tasksByEntity[sub.id] || [];
        const tArc = Math.min(70, 22 * Math.max(2, tList.length));
        const tRadius = 160;
        tList.forEach((task, tIdx) => {{
          const tAngle = tList.length === 1 ? subAngle : subAngle - tArc / 2 + (tArc * tIdx / (tList.length - 1));
          const pTask = {{ x: pSub.x + polar(tRadius, tAngle).x, y: pSub.y + polar(tRadius, tAngle).y }};
          const taskId = "task:" + task.id;
          addNode({{
            id: taskId,
            kind: "task",
            entityType: "task",
            name: task.title,
            health: null,
            priority: task.priority,
            status: task.status,
            description: task.description || "",
            current_state: "",
            target_state: "",
            raw: task
          }}, pTask.x, pTask.y, 7);
          treeEdges.push({{ from: sub.id, to: taskId }});
        }});
      }});
    }});

    function relPath(a, b) {{
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const curve = 0.22;
      const cx = mx - dy * curve;
      const cy = my + dx * curve;
      return `M ${{a.x}} ${{a.y}} Q ${{cx}} ${{cy}} ${{b.x}} ${{b.y}}`;
    }}

    function colorForNode(n) {{
      if (n.kind === "task") return "#6fa8ff";
      return healthColor[n.health] || "#adbcd6";
    }}

    function el(tag, className, text) {{
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    }}

    function formatTitle(meta) {{
      if (meta.kind === "task") return meta.name;
      return meta.name;
    }}

    function clearDetails() {{
      detail.innerHTML = "";
    }}

    function updateDetails(meta, relInfo = null) {{
      clearDetails();
      if (relInfo) {{
        detail.appendChild(el("h2", "", "Relationship"));
        const m = el("div", "meta", `${{relInfo.type}}`);
        detail.appendChild(m);
        detail.appendChild(el("div", "section-title", "From"));
        detail.appendChild(el("p", "text", relInfo.fromName));
        detail.appendChild(el("div", "section-title", "To"));
        detail.appendChild(el("p", "text", relInfo.toName));
        detail.appendChild(el("div", "section-title", "Description"));
        detail.appendChild(el("p", "text", relInfo.description || "No description."));
        return;
      }}

      detail.appendChild(el("h2", "", formatTitle(meta)));
      const metaLine = [];
      if (meta.entityType) metaLine.push(meta.entityType);
      if (meta.kind === "task") {{
        metaLine.push(meta.priority || "n/a");
        metaLine.push(meta.status || "n/a");
      }}
      detail.appendChild(el("div", "meta", metaLine.join(" | ")));

      if (meta.health) {{
        const chip = el("span", "chip " + meta.health, meta.health.toUpperCase());
        detail.appendChild(chip);
      }}
      if (meta.description) {{
        detail.appendChild(el("div", "section-title", "Description"));
        detail.appendChild(el("p", "text", meta.description));
      }}
      if (meta.current_state) {{
        detail.appendChild(el("div", "section-title", "Current State"));
        detail.appendChild(el("p", "text", meta.current_state));
      }}
      if (meta.target_state) {{
        detail.appendChild(el("div", "section-title", "Target State"));
        detail.appendChild(el("p", "text", meta.target_state));
      }}
      const ctx = meta.raw?.full_context;
      if (ctx) {{
        detail.appendChild(el("div", "section-title", "Context"));
        Object.entries(ctx).forEach(([k, v]) => {{
          if (typeof v !== "string" || !v) return;
          detail.appendChild(el("p", "text", `${{k}}: ${{v}}`));
        }});
      }}
    }}

    function showTooltip(evt, html) {{
      tooltip.innerHTML = html;
      tooltip.style.display = "block";
      tooltip.style.left = `${{evt.clientX + 12}}px`;
      tooltip.style.top = `${{evt.clientY + 12}}px`;
    }}

    function hideTooltip() {{
      tooltip.style.display = "none";
    }}

    function render() {{
      viewport.innerHTML = "";
      treeEdges.forEach(edge => {{
        const a = positions[edge.from];
        const b = positions[edge.to];
        mkEl("path", {{
          d: `M ${{a.x}} ${{a.y}} L ${{b.x}} ${{b.y}}`,
          class: "edge"
        }}, viewport);
      }});

      DATA.relationships.forEach(rel => {{
        const a = positions[rel.from_id];
        const b = positions[rel.to_id];
        if (!a || !b) return;
        const line = mkEl("path", {{
          d: relPath(a, b),
          class: "edge rel",
          stroke: relColor[rel.type] || "#c0c8d5"
        }}, viewport);
        line.addEventListener("mousemove", evt => {{
          const fromName = entitiesById[rel.from_id]?.name || rel.from_id;
          const toName = entitiesById[rel.to_id]?.name || rel.to_id;
          showTooltip(evt, `<strong>${{rel.type}}</strong><br/>${{fromName}} → ${{toName}}`);
        }});
        line.addEventListener("mouseleave", hideTooltip);
        line.addEventListener("mouseenter", () => {{
          updateDetails(null, {{
            type: rel.type,
            fromName: entitiesById[rel.from_id]?.name || rel.from_id,
            toName: entitiesById[rel.to_id]?.name || rel.to_id,
            description: rel.description || ""
          }});
        }});
      }});

      nodes.forEach(n => {{
        const g = mkEl("g", {{
          class: `node ${{n.kind}}`,
          transform: `translate(${{n.x}}, ${{n.y}})`
        }}, viewport);

        mkEl("circle", {{
          r: n.r,
          fill: colorForNode(n)
        }}, g);

        const label = n.kind === "task"
          ? `[${{(n.priority || "").toUpperCase()}}] ${{n.name}}`
          : n.name;
        mkEl("text", {{
          x: n.r + 5,
          y: 4
        }}, g).textContent = label.length > 56 ? label.slice(0, 56) + "…" : label;

        g.addEventListener("mouseenter", evt => {{
          const summary = n.description || n.current_state || "No description.";
          showTooltip(evt, `<strong>${{n.name}}</strong><br/>${{summary}}`);
          updateDetails(n);
        }});
        g.addEventListener("mousemove", evt => {{
          tooltip.style.left = `${{evt.clientX + 12}}px`;
          tooltip.style.top = `${{evt.clientY + 12}}px`;
        }});
        g.addEventListener("mouseleave", hideTooltip);
      }});

      updateDetails(nodeMeta[root.id]);
      applyTransform();
    }}

    function applyTransform() {{
      viewport.setAttribute("transform", `translate(${{interaction.x}}, ${{interaction.y}}) scale(${{interaction.scale}})`);
    }}

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;

    svg.addEventListener("mousedown", evt => {{
      dragging = true;
      svg.classList.add("dragging");
      startX = evt.clientX;
      startY = evt.clientY;
      baseX = interaction.x;
      baseY = interaction.y;
    }});
    window.addEventListener("mouseup", () => {{
      dragging = false;
      svg.classList.remove("dragging");
    }});
    window.addEventListener("mousemove", evt => {{
      if (!dragging) return;
      interaction.x = baseX + (evt.clientX - startX);
      interaction.y = baseY + (evt.clientY - startY);
      applyTransform();
    }});
    svg.addEventListener("wheel", evt => {{
      evt.preventDefault();
      const factor = evt.deltaY < 0 ? 1.08 : 0.92;
      interaction.scale = Math.max(0.35, Math.min(2.4, interaction.scale * factor));
      applyTransform();
    }}, {{ passive: false }});

    resetBtn.addEventListener("click", () => {{
      interaction.x = 0;
      interaction.y = 0;
      interaction.scale = 1;
      applyTransform();
    }});

    render();
  </script>
</body>
</html>
"""
    output_path = (ROOT / output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html, encoding="utf-8")
    print(f"Wrote interactive mindmap to {output_path}")


def main() -> None:
    entities, relationships, tasks = load_all()
    entity_index = index_entities(entities)

    parser = argparse.ArgumentParser(description="P-Zerø local product health query tool")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("summary")

    show_p = sub.add_parser("show")
    show_p.add_argument("entity")

    blockers_p = sub.add_parser("blockers")
    blockers_p.add_argument("entity")

    sub.add_parser("priorities")

    what_if_p = sub.add_parser("what-if")
    what_if_p.add_argument("entity")

    bundle_p = sub.add_parser("bundle")
    bundle_p.add_argument("entity")

    mindmap_p = sub.add_parser("mindmap")
    mindmap_p.add_argument(
        "--output",
        default="artifacts/data_mindmap.mmd",
        help="Output Mermaid file path relative to repo root.",
    )

    mindmap_ui_p = sub.add_parser("mindmap-ui")
    mindmap_ui_p.add_argument(
        "--output",
        default="artifacts/data_mindmap_interactive.html",
        help="Output interactive HTML path relative to repo root.",
    )

    args = parser.parse_args()

    if args.cmd == "summary":
        cmd_summary(entities, relationships, tasks)
        return
    if args.cmd == "priorities":
        cmd_priorities(entities, tasks, entity_index)
        return
    if args.cmd == "mindmap":
        cmd_mindmap(entities, relationships, tasks, args.output)
        return
    if args.cmd == "mindmap-ui":
        cmd_mindmap_ui(entities, relationships, tasks, args.output)
        return

    entity = find_entity(entities, args.entity)

    if args.cmd == "show":
        cmd_show(entity, relationships, tasks, entity_index)
    elif args.cmd == "blockers":
        cmd_blockers(entity, relationships, entity_index)
    elif args.cmd == "what-if":
        cmd_what_if(entity, relationships, entity_index)
    elif args.cmd == "bundle":
        cmd_bundle(entity, relationships, tasks, entities)


if __name__ == "__main__":
    main()
