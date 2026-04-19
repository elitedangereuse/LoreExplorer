const canvas = document.getElementById("graph-canvas");
const context = canvas.getContext("2d");
const searchInput = document.getElementById("search-input");
const searchHelp = document.getElementById("search-help");
const searchSuggestionButton = document.getElementById("search-suggestion");
const graphStatus = document.getElementById("graph-status");
const graphStats = document.getElementById("graph-stats");
const fitButton = document.getElementById("fit-button");
const resetButton = document.getElementById("reset-button");
const neighborsButton = document.getElementById("neighbors-button");
const dynamicButton = document.getElementById("dynamic-button");
const neighborLayoutSelect = document.getElementById("neighbor-layout");
const noteContent = document.getElementById("note-content");
const noteMeta = document.getElementById("note-meta");
const graphStage = document.querySelector(".graph-stage");
const graphContextMenu = document.getElementById("graph-context-menu");
const contextInspectNodeButton = document.getElementById("context-inspect-node");
const contextOpenLocalGraphButton = document.getElementById("context-open-local-graph");
const contextExpandNodeButton = document.getElementById("context-expand-node");

const worker = new Worker("./search-worker.js");

const state = {
  nodes: [],
  edges: [],
  meta: {},
  nodeById: new Map(),
  graphRootNodeId: null,
  inspectNodeId: null,
  results: [],
  searchQuery: "",
  searchMatchNodeIds: null,
  camera: { x: 0, y: 0, zoom: 1 },
  bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  visibleBounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  pointer: { x: 0, y: 0, active: false },
  dragging: false,
  dragStart: { x: 0, y: 0, cameraX: 0, cameraY: 0 },
  hasFitted: false,
  neighborMode: false,
  neighborLayout: "radial",
  adjacency: new Map(),
  expandedNodeIds: new Set(),
  edgeRefs: [],
  tagIndex: new Map(),
  activeTagFilter: null,
  searchSuggestion: null,
  searchExactNodeIds: [],
  searchWorkerReady: false,
  contextMenu: { open: false, nodeId: null },
  dynamicMode: false,
  animationFrameId: null,
  lastFrameAt: 0,
};

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = graphStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(ratio, ratio);

  if (state.nodes.length && !state.hasFitted) {
    fitGraph();
    state.hasFitted = true;
    return;
  }
  render();
}

function worldToScreen(node) {
  const rect = graphStage.getBoundingClientRect();
  return {
    x: (node.x - state.camera.x) * state.camera.zoom + rect.width / 2,
    y: (node.y - state.camera.y) * state.camera.zoom + rect.height / 2,
  };
}

function screenToWorld(x, y) {
  const rect = graphStage.getBoundingClientRect();
  return {
    x: (x - rect.width / 2) / state.camera.zoom + state.camera.x,
    y: (y - rect.height / 2) / state.camera.zoom + state.camera.y,
  };
}

