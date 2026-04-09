#!/usr/bin/env python
import argparse
import csv
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
KB_RAW_SOURCES_DIR = ROOT / "knowledge_base" / "raw" / "sources"
DATA_FILE_ALIASES = {
    "entities.json": "src_data_entities.json",
    "relationships.json": "src_data_relationships.json",
    "tasks.json": "src_tasks.json",
}


def resolve_data_path(name: str) -> Path:
    candidates: List[Path] = []

    legacy_path = DATA_DIR / name
    candidates.append(legacy_path)
    if legacy_path.exists():
        return legacy_path

    alias = DATA_FILE_ALIASES.get(name)
    if alias:
        canonical_path = KB_RAW_SOURCES_DIR / alias
        candidates.append(canonical_path)
        if canonical_path.exists():
            return canonical_path

    joined = ", ".join(str(path) for path in candidates)
    raise FileNotFoundError(f"Could not find required data file '{name}'. Checked: {joined}")


def load_json(name: str) -> List[Dict[str, Any]]:
    payload = json.loads(resolve_data_path(name).read_text(encoding="utf-8"))
    if name == "tasks.json" and isinstance(payload, dict):
        tasks = payload.get("tasks")
        if isinstance(tasks, list):
            product_tasks = [
                task
                for task in tasks
                if isinstance(task, dict)
                and isinstance(task.get("id"), str)
                and isinstance(task.get("entity_id"), str)
                and isinstance(task.get("title"), str)
            ]
            return product_tasks
    if isinstance(payload, list):
        return payload
    raise ValueError(f"Unexpected JSON shape for '{name}'. Expected a list.")


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