function computeBounds(nodes) {
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  if (!xs.length || !ys.length) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function canonicalizeTag(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTagIndex() {
  const index = new Map();
  for (const node of state.nodes) {
    for (const rawTag of node.tags || []) {
      const normalizedTag = canonicalizeTag(rawTag);
      if (!normalizedTag) {
        continue;
      }
      if (!index.has(normalizedTag)) {
        index.set(normalizedTag, []);
      }
      index.get(normalizedTag).push(node);
    }
  }
  for (const [tag, nodes] of index.entries()) {
    nodes.sort((left, right) => right.degree - left.degree || left.title.localeCompare(right.title));
    index.set(tag, nodes);
  }
  state.tagIndex = index;
}

function getVisibleNodeIds() {
  if (state.searchMatchNodeIds) {
    return new Set(state.searchMatchNodeIds);
  }

  let visibleIds = null;
  if (state.neighborMode && state.graphRootNodeId) {
    visibleIds = new Set([state.graphRootNodeId]);
    const roots = new Set([state.graphRootNodeId, ...state.expandedNodeIds]);
    for (const rootId of roots) {
      visibleIds.add(rootId);
      const neighbors = state.adjacency.get(rootId) || new Set();
      for (const neighborId of neighbors) {
        visibleIds.add(neighborId);
      }
    }
  }

  return visibleIds;
}

function getBacklinkNodeIds(nodeId) {
  const nodeIds = new Set([nodeId]);
  for (const edge of state.edges) {
    if (edge.target === nodeId && edge.source !== nodeId) {
      nodeIds.add(edge.source);
    }
  }
  return nodeIds;
}

function updateSearchSuggestion() {
  if (!state.searchSuggestion || !state.searchQuery.trim()) {
    searchSuggestionButton.hidden = true;
    searchSuggestionButton.textContent = "";
    return;
  }
  const suggestionTitle = state.searchSuggestion.title;
  if (suggestionTitle.toLocaleLowerCase() === state.searchQuery.trim().toLocaleLowerCase()) {
    searchSuggestionButton.hidden = true;
    searchSuggestionButton.textContent = "";
    return;
  }
  searchSuggestionButton.hidden = false;
  searchSuggestionButton.textContent = `Complete: ${suggestionTitle}`;
}

function updateSearchHelp() {
  if (!state.searchQuery.trim()) {
    searchHelp.textContent = "Type to filter the graph by title, alias, tag, faction, ship, or system.";
    return;
  }
  if (state.searchExactNodeIds.length === 1) {
    const focusNodeId = state.searchExactNodeIds[0];
    const focusCount = getBacklinkNodeIds(focusNodeId).size;
    searchHelp.textContent = `${focusCount} nodes shown for the exact match and its backlinks. Press Escape to clear the filter.`;
    return;
  }
  const matchCount = state.searchMatchNodeIds ? state.searchMatchNodeIds.size : 0;
  searchHelp.textContent = `${matchCount} matching nodes shown in the graph. Press Escape to clear the filter.`;
}

function applySearchResults(payload) {
  const results = payload.results || [];
  const query = state.searchQuery.trim();
  state.results = query ? results : [];
  state.searchSuggestion = query ? payload.suggestion || null : null;
  state.searchExactNodeIds = query ? (payload.exactIds || []) : [];

  if (!query) {
    state.searchMatchNodeIds = null;
  } else if (state.searchExactNodeIds.length === 1) {
    const focusNodeId = state.searchExactNodeIds[0];
    state.searchMatchNodeIds = getBacklinkNodeIds(focusNodeId);
    if (state.inspectNodeId !== focusNodeId) {
      state.inspectNodeId = focusNodeId;
    }
  } else {
    state.searchMatchNodeIds = new Set(results.map((result) => result.id));
  }

  updateSearchSuggestion();
  updateSearchHelp();
  render();
}

function updateSearchQuery(query) {
  state.searchQuery = query;
  if (!state.searchWorkerReady) {
    updateSearchHelp();
    return;
  }
  querySearch(query);
}

function focusFirstSearchResult() {
  if (!state.results.length) {
    return;
  }
  const firstResult = state.results[0];
  if (!firstResult) {
    return;
  }
  if (state.neighborMode && state.graphRootNodeId) {
    inspectNode(firstResult.id);
    return;
  }
  selectNode(firstResult.id);
}

function acceptSearchSuggestion() {
  if (!state.searchSuggestion) {
    return;
  }
  searchInput.value = state.searchSuggestion.title;
  updateSearchQuery(state.searchSuggestion.title);
}

function clearSearch() {
  searchInput.value = "";
  state.searchQuery = "";
  state.searchMatchNodeIds = null;
  state.results = [];
  state.searchSuggestion = null;
  state.searchExactNodeIds = [];
  updateSearchSuggestion();
  updateSearchHelp();
  render();
}

function updateStatus() {
  const visibleNodes = getVisibleNodes();
  const visibleEdges = getVisibleEdgeRefs();
  const modeLabel = state.neighborMode && state.graphRootNodeId
    ? `${state.neighborLayout} neighbors${state.expandedNodeIds.size ? ` +${state.expandedNodeIds.size} expanded` : ""}`
    : "full graph";
  const motionLabel = state.dynamicMode ? "dynamic" : "static";
  const filterLabel = state.searchQuery.trim() ? ` · filtered` : "";
  graphStatus.textContent = `${visibleNodes.length} nodes · ${visibleEdges.length} edges · ${modeLabel}${filterLabel} · ${motionLabel}`;
}

function fitNodes(nodes) {
  const rect = graphStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const bounds = computeBounds(nodes);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const padding = Math.min(120, Math.max(40, rect.width * 0.08));
  state.camera.x = (bounds.minX + bounds.maxX) / 2;
  state.camera.y = (bounds.minY + bounds.maxY) / 2;
  state.camera.zoom = Math.min(
    (rect.width - padding) / width,
    (rect.height - padding) / height,
  );
  state.camera.zoom = Math.max(0.08, Math.min(state.camera.zoom, 1.4));
  state.visibleBounds = bounds;
  render();
}

function fitGraph() {
  fitNodes(getVisibleNodes());
}

function getLabelNodes(nodes) {
  const labelNodes = [];
  const seen = new Set();
  const rootId = state.graphRootNodeId;
  const inspectId = state.inspectNodeId || rootId;
  const hasSearchFilter = Boolean(state.searchQuery.trim() && state.searchMatchNodeIds);

  const addNode = (node) => {
    if (!node || seen.has(node.id)) {
      return;
    }
    seen.add(node.id);
    labelNodes.push(node);
  };

  addNode(state.nodeById.get(rootId));
  if (inspectId !== rootId) {
    addNode(state.nodeById.get(inspectId));
  }

  if (hasSearchFilter) {
    const filteredNodes = [...nodes]
      .filter((node) => !seen.has(node.id))
      .sort((left, right) => right.degree - left.degree || left.title.localeCompare(right.title));

    const maxLabels = state.neighborMode && rootId ? 24 : 32;
    filteredNodes.slice(0, maxLabels).forEach((node) => addNode(node));
  }

  if (!state.pointer.active) {
    return labelNodes;
  }

  const radius = state.neighborMode && rootId ? 220 : 160;
  const radiusSq = radius * radius;
  const nearbyNodes = [];

  for (const node of nodes) {
    if (seen.has(node.id)) {
      continue;
    }
    const point = worldToScreen(node);
    const dx = point.x - state.pointer.x;
    const dy = point.y - state.pointer.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > radiusSq) {
      continue;
    }
    nearbyNodes.push({ node, point, distanceSq });
  }

  nearbyNodes
    .sort((left, right) => left.distanceSq - right.distanceSq || right.node.degree - left.node.degree)
    .slice(0, state.neighborMode && rootId ? 14 : 8)
    .forEach((entry) => addNode(entry.node));

  return labelNodes;
}

function getVisibleNodes() {
  const visibleIds = getVisibleNodeIds();
  if (!visibleIds) {
    return state.nodes;
  }
  return state.nodes.filter((node) => visibleIds.has(node.id));
}

function getVisibleEdges() {
  const visibleIds = getVisibleNodeIds();
  if (!visibleIds) {
    return state.edges;
  }
  return state.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
}

function getVisibleEdgeRefs() {
  const visibleIds = getVisibleNodeIds();
  if (!visibleIds) {
    return state.edgeRefs;
  }
  return state.edgeRefs.filter((edge) => visibleIds.has(edge.source.id) && visibleIds.has(edge.target.id));
}

function renderNodeLabels(nodes) {
  const rect = graphStage.getBoundingClientRect();
  const rootId = state.graphRootNodeId;
  const inspectId = state.inspectNodeId || rootId;
  if (!inspectId && !rootId) {
    return;
  }

  const orderedNodes = getLabelNodes(nodes).sort((left, right) => {
    const leftIsPriority = left.id === rootId || left.id === inspectId;
    const rightIsPriority = right.id === rootId || right.id === inspectId;
    if (leftIsPriority !== rightIsPriority) {
      return leftIsPriority ? 1 : -1;
    }
    return left.y - right.y;
  });
  if (!orderedNodes.length) {
    return;
  }

  context.save();
  context.globalAlpha = 0.96;
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(8, 17, 27, 0.9)";

  for (const node of orderedNodes) {
    const point = worldToScreen(node);
    const radius = Math.max(1.6, node.size * state.camera.zoom * 0.42);
    const isRoot = node.id === rootId;
    const isInspected = node.id === inspectId;
    const offset = radius + 9;

    context.font = isRoot || isInspected
      ? "600 13px Avenir Next, Segoe UI, sans-serif"
      : "500 12px Avenir Next, Segoe UI, sans-serif";
    context.fillStyle = isRoot ? "#ffe082" : (isInspected ? "#eef6ff" : "rgba(238, 246, 255, 0.92)");
    context.lineWidth = isRoot || isInspected ? 4 : 3;

    let labelX = point.x + offset;
    let labelY = point.y - ((isRoot || isInspected) ? radius + 12 : 0);
    let textAlign = "left";

    if (!isRoot && !isInspected) {
      if (point.x < rect.width * 0.42) {
        textAlign = "right";
        labelX = point.x - offset;
      } else if (point.x <= rect.width * 0.58) {
        textAlign = "center";
        labelY = point.y - radius - 11;
      }
    } else if (isRoot || isInspected) {
      textAlign = "left";
    }

    context.textAlign = textAlign;
    context.strokeText(node.title, labelX, labelY);
    context.fillText(node.title, labelX, labelY);
  }

  context.restore();
}

function render() {
  const rect = graphStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  context.clearRect(0, 0, rect.width, rect.height);
  const visibleNodes = getVisibleNodes();
  const visibleEdges = getVisibleEdgeRefs();

  context.save();
  context.lineWidth = 1;
  context.strokeStyle = "rgba(180, 205, 225, 0.07)";
  context.beginPath();
  for (const edge of visibleEdges) {
    const from = worldToScreen(edge.source);
    const to = worldToScreen(edge.target);
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
  }
  context.stroke();

  for (const node of visibleNodes) {
    const point = worldToScreen(node);
    const radius = Math.max(1.6, node.size * state.camera.zoom * 0.42);
    context.beginPath();
    context.fillStyle = node.color;
    context.globalAlpha = state.inspectNodeId && state.inspectNodeId !== node.id ? 0.82 : 0.98;
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();

    if (node.id === state.graphRootNodeId) {
      context.globalAlpha = 1;
      context.strokeStyle = "#ffe082";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
      context.stroke();
    } else if (node.id === state.inspectNodeId) {
      context.globalAlpha = 1;
      context.strokeStyle = "#eef6ff";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(point.x, point.y, radius + 3, 0, Math.PI * 2);
      context.stroke();
    } else if (state.expandedNodeIds.has(node.id)) {
      context.globalAlpha = 0.95;
      context.strokeStyle = "#4dd0e1";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(point.x, point.y, radius + 3, 0, Math.PI * 2);
      context.stroke();
    }
  }

  renderNodeLabels(visibleNodes);
  context.restore();
  updateStatus();
}

function renderStats() {
  const stats = [
    ["Nodes", state.meta.nodeCount],
    ["Edges", state.meta.edgeCount],
    ["Groups", state.meta.groupCount],
  ];
  graphStats.innerHTML = stats
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function getBacklinks(nodeId) {
  const backlinks = new Map();
  for (const edge of state.edges) {
    if (edge.target !== nodeId || edge.source === nodeId) {
      continue;
    }
    const sourceNode = state.nodeById.get(edge.source);
    if (!sourceNode) {
      continue;
    }
    backlinks.set(sourceNode.id, sourceNode);
  }
  return [...backlinks.values()]
    .sort((left, right) => right.degree - left.degree || left.title.localeCompare(right.title));
}

function renderBacklinks(nodeId) {
  const backlinks = getBacklinks(nodeId);
  if (!backlinks.length) {
    return `
      <section class="backlinks-section">
        <div class="backlinks-header">
          <span class="meta-label">Backlinks</span>
          <span class="backlinks-count">0</span>
        </div>
        <p class="note-warning">No backlinks found for this node.</p>
      </section>
    `;
  }

  const items = backlinks
    .slice(0, 200)
    .map((node) => `
      <li>
        <button type="button" class="backlink-item" data-node-id="${node.id}">
          <span>${node.title}</span>
          <small>${node.group} · degree ${node.degree}</small>
        </button>
      </li>
    `)
    .join("");

  return `
    <section class="backlinks-section">
      <div class="backlinks-header">
        <span class="meta-label">Backlinks</span>
        <span class="backlinks-count">${backlinks.length}</span>
      </div>
      <ul class="backlinks-list">
        ${items}
      </ul>
    </section>
  `;
}

function getNodesForTag(tag) {
  return state.tagIndex.get(canonicalizeTag(tag)) || [];
}

function renderTagButtons(node) {
  if (!node.tags || !node.tags.length) {
    return '<span class="note-warning">No tags</span>';
  }
  return node.tags
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .map((tag) => {
      const isActive = state.activeTagFilter && canonicalizeTag(state.activeTagFilter) === canonicalizeTag(tag);
      return `
        <button
          type="button"
          class="tag tag-button ${isActive ? "is-active" : ""}"
          data-tag="${escapeHtml(tag)}"
        >${escapeHtml(tag)}</button>
      `;
    })
    .join("");
}

function renderTagMatches(nodeId) {
  if (!state.activeTagFilter) {
    return "";
  }

  const matches = getNodesForTag(state.activeTagFilter);
  const items = matches
    .slice(0, 200)
    .map((node) => `
      <li>
        <button
          type="button"
          class="backlink-item ${node.id === nodeId ? "is-current" : ""}"
          data-node-id="${node.id}"
          ${node.id === nodeId ? "disabled" : ""}
        >
          <span>${escapeHtml(node.title)}</span>
          <small>${escapeHtml(node.group)} · degree ${node.degree}</small>
        </button>
      </li>
    `)
    .join("");

  return `
    <section class="backlinks-section">
      <div class="backlinks-header">
        <span class="meta-label">Tag: ${escapeHtml(state.activeTagFilter)}</span>
        <span class="backlinks-count">${matches.length}</span>
      </div>
      <ul class="backlinks-list">
        ${items}
      </ul>
    </section>
  `;
}

async function loadNote(nodeId) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  if (
    state.activeTagFilter
    && !(node.tags || []).some((tag) => canonicalizeTag(tag) === canonicalizeTag(state.activeTagFilter))
  ) {
    state.activeTagFilter = null;
  }
  const response = await fetch(`./notes/${nodeId}.html`);
  const noteHtml = await response.text();
  noteContent.innerHTML = `${renderTagMatches(nodeId)}${renderBacklinks(nodeId)}${noteHtml}`;
  const backlinkCount = getBacklinks(nodeId).length;
  noteMeta.innerHTML = `
    <div><span class="meta-label">Node</span><span>${node.title}</span></div>
    <div><span class="meta-label">Degree</span><span>${node.degree}</span></div>
    <div><span class="meta-label">Backlinks</span><span>${backlinkCount}</span></div>
    <div>
      <span class="meta-label">Tags</span>
      <div class="note-tag-list">${renderTagButtons(node)}</div>
    </div>
  `;
}

function updateUrlState() {
  const hash = new URLSearchParams();
  if (state.graphRootNodeId) {
    hash.set("node", state.graphRootNodeId);
  }
  if (state.inspectNodeId && state.inspectNodeId !== state.graphRootNodeId) {
    hash.set("inspect", state.inspectNodeId);
  }
  if (state.neighborMode) {
    hash.set("view", "neighbors");
    if (state.neighborLayout !== "radial") {
      hash.set("nlayout", state.neighborLayout);
    }
  }
  if (state.dynamicMode) {
    hash.set("layout", "dynamic");
  }
  const hashString = hash.toString();
  const nextUrl = hashString ? `#${hashString}` : window.location.pathname + window.location.search;
  history.replaceState(null, "", nextUrl);
}

function updateNeighborButton() {
  neighborsButton.classList.toggle("is-active", state.neighborMode);
  neighborsButton.setAttribute("aria-pressed", String(state.neighborMode));
}

function updateDynamicButton() {
  dynamicButton.classList.toggle("is-active", state.dynamicMode);
  dynamicButton.setAttribute("aria-pressed", String(state.dynamicMode));
}

function updateNeighborLayoutControl() {
  neighborLayoutSelect.value = state.neighborLayout;
  neighborLayoutSelect.disabled = !state.neighborMode;
}

function hideContextMenu() {
  state.contextMenu = { open: false, nodeId: null };
  graphContextMenu.hidden = true;
}

function showContextMenu(clientX, clientY, nodeId) {
  const rect = graphStage.getBoundingClientRect();
  const menuWidth = 210;
  const menuHeight = 96;
  const left = Math.min(
    Math.max(8, clientX - rect.left),
    Math.max(8, rect.width - menuWidth - 8),
  );
  const top = Math.min(
    Math.max(8, clientY - rect.top),
    Math.max(8, rect.height - menuHeight - 8),
  );

  state.contextMenu = { open: true, nodeId };
  graphContextMenu.style.left = `${left}px`;
  graphContextMenu.style.top = `${top}px`;
  contextInspectNodeButton.disabled = nodeId === state.inspectNodeId;
  contextOpenLocalGraphButton.disabled = state.neighborMode && nodeId === state.graphRootNodeId;
  contextExpandNodeButton.disabled = (
    !state.neighborMode
    || !state.graphRootNodeId
    || nodeId === state.graphRootNodeId
    || state.expandedNodeIds.has(nodeId)
  );
  graphContextMenu.hidden = false;
}

function nudgeNodes(nodes, strength = 0.5) {
  for (const node of nodes) {
    node.vx += (Math.random() - 0.5) * strength;
    node.vy += (Math.random() - 0.5) * strength;
  }
}

function setNodeAnchor(node, x, y, resetPosition = false) {
  node.anchorX = x;
  node.anchorY = y;
  if (resetPosition) {
    node.x = x;
    node.y = y;
    node.vx = 0;
    node.vy = 0;
  }
}

function restoreGlobalLayout(resetPositions = false) {
  for (const node of state.nodes) {
    setNodeAnchor(node, node.homeX, node.homeY, resetPositions);
  }
}

function buildNeighborhoodLayoutState(nodeId) {
  const center = state.nodeById.get(nodeId);
  const visibleIds = getVisibleNodeIds();
  if (!center || !visibleIds) {
    return null;
  }

  const depthById = new Map([[nodeId, 0]]);
  const parentById = new Map();
  const queue = [nodeId];

  while (queue.length) {
    const currentId = queue.shift();
    const currentDepth = depthById.get(currentId) || 0;
    const neighbors = state.adjacency.get(currentId) || new Set();
    for (const neighborId of neighbors) {
      if (!visibleIds.has(neighborId) || depthById.has(neighborId)) {
        continue;
      }
      depthById.set(neighborId, currentDepth + 1);
      parentById.set(neighborId, currentId);
      queue.push(neighborId);
    }
  }

  for (const visibleId of visibleIds) {
    if (!depthById.has(visibleId)) {
      depthById.set(visibleId, 1);
      parentById.set(visibleId, nodeId);
    }
  }

  const nodesByDepth = new Map();
  for (const visibleId of visibleIds) {
    if (visibleId === nodeId) {
      continue;
    }
    const depth = depthById.get(visibleId) || 1;
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, []);
    }
    const node = state.nodeById.get(visibleId);
    if (node) {
      nodesByDepth.get(depth).push(node);
    }
  }

  return {
    center,
    visibleIds,
    depthById,
    parentById,
    nodesByDepth,
    sortedDepths: [...nodesByDepth.keys()].sort((left, right) => left - right),
  };
}

function sortNeighborhoodNodes(nodes, parentById, center) {
  return [...nodes].sort((left, right) => {
    const leftParent = state.nodeById.get(parentById.get(left.id)) || center;
    const rightParent = state.nodeById.get(parentById.get(right.id)) || center;
    const leftParentAngle = Math.atan2(leftParent.anchorY, leftParent.anchorX);
    const rightParentAngle = Math.atan2(rightParent.anchorY, rightParent.anchorX);
    const leftAngle = Math.atan2(left.homeY - center.homeY, left.homeX - center.homeX);
    const rightAngle = Math.atan2(right.homeY - center.homeY, right.homeX - center.homeX);
    return (
      leftParentAngle - rightParentAngle
      || leftAngle - rightAngle
      || right.degree - left.degree
      || left.title.localeCompare(right.title)
    );
  });
}

function applyRadialNeighborLayout(layoutState, resetPositions) {
  const { center, parentById, nodesByDepth, sortedDepths } = layoutState;
  for (const depth of sortedDepths) {
    const ringNodes = sortNeighborhoodNodes(nodesByDepth.get(depth), parentById, center);
    if (!ringNodes.length) {
      continue;
    }
    const ringRadius = 92 + (depth - 1) * 74;
    const step = (Math.PI * 2) / ringNodes.length;
    const angleOffset = depth % 2 === 1 ? -Math.PI / 2 : -Math.PI / 2 + step / 2;
    ringNodes.forEach((node, index) => {
      const angle = angleOffset + index * step;
      const radius = ringRadius + Math.min(18, node.degree * 0.35);
      setNodeAnchor(
        node,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        resetPositions,
      );
    });
  }
}