def _write_markdown(path: Path, lines: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _wiki_link(path_without_extension: str, label: str) -> str:
    return f"[[{path_without_extension}|{label}]]"


def _as_text(value: Any, default: str = "None") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _yaml_value(value: Any) -> str:
    if value is None:
        return "null"
    text = str(value).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{text}"'


def _render_frontmatter(fields: Dict[str, Any]) -> List[str]:
    lines = ["---"]
    for key, value in fields.items():
        lines.append(f"{key}: {_yaml_value(value)}")
    lines.append("---")
    return lines


def _append_context(lines: List[str], context: Any) -> None:
    if not isinstance(context, dict) or not context:
        lines.append("None")
        return

    for key in sorted(context.keys()):
        value = context[key]
        lines.append(f"### {key}")
        lines.append(_as_text(value))
        lines.append("")

    if lines[-1] == "":
        lines.pop()


def cmd_export_md(
    entities: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    output: str,
) -> None:
    out_dir = (ROOT / output).resolve()
    entities_dir = out_dir / "entities"
    tasks_dir = out_dir / "tasks"
    rels_dir = out_dir / "relationships"
    entities_dir.mkdir(parents=True, exist_ok=True)
    tasks_dir.mkdir(parents=True, exist_ok=True)
    rels_dir.mkdir(parents=True, exist_ok=True)

    entity_index = index_entities(entities)
    tasks_by_entity: Dict[str, List[Dict[str, Any]]] = {}
    outgoing: Dict[str, List[Dict[str, Any]]] = {}
    incoming: Dict[str, List[Dict[str, Any]]] = {}
    children: Dict[str, List[Dict[str, Any]]] = {}
    type_order = {"product": 0, "category": 1, "subcategory": 2}

    for task in tasks:
        tasks_by_entity.setdefault(task["entity_id"], []).append(task)
    for rel in relationships:
        outgoing.setdefault(rel["from_id"], []).append(rel)
        incoming.setdefault(rel["to_id"], []).append(rel)
    for entity in entities:
        parent = entity.get("parent_id")
        if parent:
            children.setdefault(parent, []).append(entity)

    for group in tasks_by_entity.values():
        group.sort(key=lambda item: (item.get("priority", ""), item.get("title", "")))
    for group in outgoing.values():
        group.sort(key=lambda item: item.get("id", ""))
    for group in incoming.values():
        group.sort(key=lambda item: item.get("id", ""))
    for group in children.values():
        group.sort(key=lambda item: item.get("name", ""))

    sorted_entities = sorted(
        entities,
        key=lambda item: (type_order.get(item.get("type", ""), 99), item.get("name", "")),
    )
    sorted_tasks = sorted(tasks, key=lambda item: (item.get("priority", ""), item.get("title", "")))
    sorted_relationships = sorted(relationships, key=lambda item: item.get("id", ""))

    for entity in sorted_entities:
        entity_id = entity["id"]
        entity_name = entity["name"]
        parent_id = entity.get("parent_id")
        parent = entity_index.get(parent_id) if parent_id else None
        entity_tasks = tasks_by_entity.get(entity_id, [])
        outgoing_rels = outgoing.get(entity_id, [])
        incoming_rels = incoming.get(entity_id, [])
        child_entities = children.get(entity_id, [])

        lines: List[str] = []
        lines.extend(
            _render_frontmatter(
                {
                    "id": entity_id,
                    "record_type": "entity",
                    "entity_type": entity.get("type", ""),
                    "health": entity.get("health", ""),
                    "product_id": entity.get("product_id"),
                    "category_id": entity.get("category_id"),
                    "parent_id": entity.get("parent_id"),
                    "source_json": "knowledge_base/raw/sources/src_data_entities.json",
                }
            )
        )
        lines.append(f"# {entity_name}")
        lines.append("")
        lines.append(f"- ID: `{entity_id}`")
        lines.append(f"- Type: `{_as_text(entity.get('type'))}`")
        lines.append(f"- Health: `{_as_text(entity.get('health'))}`")
        lines.append("")
        lines.append("## Current State")
        lines.append(_as_text(entity.get("current_state")))
        lines.append("")
        lines.append("## Target State")
        lines.append(_as_text(entity.get("target_state")))
        lines.append("")
        lines.append("## Parent")
        if parent:
            parent_link = _wiki_link(f"entities/{parent['id']}", parent["name"])
            lines.append(f"- {parent_link}")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Children")
        if child_entities:
            for child in child_entities:
                child_link = _wiki_link(f"entities/{child['id']}", child["name"])
                lines.append(f"- {child_link}")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Linked Tasks")
        if entity_tasks:
            for task in entity_tasks:
                label = f"{task['title']} ({task.get('status', 'unknown')}, {task.get('priority', 'unknown')})"
                task_link = _wiki_link(f"tasks/{task['id']}", label)
                lines.append(f"- {task_link}")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Outgoing Relationships")
        if outgoing_rels:
            for rel in outgoing_rels:
                dst = entity_index.get(rel["to_id"], {"id": rel["to_id"], "name": rel["to_id"]})
                rel_link = _wiki_link(f"relationships/{rel['id']}", rel["id"])
                dst_link = _wiki_link(f"entities/{dst['id']}", dst["name"])
                lines.append(f"- {rel_link}: `{rel['type']}` -> {dst_link}")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Incoming Relationships")
        if incoming_rels:
            for rel in incoming_rels:
                src = entity_index.get(rel["from_id"], {"id": rel["from_id"], "name": rel["from_id"]})
                rel_link = _wiki_link(f"relationships/{rel['id']}", rel["id"])
                src_link = _wiki_link(f"entities/{src['id']}", src["name"])
                lines.append(f"- {rel_link}: {src_link} -> `{rel['type']}`")
        else:
            lines.append("- None")
        lines.append("")
        lines.append("## Full Context")
        _append_context(lines, entity.get("full_context"))

        _write_markdown(entities_dir / f"{entity_id}.md", lines)

    for task in sorted_tasks:
        task_id = task["id"]
        entity = entity_index.get(task["entity_id"], {"id": task["entity_id"], "name": task["entity_id"]})

        lines = []
        lines.extend(
            _render_frontmatter(
                {
                    "id": task_id,
                    "record_type": "task",
                    "entity_id": task.get("entity_id"),
                    "status": task.get("status"),
                    "priority": task.get("priority"),
                    "source_json": "knowledge_base/raw/sources/src_tasks.json",
                }
            )
        )
        lines.append(f"# {task.get('title', task_id)}")
        lines.append("")
        lines.append(f"- ID: `{task_id}`")
        lines.append(f"- Status: `{_as_text(task.get('status'))}`")
        lines.append(f"- Priority: `{_as_text(task.get('priority'))}`")
        entity_link = _wiki_link(f"entities/{entity['id']}", entity["name"])
        lines.append(f"- Linked Entity: {entity_link}")
        lines.append("")
        lines.append("## Description")
        lines.append(_as_text(task.get("description")))
        lines.append("")
        lines.append("## Full Context")
        _append_context(lines, task.get("full_context"))
        _write_markdown(tasks_dir / f"{task_id}.md", lines)

    for rel in sorted_relationships:
        rel_id = rel["id"]
        src = entity_index.get(rel["from_id"], {"id": rel["from_id"], "name": rel["from_id"]})
        dst = entity_index.get(rel["to_id"], {"id": rel["to_id"], "name": rel["to_id"]})

        lines = []
        lines.extend(
            _render_frontmatter(
                {
                    "id": rel_id,
                    "record_type": "relationship",
                    "relationship_type": rel.get("type"),
                    "from_id": rel.get("from_id"),
                    "to_id": rel.get("to_id"),
                    "source_json": "knowledge_base/raw/sources/src_data_relationships.json",
                }
            )
        )
        lines.append(f"# {rel_id}")
        lines.append("")
        lines.append(f"- Type: `{_as_text(rel.get('type'))}`")
        from_link = _wiki_link(f"entities/{src['id']}", src["name"])
        to_link = _wiki_link(f"entities/{dst['id']}", dst["name"])
        lines.append(f"- From: {from_link}")
        lines.append(f"- To: {to_link}")
        lines.append("")
        lines.append("## Description")
        lines.append(_as_text(rel.get("description")))
        lines.append("")
        lines.append("## Full Context")
        _append_context(lines, rel.get("full_context"))
        _write_markdown(rels_dir / f"{rel_id}.md", lines)

    root = next((entity for entity in sorted_entities if entity.get("type") == "product"), None)
    index_lines = [
        "# Product Ground Truth (Obsidian Mirror)",
        "",
        "This folder is generated from canonical JSON ground truth and is safe to open as an Obsidian vault.",
        "",
        "## Canonical JSON Sources",
        "- `knowledge_base/raw/sources/src_data_entities.json`",
        "- `knowledge_base/raw/sources/src_data_relationships.json`",
        "- `knowledge_base/raw/sources/src_tasks.json`",
        "",
        "## Regeneration Command",
        "```bash",
        "python local_tool/query.py export-md",
        "```",
        "",
        "Do not treat these generated markdown files as canonical runtime input for the editor/frontend.",
        "",
        "## Counts",
        f"- Entities: {len(sorted_entities)}",
        f"- Relationships: {len(sorted_relationships)}",
        f"- Tasks: {len(sorted_tasks)}",
        "",
        "## Root Product",
    ]
    if root:
        root_link = _wiki_link(f"entities/{root['id']}", root["name"])
        index_lines.append(f"- {root_link}")
    else:
        index_lines.append("- None")
    index_lines.extend(
        [
            "",
            "## Entity Notes",
        ]
    )
    for entity in sorted_entities:
        entity_link = _wiki_link(f"entities/{entity['id']}", entity["name"])
        index_lines.append(f"- {entity_link}")
    index_lines.extend(["", "## Task Notes"])
    for task in sorted_tasks:
        task_link = _wiki_link(f"tasks/{task['id']}", task["title"])
        index_lines.append(f"- {task_link}")
    index_lines.extend(["", "## Relationship Notes"])
    for rel in sorted_relationships:
        label = f"{rel['id']} ({rel.get('type', '')})"
        rel_link = _wiki_link(f"relationships/{rel['id']}", label)
        index_lines.append(f"- {rel_link}")
    _write_markdown(out_dir / "index.md", index_lines)

    readme_lines = [
        "# Obsidian Ground-Truth Mirror",
        "",
        "This directory is generated so the product ground truth can be browsed in Obsidian.",
        "",
        "- Canonical runtime/edit data remains JSON in `knowledge_base/raw/sources/`.",
        "- Frontend/editor continues to use JSON.",
        "- Regenerate this markdown mirror after JSON changes.",
        "",
        "## Generate",
        "```bash",
        "python local_tool/query.py export-md",
        "```",
        "",
        "## Open in Obsidian",
        "Open this folder (`knowledge_base/obsidian`) as a vault.",
        "",
        "Start at:",
        "- `index.md`",
    ]
    _write_markdown(out_dir / "README.md", readme_lines)
    print(f"Wrote Obsidian markdown mirror to {out_dir}")


def _task_export_context_keys(tasks: List[Dict[str, Any]]) -> List[str]:
    keys = set()
    for task in tasks:
        context = task.get("full_context")
        if isinstance(context, dict):
            for key in context.keys():
                keys.add(str(key))
    return sorted(keys)


def _task_export_rows(
    tasks: List[Dict[str, Any]],
    entity_index: Dict[str, Dict[str, Any]],
    context_keys: List[str],
) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    sorted_tasks = sorted(
        tasks,
        key=lambda item: (
            priority_order.get(str(item.get("priority", "")).lower(), 99),
            str(item.get("status", "")),
            str(item.get("title", "")),
            str(item.get("id", "")),
        ),
    )

    for task in sorted_tasks:
        entity_id = str(task.get("entity_id", ""))
        entity = entity_index.get(entity_id, {})
        context = task.get("full_context")
        if not isinstance(context, dict):
            context = {}

        row: Dict[str, str] = {
            "task_id": str(task.get("id", "")),
            "title": str(task.get("title", "")),
            "status": str(task.get("status", "")),
            "priority": str(task.get("priority", "")),
            "entity_id": entity_id,
            "entity_name": str(entity.get("name", "")),
            "entity_type": str(entity.get("type", "")),
            "entity_health": str(entity.get("health", "")),
            "description": str(task.get("description", "")),
            "full_context_json": json.dumps(context, ensure_ascii=False, sort_keys=True),
        }
        for key in context_keys:
            row[f"context_{key}"] = str(context.get(key, ""))
        rows.append(row)
    return rows


def cmd_export_tasks_table(
    entities: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    output_csv: str,
    output_xlsx: Optional[str],
) -> None:
    entity_index = index_entities(entities)
    context_keys = _task_export_context_keys(tasks)
    rows = _task_export_rows(tasks, entity_index, context_keys)

    columns = [
        "task_id",
        "title",
        "status",
        "priority",
        "entity_id",
        "entity_name",
        "entity_type",
        "entity_health",
        "description",
        "full_context_json",
    ] + [f"context_{key}" for key in context_keys]

    csv_path = (ROOT / output_csv).resolve()
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote tasks CSV export to {csv_path}")

    if output_xlsx:
        xlsx_path = (ROOT / output_xlsx).resolve()
        xlsx_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            from openpyxl import Workbook  # type: ignore
        except ImportError:
            print("Skipped XLSX export (openpyxl not installed). CSV is Excel-compatible.")
            return

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "tasks"
        sheet.append(columns)
        for row in rows:
            sheet.append([row.get(column, "") for column in columns])
        workbook.save(xlsx_path)
        print(f"Wrote tasks XLSX export to {xlsx_path}")


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

    export_md_p = sub.add_parser("export-md")
    export_md_p.add_argument(
        "--output",
        default="knowledge_base/obsidian",
        help="Output directory for Obsidian markdown mirror (relative to repo root).",
    )

    export_tasks_table_p = sub.add_parser("export-tasks-table")
    export_tasks_table_p.add_argument(
        "--output-csv",
        default="artifacts/tasks_export.csv",
        help="Output CSV file path relative to repo root.",
    )
    export_tasks_table_p.add_argument(
        "--output-xlsx",
        default="artifacts/tasks_export.xlsx",
        help="Output XLSX file path relative to repo root (requires openpyxl).",
    )
    export_tasks_table_p.add_argument(
        "--no-xlsx",
        action="store_true",
        help="Disable XLSX export even when openpyxl is installed.",
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
    if args.cmd == "export-md":
        cmd_export_md(entities, relationships, tasks, args.output)
        return
    if args.cmd == "export-tasks-table":
        output_xlsx = None if args.no_xlsx else args.output_xlsx
        cmd_export_tasks_table(entities, tasks, args.output_csv, output_xlsx)
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