function applyFanNeighborLayout(layoutState, resetPositions) {
  const { center, parentById, nodesByDepth, sortedDepths } = layoutState;
  for (const depth of sortedDepths) {
    const fanNodes = sortNeighborhoodNodes(nodesByDepth.get(depth), parentById, center);
    if (!fanNodes.length) {
      continue;
    }
    const spread = Math.min(Math.PI * 1.45, 0.85 + fanNodes.length * 0.18);
    const startAngle = -Math.PI / 2 - spread / 2;
    const step = fanNodes.length === 1 ? 0 : spread / (fanNodes.length - 1);
    const radiusBase = 110 + (depth - 1) * 92;
    fanNodes.forEach((node, index) => {
      const angle = startAngle + step * index;
      const radius = radiusBase + Math.min(18, node.degree * 0.3);
      setNodeAnchor(
        node,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        resetPositions,
      );
    });
  }
}

function applyColumnNeighborLayout(layoutState, resetPositions) {
  const { center, parentById, nodesByDepth, sortedDepths } = layoutState;
  for (const depth of sortedDepths) {
    const columnNodes = sortNeighborhoodNodes(nodesByDepth.get(depth), parentById, center);
    if (!columnNodes.length) {
      continue;
    }
    const x = 120 + (depth - 1) * 170;
    const verticalGap = Math.min(72, Math.max(34, 320 / Math.max(1, columnNodes.length)));
    const totalHeight = verticalGap * Math.max(0, columnNodes.length - 1);
    const top = -totalHeight / 2;
    columnNodes.forEach((node, index) => {
      const parent = state.nodeById.get(parentById.get(node.id)) || center;
      const parentBias = Math.max(-42, Math.min(42, parent.anchorY * 0.16));
      const y = top + index * verticalGap + parentBias;
      setNodeAnchor(node, x, y, resetPositions);
    });
  }
}

function applyNeighborLayout(nodeId, resetPositions = true) {
  restoreGlobalLayout(false);
  const layoutState = buildNeighborhoodLayoutState(nodeId);
  if (!layoutState) {
    return;
  }
  setNodeAnchor(layoutState.center, 0, 0, resetPositions);

  if (state.neighborLayout === "fan") {
    applyFanNeighborLayout(layoutState, resetPositions);
    return;
  }
  if (state.neighborLayout === "columns") {
    applyColumnNeighborLayout(layoutState, resetPositions);
    return;
  }
  applyRadialNeighborLayout(layoutState, resetPositions);
}

function syncLayout(resetPositions = true) {
  if (state.neighborMode && state.graphRootNodeId) {
    applyNeighborLayout(state.graphRootNodeId, resetPositions);
    return;
  }
  restoreGlobalLayout(resetPositions);
}

function kickSelection(nodeId, strength = 1.2) {
  const visibleIds = getVisibleNodeIds() || new Set([nodeId]);
  if (!visibleIds.has(nodeId)) {
    visibleIds.add(nodeId);
  }
  const nodes = state.nodes.filter((node) => visibleIds.has(node.id));
  nudgeNodes(nodes, strength);
}

function expandNeighborhood(nodeId) {
  if (!state.neighborMode || !state.graphRootNodeId || nodeId === state.graphRootNodeId) {
    return;
  }
  const visibleIds = getVisibleNodeIds();
  if (!visibleIds || !visibleIds.has(nodeId) || state.expandedNodeIds.has(nodeId)) {
    return;
  }
  state.expandedNodeIds.add(nodeId);
  hideContextMenu();
  syncLayout(true);
  if (state.dynamicMode) {
    nudgeNodes(getVisibleNodes(), 1.2);
  }
  fitGraph();
}

function openLocalGraph(nodeId) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  hideContextMenu();
  state.neighborMode = true;
  updateNeighborButton();
  updateNeighborLayoutControl();
  selectNode(nodeId, true);
}

function toggleTagFilter(tag) {
  if (!state.inspectNodeId) {
    return;
  }
  const normalizedTag = canonicalizeTag(tag);
  const normalizedActiveTag = canonicalizeTag(state.activeTagFilter || "");
  state.activeTagFilter = normalizedTag === normalizedActiveTag ? null : tag;
  loadNote(state.inspectNodeId);
}

function inspectNode(nodeId, updateUrl = true) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  hideContextMenu();
  state.inspectNodeId = nodeId;
  loadNote(nodeId);
  if (updateUrl) {
    updateUrlState();
  }
  render();
}

function selectNode(nodeId, shouldCenter = true, updateUrl = true) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  hideContextMenu();
  state.graphRootNodeId = nodeId;
  state.inspectNodeId = nodeId;
  state.expandedNodeIds = new Set();
  syncLayout(state.neighborMode);
  if (shouldCenter && state.neighborMode) {
    fitGraph();
  } else if (shouldCenter) {
    state.camera.x = node.x;
    state.camera.y = node.y;
  }
  loadNote(nodeId);
  if (state.dynamicMode) {
    kickSelection(nodeId);
  }
  if (updateUrl) {
    updateUrlState();
  }
  render();
}

function resetSelection() {
  hideContextMenu();
  state.graphRootNodeId = null;
  state.inspectNodeId = null;
  state.activeTagFilter = null;
  state.expandedNodeIds = new Set();
  noteMeta.innerHTML = "";
  noteContent.innerHTML = '<div class="empty-state"><p>Select a node or search result to inspect a note.</p></div>';
  syncLayout(true);
  if (state.dynamicMode) {
    nudgeNodes(getVisibleNodes(), 0.45);
  }
  updateUrlState();
  render();
}

function setNeighborMode(enabled, shouldFit = true, updateUrl = true) {
  state.neighborMode = enabled;
  if (!enabled) {
    state.expandedNodeIds = new Set();
  }
  updateNeighborButton();
  updateNeighborLayoutControl();
  hideContextMenu();
  syncLayout(true);
  if (state.dynamicMode) {
    nudgeNodes(getVisibleNodes(), enabled ? 1.1 : 0.35);
  }
  if (shouldFit) {
    fitGraph();
  } else {
    render();
  }
  if (updateUrl) {
    updateUrlState();
  }
}

function setNeighborLayout(layout, shouldFit = true, updateUrl = true) {
  state.neighborLayout = ["radial", "fan", "columns"].includes(layout) ? layout : "radial";
  updateNeighborLayoutControl();
  hideContextMenu();
  if (state.neighborMode && state.graphRootNodeId) {
    syncLayout(true);
    if (state.dynamicMode) {
      nudgeNodes(getVisibleNodes(), 0.9);
    }
    if (shouldFit) {
      fitGraph();
    } else {
      render();
    }
  }
  if (updateUrl) {
    updateUrlState();
  }
}

function buildSimulationData() {
  state.edgeRefs = state.edges
    .map((edge) => ({
      source: state.nodeById.get(edge.source),
      target: state.nodeById.get(edge.target),
    }))
    .filter((edge) => edge.source && edge.target);

  for (const node of state.nodes) {
    node.homeX = node.x;
    node.homeY = node.y;
    node.anchorX = node.x;
    node.anchorY = node.y;
    node.vx = 0;
    node.vy = 0;
  }
}

function stopSimulation() {
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
}

function runSimulationFrame(now) {
  if (!state.dynamicMode || document.hidden) {
    stopSimulation();
    render();
    return;
  }

  const dt = Math.min(0.033, Math.max(0.012, (now - state.lastFrameAt) / 1000 || 0.016));
  state.lastFrameAt = now;
  const visibleNodes = getVisibleNodes();
  const visibleEdges = getVisibleEdgeRefs();
  const nodeIndex = new Map(visibleNodes.map((node, index) => [node.id, index]));
  const isFocusedNeighborhood = state.neighborMode && state.graphRootNodeId;
  const cellSize = isFocusedNeighborhood ? 120 : 140;
  const maxRepelDistance = cellSize * 1.75;
  const maxRepelDistanceSq = maxRepelDistance * maxRepelDistance;
  const grid = new Map();
  const scale = dt * 60;

  for (const node of visibleNodes) {
    node.fx = (node.anchorX - node.x) * (isFocusedNeighborhood ? 0.024 : 0.016);
    node.fy = (node.anchorY - node.y) * (isFocusedNeighborhood ? 0.024 : 0.016);
    const cellX = Math.floor(node.x / cellSize);
    const cellY = Math.floor(node.y / cellSize);
    const key = `${cellX},${cellY}`;
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key).push(node);
  }

  for (const node of visibleNodes) {
    const cellX = Math.floor(node.x / cellSize);
    const cellY = Math.floor(node.y / cellSize);
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const bucket = grid.get(`${cellX + offsetX},${cellY + offsetY}`);
        if (!bucket) continue;
        for (const other of bucket) {
          const nodePosition = nodeIndex.get(node.id);
          const otherPosition = nodeIndex.get(other.id);
          if (nodePosition === undefined || otherPosition === undefined || otherPosition <= nodePosition) {
            continue;
          }
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const distSq = dx * dx + dy * dy + 0.01;
          if (distSq > maxRepelDistanceSq) {
            continue;
          }
          const distance = Math.sqrt(distSq);
          const repulsion = (isFocusedNeighborhood ? 1800 : 1100) / distSq;
          const forceX = (dx / distance) * repulsion;
          const forceY = (dy / distance) * repulsion;
          node.fx -= forceX;
          node.fy -= forceY;
          other.fx += forceX;
          other.fy += forceY;
        }
      }
    }
  }

  for (const edge of visibleEdges) {
    const dx = edge.target.x - edge.source.x;
    const dy = edge.target.y - edge.source.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const preferredLength = isFocusedNeighborhood ? 74 : 78;
    const spring = (distance - preferredLength) * (isFocusedNeighborhood ? 0.018 : 0.008);
    const forceX = (dx / distance) * spring;
    const forceY = (dy / distance) * spring;
    edge.source.fx += forceX;
    edge.source.fy += forceY;
    edge.target.fx -= forceX;
    edge.target.fy -= forceY;
  }

  for (const node of visibleNodes) {
    if (node.id === state.graphRootNodeId) {
      node.fx += (node.anchorX - node.x) * (isFocusedNeighborhood ? 0.04 : 0.018);
      node.fy += (node.anchorY - node.y) * (isFocusedNeighborhood ? 0.04 : 0.018);
    }
    node.vx = (node.vx + node.fx * scale) * 0.86;
    node.vy = (node.vy + node.fy * scale) * 0.86;
    const maxVelocity = isFocusedNeighborhood ? 8 : 12;
    node.vx = Math.max(-maxVelocity, Math.min(maxVelocity, node.vx));
    node.vy = Math.max(-maxVelocity, Math.min(maxVelocity, node.vy));
    node.x += node.vx;
    node.y += node.vy;
  }

  render();
  state.animationFrameId = requestAnimationFrame(runSimulationFrame);
}

function setDynamicMode(enabled, updateUrl = true) {
  state.dynamicMode = enabled;
  updateDynamicButton();
  if (enabled) {
    nudgeNodes(getVisibleNodes(), state.neighborMode && state.graphRootNodeId ? 1.3 : 0.35);
    state.lastFrameAt = performance.now();
    if (!state.animationFrameId) {
      state.animationFrameId = requestAnimationFrame(runSimulationFrame);
    }
  } else {
    stopSimulation();
    render();
  }
  if (updateUrl) {
    updateUrlState();
  }
}

function querySearch(value) {
  worker.postMessage({ type: "query", payload: { query: value } });
}

function pickNodeAt(clientX, clientY) {
  const rect = graphStage.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let winner = null;
  let winnerDistance = Number.POSITIVE_INFINITY;

  for (const node of getVisibleNodes()) {
    const point = worldToScreen(node);
    const radius = Math.max(7, node.size * state.camera.zoom * 0.52);
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= radius && distance < winnerDistance) {
      winner = node;
      winnerDistance = distance;
    }
  }

  return winner;
}

function bindEvents() {
  window.addEventListener("resize", resizeCanvas);
  new ResizeObserver(() => {
    hideContextMenu();
    resizeCanvas();
  }).observe(graphStage);
  window.addEventListener("hashchange", () => applyUrlState());
  document.addEventListener("click", (event) => {
    if (!state.contextMenu.open) {
      return;
    }
    if (!graphContextMenu.contains(event.target)) {
      hideContextMenu();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideContextMenu();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSimulation();
      hideContextMenu();
      return;
    }
    if (state.dynamicMode && !state.animationFrameId) {
      state.lastFrameAt = performance.now();
      state.animationFrameId = requestAnimationFrame(runSimulationFrame);
    }
  });

  fitButton.addEventListener("click", fitGraph);
  resetButton.addEventListener("click", resetSelection);
  neighborsButton.addEventListener("click", () => {
    setNeighborMode(!state.neighborMode);
  });
  dynamicButton.addEventListener("click", () => {
    setDynamicMode(!state.dynamicMode);
  });
  neighborLayoutSelect.addEventListener("change", (event) => {
    setNeighborLayout(event.target.value);
  });
  contextInspectNodeButton.addEventListener("click", () => {
    if (!state.contextMenu.nodeId) {
      return;
    }
    inspectNode(state.contextMenu.nodeId);
  });
  contextOpenLocalGraphButton.addEventListener("click", () => {
    if (!state.contextMenu.nodeId) {
      return;
    }
    openLocalGraph(state.contextMenu.nodeId);
  });
  contextExpandNodeButton.addEventListener("click", () => {
    if (!state.contextMenu.nodeId) {
      return;
    }
    expandNeighborhood(state.contextMenu.nodeId);
  });

  canvas.addEventListener("mousedown", (event) => {
    hideContextMenu();
    const rect = graphStage.getBoundingClientRect();
    state.pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active: true,
    };
    state.dragging = true;
    state.dragStart = {
      x: event.clientX,
      y: event.clientY,
      cameraX: state.camera.x,
      cameraY: state.camera.y,
    };
  });

  window.addEventListener("mousemove", (event) => {
    if (!state.dragging) return;
    const dx = (event.clientX - state.dragStart.x) / state.camera.zoom;
    const dy = (event.clientY - state.dragStart.y) / state.camera.zoom;
    state.camera.x = state.dragStart.cameraX - dx;
    state.camera.y = state.dragStart.cameraY - dy;
    render();
  });

  window.addEventListener("mouseup", () => {
    state.dragging = false;
  });

  canvas.addEventListener("mousemove", (event) => {
    const rect = graphStage.getBoundingClientRect();
    state.pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active: true,
    };
    if (!state.dragging) {
      render();
    }
  });

  canvas.addEventListener("mouseleave", () => {
    state.pointer.active = false;
    render();
  });

  canvas.addEventListener("click", (event) => {
    hideContextMenu();
    if (Math.abs(event.clientX - state.dragStart.x) > 4 || Math.abs(event.clientY - state.dragStart.y) > 4) {
      return;
    }
    const winner = pickNodeAt(event.clientX, event.clientY);
    if (!winner) {
      return;
    }
    if (state.neighborMode && state.graphRootNodeId) {
      inspectNode(winner.id);
      return;
    }
    selectNode(winner.id, false);
  });

  canvas.addEventListener("contextmenu", (event) => {
    const winner = pickNodeAt(event.clientX, event.clientY);
    if (!winner) {
      return;
    }
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY, winner.id);
  });

  canvas.addEventListener("wheel", (event) => {
    hideContextMenu();
    event.preventDefault();
    const worldBefore = screenToWorld(event.offsetX, event.offsetY);
    const factor = event.deltaY > 0 ? 0.9 : 1.12;
    state.camera.zoom = Math.max(0.05, Math.min(4.5, state.camera.zoom * factor));
    const worldAfter = screenToWorld(event.offsetX, event.offsetY);
    state.camera.x += worldBefore.x - worldAfter.x;
    state.camera.y += worldBefore.y - worldAfter.y;
    render();
  }, { passive: false });

  searchInput.addEventListener("input", (event) => {
    updateSearchQuery(event.target.value);
  });
  searchSuggestionButton.addEventListener("click", () => {
    acceptSearchSuggestion();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      clearSearch();
    } else if (event.key === "Tab" && state.searchSuggestion) {
      event.preventDefault();
      acceptSearchSuggestion();
    } else if (event.key === "Enter") {
      event.preventDefault();
      focusFirstSearchResult();
    }
  });

  noteContent.addEventListener("click", (event) => {
    const tagButton = event.target.closest("[data-tag]");
    if (tagButton) {
      event.preventDefault();
      toggleTagFilter(tagButton.dataset.tag);
      return;
    }
    const link = event.target.closest("[data-node-id]");
    if (!link) return;
    event.preventDefault();
    selectNode(link.dataset.nodeId);
  });
  noteMeta.addEventListener("click", (event) => {
    const tagButton = event.target.closest("[data-tag]");
    if (!tagButton) return;
    event.preventDefault();
    toggleTagFilter(tagButton.dataset.tag);
  });
}

function buildAdjacency() {
  state.adjacency = new Map();
  for (const node of state.nodes) {
    state.adjacency.set(node.id, new Set());
  }
  for (const edge of state.edges) {
    if (!state.adjacency.has(edge.source)) {
      state.adjacency.set(edge.source, new Set());
    }
    if (!state.adjacency.has(edge.target)) {
      state.adjacency.set(edge.target, new Set());
    }
    state.adjacency.get(edge.source).add(edge.target);
    state.adjacency.get(edge.target).add(edge.source);
  }
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const nodeId = params.get("node");
  const inspectNodeId = params.get("inspect");
  const neighborMode = params.get("view") === "neighbors";
  const dynamicMode = params.get("layout") === "dynamic";
  const neighborLayout = params.get("nlayout") || "radial";

  state.neighborMode = neighborMode;
  updateNeighborButton();
  state.neighborLayout = ["radial", "fan", "columns"].includes(neighborLayout)
    ? neighborLayout
    : "radial";
  updateNeighborLayoutControl();
  state.dynamicMode = dynamicMode;
  updateDynamicButton();
  hideContextMenu();

  if (nodeId && state.nodeById.has(nodeId)) {
    selectNode(nodeId, true, false);
    if (inspectNodeId && state.nodeById.has(inspectNodeId)) {
      inspectNode(inspectNodeId, false);
    }
    if (neighborMode) {
      fitGraph();
    }
    setDynamicMode(dynamicMode, false);
    return;
  }

  if (!nodeId) {
    state.graphRootNodeId = null;
    state.inspectNodeId = null;
    state.activeTagFilter = null;
    state.searchSuggestion = null;
    state.searchExactNodeIds = [];
    updateSearchSuggestion();
    noteMeta.innerHTML = "";
    noteContent.innerHTML = '<div class="empty-state"><p>Select a node or search result to inspect a note.</p></div>';
    fitGraph();
  }
  setDynamicMode(dynamicMode, false);
}

worker.onmessage = (event) => {
  if (event.data.type === "ready") {
    state.searchWorkerReady = true;
    if (state.searchQuery.trim()) {
      querySearch(state.searchQuery);
      return;
    }
    updateSearchHelp();
    return;
  }
  if (event.data.type === "results") {
    applySearchResults(event.data.payload);
  }
};

async function bootstrap() {
  bindEvents();
  resizeCanvas();

  const graphResponse = await fetch("./data/graph.json");
  const searchResponse = await fetch("./data/search-docs.json");

  const graph = await graphResponse.json();
  const searchDocs = await searchResponse.json();

  state.nodes = graph.nodes;
  state.edges = graph.edges;
  state.meta = graph.meta;
  state.nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  state.bounds = computeBounds(state.nodes);
  buildAdjacency();
  buildTagIndex();
  buildSimulationData();
  updateNeighborLayoutControl();

  state.hasFitted = false;
  resizeCanvas();
  renderStats();
  applyUrlState();

  worker.postMessage({ type: "init", payload: { docs: searchDocs } });
}

bootstrap().catch((error) => {
  graphStatus.textContent = "Failed to load graph";
  noteContent.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
});
