const appShell = document.getElementById("app-shell");
const canvas = document.getElementById("graph-canvas");
const context = canvas.getContext("2d");
const searchInput = document.getElementById("search-input");
const explorerShell = document.getElementById("explorer-shell");
const panelResizer = document.getElementById("panel-resizer");
const detectivePanelResizer = document.getElementById("detective-panel-resizer");
const fitButton = document.getElementById("fit-button");
const resetButton = document.getElementById("reset-button");
const toolbarBackButton = document.getElementById("toolbar-back-button");
const detectiveButton = document.getElementById("detective-button");
const toolbarDetectiveActions = document.getElementById("toolbar-detective-actions");
const toolbarCreateLayerButton = document.getElementById("toolbar-create-layer-button");
const toolbarCreateNodeButton = document.getElementById("toolbar-create-node-button");
const toolbarDuplicateLayerButton = document.getElementById("toolbar-duplicate-layer-button");
const toolbarDeleteLayerButton = document.getElementById("toolbar-delete-layer-button");
const toolbarExportLayerButton = document.getElementById("toolbar-export-layer-button");
const toolbarImportLayerButton = document.getElementById("toolbar-import-layer-button");
const toolbarInspectButton = document.getElementById("toolbar-inspect-button");
const toolbarLocalGraphButton = document.getElementById("toolbar-local-graph-button");
const toolbarExpandButton = document.getElementById("toolbar-expand-button");
const toolbarBookmarkButton = document.getElementById("toolbar-bookmark-button");
const toolbarBookmarksButton = document.getElementById("toolbar-bookmarks-button");
const toolbarBookmarksPanel = document.getElementById("toolbar-bookmarks-panel");
const toolbarOptionsButton = document.getElementById("toolbar-options-button");
const toolbarOptionsPanel = document.getElementById("toolbar-options-panel");
const colorModeSelect = document.getElementById("color-mode");
const shapeModeSelect = document.getElementById("shape-mode");
const graphFilterToolbar = document.getElementById("graph-filter-toolbar");
const graphStatsBadge = document.getElementById("graph-stats-badge");
const noteContent = document.getElementById("note-content");
const noteMeta = document.getElementById("note-meta");
const detectivePanel = document.getElementById("detective-panel");
const investigatorTools = document.getElementById("investigator-tools");
const layerImportInput = document.getElementById("layer-import-input");
const graphStage = document.querySelector(".graph-stage");
const graphContextMenu = document.getElementById("graph-context-menu");
const contextInspectNodeButton = document.getElementById("context-inspect-node");
const contextOpenLocalGraphButton = document.getElementById("context-open-local-graph");
const contextExpandNodeButton = document.getElementById("context-expand-node");
const contextToggleBookmarkButton = document.getElementById("context-toggle-bookmark");
const layerContextMenu = document.getElementById("layer-context-menu");
const contextRenameLayerButton = document.getElementById("context-rename-layer");
const appTooltip = document.getElementById("app-tooltip");
const appScript = document.querySelector('script[src$="app.js"]');
const siteBaseUrl = new URL(".", appScript?.src || window.location.href);

const worker = new Worker("./search-worker.js");

const state = {
  baseNodes: [],
  baseEdges: [],
  baseCommunityNodes: [],
  baseCommunityEdges: [],
  baseMeta: {},
  baseSearchDocs: [],
  searchDocs: [],
  nodes: [],
  edges: [],
  communityById: new Map(),
  meta: {},
  nodeById: new Map(),
  view: "landing",
  graphRootNodeId: null,
  inspectNodeId: null,
  activeCommunityId: null,
  results: [],
  searchQuery: "",
  colorMode: "backlinks",
  shapeMode: "semantic",
  camera: { x: 0, y: 0, zoom: 1 },
  bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  visibleBounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  pointer: { x: 0, y: 0, active: false },
  hoverNodeId: null,
  hoverCommunityId: null,
  dragging: false,
  dragStart: { x: 0, y: 0, cameraX: 0, cameraY: 0 },
  activePointers: new Map(),
  pinching: false,
  pinchStart: { distance: 0, zoom: 1, centerX: 0, centerY: 0, worldX: 0, worldY: 0 },
  suppressNextClick: false,
  hasFitted: false,
  fittedSize: { width: 0, height: 0 },
  neighborMode: false,
  adjacency: new Map(),
  outboundAdjacency: new Map(),
  inboundAdjacency: new Map(),
  expandedNodeIds: new Set(),
  edgeRefs: [],
  tagIndex: new Map(),
  tagDisplayByKey: new Map(),
  primaryTagById: new Map(),
  metricExtents: new Map(),
  activeTagFilter: null,
  graphTagFilters: {
    requireAll: [],
    exclude: [],
  },
  graphTagFilterInput: "",
  graphTagFilterSelectionArmed: false,
  graphFilterToolbarRenderSignature: null,
  navigationBackStack: [],
  navigationRestoring: false,
  searchSuggestion: null,
  searchSelectedIndex: -1,
  searchExactNodeIds: [],
  searchWorkerReady: false,
  contextMenu: { open: false, nodeId: null },
  detectiveMode: false,
  panelWidth: 440,
  detectivePanelWidth: 420,
  noteRequestToken: 0,
  canonLayerVisible: true,
  investigationLayers: [],
  activeLayerId: null,
  bookmarkedNodeIds: [],
  investigationNotes: "",
  savedPaths: [],
  savedFilters: [],
  nodeNotes: {},
  customNodes: [],
  pathTargetNodeId: null,
  activePathNodeIds: [],
  activePathEdgeKeys: new Set(),
  pathFocus: false,
  visibleGraphStatsSignature: null,
  toolStatusMessage: "",
  optionsPanelOpen: false,
  bookmarksPanelOpen: false,
  noteLinkPickerNodeId: null,
  noteLinkQuery: "",
  noteLinkSelectionText: "",
  noteCursorNodeId: null,
  noteCursorStart: 0,
  noteCursorEnd: 0,
  layerContextMenu: { open: false, layerId: null },
  tooltip: { sourceType: null, sourceKey: null },
  pathFromNodeId: null,
  pathToNodeId: null,
  sharedNeighborLeftId: null,
  sharedNeighborRightId: null,
  detectiveSearchQuery: "",
  detectiveSearchTarget: null, // 'pathFrom' | 'pathTo' | 'sharedLeft' | 'sharedRight'
};

const INVESTIGATION_STORAGE_KEY = "org-roam-investigator-v1";
const DISPLAY_SETTINGS_STORAGE_KEY = "org-roam-display-settings-v1";
const INVESTIGATION_EXPORT_TYPE = "org-roam-investigation-layer";
const INVESTIGATION_SCHEMA_VERSION = 1;
const COLOR_MODES = new Set(["group", "links", "backlinks", "primary-tag"]);
const SHAPE_MODES = new Set(["none", "semantic"]);
const INVESTIGATION_LINK_RE = /\[\[((?:node|id):([^[\]]+))\](?:\[([^\]]+)\])?\]\]/g;
const LAYER_COLOR_PALETTE = [
  "#ffd46b",
  "#63d8ea",
  "#7ce38b",
  "#ff8c6b",
  "#c3a6ff",
  "#ff9ad5",
];

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = graphStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const previousWidth = state.fittedSize.width;
  const previousHeight = state.fittedSize.height;
  const sizeChangedAfterFit = (
    state.hasFitted
    && previousWidth
    && previousHeight
    && (Math.abs(rect.width - previousWidth) > 12 || Math.abs(rect.height - previousHeight) > 12)
  );

  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(ratio, ratio);

  if (state.nodes.length && (!state.hasFitted || (isClusterLandingView() && sizeChangedAfterFit))) {
    fitGraph();
    state.hasFitted = true;
    state.fittedSize = { width: rect.width, height: rect.height };
    return;
  }
  render();
}

function setActiveView(view) {
  state.view = view;
  if (view === "landing") {
    state.hoverNodeId = null;
    hideTooltip("node");
  } else {
    state.hoverCommunityId = null;
  }
  appShell.classList.toggle("is-exploring", view === "explorer");
  if (view === "explorer") {
    requestAnimationFrame(() => {
      applyPanelWidths(state.panelWidth, state.detectivePanelWidth, "note");
      resizeCanvas();
    });
  }
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

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, ms);
  };
}

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function timestamp() {
  return new Date().toISOString();
}

const debouncedSaveInvestigationState = debounce(() => {
  saveInvestigationState({ syncLayer: true });
}, 300);

const debouncedRebuildAndRender = debounce(() => {
  rebuildRuntimeGraphData();
  render();
}, 200);

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function buildTextTooltipMarkup(label) {
  return `<div class="app-tooltip-text">${escapeHtml(label)}</div>`;
}

function getTooltipAnchor(element) {
  if (!(element instanceof Element)) {
    return null;
  }
  return element.closest(".toolbar-tooltip-target") || element;
}

function setTooltipLabel(element, label) {
  const anchor = getTooltipAnchor(element);
  if (!anchor) {
    return;
  }
  if (anchor !== element) {
    element.removeAttribute("data-tooltip");
  }
  if (label) {
    anchor.dataset.tooltip = label;
    return;
  }
  anchor.removeAttribute("data-tooltip");
}

function initializeToolbarTooltipTargets() {
  document.querySelectorAll(".graph-toolbar .toolbar-icon-button[data-tooltip]").forEach((button) => {
    if (button.parentElement?.classList.contains("toolbar-tooltip-target")) {
      setTooltipLabel(button, button.dataset.tooltip);
      return;
    }

    const wrapper = document.createElement("span");
    wrapper.className = "toolbar-tooltip-target";
    button.parentNode.insertBefore(wrapper, button);
    wrapper.appendChild(button);
    setTooltipLabel(button, button.dataset.tooltip);
  });
}

function positionTooltip(clientX, clientY) {
  if (!appTooltip || appTooltip.hidden) {
    return;
  }
  const margin = 16;
  const offsetX = 18;
  const offsetY = 20;
  const tooltipRect = appTooltip.getBoundingClientRect();
  let left = clientX + offsetX;
  let top = clientY + offsetY;

  if (left + tooltipRect.width + margin > window.innerWidth) {
    left = Math.max(margin, clientX - tooltipRect.width - offsetX);
  }
  if (top + tooltipRect.height + margin > window.innerHeight) {
    top = Math.max(margin, clientY - tooltipRect.height - offsetY);
  }

  appTooltip.style.left = `${left}px`;
  appTooltip.style.top = `${top}px`;
}

function showTooltip({ html, clientX, clientY, sourceType, sourceKey }) {
  if (!appTooltip || !html) {
    return;
  }
  state.tooltip = { sourceType: sourceType || null, sourceKey: sourceKey || null };
  appTooltip.innerHTML = html;
  appTooltip.hidden = false;
  appTooltip.setAttribute("aria-hidden", "false");
  appTooltip.classList.add("is-visible");
  positionTooltip(clientX, clientY);
}

function hideTooltip(sourceType = null, sourceKey = null) {
  if (!appTooltip) {
    return;
  }
  if (sourceType && state.tooltip.sourceType !== sourceType) {
    return;
  }
  if (sourceKey !== null && state.tooltip.sourceKey !== sourceKey) {
    return;
  }
  state.tooltip = { sourceType: null, sourceKey: null };
  appTooltip.hidden = true;
  appTooltip.setAttribute("aria-hidden", "true");
  appTooltip.classList.remove("is-visible");
  appTooltip.innerHTML = "";
}

function updateTooltipPosition(clientX, clientY, sourceType = null, sourceKey = null) {
  if (!appTooltip || appTooltip.hidden) {
    return;
  }
  if (sourceType && state.tooltip.sourceType !== sourceType) {
    return;
  }
  if (sourceKey !== null && state.tooltip.sourceKey !== sourceKey) {
    return;
  }
  positionTooltip(clientX, clientY);
}

function edgeKey(leftId, rightId) {
  return leftId < rightId ? `${leftId}::${rightId}` : `${rightId}::${leftId}`;
}

function currentNodeId() {
  return state.inspectNodeId || state.graphRootNodeId || null;
}

function cloneGraphTagFilters(filters = state.graphTagFilters) {
  return {
    requireAll: [...(filters?.requireAll || [])],
    exclude: [...(filters?.exclude || [])],
  };
}

function getNavigationSnapshot() {
  return {
    view: state.view,
    graphRootNodeId: state.graphRootNodeId,
    inspectNodeId: state.inspectNodeId,
    activeCommunityId: state.activeCommunityId,
    activeTagFilter: state.activeTagFilter,
    graphTagFilters: cloneGraphTagFilters(),
    neighborMode: state.neighborMode,
    expandedNodeIds: [...state.expandedNodeIds],
    camera: { ...state.camera },
  };
}

function getNavigationSnapshotSignature(snapshot) {
  return JSON.stringify([
    snapshot.view || "",
    snapshot.graphRootNodeId || "",
    snapshot.inspectNodeId || "",
    snapshot.activeCommunityId || "",
    snapshot.activeTagFilter || "",
    snapshot.neighborMode ? 1 : 0,
    snapshot.graphTagFilters?.requireAll || [],
    snapshot.graphTagFilters?.exclude || [],
    snapshot.expandedNodeIds || [],
  ]);
}

function canNavigateBack() {
  return state.navigationBackStack.length > 0;
}

function rememberNavigationSnapshot() {
  if (state.navigationRestoring) {
    return;
  }
  const snapshot = getNavigationSnapshot();
  const signature = getNavigationSnapshotSignature(snapshot);
  const lastSignature = state.navigationBackStack[state.navigationBackStack.length - 1]?.signature;
  if (lastSignature === signature) {
    return;
  }
  state.navigationBackStack.push({ signature, snapshot });
  if (state.navigationBackStack.length > 80) {
    state.navigationBackStack.shift();
  }
}

function restoreNavigationSnapshot(snapshot, updateUrl = true) {
  if (!snapshot) {
    return;
  }
  state.navigationRestoring = true;
  try {
    hideContextMenu();
    hideTooltip("node");
    clearActivePath(false);
    state.activeCommunityId = snapshot.activeCommunityId || null;
    state.graphRootNodeId = snapshot.graphRootNodeId || null;
    state.inspectNodeId = snapshot.inspectNodeId || null;
    state.activeTagFilter = snapshot.activeTagFilter || null;
    state.graphTagFilters = cloneGraphTagFilters(snapshot.graphTagFilters);
    state.neighborMode = Boolean(snapshot.neighborMode);
    state.expandedNodeIds = new Set(snapshot.expandedNodeIds || []);
    setActiveView(snapshot.view || "landing");
    syncLayout(true);
    state.camera = { ...snapshot.camera };
    state.hoverNodeId = null;
    state.hoverCommunityId = null;
    if (currentNodeId() && state.nodeById.has(currentNodeId())) {
      loadNote(currentNodeId());
    } else {
      showEmptyNoteState();
      noteMeta.innerHTML = renderSearchCompletionsPanel();
    }
    render();
    if (updateUrl) {
      updateUrlState();
    }
  } finally {
    state.navigationRestoring = false;
    updateToolbarNodeActions();
    syncNoteTitleActions();
  }
}

function goBackInNavigationHistory() {
  const previousEntry = state.navigationBackStack.pop();
  if (!previousEntry) {
    return;
  }
  restoreNavigationSnapshot(previousEntry.snapshot);
}

function isBookmarked(nodeId) {
  return state.bookmarkedNodeIds.includes(nodeId);
}

function isPathNode(nodeId) {
  return state.activePathNodeIds.includes(nodeId);
}

function getBookmarkedNodes() {
  return state.bookmarkedNodeIds
    .map((nodeId) => state.nodeById.get(nodeId))
    .filter(Boolean);
}

function buildEmptyLayer(name = `Investigation ${state.investigationLayers.length + 1}`) {
  return {
    id: generateId("layer"),
    name,
    visible: true,
    color: colorForLayer(state.investigationLayers.length),
    notes: "",
    bookmarks: [],
    savedPaths: [],
    savedFilters: [],
    nodeNotes: {},
    customNodes: [],
    pathTargetNodeId: null,
    activePathNodeIds: [],
    pathFocus: false,
    createdAt: timestamp(),
    updatedAt: timestamp(),
  };
}

function sanitizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

function sanitizeSavedPath(raw, index = 0) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const nodeIds = sanitizeStringList(raw.nodeIds);
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : generateId("path"),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : `Saved Path ${index + 1}`,
    fromId: typeof raw.fromId === "string" ? raw.fromId : (nodeIds[0] || null),
    toId: typeof raw.toId === "string" ? raw.toId : (nodeIds[nodeIds.length - 1] || null),
    nodeIds,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : timestamp(),
  };
}

function sanitizeSavedFilter(raw, index = 0) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const mode = raw.mode === "tag" ? "tag" : "search";
  const value = typeof raw.value === "string" ? raw.value.trim() : "";
  if (!value) {
    return null;
  }
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : generateId("filter"),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : `${mode === "tag" ? "Tag" : "Search"} ${index + 1}`,
    mode,
    value,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : timestamp(),
  };
}

function sanitizeStringMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([key, value]) => typeof key === "string" && typeof value === "string")
      .map(([key, value]) => [key.trim(), value]),
  );
}

function scoreNodeSize(degree = 0) {
  return Math.max(5.4, Math.min(13.5, 5 + (Math.log2((degree || 0) + 2) * 1.9)));
}

function sanitizeCustomNode(raw, index = 0) {
  const id = typeof raw?.id === "string" && raw.id ? raw.id : generateId("custom-node");
  const title = typeof raw?.title === "string" && raw.title.trim() ? raw.title.trim() : `Untitled Lead ${index + 1}`;
  const tags = sanitizeStringList(raw?.tags);
  const aliases = sanitizeStringList(raw?.aliases);
  const x = Number.isFinite(raw?.x) ? Number(raw.x) : 0;
  const y = Number.isFinite(raw?.y) ? Number(raw.y) : 0;
  return {
    id,
    title,
    tags: tags.length ? tags : ["Investigation"],
    aliases,
    x,
    y,
    createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : timestamp(),
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : timestamp(),
  };
}

function sanitizeLayer(raw, index = 0) {
  const layer = buildEmptyLayer(`Investigation ${index + 1}`);
  if (!raw || typeof raw !== "object") {
    return layer;
  }
  layer.id = typeof raw.id === "string" && raw.id ? raw.id : layer.id;
  layer.name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : layer.name;
  layer.visible = raw.visible !== undefined ? Boolean(raw.visible) : true;
  layer.color = typeof raw.color === "string" && raw.color ? raw.color : colorForLayer(index);
  layer.notes = typeof raw.notes === "string" ? raw.notes : "";
  layer.bookmarks = sanitizeStringList(raw.bookmarks);
  layer.savedPaths = (Array.isArray(raw.savedPaths) ? raw.savedPaths : [])
    .map((item, itemIndex) => sanitizeSavedPath(item, itemIndex))
    .filter(Boolean);
  layer.savedFilters = (Array.isArray(raw.savedFilters) ? raw.savedFilters : [])
    .map((item, itemIndex) => sanitizeSavedFilter(item, itemIndex))
    .filter(Boolean);
  layer.nodeNotes = sanitizeStringMap(raw.nodeNotes);
  layer.customNodes = (Array.isArray(raw.customNodes) ? raw.customNodes : [])
    .map((item, itemIndex) => sanitizeCustomNode(item, itemIndex));
  layer.pathTargetNodeId = typeof raw.pathTargetNodeId === "string" ? raw.pathTargetNodeId : null;
  layer.activePathNodeIds = sanitizeStringList(raw.activePathNodeIds);
  layer.pathFocus = Boolean(raw.pathFocus);
  layer.createdAt = typeof raw.createdAt === "string" ? raw.createdAt : layer.createdAt;
  layer.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : layer.updatedAt;
  return layer;
}

function applyLayerToState(layer) {
  if (!layer) {
    state.investigationNotes = "";
    state.savedPaths = [];
    state.savedFilters = [];
    state.nodeNotes = {};
    state.customNodes = [];
    state.pathTargetNodeId = null;
    state.activePathNodeIds = [];
    state.pathFocus = false;
    state.activePathEdgeKeys = new Set();
    return;
  }
  state.investigationNotes = layer.notes;
  state.savedPaths = layer.savedPaths.map((path) => ({ ...path, nodeIds: path.nodeIds.slice() }));
  state.savedFilters = layer.savedFilters.map((filter) => ({ ...filter }));
  state.nodeNotes = { ...(layer.nodeNotes || {}) };
  state.customNodes = Array.isArray(layer.customNodes) ? layer.customNodes.map((node) => ({ ...node, tags: node.tags.slice(), aliases: node.aliases.slice() })) : [];
  state.pathTargetNodeId = layer.pathTargetNodeId;
  state.activePathNodeIds = layer.activePathNodeIds.slice();
  state.pathFocus = Boolean(layer.pathFocus && layer.activePathNodeIds.length);
  state.activePathEdgeKeys = new Set();
  for (let index = 1; index < state.activePathNodeIds.length; index += 1) {
    state.activePathEdgeKeys.add(edgeKey(state.activePathNodeIds[index - 1], state.activePathNodeIds[index]));
  }
}

function snapshotActiveLayer() {
  const activeLayer = state.investigationLayers.find((layer) => layer.id === state.activeLayerId);
  const baseLayer = activeLayer || buildEmptyLayer();
  return {
    ...baseLayer,
    name: baseLayer.name,
    notes: state.investigationNotes,
    bookmarks: state.bookmarkedNodeIds.slice(),
    savedPaths: state.savedPaths.map((path) => ({ ...path, nodeIds: path.nodeIds.slice() })),
    savedFilters: state.savedFilters.map((filter) => ({ ...filter })),
    nodeNotes: { ...state.nodeNotes },
    customNodes: state.customNodes.map((node) => ({ ...node, tags: node.tags.slice(), aliases: node.aliases.slice() })),
    pathTargetNodeId: state.pathTargetNodeId,
    activePathNodeIds: state.activePathNodeIds.slice(),
    pathFocus: state.pathFocus,
    updatedAt: timestamp(),
  };
}

function persistActiveLayerIntoCollection() {
  if (!state.activeLayerId) {
    return;
  }
  const snapshot = snapshotActiveLayer();
  let found = false;
  state.investigationLayers = state.investigationLayers.map((layer) => {
    if (layer.id !== state.activeLayerId) {
      return layer;
    }
    found = true;
    return snapshot;
  });
  if (!found) {
    state.investigationLayers = [...state.investigationLayers, snapshot];
  }
}

function ensureInvestigationLayers() {
  if (state.activeLayerId && state.investigationLayers.some((layer) => layer.id === state.activeLayerId)) {
    return;
  }
  state.activeLayerId = state.investigationLayers[0]?.id || null;
  applyLayerToState(getActiveLayer());
}

function getActiveLayer() {
  return state.investigationLayers.find((layer) => layer.id === state.activeLayerId) || null;
}

function isActiveLayerVisible() {
  const activeLayer = getActiveLayer();
  return Boolean(activeLayer?.visible);
}

function getRenderableLayers() {
  const activeSnapshot = snapshotActiveLayer();
  return state.investigationLayers.map((layer) => (
    layer.id === state.activeLayerId ? activeSnapshot : layer
  ));
}

function getVisibleInvestigationLayers() {
  if (!state.detectiveMode) {
    return [];
  }
  return getRenderableLayers().filter((layer) => layer.visible);
}

function getLayerById(layerId) {
  return getRenderableLayers().find((layer) => layer.id === layerId) || null;
}

function isLayerVisible(layerId) {
  return Boolean(getLayerById(layerId)?.visible);
}

function getKnownNodeIds() {
  const nodeIds = new Set(state.baseNodes.map((node) => node.id));
  for (const layer of getRenderableLayers()) {
    for (const customNode of layer.customNodes || []) {
      nodeIds.add(customNode.id);
    }
  }
  return nodeIds;
}

function extractNodeReferencesFromText(text) {
  if (!text || typeof text !== "string") {
    return [];
  }
  const nodeIds = new Set();
  INVESTIGATION_LINK_RE.lastIndex = 0;
  let match = INVESTIGATION_LINK_RE.exec(text);
  while (match) {
    const nodeId = String(match[2] || "").trim();
    if (nodeId) {
      nodeIds.add(nodeId);
    }
    match = INVESTIGATION_LINK_RE.exec(text);
  }
  return [...nodeIds];
}

function stripInvestigationMarkup(text) {
  if (!text) {
    return "";
  }
  return text
    .replace(INVESTIGATION_LINK_RE, (_, fullTarget, nodeId, label) => label || state.nodeById.get(nodeId)?.title || nodeId || fullTarget)
    .replace(/(^|[\s(])\*([^*]+)\*([\s).,;:!?]|$)/g, "$1$2$3")
    .replace(/(^|[\s(])\/([^/]+)\/([\s).,;:!?]|$)/g, "$1$2$3")
    .replace(/[=~]([^=~]+)[=~]/g, "$1");
}

function buildSearchDocFromNode(node, snippet = "") {
  const textSnippet = snippet || node.snippet || "";
  return {
    id: node.id,
    title: node.title,
    aliases: node.aliases || [],
    tags: node.tags || [],
    group: node.group || "misc",
    degree: node.degree || 0,
    snippet: textSnippet,
    titleNorm: normalize(node.title),
    aliasNorms: (node.aliases || []).map((alias) => normalize(alias)),
    tagNorms: (node.tags || []).map((tag) => normalize(tag)),
    snippetNorm: normalize(textSnippet),
  };
}

function refreshSearchWorkerIndex() {
  const customDocs = [];
  if (state.detectiveMode) {
    for (const layer of getVisibleInvestigationLayers()) {
      for (const customNode of layer.customNodes || []) {
        const runtimeNode = state.nodeById.get(customNode.id);
        if (!runtimeNode) {
          continue;
        }
        const noteText = layer.nodeNotes?.[customNode.id] || "";
        customDocs.push(buildSearchDocFromNode(runtimeNode, stripInvestigationMarkup(noteText)));
      }
    }
  }
  state.searchDocs = [...state.baseSearchDocs, ...customDocs];
  worker.postMessage({ type: "init", payload: { docs: state.searchDocs } });
}

function rebuildRuntimeGraphData() {
  const renderableLayers = getRenderableLayers();
  const runtimeNodes = state.baseNodes.map((node) => ({ ...node, isCustom: false, layerId: null }));
  const runtimeEdges = state.baseEdges.map((edge) => ({ ...edge, layerId: null, color: null, isInvestigation: false }));
  const nodeById = new Map(runtimeNodes.map((node) => [node.id, node]));
  const edgeDedup = new Set(runtimeEdges.map((edge) => `${edge.layerId || "canon"}::${edge.source}::${edge.target}`));

  for (const layer of renderableLayers) {
    for (const customNode of layer.customNodes || []) {
      const runtimeNode = {
        id: customNode.id,
        title: customNode.title,
        x: customNode.x,
        y: customNode.y,
        size: scoreNodeSize(0),
        color: layer.color,
        group: "Investigation",
        degree: 0,
        inbound: 0,
        outbound: 0,
        tags: customNode.tags || ["Investigation"],
        aliases: customNode.aliases || [],
        isCustom: true,
        layerId: layer.id,
      };
      runtimeNodes.push(runtimeNode);
      nodeById.set(runtimeNode.id, runtimeNode);
    }
  }

  for (const layer of renderableLayers) {
    for (const [sourceId, noteText] of Object.entries(layer.nodeNotes || {})) {
      if (!nodeById.has(sourceId) || !noteText.trim()) {
        continue;
      }
      for (const targetId of extractNodeReferencesFromText(noteText)) {
        if (!nodeById.has(targetId)) {
          continue;
        }
        const dedupKey = `${layer.id}::${sourceId}::${targetId}`;
        if (edgeDedup.has(dedupKey)) {
          continue;
        }
        edgeDedup.add(dedupKey);
        runtimeEdges.push({
          source: sourceId,
          target: targetId,
          layerId: layer.id,
          color: layer.color,
          isInvestigation: true,
        });
      }
    }
  }

  for (const node of runtimeNodes) {
    if (node.isCustom) {
      node.inbound = 0;
      node.outbound = 0;
      node.degree = 0;
    }
  }

  for (const edge of runtimeEdges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) {
      continue;
    }
    if (edge.isInvestigation) {
      sourceNode.outbound = (sourceNode.outbound || 0) + 1;
      targetNode.inbound = (targetNode.inbound || 0) + 1;
    }
  }

  for (const node of runtimeNodes) {
    node.degree = (node.inbound || 0) + (node.outbound || 0);
    node.size = scoreNodeSize(node.degree || 0);
    if (node.isCustom) {
      node.color = getLayerById(node.layerId)?.color || node.color;
    }
  }

  state.nodes = runtimeNodes;
  state.edges = runtimeEdges;
  state.nodeById = nodeById;
  state.meta = {
    ...state.baseMeta,
    nodeCount: runtimeNodes.length,
    edgeCount: runtimeEdges.length,
  };
  state.bounds = computeBounds(state.nodes);
  buildAdjacency();
  buildTagIndex();
  buildAppearanceData();
  buildSimulationData();
  refreshSearchWorkerIndex();
}

function getLayerOverlayData() {
  const bookmarkColorsByNodeId = new Map();
  const pathEdges = [];
  const overlayNodeIds = new Set();

  for (const layer of getVisibleInvestigationLayers()) {
    for (const nodeId of layer.bookmarks) {
      overlayNodeIds.add(nodeId);
      if (!bookmarkColorsByNodeId.has(nodeId)) {
        bookmarkColorsByNodeId.set(nodeId, []);
      }
      bookmarkColorsByNodeId.get(nodeId).push(layer.color);
    }

    for (const [sourceId, noteText] of Object.entries(layer.nodeNotes || {})) {
      if (!noteText.trim()) {
        continue;
      }
      overlayNodeIds.add(sourceId);
      extractNodeReferencesFromText(noteText).forEach((targetId) => overlayNodeIds.add(targetId));
    }

    const pathCollections = [...layer.savedPaths.map((path) => path.nodeIds)];
    if (layer.id === state.activeLayerId && layer.activePathNodeIds.length > 1) {
      pathCollections.push(layer.activePathNodeIds);
    }

    for (const nodeIds of pathCollections) {
      for (let index = 0; index < nodeIds.length; index += 1) {
        overlayNodeIds.add(nodeIds[index]);
      }
      for (let index = 1; index < nodeIds.length; index += 1) {
        pathEdges.push({
          key: edgeKey(nodeIds[index - 1], nodeIds[index]),
          color: layer.color,
          sourceId: nodeIds[index - 1],
          targetId: nodeIds[index],
          isActive: layer.id === state.activeLayerId && nodeIds.join("|") === layer.activePathNodeIds.join("|"),
        });
      }
    }
  }

  return {
    bookmarkColorsByNodeId,
    pathEdges,
    overlayNodeIds,
  };
}

function setToolStatusMessage(message) {
  state.toolStatusMessage = message;
  renderInvestigatorTools();
}

function saveInvestigationState({ syncLayer = true } = {}) {
  if (syncLayer) {
    persistActiveLayerIntoCollection();
  }
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(
    INVESTIGATION_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: INVESTIGATION_SCHEMA_VERSION,
      canonLayerVisible: state.canonLayerVisible,
      detectiveMode: state.detectiveMode,
      bookmarks: state.bookmarkedNodeIds,
      activeLayerId: state.activeLayerId,
      layers: state.investigationLayers,
    }),
  );
}

function loadInvestigationState() {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const raw = storage.getItem(INVESTIGATION_STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    state.canonLayerVisible = parsed.canonLayerVisible !== undefined ? Boolean(parsed.canonLayerVisible) : true;
    state.detectiveMode = Boolean(parsed.detectiveMode);
    state.investigationLayers = (Array.isArray(parsed.layers) ? parsed.layers : [])
      .map((layer, index) => sanitizeLayer(layer, index));
    state.bookmarkedNodeIds = sanitizeStringList(
      Array.isArray(parsed.bookmarks)
        ? parsed.bookmarks
        : state.investigationLayers.flatMap((layer) => layer.bookmarks || []),
    );
    ensureInvestigationLayers();
    const preferredLayerId = typeof parsed.activeLayerId === "string" ? parsed.activeLayerId : state.investigationLayers[0]?.id;
    state.activeLayerId = state.investigationLayers.some((layer) => layer.id === preferredLayerId)
      ? preferredLayerId
      : (state.investigationLayers[0]?.id || null);
    applyLayerToState(getActiveLayer());
  } catch {
    state.canonLayerVisible = true;
    state.detectiveMode = false;
    state.bookmarkedNodeIds = [];
    state.investigationLayers = [];
    state.activeLayerId = null;
    ensureInvestigationLayers();
  }
}

function saveDisplaySettings() {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(
    DISPLAY_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      colorMode: state.colorMode,
      shapeMode: state.shapeMode,
    }),
  );
}

function loadDisplaySettings() {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const raw = storage.getItem(DISPLAY_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (COLOR_MODES.has(parsed.colorMode)) {
      state.colorMode = parsed.colorMode;
    }
    if (SHAPE_MODES.has(parsed.shapeMode)) {
      state.shapeMode = parsed.shapeMode;
    }
  } catch {
    storage.removeItem(DISPLAY_SETTINGS_STORAGE_KEY);
  }
}

function setActiveLayer(layerId, { shouldRender = true, shouldFit = false } = {}) {
  if (!layerId || layerId === state.activeLayerId) {
    if (shouldRender) {
      renderInvestigatorTools();
    }
    return;
  }
  persistActiveLayerIntoCollection();
  state.activeLayerId = layerId;
  const activeLayer = getActiveLayer();
  if (!activeLayer) {
    ensureInvestigationLayers();
    return;
  }
  applyLayerToState(activeLayer);
  saveInvestigationState({ syncLayer: false });
  rebuildRuntimeGraphData();
  if (currentNodeId() && state.nodeById.has(currentNodeId())) {
    loadNote(currentNodeId());
  }
  if (shouldRender) {
    renderInvestigatorTools();
    if (shouldFit && state.graphRootNodeId) {
      fitGraph();
    } else {
      render();
    }
  }
}

function validateInvestigationLayersAgainstGraph() {
  const validNodeIds = getKnownNodeIds();
  state.bookmarkedNodeIds = state.bookmarkedNodeIds.filter((nodeId) => validNodeIds.has(nodeId));
  state.investigationLayers = state.investigationLayers.map((layer, index) => {
    const nextLayer = sanitizeLayer(layer, index);
    nextLayer.bookmarks = nextLayer.bookmarks.filter((nodeId) => validNodeIds.has(nodeId));
    nextLayer.savedPaths = nextLayer.savedPaths
      .map((savedPath, pathIndex) => sanitizeSavedPath(savedPath, pathIndex))
      .filter(Boolean)
      .map((savedPath) => ({
        ...savedPath,
        nodeIds: savedPath.nodeIds.filter((nodeId) => validNodeIds.has(nodeId)),
      }))
      .filter((savedPath) => savedPath.nodeIds.length >= 2);
    nextLayer.nodeNotes = Object.fromEntries(
      Object.entries(nextLayer.nodeNotes || {})
        .filter(([nodeId]) => validNodeIds.has(nodeId))
        .map(([nodeId, text]) => [nodeId, text]),
    );
    nextLayer.customNodes = nextLayer.customNodes
      .map((customNode, customIndex) => sanitizeCustomNode(customNode, customIndex))
      .filter((customNode) => validNodeIds.has(customNode.id));
    nextLayer.pathTargetNodeId = validNodeIds.has(nextLayer.pathTargetNodeId) ? nextLayer.pathTargetNodeId : null;
    nextLayer.activePathNodeIds = nextLayer.activePathNodeIds.filter((nodeId) => validNodeIds.has(nodeId));
    nextLayer.pathFocus = nextLayer.pathFocus && nextLayer.activePathNodeIds.length >= 2;
    return nextLayer;
  });
  ensureInvestigationLayers();
  if (!state.investigationLayers.some((layer) => layer.id === state.activeLayerId)) {
    state.activeLayerId = state.investigationLayers[0]?.id || null;
  }
  applyLayerToState(getActiveLayer());
}

function isYearTag(tag) {
  return /^\d{4}$/.test(tag);
}

function pickPrimaryTag(node) {
  for (const tag of node.tags || []) {
    if (tag === "galnet" || isYearTag(tag)) {
      continue;
    }
    return tag;
  }
  return node.group || "misc";
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function interpolateColor(startHex, endHex, ratio) {
  const start = startHex.match(/\w\w/g).map((part) => Number.parseInt(part, 16));
  const end = endHex.match(/\w\w/g).map((part) => Number.parseInt(part, 16));
  const channels = start.map((channel, index) => Math.round(channel + (end[index] - channel) * ratio));
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}

function interpolateColorRamp(stops, ratio) {
  const clamped = clamp(ratio, 0, 1);
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  return interpolateColor(stops[index], stops[index + 1], scaled - index);
}

function classifySemanticShape(node) {
  if (node.isCustom) {
    return "hexagon";
  }
  const tags = new Set((node.tags || []).map((tag) => canonicalizeTag(tag)));
  const hasAny = (...values) => values.some((value) => tags.has(value));

  if (hasAny("system", "planet", "station", "settlement", "permit", "sector", "region", "nebula", "cluster")) {
    return "square";
  }
  if (hasAny("beacon", "communitygoal", "galnet", "event", "war", "election", "historicalevent")) {
    return "diamond";
  }
  if (hasAny("individual", "commander")) {
    return "person";
  }
  if (hasAny("empire", "federation", "alliance", "faction", "corporation", "thargoid", "guardian", "power")) {
    return "triangle";
  }
  if (hasAny("ship", "commodity", "component", "module", "weapon", "technology")) {
    return "hexagon";
  }
  return "circle";
}

function getNodeShape(node) {
  if (state.shapeMode !== "semantic") {
    return "circle";
  }
  return classifySemanticShape(node);
}

function tracePersonShape(pathContext, x, y, radiusX, radiusY) {
  const headRadiusX = radiusX * 0.42;
  const headRadiusY = radiusY * 0.42;
  const headY = y - radiusY * 0.34;
  const neckHalfWidth = radiusX * 0.18;
  const shoulderHalfWidth = radiusX * 0.62;
  const shoulderY = y + radiusY * 0.18;
  const baseY = y + radiusY * 0.82;
  const headBaseY = headY + headRadiusY * 0.84;

  pathContext.moveTo(x - shoulderHalfWidth, baseY);
  pathContext.quadraticCurveTo(
    x - shoulderHalfWidth * 0.98,
    shoulderY + radiusY * 0.22,
    x - shoulderHalfWidth * 0.72,
    shoulderY,
  );
  pathContext.quadraticCurveTo(
    x - neckHalfWidth * 1.6,
    shoulderY - radiusY * 0.08,
    x - neckHalfWidth,
    headBaseY,
  );
  pathContext.bezierCurveTo(
    x - headRadiusX,
    headY + headRadiusY * 0.28,
    x - headRadiusX,
    headY - headRadiusY,
    x,
    headY - headRadiusY,
  );
  pathContext.bezierCurveTo(
    x + headRadiusX,
    headY - headRadiusY,
    x + headRadiusX,
    headY + headRadiusY * 0.28,
    x + neckHalfWidth,
    headBaseY,
  );
  pathContext.quadraticCurveTo(
    x + neckHalfWidth * 1.6,
    shoulderY - radiusY * 0.08,
    x + shoulderHalfWidth * 0.72,
    shoulderY,
  );
  pathContext.quadraticCurveTo(
    x + shoulderHalfWidth * 0.98,
    shoulderY + radiusY * 0.22,
    x + shoulderHalfWidth,
    baseY,
  );
  pathContext.closePath();
}

function traceNodeShape(pathContext, shape, x, y, radius) {
  pathContext.beginPath();

  if (shape === "square") {
    pathContext.rect(x - radius, y - radius, radius * 2, radius * 2);
    return;
  }

  if (shape === "diamond") {
    pathContext.moveTo(x, y - radius);
    pathContext.lineTo(x + radius, y);
    pathContext.lineTo(x, y + radius);
    pathContext.lineTo(x - radius, y);
    pathContext.closePath();
    return;
  }

  if (shape === "triangle") {
    const halfWidth = radius * 0.94;
    pathContext.moveTo(x, y - radius);
    pathContext.lineTo(x + halfWidth, y + radius * 0.8);
    pathContext.lineTo(x - halfWidth, y + radius * 0.8);
    pathContext.closePath();
    return;
  }

  if (shape === "person") {
    tracePersonShape(pathContext, x, y, radius, radius);
    return;
  }

  if (shape === "hexagon") {
    for (let side = 0; side < 6; side += 1) {
      const angle = -Math.PI / 2 + (Math.PI / 3) * side;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      if (side === 0) {
        pathContext.moveTo(pointX, pointY);
      } else {
        pathContext.lineTo(pointX, pointY);
      }
    }
    pathContext.closePath();
    return;
  }

  pathContext.arc(x, y, radius, 0, Math.PI * 2);
}

function strokeNodeOutline(shape, x, y, radius, color, lineWidth, alpha = 1) {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  traceNodeShape(context, shape, x, y, radius);
  context.stroke();
  context.restore();
}

function strokeNodeHalo(shape, x, y, baseRadius, gap, color, lineWidth, alpha = 1) {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  if (shape === "person") {
    context.beginPath();
    tracePersonShape(context, x, y, baseRadius + gap, baseRadius + gap * 0.55);
  } else {
    traceNodeShape(context, shape, x, y, baseRadius + gap);
  }
  context.stroke();
  context.restore();
}

function buildTagIndex() {
  const index = new Map();
  const displayByKey = new Map();
  for (const node of state.nodes) {
    for (const rawTag of node.tags || []) {
      const normalizedTag = canonicalizeTag(rawTag);
      if (!normalizedTag) {
        continue;
      }
      if (!index.has(normalizedTag)) {
        index.set(normalizedTag, []);
      }
      if (!displayByKey.has(normalizedTag)) {
        displayByKey.set(normalizedTag, rawTag);
      }
      index.get(normalizedTag).push(node);
    }
  }
  for (const [tag, nodes] of index.entries()) {
    nodes.sort((left, right) => right.degree - left.degree || left.title.localeCompare(right.title));
    index.set(tag, nodes);
  }
  state.tagIndex = index;
  state.tagDisplayByKey = displayByKey;
}

function buildAppearanceData() {
  const primaryTags = new Map();
  for (const node of state.nodes) {
    primaryTags.set(node.id, pickPrimaryTag(node));
  }
  state.primaryTagById = primaryTags;

  const metrics = {
    links: state.nodes.map((node) => node.degree || 0),
    backlinks: state.nodes.map((node) => node.inbound || 0),
  };

  state.metricExtents = new Map(
    Object.entries(metrics).map(([key, values]) => {
      if (!values.length) {
        return [key, { min: 0, max: 1 }];
      }
      const sorted = [...values].sort((left, right) => left - right);
      const percentileIndex = Math.floor((sorted.length - 1) * 0.96);
      const displayMax = Math.max(1, sorted[percentileIndex] || 1);
      return [key, {
        min: 0,
        max: displayMax,
      }];
    }),
  );
}

function logNormalize(value, min, max) {
  const safeValue = Math.max(0, value);
  const safeMin = Math.max(0, min);
  const safeMax = Math.max(0, max);

  if (safeMax === safeMin) return 0.5;

  return clamp(
    (Math.log1p(safeValue) - Math.log1p(safeMin)) /
      (Math.log1p(safeMax) - Math.log1p(safeMin)),
    0,
    1
  );
}

function getNodeColor(node) {
  if (state.colorMode === "group") {
    return node.color;
  }

  if (state.colorMode === "primary-tag") {
    const tag = state.primaryTagById.get(node.id) || "misc";
    const hue = hashString(tag) % 360;
    return `hsl(${hue} 60% 58%)`;
  }

  const metric = getNodeMetricValue(node, state.colorMode);
  const range = state.metricExtents.get(state.colorMode) || { min: 0, max: 1 };

  const normalized = logNormalize(metric, range.min, range.max);

  const eased = Math.pow(normalized, 0.72);

  return interpolateColorRamp(["#1f3b73", "#1ba6b8", "#ffd46b", "#ff7a45"], eased);
}

function getNodeMetricValue(node, mode) {
  if (mode === "links") {
    return node.degree || 0;
  }
  if (mode === "backlinks") {
    return node.inbound || 0;
  }
  return 0;
}

function hasActiveGraphTagFilters() {
  return (
    state.graphTagFilters.requireAll.length > 0
    || state.graphTagFilters.exclude.length > 0
  );
}

function nodeHasTag(node, tag) {
  const normalizedTag = canonicalizeTag(tag);
  return (node.tags || []).some((candidate) => canonicalizeTag(candidate) === normalizedTag);
}

function nodeMatchesGraphTagFilters(node) {
  const { requireAll, exclude } = state.graphTagFilters;
  if (exclude.some((tag) => nodeHasTag(node, tag))) {
    return false;
  }
  return requireAll.length > 0
    ? requireAll.every((tag) => nodeHasTag(node, tag))
    : true;
}

function applyGraphTagFilters(visibleIds) {
  if (!hasActiveGraphTagFilters()) {
    return visibleIds;
  }
  const anchors = new Set([state.graphRootNodeId, state.inspectNodeId].filter(Boolean));
  const candidateNodes = visibleIds
    ? state.nodes.filter((node) => visibleIds.has(node.id) && isRuntimeNodeVisible(node))
    : state.nodes.filter((node) => isRuntimeNodeVisible(node));
  const filteredIds = new Set();
  for (const node of candidateNodes) {
    if (anchors.has(node.id) || nodeMatchesGraphTagFilters(node)) {
      filteredIds.add(node.id);
    }
  }
  return filteredIds;
}

function getBaseVisibleNodeIds() {
  if (!state.canonLayerVisible && state.detectiveMode) {
    const overlayData = getLayerOverlayData();
    const visibleIds = new Set(overlayData.overlayNodeIds);
    for (const node of state.nodes) {
      if (node.isCustom && isRuntimeNodeVisible(node)) {
        visibleIds.add(node.id);
      }
    }
    if (state.graphRootNodeId) {
      visibleIds.add(state.graphRootNodeId);
    }
    if (state.inspectNodeId) {
      visibleIds.add(state.inspectNodeId);
    }
    return visibleIds;
  }

  if (state.detectiveMode && state.pathFocus && state.activePathNodeIds.length) {
    const visibleIds = new Set(state.activePathNodeIds);
    if (state.graphRootNodeId) {
      visibleIds.add(state.graphRootNodeId);
    }
    if (state.inspectNodeId) {
      visibleIds.add(state.inspectNodeId);
    }
    return visibleIds;
  }

  if (state.activeCommunityId && !state.neighborMode) {
    const visibleIds = new Set(
      state.nodes
        .filter((node) => node.community === state.activeCommunityId && isRuntimeNodeVisible(node))
        .map((node) => node.id),
    );
    if (state.inspectNodeId) {
      visibleIds.add(state.inspectNodeId);
    }
    return visibleIds;
  }

  if (state.activeTagFilter) {
    const visibleIds = new Set(getNodesForTag(state.activeTagFilter).map((node) => node.id));
    if (state.graphRootNodeId) {
      visibleIds.add(state.graphRootNodeId);
    }
    if (state.inspectNodeId) {
      visibleIds.add(state.inspectNodeId);
    }
    return visibleIds;
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

  const visibleCustomIds = state.nodes
    .filter((node) => node.isCustom && isRuntimeNodeVisible(node))
    .map((node) => node.id);
  if (visibleCustomIds.length) {
    if (!visibleIds) {
      visibleIds = new Set();
    }
    visibleCustomIds.forEach((nodeId) => visibleIds.add(nodeId));
  }

  if (visibleIds) {
    for (const nodeId of [...visibleIds]) {
      const node = state.nodeById.get(nodeId);
      if (node && !isRuntimeNodeVisible(node)) {
        visibleIds.delete(nodeId);
      }
    }
  }

  return visibleIds;
}

function isRuntimeNodeVisible(node) {
  if (state.detectiveMode && state.pathFocus && state.activePathNodeIds.includes(node.id)) {
    return true;
  }
  if (!node?.isCustom) {
    return true;
  }
  return state.detectiveMode && isLayerVisible(node.layerId);
}

function isRuntimeEdgeVisible(edge) {
  if (state.detectiveMode && state.pathFocus && state.activePathEdgeKeys.has(edgeKey(edge.source, edge.target))) {
    return true;
  }
  if (!edge?.layerId) {
    return state.canonLayerVisible || !state.detectiveMode;
  }
  return state.detectiveMode && isLayerVisible(edge.layerId);
}

function getVisibleNodeIds() {
  return applyGraphTagFilters(getBaseVisibleNodeIds());
}

function getPrimarySearchNodeId() {
  if (state.searchExactNodeIds.length === 1) {
    return state.searchExactNodeIds[0];
  }
  return state.results[0]?.id || null;
}

function getVisibleSearchResults() {
  return state.results.slice(0, 8);
}

function getDefaultSearchSelectedIndex() {
  const results = getVisibleSearchResults();
  if (!results.length) {
    return -1;
  }
  if (state.searchSuggestion?.id) {
    const suggestionIndex = results.findIndex((result) => result.id === state.searchSuggestion.id);
    if (suggestionIndex >= 0) {
      return suggestionIndex;
    }
  }
  return 0;
}

function getSelectedSearchNodeId() {
  const results = getVisibleSearchResults();
  if (!results.length) {
    return state.searchSuggestion?.id || getPrimarySearchNodeId();
  }
  if (state.searchSelectedIndex >= 0 && state.searchSelectedIndex < results.length) {
    return results[state.searchSelectedIndex].id;
  }
  return state.searchSuggestion?.id || results[0]?.id || null;
}

function moveSearchSelection(delta) {
  const results = getVisibleSearchResults();
  if (!results.length) {
    return;
  }
  const currentIndex = (
    state.searchSelectedIndex >= 0 && state.searchSelectedIndex < results.length
      ? state.searchSelectedIndex
      : getDefaultSearchSelectedIndex()
  );
  state.searchSelectedIndex = (currentIndex + delta + results.length) % results.length;
  updateCurrentNoteMeta();
}

function commitSearchSelection(nodeId = getSelectedSearchNodeId()) {
  if (!nodeId) {
    return;
  }
  searchInput.value = "";
  resetSearchState();
  selectNode(nodeId, true);
}

function showEmptyNoteState(message = "Select a node or search result to inspect a note.") {
  state.noteLinkPickerNodeId = null;
  state.noteLinkQuery = "";
  state.noteLinkSelectionText = "";
  noteMeta.innerHTML = "";
  noteContent.innerHTML = `<div class="empty-state"><p>${escapeHtml(message)}</p></div>`;
  renderInvestigatorTools();
}

function applyPanelWidths(noteWidth = state.panelWidth, detectiveWidth = state.detectivePanelWidth, preferred = "note") {
  const shellWidth = explorerShell.getBoundingClientRect().width;
  if (!shellWidth) {
    return;
  }
  const minGraphWidth = 280;
  const minNoteWidth = 320;
  const minDetectiveWidth = 260;
  const resizerWidth = 12;

  if (!state.detectiveMode) {
    const maxNoteWidth = Math.max(minNoteWidth, shellWidth - minGraphWidth - resizerWidth);
    state.panelWidth = Math.max(minNoteWidth, Math.min(maxNoteWidth, noteWidth));
    explorerShell.style.setProperty("--note-panel-width", `${state.panelWidth}px`);
    explorerShell.style.setProperty("--detective-panel-width", `${state.detectivePanelWidth}px`);
    return;
  }

  const maxCombinedWidth = Math.max(
    minNoteWidth + minDetectiveWidth,
    shellWidth - minGraphWidth - (resizerWidth * 2),
  );

  let nextNoteWidth = Math.max(minNoteWidth, Math.min(maxCombinedWidth - minDetectiveWidth, noteWidth));
  let nextDetectiveWidth = Math.max(minDetectiveWidth, Math.min(maxCombinedWidth - minNoteWidth, detectiveWidth));

  if (nextNoteWidth + nextDetectiveWidth > maxCombinedWidth) {
    if (preferred === "detective") {
      nextNoteWidth = Math.max(minNoteWidth, Math.min(maxCombinedWidth - minDetectiveWidth, maxCombinedWidth - nextDetectiveWidth));
    } else {
      nextDetectiveWidth = Math.max(
        minDetectiveWidth,
        Math.min(maxCombinedWidth - minNoteWidth, maxCombinedWidth - nextNoteWidth),
      );
    }
  }

  state.panelWidth = nextNoteWidth;
  state.detectivePanelWidth = nextDetectiveWidth;
  explorerShell.style.setProperty("--note-panel-width", `${state.panelWidth}px`);
  explorerShell.style.setProperty("--detective-panel-width", `${state.detectivePanelWidth}px`);
}

function resetSearchState() {
  state.searchQuery = "";
  state.results = [];
  state.searchSuggestion = null;
  state.searchSelectedIndex = -1;
  state.searchExactNodeIds = [];
}

function applySearchResults(payload) {
  const results = payload.results || [];
  const query = state.searchQuery.trim();
  state.results = query ? results : [];
  state.searchSuggestion = query ? payload.suggestion || null : null;
  state.searchSelectedIndex = query ? getDefaultSearchSelectedIndex() : -1;
  state.searchExactNodeIds = query ? (payload.exactIds || []) : [];

  if (!query) {
    if (state.inspectNodeId) {
      loadNote(state.inspectNodeId);
    } else {
      render();
    }
    return;
  }

  const focusNodeId = getPrimarySearchNodeId();
  if (!focusNodeId) {
    if (state.inspectNodeId) {
      loadNote(state.inspectNodeId);
    } else {
      render();
    }
    return;
  }

  state.activeTagFilter = null;
  if (state.graphRootNodeId === focusNodeId && state.inspectNodeId === focusNodeId && state.neighborMode) {
    loadNote(focusNodeId);
    setActiveView("explorer");
    syncLayout(true);
    fitGraph();
    updateUrlState();
    return;
  }
  selectNode(focusNodeId, true);
}

function updateSearchQuery(query) {
  state.searchQuery = query;
  if (!state.searchWorkerReady) return;
  querySearch(query);
}

function focusFirstSearchResult() {
  commitSearchSelection();
}

function clearSearch() {
  searchInput.value = "";
  resetSearchState();
  if (state.inspectNodeId) {
    loadNote(state.inspectNodeId);
    return;
  }
  render();
}

function updateStatus() {
  return;
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
  state.hasFitted = true;
  state.fittedSize = { width: rect.width, height: rect.height };
  state.visibleBounds = bounds;
  render();
}

function fitGraph() {
  fitNodes(isClusterLandingView() ? state.baseCommunityNodes : getVisibleNodes());
}

function scheduleLandingFit() {
  if (!isClusterLandingView()) {
    return;
  }
  const refit = () => {
    if (!isClusterLandingView()) {
      return;
    }
    state.hasFitted = false;
    state.fittedSize = { width: 0, height: 0 };
    resizeCanvas();
  };
  requestAnimationFrame(refit);
  [80, 180, 360, 720, 1200].forEach((delay) => {
    window.setTimeout(refit, delay);
  });
}

function getLabelNodes(nodes) {
  const labelNodes = [];
  const seen = new Set();
  const rootId = state.graphRootNodeId;
  const inspectId = state.inspectNodeId || rootId;

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
  if (state.detectiveMode && state.activePathNodeIds.length && (state.pathFocus || state.activePathNodeIds.length <= 10)) {
    for (const nodeId of state.activePathNodeIds) {
      addNode(state.nodeById.get(nodeId));
    }
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
    return state.nodes.filter((node) => isRuntimeNodeVisible(node));
  }
  return state.nodes.filter((node) => visibleIds.has(node.id) && isRuntimeNodeVisible(node));
}

function getVisibleEdges() {
  const visibleIds = getVisibleNodeIds();
  if (!visibleIds) {
    return state.edges.filter((edge) => isRuntimeEdgeVisible(edge));
  }
  return state.edges.filter((edge) => (
    visibleIds.has(edge.source) && visibleIds.has(edge.target) && isRuntimeEdgeVisible(edge)
  ));
}

function getVisibleEdgeRefs() {
  const visibleIds = getVisibleNodeIds();
  if (!visibleIds) {
    return state.edgeRefs.filter((edge) => isRuntimeEdgeVisible(edge));
  }
  return state.edgeRefs.filter((edge) => (
    visibleIds.has(edge.source.id) && visibleIds.has(edge.target.id) && isRuntimeEdgeVisible(edge)
  ));
}

function getCommunityEdgeRefs() {
  return state.baseCommunityEdges
    .map((edge) => ({
      ...edge,
      sourceNode: state.communityById.get(edge.source),
      targetNode: state.communityById.get(edge.target),
    }))
    .filter((edge) => edge.sourceNode && edge.targetNode);
}

function isClusterLandingView() {
  return state.view === "landing" && !state.activeTagFilter && !hasActiveGraphTagFilters();
}

function getHoverContext(visibleNodes) {
  if (!state.hoverNodeId || state.dragging) {
    return null;
  }

  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  if (!visibleNodeIds.has(state.hoverNodeId)) {
    return null;
  }

  const neighborIds = new Set();
  const adjacentIds = state.adjacency.get(state.hoverNodeId) || new Set();
  for (const nodeId of adjacentIds) {
    if (visibleNodeIds.has(nodeId)) {
      neighborIds.add(nodeId);
    }
  }

  return {
    nodeId: state.hoverNodeId,
    neighborIds,
  };
}

function renderNodeLabels(nodes) {
  const rect = graphStage.getBoundingClientRect();
  const rootId = state.graphRootNodeId;
  const inspectId = state.inspectNodeId || rootId;

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

function reportVisibleGraphStats(visibleNodeCount, visibleLinkCount) {
  if (graphStatsBadge) {
    const totalNodeCount = state.baseMeta?.nodeCount ?? state.baseNodes.length;
    const totalLinkCount = state.baseMeta?.edgeCount ?? state.baseEdges.length;
    graphStatsBadge.textContent = `${visibleNodeCount} nodes, ${visibleLinkCount} links`;
    setTooltipLabel(graphStatsBadge, `Total: ${totalNodeCount} nodes, ${totalLinkCount} links`);
  }
  const signature = `${visibleNodeCount}:${visibleLinkCount}`;
  if (state.visibleGraphStatsSignature === signature) {
    return;
  }
  state.visibleGraphStatsSignature = signature;
  console.info(`[graph] visible: ${visibleNodeCount} nodes, ${visibleLinkCount} links`);
}

function pickCommunityAt(clientX, clientY) {
  const rect = graphStage.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let winner = null;
  let winnerDistance = Number.POSITIVE_INFINITY;

  for (const community of state.baseCommunityNodes) {
    const point = worldToScreen(community);
    const radius = Math.max(10, community.size * state.camera.zoom * 0.46);
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= radius && distance < winnerDistance) {
      winner = community;
      winnerDistance = distance;
    }
  }

  return winner;
}

function renderLandingGraph(rect) {
  const communityNodes = state.baseCommunityNodes;
  const communityEdges = getCommunityEdgeRefs();
  reportVisibleGraphStats(communityNodes.length, communityEdges.length);

  const hoveredCommunityId = state.hoverCommunityId;
  const hoveredNeighbors = new Set();
  if (hoveredCommunityId) {
    for (const edge of communityEdges) {
      if (edge.source === hoveredCommunityId) {
        hoveredNeighbors.add(edge.target);
      } else if (edge.target === hoveredCommunityId) {
        hoveredNeighbors.add(edge.source);
      }
    }
  }

  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";

  if (communityEdges.length) {
    for (const edge of communityEdges) {
      const from = worldToScreen(edge.sourceNode);
      const to = worldToScreen(edge.targetNode);
      const isHoveredEdge = hoveredCommunityId && (
        edge.source === hoveredCommunityId
        || edge.target === hoveredCommunityId
      );
      context.beginPath();
      context.lineWidth = isHoveredEdge ? 2.2 : Math.max(1, Math.min(4.2, Math.log2((edge.weight || 1) + 1)));
      context.strokeStyle = isHoveredEdge ? "rgba(125, 211, 252, 0.78)" : "rgba(180, 205, 225, 0.18)";
      context.globalAlpha = hoveredCommunityId && !isHoveredEdge ? 0.18 : 0.72;
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  for (const community of communityNodes) {
    const point = worldToScreen(community);
    const radius = Math.max(8, community.size * state.camera.zoom * 0.46);
    const isHovered = community.id === hoveredCommunityId;
    const isNeighbor = hoveredNeighbors.has(community.id);

    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = community.color;
    context.globalAlpha = hoveredCommunityId ? (isHovered || isNeighbor ? 0.98 : 0.34) : 0.94;
    context.fill();

    if (isHovered) {
      strokeNodeOutline("circle", point.x, point.y, radius + 6, "#9ee7ff", 2.6);
    } else if (isNeighbor) {
      strokeNodeOutline("circle", point.x, point.y, radius + 4, "rgba(125, 211, 252, 0.82)", 1.5);
    }
  }

  context.globalAlpha = 0.96;
  context.textBaseline = "middle";
  context.textAlign = "left";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(8, 17, 27, 0.9)";

  for (const community of communityNodes) {
    const point = worldToScreen(community);
    const radius = Math.max(8, community.size * state.camera.zoom * 0.46);
    context.font = community.id === hoveredCommunityId
      ? "600 13px Avenir Next, Segoe UI, sans-serif"
      : "500 12px Avenir Next, Segoe UI, sans-serif";
    context.fillStyle = "rgba(238, 246, 255, 0.94)";
    const labelX = point.x + radius + 10;
    const labelY = point.y;
    context.strokeText(community.title, labelX, labelY);
    context.fillText(community.title, labelX, labelY);
  }

  context.restore();
  renderGraphFilterToolbar();
  renderBookmarksPanel();
  updateDetectiveToolbarActions();
  updateToolbarNodeActions();
}

function render() {
  const rect = graphStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  context.clearRect(0, 0, rect.width, rect.height);
  if (isClusterLandingView()) {
    renderLandingGraph(rect);
    return;
  }
  const visibleNodes = getVisibleNodes();
  const visibleEdges = getVisibleEdgeRefs();
  const baseVisibleEdges = visibleEdges.filter((edge) => !edge.layerId);
  const investigationVisibleEdges = visibleEdges.filter((edge) => edge.layerId);
  const layerOverlayData = getLayerOverlayData();
  const visibleNodeIdSet = new Set(visibleNodes.map((node) => node.id));
  const visibleOverlayEdges = layerOverlayData.pathEdges.filter((edge) => (
    visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
  ));
  reportVisibleGraphStats(visibleNodes.length, visibleEdges.length + visibleOverlayEdges.length);
  const hoverContext = getHoverContext(visibleNodes);
  const hoveredNodeId = hoverContext?.nodeId || null;
  const hoveredNeighborIds = hoverContext?.neighborIds || null;
  const hasPath = state.detectiveMode && state.activePathNodeIds.length > 1;

  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  if (baseVisibleEdges.length) {
    context.lineWidth = 1;
    context.strokeStyle = hoveredNodeId
      ? "rgba(180, 205, 225, 0.04)"
      : (hasPath ? "rgba(180, 205, 225, 0.035)" : "rgba(180, 205, 225, 0.07)");
    context.beginPath();
    for (const edge of baseVisibleEdges) {
      const isPathEdge = hasPath && state.activePathEdgeKeys.has(edgeKey(edge.source.id, edge.target.id));
      const isHoveredEdge = hoveredNodeId && (
        (edge.source.id === hoveredNodeId && hoveredNeighborIds.has(edge.target.id))
        || (edge.target.id === hoveredNodeId && hoveredNeighborIds.has(edge.source.id))
      );
      if (isPathEdge || isHoveredEdge) {
        continue;
      }
      const from = worldToScreen(edge.source);
      const to = worldToScreen(edge.target);
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
    }
    context.stroke();
  }

  if (investigationVisibleEdges.length) {
    for (const edge of investigationVisibleEdges) {
      const isPathEdge = hasPath && state.activePathEdgeKeys.has(edgeKey(edge.source.id, edge.target.id));
      const isHoveredEdge = hoveredNodeId && (
        (edge.source.id === hoveredNodeId && hoveredNeighborIds.has(edge.target.id))
        || (edge.target.id === hoveredNodeId && hoveredNeighborIds.has(edge.source.id))
      );
      if (isPathEdge || isHoveredEdge) {
        continue;
      }
      const from = worldToScreen(edge.source);
      const to = worldToScreen(edge.target);
      context.beginPath();
      context.lineWidth = 1.8;
      context.strokeStyle = edge.color || "rgba(99, 216, 234, 0.48)";
      context.globalAlpha = hoveredNodeId ? 0.22 : 0.48;
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  if (hasPath) {
    context.lineWidth = 2.4;
    context.strokeStyle = "rgba(255, 212, 107, 0.82)";
    context.beginPath();
    for (const edge of visibleEdges) {
      if (!state.activePathEdgeKeys.has(edgeKey(edge.source.id, edge.target.id))) {
        continue;
      }
      const from = worldToScreen(edge.source);
      const to = worldToScreen(edge.target);
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
    }
    context.stroke();
  }

  if (visibleOverlayEdges.length) {
    for (const overlayEdge of visibleOverlayEdges) {
      const sourceNode = state.nodeById.get(overlayEdge.sourceId);
      const targetNode = state.nodeById.get(overlayEdge.targetId);
      if (!sourceNode || !targetNode) {
        continue;
      }
      const from = worldToScreen(sourceNode);
      const to = worldToScreen(targetNode);
      context.beginPath();
      context.lineWidth = overlayEdge.isActive ? 3 : 1.7;
      context.strokeStyle = overlayEdge.color;
      context.globalAlpha = overlayEdge.isActive ? 0.92 : 0.52;
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  if (hoveredNodeId) {
    context.lineWidth = 2.2;
    context.strokeStyle = "rgba(125, 211, 252, 0.78)";
    context.beginPath();
    for (const edge of visibleEdges) {
      const isHoveredEdge = (
        (edge.source.id === hoveredNodeId && hoveredNeighborIds.has(edge.target.id))
        || (edge.target.id === hoveredNodeId && hoveredNeighborIds.has(edge.source.id))
      );
      if (!isHoveredEdge) {
        continue;
      }
      const from = worldToScreen(edge.source);
      const to = worldToScreen(edge.target);
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
    }
  }
  context.stroke();

  for (const node of visibleNodes) {
    const point = worldToScreen(node);
    const radius = Math.max(1.6, node.size * state.camera.zoom * 0.42);
    const shape = getNodeShape(node);
    const fillColor = getNodeColor(node);
    const isHoveredNode = node.id === hoveredNodeId;
    const isHoveredNeighbor = Boolean(hoveredNeighborIds?.has(node.id));
    const isActivePathNode = hasPath && isPathNode(node.id);
    let nodeAlpha = state.inspectNodeId && state.inspectNodeId !== node.id ? 0.82 : 0.98;
    if (!state.canonLayerVisible && state.detectiveMode) {
      nodeAlpha = 0.94;
    }
    if (hasPath) {
      if (isActivePathNode) {
        nodeAlpha = Math.max(nodeAlpha, 0.98);
      } else {
        nodeAlpha *= state.pathFocus ? 0.22 : 0.55;
      }
    }
    if (hoveredNodeId) {
      if (isHoveredNode) {
        nodeAlpha = 1;
      } else if (isHoveredNeighbor) {
        nodeAlpha = Math.max(nodeAlpha, 0.96);
      } else {
        nodeAlpha *= 0.26;
      }
    }
    traceNodeShape(context, shape, point.x, point.y, radius);
    context.fillStyle = fillColor;
    context.globalAlpha = nodeAlpha;
    context.fill();

    if (node.id === state.graphRootNodeId) {
      strokeNodeHalo(shape, point.x, point.y, radius, 4, "#ffe082", 2);
    }
    if (node.id === state.inspectNodeId) {
      strokeNodeHalo(shape, point.x, point.y, radius, 3, "#eef6ff", 1.5);
    }
    if (state.expandedNodeIds.has(node.id)) {
      strokeNodeHalo(shape, point.x, point.y, radius, 3, "#4dd0e1", 1.5, 0.95);
    }
    if (isBookmarked(node.id)) {
      strokeNodeHalo(shape, point.x, point.y, radius, 4.5, "rgba(255, 212, 107, 0.92)", 1.8, 0.92);
    }
    if (state.detectiveMode && layerOverlayData.bookmarkColorsByNodeId.has(node.id)) {
      const bookmarkColors = layerOverlayData.bookmarkColorsByNodeId.get(node.id);
      bookmarkColors.slice(0, 2).forEach((color, index) => {
        strokeNodeHalo(shape, point.x, point.y, radius, 2.5 + (index * 2.5), color, 1.2, 0.76);
      });
    }
    if (isActivePathNode) {
      strokeNodeHalo(shape, point.x, point.y, radius, 5, "rgba(255, 212, 107, 0.92)", 2.2);
    }
    if (isHoveredNeighbor && !isHoveredNode) {
      strokeNodeHalo(shape, point.x, point.y, radius, 4, "rgba(125, 211, 252, 0.86)", 1.5);
    }
    if (isHoveredNode) {
      strokeNodeHalo(shape, point.x, point.y, radius, 6, "#9ee7ff", 2.6);
    }
  }

  renderNodeLabels(visibleNodes);
  context.restore();
  updateStatus();
  renderGraphFilterToolbar();
  renderBookmarksPanel();
  updateDetectiveToolbarActions();
  updateToolbarNodeActions();
  if (state.tooltip.sourceType === "node") {
    refreshNodeTooltip();
  }
}

function getBacklinks(nodeId) {
  const backlinks = new Map();
  for (const edge of state.edges) {
    if (!isRuntimeEdgeVisible(edge)) {
      continue;
    }
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

function getNodesForTag(tag) {
  return state.tagIndex.get(canonicalizeTag(tag)) || [];
}

function iconMarkup(name) {
  const icons = {
    back: '<svg viewBox="0 0 24 24" focusable="false"><path d="M10 6 4 12l6 6"/><path d="M4 12h12a4 4 0 1 1 0 8"/></svg>',
    add: '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 5v14M5 12h14"/></svg>',
    duplicate: '<svg viewBox="0 0 24 24" focusable="false"><rect x="9" y="9" width="10" height="10" rx="2"/><rect x="5" y="5" width="10" height="10" rx="2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 7h16M9 7V5h6v2M8 10v7M12 10v7M16 10v7M6 7l1 12h10l1-12"/></svg>',
    download: '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 4v10M8 10l4 4 4-4M5 19h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 20V10M8 14l4-4 4 4M5 5h14"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" focusable="false"><path d="M7 5h10v14l-5-3-5 3z"/></svg>',
    localGraph: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bullseye" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M8 13A5 5 0 1 1 8 3a5 5 0 0 1 0 10m0 1A6 6 0 1 0 8 2a6 6 0 0 0 0 12"/><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/><path d="M9.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/></svg>',
    expand: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-node-plus" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M6.025 7.5a5 5 0 1 1 0 1H4A1.5 1.5 0 0 1 2.5 10h-1A1.5 1.5 0 0 1 0 8.5v-1A1.5 1.5 0 0 1 1.5 6h1A1.5 1.5 0 0 1 4 7.5zM11 5a.5.5 0 0 1 .5.5v2h2a.5.5 0 0 1 0 1h-2v2a.5.5 0 0 1-1 0v-2h-2a.5.5 0 0 1 0-1h2v-2A.5.5 0 0 1 11 5M1.5 7a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/></svg>',
    filter: '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    path: '<svg viewBox="0 0 24 24" focusable="false"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 17l8-9M8 18h8"/></svg>',
  };
  const filledIcons = new Set(["localGraph", "expand"]);
  const classes = [
    "toolbar-icon",
    filledIcons.has(name) ? "toolbar-icon-filled" : "",
    name === "expand" ? "toolbar-icon-expand" : "",
  ].filter(Boolean).join(" ");
  return `<span class="${classes}" aria-hidden="true">${icons[name] || ""}</span>`;
}

function bookmarkIconMarkup(bookmarked, wrapperClass = "toolbar-icon") {
  return `
    <span class="${wrapperClass} bookmark-icon ${bookmarked ? "is-filled" : "is-outline"}" aria-hidden="true">
      ${
        bookmarked
          ? `<svg viewBox="0 0 24 24" focusable="false"><path d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v14.2a.3.3 0 0 1-.46.25L12 16.47l-6.04 3.98a.3.3 0 0 1-.46-.25V6A1.5 1.5 0 0 1 7 4.5z"/></svg>`
          : `<svg viewBox="0 0 24 24" focusable="false"><path d="M7 5h10v14l-5-3-5 3z"/></svg>`
      }
    </span>
  `;
}

function renderSharedToolbarIcons() {
  toolbarBackButton.innerHTML = iconMarkup("back");
  toolbarLocalGraphButton.innerHTML = iconMarkup("localGraph");
  toolbarExpandButton.innerHTML = iconMarkup("expand");
  toolbarBookmarkButton.innerHTML = bookmarkIconMarkup(false);
}

function canOpenLocalGraphForNode(nodeId) {
  return Boolean(nodeId && !(state.neighborMode && nodeId === state.graphRootNodeId));
}

function canExpandNeighborsForNode(nodeId) {
  return Boolean(
    nodeId
    && state.neighborMode
    && state.graphRootNodeId
    && nodeId !== state.graphRootNodeId
    && !state.expandedNodeIds.has(nodeId),
  );
}

function colorForLayer(index) {
  return LAYER_COLOR_PALETTE[index % LAYER_COLOR_PALETTE.length];
}

function rgbaFromHex(hex, alpha = 1) {
  const normalized = typeof hex === "string" ? hex.trim().replace(/^#/, "") : "";
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    return `rgba(99, 216, 234, ${alpha})`;
  }
  const channels = expanded.match(/\w\w/g).map((part) => Number.parseInt(part, 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
}

function textColorForHex(hex) {
  const normalized = typeof hex === "string" ? hex.trim().replace(/^#/, "") : "";
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    return "#08111b";
  }
  const [red, green, blue] = expanded.match(/\w\w/g).map((part) => Number.parseInt(part, 16) / 255);
  const linear = [red, green, blue].map((channel) => (
    channel <= 0.03928 ? (channel / 12.92) : Math.pow((channel + 0.055) / 1.055, 2.4)
  ));
  const luminance = (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  return luminance > 0.58 ? "#08111b" : "#f4fbff";
}

function compactNodeList(nodeIds) {
  return nodeIds
    .map((nodeId) => state.nodeById.get(nodeId))
    .filter(Boolean);
}

function describePath(nodeIds) {
  const pathNodes = compactNodeList(nodeIds);
  if (!pathNodes.length) {
    return "No nodes";
  }
  if (pathNodes.length === 1) {
    return pathNodes[0].title;
  }
  return `${pathNodes[0].title} -> ${pathNodes[pathNodes.length - 1].title}`;
}

function getNodeLayerDetails(nodeId) {
  if (!nodeId || !state.nodeById.has(nodeId)) {
    return [];
  }
  const node = state.nodeById.get(nodeId);
  const layers = node?.isCustom ? [] : [{
    name: "Canon Lore",
    color: "#ffd46b",
    detail: state.canonLayerVisible ? "Visible base layer" : "Base layer hidden",
    kind: "canon",
  }];

  for (const layer of getRenderableLayers()) {
    const flags = [];
    if (node?.isCustom && node.layerId === layer.id) {
      flags.push("custom node");
    }
    if (layer.bookmarks.includes(nodeId)) {
      flags.push("bookmark");
    }
    const savedPathMatches = layer.savedPaths.filter((path) => path.nodeIds.includes(nodeId)).length;
    if (savedPathMatches) {
      flags.push(savedPathMatches === 1 ? "saved path" : `${savedPathMatches} saved paths`);
    }
    if (layer.activePathNodeIds.includes(nodeId)) {
      flags.push("active path");
    }
    if (!flags.length) {
      continue;
    }
    layers.push({
      name: layer.name,
      color: layer.color,
      detail: `${layer.visible ? "Visible" : "Hidden"} · ${flags.join(" · ")}`,
      kind: "investigation",
    });
  }

  return layers;
}

function buildNodeTooltipMarkup(nodeId) {
  const node = state.nodeById.get(nodeId);
  if (!node) {
    return "";
  }
  const tags = (node.tags || []).slice(0, 3).join(", ");
  const layerDetails = getNodeLayerDetails(nodeId);
  return `
    <div class="app-tooltip-card">
      <div class="app-tooltip-title">${escapeHtml(node.title)}</div>
      <div class="app-tooltip-meta">
        ${escapeHtml(node.group || "node")}
        ${tags ? `<span> · ${escapeHtml(tags)}</span>` : ""}
      </div>
      <div class="app-tooltip-section-title">Layers</div>
      <div class="app-tooltip-layer-list">
        ${layerDetails.map((layer) => `
          <div class="app-tooltip-layer-row">
            <span
              class="app-tooltip-layer-swatch ${layer.kind === "canon" ? "is-canon" : ""}"
              style="${layer.kind === "canon" ? "" : `--tooltip-layer-color: ${escapeHtml(layer.color)};`}"
            ></span>
            <span class="app-tooltip-layer-copy">
              <strong>${escapeHtml(layer.name)}</strong>
              <small>${escapeHtml(layer.detail)}</small>
            </span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function showNodeTooltip(nodeId, clientX, clientY) {
  const markup = buildNodeTooltipMarkup(nodeId);
  if (!markup) {
    hideTooltip("node");
    return;
  }
  showTooltip({
    html: markup,
    clientX,
    clientY,
    sourceType: "node",
    sourceKey: nodeId,
  });
}

function refreshNodeTooltip() {
  if (!state.hoverNodeId || !state.pointer.active || state.dragging) {
    hideTooltip("node");
    return;
  }
  const rect = graphStage.getBoundingClientRect();
  showNodeTooltip(
    state.hoverNodeId,
    rect.left + state.pointer.x,
    rect.top + state.pointer.y,
  );
}

function clearActivePath(shouldRender = true) {
  const wasPathFocus = state.pathFocus;
  state.activePathNodeIds = [];
  state.activePathEdgeKeys = new Set();
  state.pathFocus = false;
  saveInvestigationState();
  renderInvestigatorTools();
  if (shouldRender) {
    if (wasPathFocus && state.graphRootNodeId) {
      fitGraph();
    } else {
      render();
    }
  }
}

function maybeClearPathForNode(nodeId) {
  if (!state.activePathNodeIds.length || isPathNode(nodeId)) {
    return;
  }
  clearActivePath(false);
}

function setPathFocus(enabled, shouldFit = true) {
  state.pathFocus = enabled && state.activePathNodeIds.length > 0;
  saveInvestigationState();
  renderInvestigatorTools();
  if (shouldFit) {
    fitGraph();
  } else {
    render();
  }
}

function findShortestPath(startId, endId) {
  if (!startId || !endId || startId === endId) {
    return startId && endId ? [startId] : [];
  }

  const queue = [startId];
  const parentById = new Map([[startId, null]]);

  while (queue.length) {
    const currentId = queue.shift();
    const neighbors = state.outboundAdjacency.get(currentId) || new Set();
    for (const neighborId of neighbors) {
      if (parentById.has(neighborId)) {
        continue;
      }
      parentById.set(neighborId, currentId);
      if (neighborId === endId) {
        queue.length = 0;
        break;
      }
      queue.push(neighborId);
    }
  }

  if (!parentById.has(endId)) {
    return [];
  }

  const pathNodeIds = [];
  let currentId = endId;
  while (currentId) {
    pathNodeIds.push(currentId);
    currentId = parentById.get(currentId) || null;
  }
  pathNodeIds.reverse();
  return pathNodeIds;
}

function getSharedNeighbors(leftId, rightId) {
  if (!leftId || !rightId) {
    return [];
  }
  const leftNeighbors = state.outboundAdjacency.get(leftId) || new Set();
  const rightNeighbors = state.outboundAdjacency.get(rightId) || new Set();
  const shared = [];

  for (const candidateId of leftNeighbors) {
    if (candidateId === leftId || candidateId === rightId || !rightNeighbors.has(candidateId)) {
      continue;
    }
    const node = state.nodeById.get(candidateId);
    if (node) {
      shared.push(node);
    }
  }

  return shared.sort((left, right) => right.degree - left.degree || left.title.localeCompare(right.title));
}

function applyPath(pathNodeIds, targetNodeId = null, { shouldFit = true, preserveFocus = false } = {}) {
  state.activePathNodeIds = pathNodeIds.slice();
  state.activePathEdgeKeys = new Set();
  for (let index = 1; index < pathNodeIds.length; index += 1) {
    state.activePathEdgeKeys.add(edgeKey(pathNodeIds[index - 1], pathNodeIds[index]));
  }
  state.pathTargetNodeId = targetNodeId;
  state.pathFocus = true;
  state.activeTagFilter = null; // Clear tag filter so path nodes are visible
  state.graphTagFilters = { requireAll: [], exclude: [] };
  state.graphTagFilterInput = "";
  saveInvestigationState();
  renderInvestigatorTools();
  setActiveView("explorer"); // Switch to explorer view to show the path
  if (shouldFit) {
    fitGraph();
  } else {
    render();
  }
}

function tracePathToTarget(targetNodeId = state.pathTargetNodeId) {
  const startId = currentNodeId();
  if (!startId || !targetNodeId || startId === targetNodeId) {
    clearActivePath(false);
    state.pathTargetNodeId = targetNodeId || null;
    saveInvestigationState();
    renderInvestigatorTools();
    render();
    return;
  }
  const pathNodeIds = findShortestPath(startId, targetNodeId);
  if (!pathNodeIds.length) {
    state.activePathNodeIds = [];
    state.activePathEdgeKeys = new Set();
    state.pathTargetNodeId = targetNodeId;
    state.pathFocus = false;
    saveInvestigationState();
    renderInvestigatorTools();
    render();
    return;
  }
  applyPath(pathNodeIds, targetNodeId, { shouldFit: true, preserveFocus: state.pathFocus });
}

function toggleBookmark(nodeId) {
  if (!nodeId || !state.nodeById.has(nodeId)) {
    return;
  }
  if (isBookmarked(nodeId)) {
    state.bookmarkedNodeIds = state.bookmarkedNodeIds.filter((id) => id !== nodeId);
    if (state.pathTargetNodeId === nodeId) {
      state.pathTargetNodeId = null;
      if (state.activePathNodeIds.length && state.activePathNodeIds[state.activePathNodeIds.length - 1] === nodeId) {
        clearActivePath(false);
      }
    }
  } else {
    state.bookmarkedNodeIds = [...state.bookmarkedNodeIds, nodeId];
  }
  saveInvestigationState();
  syncBookmarkButtons(nodeId);
  renderInvestigatorTools();
  render();
}

function saveCurrentPath() {
  if (state.activePathNodeIds.length < 2) {
    return;
  }
  const nextPath = {
    id: generateId("path"),
    name: describePath(state.activePathNodeIds),
    fromId: state.activePathNodeIds[0],
    toId: state.activePathNodeIds[state.activePathNodeIds.length - 1],
    nodeIds: state.activePathNodeIds.slice(),
    createdAt: timestamp(),
  };
  state.savedPaths = [
    nextPath,
    ...state.savedPaths.filter((path) => path.nodeIds.join("|") !== nextPath.nodeIds.join("|")),
  ];
  saveInvestigationState();
  setToolStatusMessage(`Saved path: ${nextPath.name}`);
}

function openSavedPath(pathId) {
  const savedPath = state.savedPaths.find((path) => path.id === pathId);
  if (!savedPath) {
    return;
  }
  applyPath(savedPath.nodeIds, savedPath.toId, { shouldFit: true, preserveFocus: state.pathFocus });
  setToolStatusMessage(`Opened saved path: ${savedPath.name}`);
}

function removeSavedPath(pathId) {
  const pathToRemove = state.savedPaths.find((path) => path.id === pathId);
  state.savedPaths = state.savedPaths.filter((path) => path.id !== pathId);
  if (pathToRemove && state.activePathNodeIds.join("|") === pathToRemove.nodeIds.join("|")) {
    clearActivePath(false);
  }
  saveInvestigationState();
  setToolStatusMessage(pathToRemove ? `Removed saved path: ${pathToRemove.name}` : "Removed saved path.");
}

function saveCurrentFilter() {
  const query = state.searchQuery.trim();
  const tag = state.activeTagFilter;
  if (!query && !tag) {
    return;
  }
  const mode = tag ? "tag" : "search";
  const value = tag || query;
  const nextFilter = {
    id: generateId("filter"),
    name: mode === "tag" ? `Tag: ${value}` : `Search: ${value}`,
    mode,
    value,
    createdAt: timestamp(),
  };
  state.savedFilters = [
    nextFilter,
    ...state.savedFilters.filter((filter) => !(filter.mode === mode && filter.value === value)),
  ];
  saveInvestigationState();
  setToolStatusMessage(`Saved filter: ${nextFilter.name}`);
}

function applySavedFilter(filterId) {
  const savedFilter = state.savedFilters.find((filter) => filter.id === filterId);
  if (!savedFilter) {
    return;
  }
  if (savedFilter.mode === "tag") {
    activateTag(savedFilter.value);
  } else {
    state.activeTagFilter = null;
    searchInput.value = savedFilter.value;
    updateSearchQuery(savedFilter.value);
  }
  setToolStatusMessage(`Applied filter: ${savedFilter.name}`);
}

function removeSavedFilter(filterId) {
  const savedFilter = state.savedFilters.find((filter) => filter.id === filterId);
  state.savedFilters = state.savedFilters.filter((filter) => filter.id !== filterId);
  saveInvestigationState();
  setToolStatusMessage(savedFilter ? `Removed filter: ${savedFilter.name}` : "Removed filter.");
}

function createLayer(name = `Investigation ${state.investigationLayers.length + 1}`) {
  persistActiveLayerIntoCollection();
  const nextLayer = buildEmptyLayer(name);
  state.investigationLayers = [...state.investigationLayers, nextLayer];
  state.activeLayerId = nextLayer.id;
  applyLayerToState(nextLayer);
  saveInvestigationState({ syncLayer: false });
  rebuildRuntimeGraphData();
  if (currentNodeId() && state.nodeById.has(currentNodeId())) {
    loadNote(currentNodeId());
  }
  renderInvestigatorTools();
  render();
}

function currentAnchorPoint() {
  const anchorNode = state.nodeById.get(currentNodeId());
  if (anchorNode) {
    return { x: anchorNode.x, y: anchorNode.y };
  }
  return { x: state.camera.x || 0, y: state.camera.y || 0 };
}

function createCustomNodeRecord(title = "Untitled Lead") {
  const activeLayer = getActiveLayer();
  if (!activeLayer) {
    return null;
  }
  if (!activeLayer.visible) {
    state.investigationLayers = state.investigationLayers.map((layer) => (
      layer.id === activeLayer.id ? { ...layer, visible: true, updatedAt: timestamp() } : layer
    ));
  }
  const anchor = currentAnchorPoint();
  const index = state.customNodes.length;
  const customNode = sanitizeCustomNode({
    id: generateId("custom-node"),
    title,
    tags: ["Investigation"],
    aliases: [],
    x: anchor.x + 48 + ((index % 4) * 18),
    y: anchor.y + 28 + ((index % 3) * 14),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  }, index);
  state.customNodes = [...state.customNodes, customNode];
  state.nodeNotes = {
    ...state.nodeNotes,
    [customNode.id]: "",
  };
  saveInvestigationState();
  rebuildRuntimeGraphData();
  return customNode;
}

function createCustomNode() {
  const customNode = createCustomNodeRecord("Untitled Lead");
  if (!customNode) {
    return;
  }
  setToolStatusMessage(`Created custom node in ${getActiveLayer()?.name || "layer"}: ${customNode.title}`);
  selectNode(customNode.id, true);
}

function createLinkedNodeFromSelection() {
  const currentId = currentNodeId();
  const textarea = document.getElementById("node-note-editor");
  if (!currentId || !textarea) {
    return;
  }
  const currentText = textarea.value;
  const start = state.noteCursorNodeId === currentId ? state.noteCursorStart : textarea.selectionStart;
  const end = state.noteCursorNodeId === currentId ? state.noteCursorEnd : textarea.selectionEnd;
  const title = (state.noteLinkQuery || currentText.slice(start, end) || state.noteLinkSelectionText || "").trim();
  if (!title) {
    setToolStatusMessage("Select text or type a title before creating a linked node.");
    return;
  }
  const customNode = createCustomNodeRecord(title);
  if (!customNode) {
    return;
  }
  insertNodeLinkIntoCurrentNote(customNode.id);
  setToolStatusMessage(`Created linked node: ${customNode.title}`);
}

function updateCustomNode(nodeId, updates) {
  let changed = false;
  state.customNodes = state.customNodes.map((customNode) => {
    if (customNode.id !== nodeId) {
      return customNode;
    }
    changed = true;
    return {
      ...customNode,
      ...updates,
      updatedAt: timestamp(),
    };
  });
  if (!changed) {
    return;
  }
  saveInvestigationState();
  rebuildRuntimeGraphData();
}

function deleteCustomNode(nodeId) {
  if (!nodeId) {
    return;
  }
  state.customNodes = state.customNodes.filter((node) => node.id !== nodeId);
  const nextNodeNotes = { ...state.nodeNotes };
  delete nextNodeNotes[nodeId];
  state.nodeNotes = nextNodeNotes;
  saveInvestigationState();
  rebuildRuntimeGraphData();
  if (currentNodeId() === nodeId) {
    showEmptyNoteState();
    noteMeta.innerHTML = renderSearchCompletionsPanel();
  }
  renderInvestigatorTools();
  render();
  setToolStatusMessage("Custom node deleted.");
}

function duplicateActiveLayer() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) {
    return;
  }
  persistActiveLayerIntoCollection();
  const nextLayer = sanitizeLayer({
    ...activeLayer,
    id: generateId("layer"),
    name: `${activeLayer.name} Copy`,
    createdAt: timestamp(),
    updatedAt: timestamp(),
  });
  state.investigationLayers = [...state.investigationLayers, nextLayer];
  state.activeLayerId = nextLayer.id;
  applyLayerToState(nextLayer);
  saveInvestigationState({ syncLayer: false });
  rebuildRuntimeGraphData();
  if (currentNodeId() && state.nodeById.has(currentNodeId())) {
    loadNote(currentNodeId());
  }
  setToolStatusMessage(`Duplicated layer: ${nextLayer.name}`);
}

function toggleCanonLayerVisibility() {
  state.canonLayerVisible = !state.canonLayerVisible;
  saveInvestigationState({ syncLayer: false });
  buildAdjacency();
  refreshSearchWorkerIndex();
  renderInvestigatorTools();
  render();
}

function toggleLayerVisibility(layerId) {
  state.investigationLayers = state.investigationLayers.map((layer) => (
    layer.id === layerId
      ? { ...layer, visible: !layer.visible, updatedAt: timestamp() }
      : layer
  ));
  saveInvestigationState({ syncLayer: false });
  buildAdjacency();
  refreshSearchWorkerIndex();
  renderInvestigatorTools();
  render();
}

function deleteActiveLayer() {
  if (state.investigationLayers.length <= 1) {
    state.investigationLayers = [];
    state.activeLayerId = null;
    applyLayerToState(null);
    saveInvestigationState({ syncLayer: false });
    rebuildRuntimeGraphData();
    if (currentNodeId() && state.nodeById.has(currentNodeId())) {
      loadNote(currentNodeId());
    }
    setToolStatusMessage("Removed the last investigation layer.");
    renderInvestigatorTools();
    render();
    return;
  }
  const previousLayer = getActiveLayer();
  const remainingLayers = state.investigationLayers.filter((layer) => layer.id !== state.activeLayerId);
  state.investigationLayers = remainingLayers;
  state.activeLayerId = remainingLayers[0].id;
  applyLayerToState(remainingLayers[0]);
  saveInvestigationState({ syncLayer: false });
  rebuildRuntimeGraphData();
  if (currentNodeId() && state.nodeById.has(currentNodeId())) {
    loadNote(currentNodeId());
  }
  setToolStatusMessage(previousLayer ? `Deleted layer: ${previousLayer.name}` : "Deleted layer.");
}

function renameLayer(layerId, name) {
  if (!layerId) {
    return;
  }
  const targetLayer = state.investigationLayers.find((layer) => layer.id === layerId);
  if (!targetLayer) {
    return;
  }
  const trimmedName = name.trim();
  if (!trimmedName) {
    renderInvestigatorTools();
    return;
  }
  state.investigationLayers = state.investigationLayers.map((layer) => (
    layer.id === layerId
      ? { ...layer, name: trimmedName, updatedAt: timestamp() }
      : layer
  ));
  saveInvestigationState({ syncLayer: false });
  renderInvestigatorTools();
}

function promptRenameLayer(layerId) {
  const targetLayer = state.investigationLayers.find((layer) => layer.id === layerId);
  if (!targetLayer) {
    return;
  }
  const nextName = window.prompt("Rename layer", targetLayer.name);
  if (typeof nextName !== "string") {
    return;
  }
  renameLayer(layerId, nextName);
}

function renameActiveLayer(name) {
  const activeLayer = getActiveLayer();
  if (!activeLayer) {
    return;
  }
  renameLayer(activeLayer.id, name);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugifyFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "investigation";
}

function exportActiveLayer() {
  const activeLayer = snapshotActiveLayer();
  const payload = {
    type: INVESTIGATION_EXPORT_TYPE,
    schemaVersion: INVESTIGATION_SCHEMA_VERSION,
    exportedAt: timestamp(),
    layer: activeLayer,
  };
  downloadFile(
    `${slugifyFilename(activeLayer.name)}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
  setToolStatusMessage(`Exported layer: ${activeLayer.name}`);
}

function importInvestigationLayers(serialized) {
  const payload = JSON.parse(serialized);
  const importedLayers = [];

  if (payload?.type === INVESTIGATION_EXPORT_TYPE && payload.layer) {
    importedLayers.push(sanitizeLayer(payload.layer));
  } else if (Array.isArray(payload?.layers)) {
    importedLayers.push(...payload.layers.map((layer, index) => sanitizeLayer(layer, index)));
  } else if (payload && typeof payload === "object") {
    importedLayers.push(sanitizeLayer(payload));
  }

  if (!importedLayers.length) {
    throw new Error("No investigation layer found in this file.");
  }

  persistActiveLayerIntoCollection();
  const existingIds = new Set(state.investigationLayers.map((layer) => layer.id));
  const nextLayers = importedLayers.map((layer, index) => {
    const importedLayer = sanitizeLayer(layer, index);
    const hadCollision = existingIds.has(importedLayer.id);
    if (hadCollision) {
      importedLayer.id = generateId("layer");
      importedLayer.name = `${importedLayer.name} Imported`;
    }
    existingIds.add(importedLayer.id);
    return importedLayer;
  });

  state.investigationLayers = [...state.investigationLayers, ...nextLayers];
  state.activeLayerId = nextLayers[0].id;
  applyLayerToState(nextLayers[0]);
  saveInvestigationState({ syncLayer: false });
  rebuildRuntimeGraphData();
  if (currentNodeId() && state.nodeById.has(currentNodeId())) {
    loadNote(currentNodeId());
  }
  setToolStatusMessage(`Imported ${nextLayers.length} layer${nextLayers.length > 1 ? "s" : ""}.`);
}

function renderSavedPaths(pathNodeIds) {
  if (!state.savedPaths.length) {
    return '<div class="tool-empty">Record a traced path to keep a reusable connection chain.</div>';
  }
  const activePathSignature = pathNodeIds.join("|");
  return state.savedPaths.map((savedPath) => `
    <div class="saved-item ${savedPath.nodeIds.join("|") === activePathSignature ? "is-active" : ""}">
      <button type="button" class="saved-item-open" data-open-path="${savedPath.id}">
        <strong>${escapeHtml(savedPath.name)}</strong>
        <small>${escapeHtml(describePath(savedPath.nodeIds))}</small>
      </button>
      <div class="bookmark-actions">
        <button type="button" class="mini-button" data-remove-path="${savedPath.id}">Remove</button>
      </div>
    </div>
  `).join("");
}

function renderSavedFilters() {
  if (!state.savedFilters.length) {
    return '<div class="tool-empty">Save recurring searches or tag views for later.</div>';
  }
  return state.savedFilters.map((savedFilter) => `
    <div class="saved-item">
      <button type="button" class="saved-item-open" data-open-filter="${savedFilter.id}">
        <strong>${escapeHtml(savedFilter.name)}</strong>
        <small>${escapeHtml(savedFilter.mode === "tag" ? `Tag ${savedFilter.value}` : `Search ${savedFilter.value}`)}</small>
      </button>
      <div class="bookmark-actions">
        <button type="button" class="mini-button" data-remove-filter="${savedFilter.id}">Remove</button>
      </div>
    </div>
  `).join("");
}

function renderInvestigatorTools() {
  if (!state.detectiveMode) {
    investigatorTools.hidden = true;
    investigatorTools.innerHTML = "";
    updateDetectiveToolbarActions();
    return;
  }

  investigatorTools.hidden = false;
  const renderableLayers = getRenderableLayers();
  const orderedLayers = [...renderableLayers].reverse();
  const activeLayer = getActiveLayer();
  const activeCustomNodes = state.customNodes;
  const activeSavedPaths = state.savedPaths;
  const pathFromId = state.activePathNodeIds[0] || currentNodeId() || "";
  const pathToId = state.pathTargetNodeId || "";

  investigatorTools.innerHTML = `
    <div class="tool-card">
      <div class="tool-card-toolbar">
        <div class="layer-stack" role="list" aria-label="Layer stack">
          ${orderedLayers.map((layer) => `
            <div class="layer-row ${layer.id === state.activeLayerId ? "is-active" : ""}" role="listitem">
              <button
                type="button"
                class="layer-visibility-button ${layer.visible ? "is-visible" : ""}"
                data-toggle-layer-visible="${layer.id}"
                aria-label="${layer.visible ? "Hide" : "Show"} ${escapeHtml(layer.name)}"
                data-tooltip="${layer.visible ? "Hide" : "Show"} ${escapeHtml(layer.name)}"
              >${
                layer.visible
                  ? `<span class="layer-visibility-icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" focusable="false">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"></path>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"></path>
                      </svg>
                    </span>`
                  : ""
              }</button>
              <button
                type="button"
                class="layer-rename-button"
                data-rename-layer="${layer.id}"
                aria-label="Rename ${escapeHtml(layer.name)}"
                data-tooltip="Rename ${escapeHtml(layer.name)}"
              >
                <span class="layer-rename-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" focusable="false">
                    <path d="M11.8 1.8a1.5 1.5 0 0 1 2.1 2.1l-7.6 7.6-3 .8.8-3z"></path>
                    <path d="M9.9 3.7 12.3 6.1"></path>
                  </svg>
                </span>
              </button>
              <button
                type="button"
                class="layer-select-button"
                data-select-layer="${layer.id}"
                data-layer-name="${escapeHtml(layer.name)}"
                aria-label="Select ${escapeHtml(layer.name)}"
                data-tooltip="Select ${escapeHtml(layer.name)}"
                style="
                  --layer-color: ${escapeHtml(layer.color)};
                  --layer-color-soft: ${escapeHtml(rgbaFromHex(layer.color, layer.id === state.activeLayerId ? 0.84 : 0.58))};
                  --layer-text: ${escapeHtml(textColorForHex(layer.color))};
                "
              >
                <span class="layer-name">${escapeHtml(layer.name)}</span>
              </button>
            </div>
          `).join("")}
          <div class="layer-row ${state.activeLayerId ? "" : "is-active"} is-canon" role="listitem">
            <button
              type="button"
              class="layer-visibility-button ${state.canonLayerVisible ? "is-visible" : ""}"
              data-toggle-canon-visible="true"
              aria-label="${state.canonLayerVisible ? "Hide" : "Show"} Canon Lore"
              data-tooltip="${state.canonLayerVisible ? "Hide" : "Show"} Canon Lore"
            >${
              state.canonLayerVisible
                ? `<span class="layer-visibility-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16" focusable="false">
                      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"></path>
                      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"></path>
                    </svg>
                  </span>`
                : ""
            }</button>
            <div class="layer-select-button is-static is-canon" aria-label="Canon Lore layer">
              <span class="layer-name">Canon Lore</span>
            </div>
          </div>
        </div>
      </div>

      <div class="tool-card-toolbar">
        <div class="tool-card-title">Trace Path</div>
        ${renderNodeSearchInput("path-from", state.pathFromNodeId, "Search from node...", "From")}
        ${renderNodeSearchInput("path-to", state.pathToNodeId, "Search to node...", "To")}
        <div class="path-controls">
          <button type="button" class="mini-button" id="trace-path-button">Trace</button>
          <button
            type="button"
            class="mini-button ${state.pathFocus ? "is-active" : ""}"
            id="path-focus-button"
            ${state.activePathNodeIds.length > 1 ? "" : "disabled"}
          >${state.pathFocus ? "Unfocus" : "Focus"}</button>
          <button type="button" class="mini-button" id="save-path-button" ${state.activePathNodeIds.length > 1 ? "" : "disabled"}>Save</button>
        </div>
        <div class="path-summary" id="path-summary-text">
          ${state.activePathNodeIds.length > 1 ? `${state.activePathNodeIds.length} nodes · ${describePath(state.activePathNodeIds)}` : "No active path"}
        </div>
      </div>

      ${activeSavedPaths.length ? `
      <div class="tool-card-toolbar">
        <div class="tool-card-title">Saved Paths</div>
        <div class="saved-item-list">
          ${activeSavedPaths.map((path) => `
            <div class="saved-item">
              <button type="button" class="saved-item-open" data-open-saved-path="${escapeHtml(path.id)}">
                <strong>${escapeHtml(path.name)}</strong>
                <small>${escapeHtml(describePath(path.nodeIds))} · ${path.nodeIds.length} nodes</small>
              </button>
              <button type="button" class="mini-button" data-remove-saved-path="${escapeHtml(path.id)}">Remove</button>
            </div>
          `).join("")}
        </div>
      </div>
      ` : ""}

      ${activeCustomNodes.length ? `
      <div class="tool-card-toolbar">
        <div class="tool-card-title">Custom Nodes (${activeCustomNodes.length})</div>
        <div class="saved-item-list">
          ${activeCustomNodes.map((customNode) => `
            <div class="saved-item">
              <button type="button" class="saved-item-open" data-select-node="${escapeHtml(customNode.id)}">
                <strong>${escapeHtml(customNode.title)}</strong>
                <small>${escapeHtml((customNode.tags || []).join(", "))}</small>
              </button>
              <button type="button" class="mini-button" data-delete-custom-node="${escapeHtml(customNode.id)}">Delete</button>
            </div>
          `).join("")}
        </div>
      </div>
      ` : ""}

      <div class="tool-card-toolbar">
        <div class="tool-card-title">Layer Notes</div>
        <textarea
          id="layer-notes-editor"
          class="investigation-notes"
          placeholder="General notes about this investigation layer..."
        >${escapeHtml(activeLayer?.notes || "")}</textarea>
      </div>

      <div class="tool-status tool-block">${escapeHtml(state.toolStatusMessage || "Ready")}</div>
    </div>
  `;
  updateDetectiveToolbarActions();
}

function getPathTraceOptions(selectedId) {
  return ""; // No longer used - replaced with searchable inputs
}

function getNodeTitleById(nodeId) {
  return state.nodeById.get(nodeId)?.title || "";
}

function renderNodeSearchInput(id, value, placeholder, label) {
  const title = getNodeTitleById(value);
  return `
    <div class="detective-node-search">
      <label class="detective-node-search-label">${escapeHtml(label)}</label>
      <div class="detective-node-search-field">
        <input
          id="${id}-input"
          class="detective-node-search-input"
          type="search"
          value="${escapeHtml(title)}"
          placeholder="${escapeHtml(placeholder)}"
          data-search-target="${id}"
          autocomplete="off"
          spellcheck="false"
        />
        ${title ? `<button type="button" class="detective-node-search-clear" data-clear-search="${id}" aria-label="Clear selection">×</button>` : ""}
      </div>
      <div id="${id}-results" class="detective-node-search-results"></div>
      <input type="hidden" id="${id}-value" value="${escapeHtml(value || "")}" />
    </div>
  `;
}

function searchNodesLocally(query, limit = 10) {
  const normalized = normalize(query);
  if (!normalized) return [];
  const terms = normalized.split(" ").filter(Boolean);
  return state.nodes
    .map((node) => {
      let score = 0;
      const titleNorm = normalize(node.title);
      const aliasNorms = (node.aliases || []).map(normalize);
      const tagNorms = (node.tags || []).map(normalize);

      if (titleNorm === normalized) score += 100;
      else if (titleNorm.startsWith(normalized)) score += 50;
      else if (terms.every((t) => titleNorm.includes(t))) score += 30;

      for (const term of terms) {
        if (aliasNorms.some((a) => a.includes(term))) score += 15;
        if (tagNorms.some((t) => t.includes(term))) score += 10;
      }
      return { node, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title))
    .slice(0, limit)
    .map((item) => item.node);
}

function activateTag(tag) {
  clearActivePath(false);
  const [node] = getNodesForTag(tag);
  if (!node) {
    return;
  }
  searchInput.value = "";
  resetSearchState();
  state.activeTagFilter = tag;
  state.graphTagFilters = { requireAll: [], exclude: [] };
  state.graphTagFilterInput = "";
  selectNode(node.id, true);
}

function getGraphFilterDisplayTag(tag) {
  return state.tagDisplayByKey.get(canonicalizeTag(tag)) || tag;
}

function getScopedGraphFilterTags(limit = 24) {
  const baseVisibleIds = getBaseVisibleNodeIds();
  const candidateNodes = baseVisibleIds
    ? state.nodes.filter((node) => baseVisibleIds.has(node.id))
    : state.nodes.filter((node) => isRuntimeNodeVisible(node));
  const counts = new Map();
  for (const node of candidateNodes) {
    for (const tag of node.tags || []) {
      const normalizedTag = canonicalizeTag(tag);
      if (!normalizedTag) {
        continue;
      }
      counts.set(normalizedTag, (counts.get(normalizedTag) || 0) + 1);
    }
  }
  const query = canonicalizeTag(state.graphTagFilterInput || "");
  const sortedTags = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || getGraphFilterDisplayTag(left[0]).localeCompare(getGraphFilterDisplayTag(right[0])));
  const filteredTags = query
    ? sortedTags.filter(([tag]) => (
      tag.includes(query) || getGraphFilterDisplayTag(tag).toLocaleLowerCase().includes(query)
    ))
    : sortedTags;
  return filteredTags
    .slice(0, query ? 200 : limit)
    .map(([tag]) => tag);
}

function renderGraphFilterTagOptions() {
  return getScopedGraphFilterTags()
    .map((tag) => `<option value="${escapeHtml(getGraphFilterDisplayTag(tag))}"></option>`)
    .join("");
}

function syncGraphFilterTagOptions() {
  const datalist = document.getElementById("graph-filter-tag-options");
  if (!datalist) {
    return;
  }
  const tagOptions = renderGraphFilterTagOptions();
  datalist.innerHTML = tagOptions;
  state.graphFilterToolbarRenderSignature = getGraphFilterToolbarRenderSignature(tagOptions);
}

function getGraphFilterToolbarRenderSignature(tagOptions = renderGraphFilterTagOptions()) {
  return JSON.stringify({
    input: state.graphTagFilterInput,
    requireAll: state.graphTagFilters.requireAll,
    exclude: state.graphTagFilters.exclude,
    tagOptions,
  });
}

function eyeIconMarkup(isHidden = false) {
  return `
    <span class="graph-filter-pill-eye ${isHidden ? "is-hidden" : ""}" aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false">
        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"></path>
        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"></path>
      </svg>
    </span>
  `;
}

function getToolbarGraphFilterTags() {
  return [
    ...state.graphTagFilters.requireAll.map((tag) => ({ tag, mode: "show" })),
    ...state.graphTagFilters.exclude.map((tag) => ({ tag, mode: "hide" })),
  ].sort((left, right) => getGraphFilterDisplayTag(left.tag).localeCompare(getGraphFilterDisplayTag(right.tag)));
}

function renderGraphFilterToolbar() {
  const tagOptions = renderGraphFilterTagOptions();
  const activeTags = getToolbarGraphFilterTags();
  const nextSignature = getGraphFilterToolbarRenderSignature(tagOptions);
  if (
    state.graphFilterToolbarRenderSignature === nextSignature
    && graphFilterToolbar.childElementCount > 0
  ) {
    return;
  }
  graphFilterToolbar.innerHTML = `
    <div class="graph-filter-toolbar-scroll">
      <div class="graph-filter-toolbar-row">
        <input
          id="graph-filter-tag-input"
          class="graph-filter-toolbar-input"
          type="search"
          list="graph-filter-tag-options"
          value="${escapeHtml(state.graphTagFilterInput)}"
          placeholder="Filter by tag…"
          autocomplete="off"
          spellcheck="false"
        />
        <datalist id="graph-filter-tag-options">${tagOptions}</datalist>
        ${
          activeTags.map(({ tag, mode }) => `
            <div class="graph-filter-pill is-${mode}">
              <button
                type="button"
                class="graph-filter-pill-toggle"
                data-toggle-graph-filter-mode="${escapeHtml(tag)}"
                aria-label="${mode === "hide" ? "Show" : "Hide"} ${escapeHtml(getGraphFilterDisplayTag(tag))}"
              >
                ${eyeIconMarkup(mode === "hide")}
                <span>${escapeHtml(getGraphFilterDisplayTag(tag))}</span>
              </button>
              <button
                type="button"
                class="graph-filter-pill-remove"
                data-remove-graph-filter-tag="${escapeHtml(tag)}"
                aria-label="Remove ${escapeHtml(getGraphFilterDisplayTag(tag))}"
              >×</button>
            </div>
          `).join("")
        }
      </div>
    </div>
  `;
  state.graphFilterToolbarRenderSignature = nextSignature;
}

function renderTagButtons(node) {
  if (!node.tags || !node.tags.length) {
    return '<span class="note-warning">No tags</span>';
  }
  return node.tags
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .map((tag) => {
      const normalizedTag = canonicalizeTag(tag);
      const isActive = state.graphTagFilters.requireAll.includes(normalizedTag);
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

function rewriteNoteAssetUrls(root) {
  for (const image of root.querySelectorAll("img[src]")) {
    const src = image.getAttribute("src");
    if (!src || /^(?:[a-z]+:|\/\/|data:|blob:|#)/i.test(src)) {
      continue;
    }
    image.src = new URL(src, siteBaseUrl).href;
  }

  for (const link of root.querySelectorAll("a[href]")) {
    if (link.dataset.nodeId) {
      continue;
    }
    const href = link.getAttribute("href");
    if (!href || /^(?:[a-z]+:|\/\/|#|mailto:|tel:)/i.test(href)) {
      continue;
    }
    link.href = new URL(href, siteBaseUrl).href;
  }
}

function renderBacklinkButtons(nodeId) {
  const backlinks = getBacklinks(nodeId);
  if (!backlinks.length) {
    return '<span class="note-warning">No backlinks</span>';
  }
  return backlinks.map((backlink) => `
    <button
      type="button"
      class="tag tag-button"
      data-node-id="${escapeHtml(backlink.id)}"
    >${escapeHtml(backlink.title)}</button>
  `).join("");
}

function renderSearchCompletionsPanel() {
  const query = state.searchQuery.trim();
  if (!query) {
    return "";
  }
  const results = getVisibleSearchResults();
  const countLabel = state.results.length
    ? `${state.results.length} match${state.results.length === 1 ? "" : "es"}`
    : "No matches";
  return `
    <div class="search-completions-panel">
      <div class="search-completions-header">
        <span class="meta-label">Completions</span>
        <small>${escapeHtml(countLabel)}</small>
      </div>
      ${
        results.length
          ? `<div class="search-completions-list">${
            results.map((result) => `
              <button
                type="button"
                class="search-completion-item ${result.id === currentNodeId() ? "is-active" : ""} ${results[state.searchSelectedIndex]?.id === result.id ? "is-selected" : ""}"
                data-node-id="${escapeHtml(result.id)}"
                data-search-completion-node-id="${escapeHtml(result.id)}"
              >
                <strong>${escapeHtml(result.title)}</strong>
                <small>${escapeHtml(result.group || "node")}</small>
              </button>
            `).join("")
          }</div>`
          : `<div class="tool-empty">No node matches "${escapeHtml(query)}".</div>`
      }
    </div>
  `;
}

function renderNoteMetaPanel(node) {
  const layerBadge = node.isCustom
    ? `<span class="note-meta-badge">Layer Node · ${escapeHtml(getLayerById(node.layerId)?.name || "Investigation")}</span>`
    : '<span class="note-meta-badge">Canon Lore</span>';
  return `
    <div class="note-meta-stack">
      ${renderSearchCompletionsPanel()}
      <div class="note-tag-list">${renderTagButtons(node)}</div>
      <div class="note-inline-meta">
        ${layerBadge}
        <span class="note-meta-badge">${escapeHtml(node.group || "node")}</span>
      </div>
    </div>
  `;
}

function renderBacklinksSection(nodeId) {
  const backlinks = getBacklinks(nodeId);
  const count = backlinks.length;
  return `
    <details class="note-backlinks-section">
      <summary class="note-backlinks-summary">
        <span>Backlinks</span>
        <small>${count}</small>
      </summary>
      <div class="note-backlinks-panel">
        ${
          count
            ? `<div class="note-backlinks-list">${renderBacklinkButtons(nodeId)}</div>`
            : '<span class="note-warning">No backlinks</span>'
        }
      </div>
    </details>
  `;
}

function renderInvestigationInline(text) {
  const placeholders = [];
  const withPlaceholders = String(text || "").replace(INVESTIGATION_LINK_RE, (_, fullTarget, nodeId, label) => {
    const nodeTitle = label || state.nodeById.get(nodeId)?.title || nodeId;
    placeholders.push(`<a href="#" data-node-id="${escapeHtml(nodeId)}">${escapeHtml(nodeTitle)}</a>`);
    return `@@NODELINK${placeholders.length - 1}@@`;
  });
  let escaped = escapeHtml(withPlaceholders);
  escaped = escaped
    .replace(/(^|[\s(])\*([^*]+)\*([\s).,;:!?]|$)/g, "$1<strong>$2</strong>$3")
    .replace(/(^|[\s(])\/([^/]+)\/([\s).,;:!?]|$)/g, "$1<em>$2</em>$3")
    .replace(/=([^=]+)=/g, "<code>$1</code>")
    .replace(/~([^~]+)~/g, "<code>$1</code>");
  placeholders.forEach((markup, index) => {
    escaped = escaped.replace(`@@NODELINK${index}@@`, markup);
  });
  return escaped;
}

function renderInvestigationNoteHtml(text) {
  const lines = String(text || "").split(/\r?\n/);
  const blocks = [];
  let paragraphLines = [];
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }
    const content = paragraphLines.join(" ").trim();
    if (content) {
      blocks.push(`<p>${renderInvestigationInline(content)}</p>`);
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }
    blocks.push(`<ul>${listItems.map((item) => `<li>${renderInvestigationInline(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const listMatch = line.match(/^[-+]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1].trim());
      continue;
    }
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks.join("");
}

function findLinkSuggestions(query, sourceNodeId) {
  const rawQuery = normalize(query || "");
  const blockedId = sourceNodeId || currentNodeId();
  const candidates = state.searchDocs.length ? state.searchDocs : state.nodes.map((node) => buildSearchDocFromNode(node));
  const scored = [];

  for (const doc of candidates) {
    if (doc.id === blockedId) {
      continue;
    }
    const node = state.nodeById.get(doc.id);
    if (!node || !isRuntimeNodeVisible(node)) {
      continue;
    }
    let score = 0;
    if (!rawQuery) {
      score = Math.min(doc.degree || 0, 40);
    } else {
      if (doc.titleNorm === rawQuery) score += 180;
      if (doc.titleNorm.startsWith(rawQuery)) score += 120;
      if (doc.titleNorm.includes(rawQuery)) score += 60;
      if (doc.aliasNorms.some((alias) => alias === rawQuery)) score += 130;
      if (doc.aliasNorms.some((alias) => alias.startsWith(rawQuery))) score += 82;
      if (doc.aliasNorms.some((alias) => alias.includes(rawQuery))) score += 38;
      if (doc.tagNorms.some((tag) => tag.startsWith(rawQuery))) score += 22;
    }
    if (score <= 0 && rawQuery) {
      continue;
    }
    scored.push({ ...doc, score });
  }

  return scored
    .sort((left, right) => right.score - left.score || right.degree - left.degree || left.title.localeCompare(right.title))
    .slice(0, 10);
}

function renderLinkSuggestionList(nodeId) {
  const suggestions = findLinkSuggestions(state.noteLinkQuery, nodeId);
  const createTitle = (state.noteLinkQuery || state.noteLinkSelectionText || "").trim();
  const createButton = createTitle
    ? `
      <button
        type="button"
        class="note-link-result note-link-result-create"
        data-create-note-link-node="${escapeHtml(createTitle)}"
      >
        <strong>Create linked node</strong>
        <small>${escapeHtml(createTitle)}</small>
      </button>
    `
    : "";
  if (!suggestions.length) {
    return `${createButton}<div class="tool-empty">No matching node found.</div>`;
  }
  return `${createButton}${suggestions.map((suggestion) => `
    <button
      type="button"
      class="note-link-result"
      data-insert-note-link="${escapeHtml(suggestion.id)}"
    >
      <strong>${escapeHtml(suggestion.title)}</strong>
      <small>${escapeHtml(suggestion.group || "node")}</small>
    </button>
  `).join("")}`;
}

function renderNoteLinkPicker(nodeId) {
  if (state.noteLinkPickerNodeId !== nodeId) {
    return "";
  }
  const selectionText = state.noteLinkSelectionText.trim();
  return `
    <div class="note-link-picker">
      <div class="note-link-selection">
        ${selectionText
          ? `<span class="meta-label">Selected Text</span><div class="note-link-selection-text">${escapeHtml(selectionText)}</div>`
          : '<div class="tool-empty">Select text in the note first, then link it.</div>'}
      </div>
      <input
        id="note-link-query-input"
        class="layer-name-input"
        type="search"
        value="${escapeHtml(state.noteLinkQuery)}"
        placeholder="Search a node to link…"
        autocomplete="off"
        spellcheck="false"
      />
      <div id="note-link-result-list" class="note-link-result-list">${renderLinkSuggestionList(nodeId)}</div>
      <div class="investigation-note-actions">
        <button type="button" class="mini-button" data-close-note-link-picker="true">Close</button>
      </div>
    </div>
  `;
}

function renderCustomNodeEditor(node) {
  if (!node.isCustom) {
    return "";
  }
  const customNode = state.customNodes.find((entry) => entry.id === node.id);
  if (!customNode) {
    return "";
  }
  return `
    <section class="investigation-note-card custom-node-card">
      <div class="investigation-note-card-header">
        <div>
          <div class="tool-card-title">Custom Node</div>
          <div class="tool-card-subtitle">This node only exists in the active investigation layer.</div>
        </div>
      </div>
      <div class="custom-node-fields">
        <label class="custom-node-field">
          <span class="meta-label">Title</span>
          <input id="custom-node-title-input" type="text" value="${escapeHtml(customNode.title)}" />
        </label>
        <label class="custom-node-field">
          <span class="meta-label">Tags</span>
          <input id="custom-node-tags-input" type="text" value="${escapeHtml((customNode.tags || []).join(", "))}" placeholder="Investigation, theory, clue" />
        </label>
        <label class="custom-node-field">
          <span class="meta-label">Aliases</span>
          <input id="custom-node-aliases-input" type="text" value="${escapeHtml((customNode.aliases || []).join(", "))}" placeholder="Optional aliases" />
        </label>
      </div>
    </section>
  `;
}

function renderInvestigationNoteEditor(node) {
  if (!state.detectiveMode || !getActiveLayer()) {
    return "";
  }
  const noteText = state.nodeNotes[node.id] || "";
  const layerName = getActiveLayer()?.name || "Investigation";
  return `
    <section class="investigation-note-card">
      <div class="investigation-note-card-header">
        <div>
          <div class="tool-card-title">Layer Note</div>
          <div class="tool-card-subtitle">${escapeHtml(layerName)} can annotate this node and create investigation-only links.</div>
        </div>
        <div class="investigation-note-actions">
          <button type="button" class="mini-button" data-open-note-link-picker="${escapeHtml(node.id)}">Link Selection</button>
        </div>
      </div>
      <textarea
        id="node-note-editor"
        class="investigation-note-editor"
        placeholder="Add investigation notes for this node. Select text and use Link Selection to create safe node references."
      >${escapeHtml(noteText)}</textarea>
      <div id="note-link-picker-container">${renderNoteLinkPicker(node.id)}</div>
      <div class="investigation-note-preview">
        ${noteText.trim() ? renderInvestigationNoteHtml(noteText) : '<div class="tool-empty">No investigation note yet.</div>'}
      </div>
    </section>
  `;
}

function renderCustomNodeBody(node) {
  return `
    <article class="note-body">
      <header>
        <h1>${escapeHtml(node.title)}</h1>
        <p class="note-warning">Custom investigation node.</p>
      </header>
      <section>
        <p>This node belongs to <strong>${escapeHtml(getLayerById(node.layerId)?.name || "the active layer")}</strong> and can be linked from investigation notes.</p>
      </section>
    </article>
  `;
}

function renderNoteBookmarkButton(node) {
  const bookmarked = isBookmarked(node.id);
  return `
    <button
      type="button"
      class="toolbar-icon-button ${bookmarked ? "is-active" : ""}"
      data-toggle-bookmark="${escapeHtml(node.id)}"
      aria-label="${bookmarked ? `Remove bookmark from ${escapeHtml(node.title)}` : `Bookmark ${escapeHtml(node.title)}`}"
    >
      ${bookmarkIconMarkup(bookmarked)}
    </button>
  `;
}

function renderNoteTitleActions(node) {
  const canOpenLocalGraph = canOpenLocalGraphForNode(node.id);
  const canExpandNeighbors = canExpandNeighborsForNode(node.id);
  return `
    <div class="note-title-actions">
      <button
        type="button"
        class="toolbar-icon-button"
        data-go-back="true"
        aria-label="Go back"
        ${canNavigateBack() ? "" : "disabled"}
      >
        ${iconMarkup("back")}
      </button>
      <button
        type="button"
        class="toolbar-icon-button"
        data-open-local-graph="${escapeHtml(node.id)}"
        aria-label="Open local graph for ${escapeHtml(node.title)}"
        ${canOpenLocalGraph ? "" : "disabled"}
      >
        ${iconMarkup("localGraph")}
      </button>
      <button
        type="button"
        class="toolbar-icon-button"
        data-expand-neighbors="${escapeHtml(node.id)}"
        aria-label="Expand neighbors of ${escapeHtml(node.title)}"
        ${canExpandNeighbors ? "" : "disabled"}
      >
        ${iconMarkup("expand")}
      </button>
      ${renderNoteBookmarkButton(node)}
    </div>
  `;
}

function syncNoteTitleActions(nodeId = currentNodeId()) {
  const node = state.nodeById.get(nodeId);
  const backButton = noteContent.querySelector("[data-go-back]");
  if (backButton) {
    backButton.disabled = !canNavigateBack();
    backButton.setAttribute("aria-label", "Go back");
  }
  if (!node) {
    return;
  }
  const localGraphButton = noteContent.querySelector(`[data-open-local-graph="${CSS.escape(nodeId)}"]`);
  if (localGraphButton) {
    localGraphButton.disabled = !canOpenLocalGraphForNode(nodeId);
    localGraphButton.setAttribute("aria-label", `Open local graph for ${node.title}`);
  }
  const expandButton = noteContent.querySelector(`[data-expand-neighbors="${CSS.escape(nodeId)}"]`);
  if (expandButton) {
    expandButton.disabled = !canExpandNeighborsForNode(nodeId);
    expandButton.setAttribute("aria-label", `Expand neighbors of ${node.title}`);
  }
}

function decorateNoteTitle(node) {
  const title = noteContent.querySelector("h1");
  if (!title || title.closest(".note-title-row")) {
    return;
  }
  const row = document.createElement("div");
  row.className = "note-title-row";
  title.replaceWith(row);
  row.append(title);
  row.insertAdjacentHTML("beforeend", renderNoteTitleActions(node));
}

function renderNoteSurface(node, baseMarkup) {
  noteContent.innerHTML = `${baseMarkup}${renderCustomNodeEditor(node)}${renderInvestigationNoteEditor(node)}${renderBacklinksSection(node.id)}`;
  rewriteNoteAssetUrls(noteContent);
  decorateNoteTitle(node);
  noteMeta.innerHTML = renderNoteMetaPanel(node);
  requestAnimationFrame(() => {
    if (state.noteCursorNodeId === node.id) {
      const textarea = document.getElementById("node-note-editor");
      if (textarea) {
        const end = Math.min(state.noteCursorEnd, textarea.value.length);
        const start = Math.min(state.noteCursorStart, end);
        textarea.setSelectionRange(start, end);
      }
    }
    if (state.noteLinkPickerNodeId === node.id) {
      document.getElementById("note-link-query-input")?.focus();
    }
  });
}

function updateCurrentNoteMeta() {
  const node = state.nodeById.get(currentNodeId());
  if (!node) {
    noteMeta.innerHTML = renderSearchCompletionsPanel();
    return;
  }
  noteMeta.innerHTML = renderNoteMetaPanel(node);
}

function recordNoteCursor(textarea, nodeId = currentNodeId()) {
  if (!textarea || !nodeId) {
    return;
  }
  state.noteCursorNodeId = nodeId;
  state.noteCursorStart = textarea.selectionStart || 0;
  state.noteCursorEnd = textarea.selectionEnd || state.noteCursorStart;
  state.noteLinkSelectionText = (textarea.value || "").slice(state.noteCursorStart, state.noteCursorEnd);
}

function refreshNoteLinkPickerUI(nodeId = currentNodeId(), { focus = false } = {}) {
  const container = document.getElementById("note-link-picker-container");
  if (!container || !nodeId) {
    return;
  }
  container.innerHTML = renderNoteLinkPicker(nodeId);
  if (focus && state.noteLinkPickerNodeId === nodeId) {
    requestAnimationFrame(() => {
      document.getElementById("note-link-query-input")?.focus();
    });
  }
}

function closeNoteLinkPicker() {
  state.noteLinkPickerNodeId = null;
  state.noteLinkQuery = "";
  state.noteLinkSelectionText = "";
  refreshNoteLinkPickerUI();
}

function openNoteLinkPicker(nodeId) {
  const textarea = document.getElementById("node-note-editor");
  if (!nodeId || !textarea) {
    return;
  }
  recordNoteCursor(textarea, nodeId);
  if (state.noteCursorStart === state.noteCursorEnd) {
    setToolStatusMessage("Select text in the note first, then use Link Selection.");
    textarea.focus();
    return;
  }
  state.noteLinkPickerNodeId = nodeId;
  state.noteLinkQuery = state.noteLinkSelectionText.trim();
  refreshNoteLinkPickerUI(nodeId, { focus: true });
}

function updateNodeNoteText(nodeId, text) {
  if (!nodeId) {
    return;
  }
  const previousText = state.nodeNotes[nodeId] || "";
  const previousLinks = extractNodeReferencesFromText(previousText).join("|");
  const nextLinks = extractNodeReferencesFromText(text).join("|");
  const nextNodeNotes = { ...state.nodeNotes };
  if (text.trim()) {
    nextNodeNotes[nodeId] = text;
  } else {
    delete nextNodeNotes[nodeId];
  }
  state.nodeNotes = nextNodeNotes;
  debouncedSaveInvestigationState();
  const preview = document.querySelector(".investigation-note-preview");
  if (preview) {
    preview.innerHTML = text.trim() ? renderInvestigationNoteHtml(text) : '<div class="tool-empty">No investigation note yet.</div>';
  }
  if (previousLinks !== nextLinks) {
    debouncedRebuildAndRender();
  }
}

function setGraphTagFilterInput(value) {
  state.graphTagFilterInput = value;
}

function refreshGraphAfterTagFilterChange() {
  syncLayout(true);
  fitGraph();
}

function shouldCommitExactGraphTagFromInputEvent(event, exactTag) {
  if (!exactTag) {
    return false;
  }
  if (state.graphTagFilterSelectionArmed) {
    return true;
  }
  return event instanceof InputEvent && event.inputType === "insertReplacementText";
}

function resolveExactGraphTagFilterInput(rawTag) {
  const normalizedTag = canonicalizeTag(rawTag);
  if (!normalizedTag) {
    return null;
  }
  if (state.tagDisplayByKey.has(normalizedTag)) {
    return normalizedTag;
  }
  return null;
}

function resolveGraphTagFilterInput(rawTag) {
  const exactTag = resolveExactGraphTagFilterInput(rawTag);
  if (exactTag) {
    return exactTag;
  }
  const normalizedTag = canonicalizeTag(rawTag);
  if (!normalizedTag) {
    return null;
  }
  const fallbackTag = getScopedGraphFilterTags(200).find((tag) => (
    tag.startsWith(normalizedTag)
    || getGraphFilterDisplayTag(tag).toLocaleLowerCase().includes(normalizedTag)
  ));
  return fallbackTag || null;
}

function addGraphTagFilter(bucket, rawTag) {
  const normalizedTag = resolveGraphTagFilterInput(rawTag) || canonicalizeTag(rawTag);
  if (!normalizedTag) {
    return;
  }
  state.activeTagFilter = null;
  const nextFilters = {
    requireAll: state.graphTagFilters.requireAll.filter((tag) => tag !== normalizedTag),
    exclude: state.graphTagFilters.exclude.filter((tag) => tag !== normalizedTag),
  };
  nextFilters[bucket] = [...nextFilters[bucket], normalizedTag];
  state.graphTagFilters = nextFilters;
  state.graphTagFilterInput = "";
  state.graphTagFilterSelectionArmed = false;
  updateCurrentNoteMeta();
  renderGraphFilterToolbar();
  refreshGraphAfterTagFilterChange();
}

function removeGraphTagFilter(bucket, rawTag) {
  const normalizedTag = canonicalizeTag(rawTag);
  state.graphTagFilters = {
    ...state.graphTagFilters,
    [bucket]: state.graphTagFilters[bucket].filter((tag) => tag !== normalizedTag),
  };
  updateCurrentNoteMeta();
  renderGraphFilterToolbar();
  refreshGraphAfterTagFilterChange();
}

function clearGraphTagFilters() {
  state.graphTagFilters = { requireAll: [], exclude: [] };
  state.graphTagFilterInput = "";
  state.graphTagFilterSelectionArmed = false;
  updateCurrentNoteMeta();
  renderGraphFilterToolbar();
  refreshGraphAfterTagFilterChange();
}

function removeGraphTag(rawTag) {
  const normalizedTag = canonicalizeTag(rawTag);
  state.graphTagFilters = {
    requireAll: state.graphTagFilters.requireAll.filter((tag) => tag !== normalizedTag),
    exclude: state.graphTagFilters.exclude.filter((tag) => tag !== normalizedTag),
  };
  updateCurrentNoteMeta();
  renderGraphFilterToolbar();
  refreshGraphAfterTagFilterChange();
}

function toggleGraphTagMode(rawTag) {
  const normalizedTag = canonicalizeTag(rawTag);
  if (!normalizedTag) {
    return;
  }
  if (state.graphTagFilters.exclude.includes(normalizedTag)) {
    state.graphTagFilters = {
      requireAll: [...state.graphTagFilters.requireAll.filter((tag) => tag !== normalizedTag), normalizedTag],
      exclude: state.graphTagFilters.exclude.filter((tag) => tag !== normalizedTag),
    };
  } else {
    state.graphTagFilters = {
      requireAll: state.graphTagFilters.requireAll.filter((tag) => tag !== normalizedTag),
      exclude: [...state.graphTagFilters.exclude.filter((tag) => tag !== normalizedTag), normalizedTag],
    };
  }
  updateCurrentNoteMeta();
  renderGraphFilterToolbar();
  refreshGraphAfterTagFilterChange();
}

function commitGraphTagFilterInput(input, { allowFallback = true } = {}) {
  if (!input) {
    return;
  }
  const normalizedTag = allowFallback
    ? resolveGraphTagFilterInput(input.value)
    : resolveExactGraphTagFilterInput(input.value);
  if (!normalizedTag) {
    return;
  }
  addGraphTagFilter("requireAll", normalizedTag);
}

function insertNodeLinkIntoCurrentNote(targetNodeId) {
  const currentId = currentNodeId();
  const targetNode = state.nodeById.get(targetNodeId);
  const textarea = document.getElementById("node-note-editor");
  if (!currentId || !targetNode || !textarea) {
    return;
  }
  const currentText = textarea.value;
  const start = state.noteCursorNodeId === currentId ? state.noteCursorStart : textarea.selectionStart;
  const end = state.noteCursorNodeId === currentId ? state.noteCursorEnd : textarea.selectionEnd;
  const selectedText = currentText.slice(start, end) || state.noteLinkSelectionText || targetNode.title;
  const linkMarkup = `[[node:${targetNodeId}][${selectedText}]]`;
  const nextText = `${currentText.slice(0, start)}${linkMarkup}${currentText.slice(end)}`;
  textarea.value = nextText;
  const nextCursor = start + linkMarkup.length;
  closeNoteLinkPicker();
  state.noteCursorNodeId = currentId;
  state.noteCursorStart = nextCursor;
  state.noteCursorEnd = nextCursor;
  state.noteLinkSelectionText = "";
  updateNodeNoteText(currentId, nextText);
  textarea.focus();
  textarea.setSelectionRange(nextCursor, nextCursor);
}

async function fetchWithRetry(url, options = {}, attempts = 4, retryDelayMs = 150) {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        ...options,
      });
      if (response.ok) {
        return response;
      }
      const error = new Error(`${response.status} ${response.statusText}`.trim());
      error.status = response.status;
      throw error;
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts - 1 && (!("status" in error) || error.status === 404);
      if (!canRetry) {
        throw error;
      }
      await delay(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
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
  const requestToken = ++state.noteRequestToken;
  if (node.isCustom) {
    noteContent.innerHTML = "";
    renderNoteSurface(node, renderCustomNodeBody(node));
    renderInvestigatorTools();
    return;
  }
  const response = await fetchWithRetry(`./notes/${nodeId}.html`);
  const noteHtml = await response.text();
  if (requestToken !== state.noteRequestToken) {
    return;
  }
  renderNoteSurface(node, noteHtml);
  renderInvestigatorTools();
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
  }
  if (state.activeTagFilter) {
    hash.set("tag", state.activeTagFilter);
  }
  const hashString = hash.toString();
  const nextUrl = hashString ? `#${hashString}` : window.location.pathname + window.location.search;
  history.replaceState(null, "", nextUrl);
}

function getToolbarTargetNodeId() {
  if (state.view !== "explorer") {
    return null;
  }
  if (state.hoverNodeId && state.nodeById.has(state.hoverNodeId)) {
    return state.hoverNodeId;
  }
  if (state.inspectNodeId && state.nodeById.has(state.inspectNodeId)) {
    return state.inspectNodeId;
  }
  if (state.graphRootNodeId && state.nodeById.has(state.graphRootNodeId)) {
    return state.graphRootNodeId;
  }
  return null;
}

function setToolbarButtonState(button, { disabled = false, active = false, label, title } = {}) {
  if (!button) {
    return;
  }
  button.disabled = disabled;
  button.classList.toggle("is-active", active);
  if (label) {
    button.setAttribute("aria-label", label);
  }
  setTooltipLabel(button, title);
  button.removeAttribute("title");
}

function updateOptionsPanel() {
  toolbarOptionsPanel.hidden = !state.optionsPanelOpen;
  toolbarOptionsButton.classList.toggle("is-active", state.optionsPanelOpen);
  toolbarOptionsButton.setAttribute("aria-expanded", String(state.optionsPanelOpen));
}

function setOptionsPanelOpen(open) {
  state.optionsPanelOpen = open;
  if (open) {
    state.bookmarksPanelOpen = false;
  }
  updateOptionsPanel();
  renderBookmarksPanel();
}

function renderBookmarksPanel() {
  const bookmarkedNodes = getBookmarkedNodes();
  toolbarBookmarksPanel.innerHTML = bookmarkedNodes.length
    ? `
      <div class="toolbar-popover-section">
        <div class="toolbar-popover-heading">Bookmarks</div>
        <div class="toolbar-bookmark-list">
          ${bookmarkedNodes.map((node) => `
            <div class="toolbar-bookmark-item ${node.id === currentNodeId() ? "is-current" : ""}">
              <button type="button" class="toolbar-bookmark-open" data-open-bookmark="${node.id}">
                <strong>${escapeHtml(node.title)}</strong>
                <small>${escapeHtml(node.group || "node")}</small>
              </button>
              <button
                type="button"
                class="toolbar-bookmark-remove"
                data-remove-bookmark="${node.id}"
                aria-label="Remove ${escapeHtml(node.title)} from bookmarks"
              >×</button>
            </div>
          `).join("")}
        </div>
      </div>
    `
    : `
      <div class="toolbar-popover-section">
        <div class="toolbar-popover-heading">Bookmarks</div>
        <div class="tool-empty">Bookmark nodes from the graph toolbar or node context menu.</div>
      </div>
    `;
  toolbarBookmarksPanel.hidden = !state.bookmarksPanelOpen;
  toolbarBookmarksButton.classList.toggle("is-active", state.bookmarksPanelOpen);
  toolbarBookmarksButton.setAttribute("aria-expanded", String(state.bookmarksPanelOpen));
  setTooltipLabel(
    toolbarBookmarksButton,
    bookmarkedNodes.length
      ? `Open bookmarks (${bookmarkedNodes.length})`
      : "Open bookmarks",
  );
}

function setBookmarksPanelOpen(open) {
  state.bookmarksPanelOpen = open;
  if (open) {
    state.optionsPanelOpen = false;
  }
  updateOptionsPanel();
  renderBookmarksPanel();
}

function hideLayerContextMenu() {
  state.layerContextMenu = { open: false, layerId: null };
  layerContextMenu.hidden = true;
}

function showLayerContextMenu(clientX, clientY, layerId) {
  if (!layerId) {
    return;
  }
  const rect = detectivePanel.getBoundingClientRect();
  const menuWidth = 168;
  const menuHeight = 48;
  const left = Math.min(
    Math.max(8, clientX - rect.left),
    Math.max(8, rect.width - menuWidth - 8),
  );
  const top = Math.min(
    Math.max(8, clientY - rect.top),
    Math.max(8, rect.height - menuHeight - 8),
  );
  state.layerContextMenu = { open: true, layerId };
  layerContextMenu.style.left = `${left}px`;
  layerContextMenu.style.top = `${top}px`;
  layerContextMenu.hidden = false;
}

function updateDetectiveToolbarActions() {
  const activeLayer = getActiveLayer();
  toolbarDetectiveActions.hidden = !state.detectiveMode;

  setToolbarButtonState(toolbarCreateLayerButton, {
    disabled: !state.detectiveMode,
    title: "Create layer",
    label: "Create layer",
  });
  setToolbarButtonState(toolbarCreateNodeButton, {
    disabled: !state.detectiveMode || !activeLayer,
    title: activeLayer ? `Create custom node in ${activeLayer.name}` : "Create custom node",
    label: activeLayer ? `Create custom node in ${activeLayer.name}` : "Create custom node",
  });
  setToolbarButtonState(toolbarDuplicateLayerButton, {
    disabled: !state.detectiveMode || !activeLayer,
    title: activeLayer ? `Duplicate ${activeLayer.name}` : "Duplicate layer",
    label: activeLayer ? `Duplicate ${activeLayer.name}` : "Duplicate layer",
  });
  setToolbarButtonState(toolbarDeleteLayerButton, {
    disabled: !state.detectiveMode || !activeLayer,
    title: activeLayer ? `Delete ${activeLayer.name}` : "Delete layer",
    label: activeLayer ? `Delete ${activeLayer.name}` : "Delete layer",
  });
  setToolbarButtonState(toolbarExportLayerButton, {
    disabled: !state.detectiveMode || !activeLayer,
    title: activeLayer ? `Export ${activeLayer.name}` : "Export layer",
    label: activeLayer ? `Export ${activeLayer.name}` : "Export layer",
  });
  setToolbarButtonState(toolbarImportLayerButton, {
    disabled: !state.detectiveMode,
    title: "Import layer",
    label: "Import layer",
  });
}

function updateToolbarNodeActions() {
  setToolbarButtonState(toolbarBackButton, {
    disabled: !canNavigateBack(),
    label: "Go back",
    title: "Go back",
  });
  const targetNodeId = getToolbarTargetNodeId();
  const targetNode = targetNodeId ? state.nodeById.get(targetNodeId) : null;
  const targetTitle = targetNode?.title || "node";
  const bookmarked = Boolean(targetNodeId && isBookmarked(targetNodeId));

  setToolbarButtonState(toolbarInspectButton, {
    disabled: !targetNodeId || targetNodeId === state.inspectNodeId,
    label: `Inspect ${targetTitle}`,
    title: targetNodeId ? `Inspect ${targetTitle}` : "Inspect node",
  });

  setToolbarButtonState(toolbarLocalGraphButton, {
    disabled: !canOpenLocalGraphForNode(targetNodeId),
    label: `Open local graph for ${targetTitle}`,
    title: targetNodeId ? `Open local graph for ${targetTitle}` : "Open local graph",
  });

  setToolbarButtonState(toolbarExpandButton, {
    disabled: !canExpandNeighborsForNode(targetNodeId),
    label: `Expand neighbors of ${targetTitle}`,
    title: targetNodeId ? `Expand neighbors of ${targetTitle}` : "Expand neighbors",
  });

  setToolbarButtonState(toolbarBookmarkButton, {
    disabled: !targetNodeId,
    active: bookmarked,
    label: bookmarked
      ? `Remove bookmark from ${targetTitle}`
      : `Bookmark ${targetTitle}`,
    title: targetNodeId
      ? (bookmarked ? `Remove bookmark from ${targetTitle}` : `Bookmark ${targetTitle}`)
      : "Bookmark node",
  });
  toolbarBookmarkButton.innerHTML = bookmarkIconMarkup(bookmarked);

  setToolbarButtonState(toolbarBookmarksButton, {
    disabled: false,
    active: state.bookmarksPanelOpen,
    label: state.bookmarkedNodeIds.length ? `Open bookmarks (${state.bookmarkedNodeIds.length})` : "Open bookmarks",
    title: state.bookmarkedNodeIds.length ? `Open bookmarks (${state.bookmarkedNodeIds.length})` : "Open bookmarks",
  });
  toolbarBookmarksButton.setAttribute("aria-expanded", String(state.bookmarksPanelOpen));
}

function syncBookmarkButtons(nodeId) {
  const node = nodeId ? state.nodeById.get(nodeId) : null;
  const bookmarked = Boolean(nodeId && isBookmarked(nodeId));
  if (nodeId && getToolbarTargetNodeId() === nodeId) {
    toolbarBookmarkButton.classList.toggle("is-active", bookmarked);
    toolbarBookmarkButton.innerHTML = bookmarkIconMarkup(bookmarked);
    toolbarBookmarkButton.setAttribute(
      "aria-label",
      bookmarked ? `Remove bookmark from ${node?.title || "node"}` : `Bookmark ${node?.title || "node"}`,
    );
  }
  const noteBookmarkButton = [...noteContent.querySelectorAll("[data-toggle-bookmark]")]
    .find((button) => button.dataset.toggleBookmark === nodeId);
  if (noteBookmarkButton) {
    noteBookmarkButton.classList.toggle("is-active", bookmarked);
    noteBookmarkButton.innerHTML = bookmarkIconMarkup(bookmarked);
    noteBookmarkButton.setAttribute(
      "aria-label",
      bookmarked ? `Remove bookmark from ${node?.title || "node"}` : `Bookmark ${node?.title || "node"}`,
    );
  }
}

function updateDetectiveButton() {
  detectiveButton.classList.toggle("is-active", state.detectiveMode);
  detectiveButton.setAttribute("aria-pressed", String(state.detectiveMode));
  appShell.classList.toggle("is-detective", state.detectiveMode);
  detectivePanel.hidden = !state.detectiveMode;
  detectivePanelResizer.hidden = !state.detectiveMode;
  if (!state.detectiveMode) {
    hideLayerContextMenu();
  }
  updateDetectiveToolbarActions();
  updateToolbarNodeActions();
}

function setDetectiveMode(enabled, shouldFit = true) {
  state.detectiveMode = enabled;
  buildAdjacency();
  refreshSearchWorkerIndex();
  updateDetectiveButton();
  applyPanelWidths(state.panelWidth, state.detectivePanelWidth, "detective");
  hideContextMenu();
  saveInvestigationState();
  renderInvestigatorTools();
  requestAnimationFrame(() => {
    resizeCanvas();
    if (shouldFit && state.graphRootNodeId) {
      fitGraph();
      return;
    }
    render();
  });
}

function hideContextMenu() {
  state.contextMenu = { open: false, nodeId: null };
  graphContextMenu.hidden = true;
  hideTooltip("node");
  updateToolbarNodeActions();
}

function showContextMenu(clientX, clientY, nodeId) {
  const rect = graphStage.getBoundingClientRect();
  const menuWidth = 210;
  const menuHeight = 140;
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
  contextToggleBookmarkButton.textContent = isBookmarked(nodeId) ? "Remove Bookmark" : "Bookmark Node";
  graphContextMenu.hidden = false;
  updateToolbarNodeActions();
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

function buildFilteredComponentLayout(componentIds) {
  const componentNodes = componentIds
    .map((nodeId) => state.nodeById.get(nodeId))
    .filter(Boolean);
  if (!componentNodes.length) {
    return [];
  }

  const visibleIdSet = new Set(componentIds);
  const degreeWithinComponent = (nodeId) => {
    const neighbors = state.adjacency.get(nodeId) || new Set();
    let degree = 0;
    for (const neighborId of neighbors) {
      if (visibleIdSet.has(neighborId)) {
        degree += 1;
      }
    }
    return degree;
  };

  const center = [...componentNodes].sort((left, right) => (
    degreeWithinComponent(right.id) - degreeWithinComponent(left.id)
    || right.degree - left.degree
    || left.title.localeCompare(right.title)
  ))[0];
  const depthById = new Map([[center.id, 0]]);
  const queue = [center.id];

  while (queue.length) {
    const currentId = queue.shift();
    const currentDepth = depthById.get(currentId) || 0;
    const neighbors = state.adjacency.get(currentId) || new Set();
    for (const neighborId of neighbors) {
      if (!visibleIdSet.has(neighborId) || depthById.has(neighborId)) {
        continue;
      }
      depthById.set(neighborId, currentDepth + 1);
      queue.push(neighborId);
    }
  }

  const positions = new Map([[center.id, { x: 0, y: 0 }]]);
  const nodesByDepth = new Map();
  for (const node of componentNodes) {
    if (node.id === center.id) {
      continue;
    }
    const depth = depthById.get(node.id) || 1;
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, []);
    }
    nodesByDepth.get(depth).push(node);
  }

  const sortedDepths = [...nodesByDepth.keys()].sort((left, right) => left - right);
  for (const depth of sortedDepths) {
    const ringNodes = [...nodesByDepth.get(depth)].sort((left, right) => {
      const leftAngle = Math.atan2(left.homeY - center.homeY, left.homeX - center.homeX);
      const rightAngle = Math.atan2(right.homeY - center.homeY, right.homeX - center.homeX);
      return leftAngle - rightAngle || right.degree - left.degree || left.title.localeCompare(right.title);
    });
    const ringRadius = 80 + (depth - 1) * 68;
    const step = (Math.PI * 2) / Math.max(1, ringNodes.length);
    const angleOffset = -Math.PI / 2;
    ringNodes.forEach((node, index) => {
      const angle = angleOffset + index * step;
      const radius = ringRadius + Math.min(14, degreeWithinComponent(node.id) * 2.2);
      positions.set(node.id, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    });
  }

  return componentNodes.map((node) => ({
    node,
    ...positions.get(node.id),
  }));
}

function getFilteredLayoutComponents(visibleIds) {
  const pending = new Set(visibleIds);
  const components = [];

  while (pending.size) {
    const startId = pending.values().next().value;
    pending.delete(startId);
    const queue = [startId];
    const componentIds = [startId];

    while (queue.length) {
      const currentId = queue.shift();
      const neighbors = state.adjacency.get(currentId) || new Set();
      for (const neighborId of neighbors) {
        if (!pending.has(neighborId) || !visibleIds.has(neighborId)) {
          continue;
        }
        pending.delete(neighborId);
        queue.push(neighborId);
        componentIds.push(neighborId);
      }
    }

    components.push(componentIds);
  }

  return components.sort((left, right) => right.length - left.length);
}

function applyFilteredGraphLayout(resetPositions = true) {
  restoreGlobalLayout(false);
  const visibleIds = getVisibleNodeIds();
  if (!visibleIds || !visibleIds.size) {
    return;
  }

  const components = getFilteredLayoutComponents(visibleIds)
    .map((componentIds) => {
      const entries = buildFilteredComponentLayout(componentIds);
      if (!entries.length) {
        return null;
      }
      const bounds = computeBounds(entries);
      return {
        entries,
        width: Math.max(80, bounds.maxX - bounds.minX),
        height: Math.max(80, bounds.maxY - bounds.minY),
        minX: bounds.minX,
        minY: bounds.minY,
      };
    })
    .filter(Boolean);

  if (!components.length) {
    return;
  }

  const gap = 104;
  const targetRowWidth = Math.max(520, Math.sqrt(visibleIds.size) * 170);
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  for (const component of components) {
    if (cursorX > 0 && cursorX + component.width > targetRowWidth) {
      cursorX = 0;
      cursorY += rowHeight + gap;
      rowHeight = 0;
    }

    const offsetX = cursorX - component.minX;
    const offsetY = cursorY - component.minY;
    component.entries.forEach(({ node, x, y }) => {
      setNodeAnchor(node, x + offsetX, y + offsetY, resetPositions);
    });

    cursorX += component.width + gap;
    rowHeight = Math.max(rowHeight, component.height);
  }

  const visibleNodes = state.nodes.filter((node) => visibleIds.has(node.id) && isRuntimeNodeVisible(node));
  const bounds = {
    minX: Math.min(...visibleNodes.map((node) => node.anchorX)),
    maxX: Math.max(...visibleNodes.map((node) => node.anchorX)),
    minY: Math.min(...visibleNodes.map((node) => node.anchorY)),
    maxY: Math.max(...visibleNodes.map((node) => node.anchorY)),
  };
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  visibleNodes.forEach((node) => {
    setNodeAnchor(node, node.anchorX - centerX, node.anchorY - centerY, resetPositions);
  });
}

function applyNeighborLayout(nodeId, resetPositions = true) {
  restoreGlobalLayout(false);
  const layoutState = buildNeighborhoodLayoutState(nodeId);
  if (!layoutState) {
    return;
  }
  setNodeAnchor(layoutState.center, 0, 0, resetPositions);
  applyRadialNeighborLayout(layoutState, resetPositions);
}

function syncLayout(resetPositions = true) {
  if (state.neighborMode && state.graphRootNodeId) {
    applyNeighborLayout(state.graphRootNodeId, resetPositions);
    return;
  }
  if (hasActiveGraphTagFilters()) {
    applyFilteredGraphLayout(resetPositions);
    return;
  }
  restoreGlobalLayout(resetPositions);
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
  fitGraph();
  syncNoteTitleActions(nodeId);
}

function openCommunity(communityId, updateUrl = true) {
  const community = state.communityById.get(communityId);
  const hubNode = community?.hubId ? state.nodeById.get(community.hubId) : null;
  if (!community || !hubNode) {
    return;
  }
  rememberNavigationSnapshot();
  hideContextMenu();
  clearActivePath(false);
  state.activeCommunityId = communityId;
  state.graphRootNodeId = null;
  state.inspectNodeId = hubNode.id;
  state.activeTagFilter = null;
  state.neighborMode = false;
  state.expandedNodeIds = new Set();
  setActiveView("explorer");
  syncLayout(true);
  fitGraph();
  loadNote(hubNode.id);
  if (updateUrl) {
    updateUrlState();
  }
}

function openLocalGraph(nodeId) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  rememberNavigationSnapshot();
  hideContextMenu();
  state.activeCommunityId = null;
  state.neighborMode = true;
  selectNode(nodeId, true, true, false);
}

function toggleTagFilter(tag) {
  if (!state.inspectNodeId) {
    return;
  }
  clearActivePath(false);
  const normalizedTag = canonicalizeTag(tag);
  if (state.graphTagFilters.requireAll.includes(normalizedTag)) {
    removeGraphTagFilter("requireAll", normalizedTag);
    return;
  }
  addGraphTagFilter("requireAll", normalizedTag);
}

function inspectNode(nodeId, updateUrl = true, recordNavigation = true) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  if (recordNavigation) {
    rememberNavigationSnapshot();
  }
  maybeClearPathForNode(nodeId);
  hideContextMenu();
  setActiveView("explorer");
  state.inspectNodeId = nodeId;
  loadNote(nodeId);
  if (updateUrl) {
    updateUrlState();
  }
  render();
}

function selectNode(nodeId, shouldCenter = true, updateUrl = true, recordNavigation = true) {
  const node = state.nodeById.get(nodeId);
  if (!node) return;
  if (recordNavigation) {
    rememberNavigationSnapshot();
  }
  maybeClearPathForNode(nodeId);
  hideContextMenu();
  setActiveView("explorer");
  state.activeCommunityId = null;
  state.neighborMode = true;
  state.graphRootNodeId = nodeId;
  state.inspectNodeId = nodeId;
  state.expandedNodeIds = new Set();
  syncLayout(true);
  if (shouldCenter) {
    fitGraph();
  } else {
    state.camera.x = node.x;
    state.camera.y = node.y;
  }
  loadNote(nodeId);
  if (updateUrl) {
    updateUrlState();
  }
  render();
}

function resetSelection() {
  rememberNavigationSnapshot();
  hideContextMenu();
  clearActivePath(false);
  setActiveView("landing");
  searchInput.value = "";
  resetSearchState();
  state.activeCommunityId = null;
  state.graphRootNodeId = null;
  state.inspectNodeId = null;
  state.activeTagFilter = null;
  state.neighborMode = false;
  state.expandedNodeIds = new Set();
  showEmptyNoteState();
  syncLayout(true);
  fitGraph();
  updateUrlState();
  render();
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
  const getTooltipTarget = (target) => (
    target instanceof Element
      ? target.closest(".toolbar-tooltip-target[data-tooltip], [data-tooltip]")
      : null
  );

  window.addEventListener("resize", resizeCanvas);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      if (isClusterLandingView()) {
        scheduleLandingFit();
      } else {
        resizeCanvas();
      }
    });
  }
  new ResizeObserver(() => {
    hideContextMenu();
    if (isClusterLandingView()) {
      scheduleLandingFit();
    } else {
      resizeCanvas();
    }
  }).observe(graphStage);
  window.addEventListener("hashchange", () => applyUrlState());
  document.addEventListener("click", (event) => {
    if (!state.contextMenu.open) {
      if (state.optionsPanelOpen) {
        const clickedInsideOptions = toolbarOptionsPanel.contains(event.target) || toolbarOptionsButton.contains(event.target);
        if (!clickedInsideOptions) {
          setOptionsPanelOpen(false);
        }
      }
      return;
    }
    if (!graphContextMenu.contains(event.target)) {
      hideContextMenu();
    }
    if (state.optionsPanelOpen) {
      const clickedInsideOptions = toolbarOptionsPanel.contains(event.target) || toolbarOptionsButton.contains(event.target);
      if (!clickedInsideOptions) {
        setOptionsPanelOpen(false);
      }
    }
  });
  document.addEventListener("pointerover", (event) => {
    if (state.dragging) {
      return;
    }
    const target = getTooltipTarget(event.target);
    if (!target || target.disabled) {
      return;
    }
    showTooltip({
      html: buildTextTooltipMarkup(target.dataset.tooltip),
      clientX: event.clientX,
      clientY: event.clientY,
      sourceType: "dom",
      sourceKey: target,
    });
  });
  document.addEventListener("pointermove", (event) => {
    const target = getTooltipTarget(event.target);
    if (!target || target.disabled) {
      return;
    }
    if (state.tooltip.sourceType === "dom" && state.tooltip.sourceKey === target) {
      updateTooltipPosition(event.clientX, event.clientY, "dom", target);
      return;
    }
    showTooltip({
      html: buildTextTooltipMarkup(target.dataset.tooltip),
      clientX: event.clientX,
      clientY: event.clientY,
      sourceType: "dom",
      sourceKey: target,
    });
  });
  document.addEventListener("pointerout", (event) => {
    const target = getTooltipTarget(event.target);
    if (!target) {
      return;
    }
    const nextTarget = getTooltipTarget(event.relatedTarget);
    if (nextTarget === target) {
      return;
    }
    hideTooltip("dom", target);
  });
  document.addEventListener("focusin", (event) => {
    const target = getTooltipTarget(event.target);
    if (!target || target.disabled) {
      return;
    }
    const rect = target.getBoundingClientRect();
    showTooltip({
      html: buildTextTooltipMarkup(target.dataset.tooltip),
      clientX: rect.left + (rect.width / 2),
      clientY: rect.bottom,
      sourceType: "dom",
      sourceKey: target,
    });
  });
  document.addEventListener("focusout", (event) => {
    const target = getTooltipTarget(event.target);
    if (!target) {
      return;
    }
    hideTooltip("dom", target);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideContextMenu();
      hideLayerContextMenu();
      setBookmarksPanelOpen(false);
      setOptionsPanelOpen(false);
      hideTooltip();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hideContextMenu();
      hideLayerContextMenu();
      setBookmarksPanelOpen(false);
      setOptionsPanelOpen(false);
      hideTooltip();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (
      state.bookmarksPanelOpen
      && !toolbarBookmarksPanel.contains(event.target)
      && !toolbarBookmarksButton.contains(event.target)
    ) {
      setBookmarksPanelOpen(false);
    }
    if (
      state.optionsPanelOpen
      && !toolbarOptionsPanel.contains(event.target)
      && !toolbarOptionsButton.contains(event.target)
    ) {
      setOptionsPanelOpen(false);
    }
    if (
      state.layerContextMenu.open
      && !layerContextMenu.contains(event.target)
      && !event.target.closest("[data-select-layer]")
    ) {
      hideLayerContextMenu();
    }
  });

  fitButton.addEventListener("click", fitGraph);
  resetButton.addEventListener("click", resetSelection);
  detectiveButton.addEventListener("click", () => {
    setDetectiveMode(!state.detectiveMode);
  });
  toolbarCreateLayerButton.addEventListener("click", () => createLayer());
  toolbarCreateNodeButton.addEventListener("click", () => createCustomNode());
  toolbarDuplicateLayerButton.addEventListener("click", () => duplicateActiveLayer());
  toolbarDeleteLayerButton.addEventListener("click", () => deleteActiveLayer());
  toolbarExportLayerButton.addEventListener("click", () => exportActiveLayer());
  toolbarImportLayerButton.addEventListener("click", () => {
    layerImportInput.value = "";
    layerImportInput.click();
  });
  toolbarInspectButton.addEventListener("click", () => {
    const targetNodeId = getToolbarTargetNodeId();
    if (targetNodeId) {
      inspectNode(targetNodeId);
    }
  });
  toolbarLocalGraphButton.addEventListener("click", () => {
    const targetNodeId = getToolbarTargetNodeId();
    if (targetNodeId) {
      openLocalGraph(targetNodeId);
    }
  });
  toolbarExpandButton.addEventListener("click", () => {
    const targetNodeId = getToolbarTargetNodeId();
    if (targetNodeId) {
      expandNeighborhood(targetNodeId);
    }
  });
  toolbarBookmarkButton.addEventListener("click", () => {
    const targetNodeId = getToolbarTargetNodeId();
    if (targetNodeId) {
      toggleBookmark(targetNodeId);
    }
  });
  toolbarBackButton?.addEventListener("click", () => {
    goBackInNavigationHistory();
  });
  toolbarBookmarksButton.addEventListener("click", () => {
    setBookmarksPanelOpen(!state.bookmarksPanelOpen);
  });
  toolbarOptionsButton.addEventListener("click", () => {
    setOptionsPanelOpen(!state.optionsPanelOpen);
  });
  colorModeSelect.addEventListener("change", (event) => {
    state.colorMode = event.target.value;
    saveDisplaySettings();
    render();
  });
  shapeModeSelect.addEventListener("change", (event) => {
    state.shapeMode = event.target.value;
    saveDisplaySettings();
    render();
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
  contextToggleBookmarkButton.addEventListener("click", () => {
    if (!state.contextMenu.nodeId) {
      return;
    }
    toggleBookmark(state.contextMenu.nodeId);
    hideContextMenu();
  });
  contextRenameLayerButton.addEventListener("click", () => {
    const { layerId } = state.layerContextMenu;
    hideLayerContextMenu();
    if (layerId) {
      promptRenameLayer(layerId);
    }
  });
  toolbarBookmarksPanel.addEventListener("click", (event) => {
    const openBookmarkButton = event.target.closest("[data-open-bookmark]");
    if (openBookmarkButton) {
      selectNode(openBookmarkButton.dataset.openBookmark, true);
      setBookmarksPanelOpen(false);
      return;
    }
    const removeBookmarkButton = event.target.closest("[data-remove-bookmark]");
    if (removeBookmarkButton) {
      toggleBookmark(removeBookmarkButton.dataset.removeBookmark);
    }
  });

  panelResizer.addEventListener("mousedown", (event) => {
    if (window.innerWidth <= 920) {
      return;
    }
    event.preventDefault();
    panelResizer.classList.add("is-dragging");
    const shellRect = explorerShell.getBoundingClientRect();
    const startX = event.clientX;
    const startWidth = state.panelWidth;

    const onMouseMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX;
      const nextWidth = startWidth + delta;
      applyPanelWidths(nextWidth, state.detectivePanelWidth, "note");
      resizeCanvas();
    };

    const onMouseUp = () => {
      panelResizer.classList.remove("is-dragging");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    applyPanelWidths(Math.min(startWidth, shellRect.width - 280), state.detectivePanelWidth, "note");
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  panelResizer.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? 24 : -24;
    applyPanelWidths(state.panelWidth + delta, state.detectivePanelWidth, "note");
    resizeCanvas();
  });

  detectivePanelResizer.addEventListener("mousedown", (event) => {
    if (window.innerWidth <= 920 || !state.detectiveMode) {
      return;
    }
    event.preventDefault();
    detectivePanelResizer.classList.add("is-dragging");
    const shellRect = explorerShell.getBoundingClientRect();
    const startX = event.clientX;
    const startWidth = state.detectivePanelWidth;

    const onMouseMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX;
      const nextWidth = startWidth + delta;
      applyPanelWidths(state.panelWidth, nextWidth, "detective");
      resizeCanvas();
    };

    const onMouseUp = () => {
      detectivePanelResizer.classList.remove("is-dragging");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    applyPanelWidths(state.panelWidth, Math.min(startWidth, shellRect.width - 280), "detective");
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  detectivePanelResizer.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? 24 : -24;
    applyPanelWidths(state.panelWidth, state.detectivePanelWidth + delta, "detective");
    resizeCanvas();
  });

  const updateActivePointer = (event) => {
    const rect = graphStage.getBoundingClientRect();
    state.activePointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const removeActivePointer = (event) => {
    state.activePointers.delete(event.pointerId);
  };

  const activePointerList = () => [...state.activePointers.values()];

  const pointerDistance = (first, second) => Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY,
  );

  const pointerCenter = (first, second) => ({
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  });

  const startPinchZoom = () => {
    const pointers = activePointerList();
    if (pointers.length < 2) {
      return;
    }
    const [first, second] = pointers;
    const center = pointerCenter(first, second);
    const worldCenter = screenToWorld(center.x, center.y);
    state.pinching = true;
    state.dragging = false;
    state.suppressNextClick = true;
    state.pinchStart = {
      distance: Math.max(1, pointerDistance(first, second)),
      zoom: state.camera.zoom,
      centerX: center.x,
      centerY: center.y,
      worldX: worldCenter.x,
      worldY: worldCenter.y,
    };
    hideTooltip("node");
    canvas.style.cursor = "grabbing";
  };

  const updatePinchZoom = () => {
    const pointers = activePointerList();
    if (!state.pinching || pointers.length < 2) {
      return false;
    }
    const [first, second] = pointers;
    const center = pointerCenter(first, second);
    const distance = Math.max(1, pointerDistance(first, second));
    const ratio = distance / state.pinchStart.distance;
    state.camera.zoom = Math.max(0.05, Math.min(4.5, state.pinchStart.zoom * ratio));
    const rect = graphStage.getBoundingClientRect();
    state.camera.x = state.pinchStart.worldX - (center.x - rect.width / 2) / state.camera.zoom;
    state.camera.y = state.pinchStart.worldY - (center.y - rect.height / 2) / state.camera.zoom;
    state.pointer = { x: center.x, y: center.y, active: true };
    render();
    return true;
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    event.preventDefault();
    updateActivePointer(event);
    canvas.setPointerCapture?.(event.pointerId);
    hideContextMenu();
    hideTooltip("node");
    state.hoverNodeId = null;
    state.hoverCommunityId = null;
    const rect = graphStage.getBoundingClientRect();
    state.pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active: true,
    };
    if (state.activePointers.size >= 2) {
      startPinchZoom();
      return;
    }
    state.dragging = true;
    state.dragStart = {
      x: event.clientX,
      y: event.clientY,
      cameraX: state.camera.x,
      cameraY: state.camera.y,
    };
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.activePointers.has(event.pointerId)) {
      return;
    }
    updateActivePointer(event);
    if (updatePinchZoom()) {
      event.preventDefault();
      return;
    }
    if (!state.dragging) return;
    event.preventDefault();
    const rect = graphStage.getBoundingClientRect();
    state.pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active: true,
    };
    const dx = (event.clientX - state.dragStart.x) / state.camera.zoom;
    const dy = (event.clientY - state.dragStart.y) / state.camera.zoom;
    state.camera.x = state.dragStart.cameraX - dx;
    state.camera.y = state.dragStart.cameraY - dy;
    render();
  });

  const endCanvasDrag = (event) => {
    const wasDragging = state.dragging;
    const wasPinching = state.pinching;
    removeActivePointer(event);
    canvas.releasePointerCapture?.(event.pointerId);

    if (state.pinching && state.activePointers.size < 2) {
      state.pinching = false;
      state.suppressNextClick = true;
      if (state.activePointers.size === 1) {
        const [remainingPointer] = activePointerList();
        state.dragging = true;
        state.dragStart = {
          x: remainingPointer.clientX,
          y: remainingPointer.clientY,
          cameraX: state.camera.x,
          cameraY: state.camera.y,
        };
        return;
      }
    }

    if (!wasDragging && !wasPinching) {
      return;
    }
    state.dragging = false;
    canvas.style.cursor = (isClusterLandingView()
      ? (state.hoverCommunityId ? "pointer" : "default")
      : (state.hoverNodeId ? "pointer" : "default"));
    updateToolbarNodeActions();
    refreshNodeTooltip();
  };

  canvas.addEventListener("pointerup", endCanvasDrag);
  canvas.addEventListener("pointercancel", endCanvasDrag);

  canvas.addEventListener("mousemove", (event) => {
    const rect = graphStage.getBoundingClientRect();
    if (isClusterLandingView()) {
      const hoveredCommunity = state.dragging ? null : pickCommunityAt(event.clientX, event.clientY);
      const nextHoverCommunityId = hoveredCommunity ? hoveredCommunity.id : null;
      const hoverChanged = nextHoverCommunityId !== state.hoverCommunityId;
      state.hoverCommunityId = nextHoverCommunityId;
      state.hoverNodeId = null;
      state.pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
      canvas.style.cursor = state.dragging ? "grabbing" : (hoveredCommunity ? "pointer" : "default");
      if (!state.dragging || hoverChanged) {
        render();
      }
      return;
    }
    const hoveredNode = state.dragging ? null : pickNodeAt(event.clientX, event.clientY);
    const nextHoverNodeId = hoveredNode ? hoveredNode.id : null;
    const hoverChanged = nextHoverNodeId !== state.hoverNodeId;
    state.hoverNodeId = nextHoverNodeId;
    state.hoverCommunityId = null;
    state.pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active: true,
    };
    canvas.style.cursor = state.dragging ? "grabbing" : (hoveredNode ? "pointer" : "default");
    updateToolbarNodeActions();
    if (nextHoverNodeId) {
      showNodeTooltip(nextHoverNodeId, event.clientX, event.clientY);
    } else {
      hideTooltip("node");
    }
    if (!state.dragging || hoverChanged) {
      render();
    }
  });

  canvas.addEventListener("mouseleave", () => {
    if (state.activePointers.size) {
      return;
    }
    state.pointer.active = false;
    state.hoverNodeId = null;
    state.hoverCommunityId = null;
    canvas.style.cursor = "default";
    hideTooltip("node");
    updateToolbarNodeActions();
    render();
  });

  canvas.addEventListener("click", (event) => {
    hideContextMenu();
    if (state.suppressNextClick) {
      state.suppressNextClick = false;
      return;
    }
    if (Math.abs(event.clientX - state.dragStart.x) > 4 || Math.abs(event.clientY - state.dragStart.y) > 4) {
      return;
    }
    if (isClusterLandingView()) {
      const community = pickCommunityAt(event.clientX, event.clientY);
      if (!community) {
        return;
      }
      openCommunity(community.id);
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
    selectNode(winner.id, true);
  });

  canvas.addEventListener("contextmenu", (event) => {
    if (isClusterLandingView()) {
      return;
    }
    const winner = pickNodeAt(event.clientX, event.clientY);
    if (!winner) {
      return;
    }
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY, winner.id);
  });

  canvas.addEventListener("wheel", (event) => {
    hideContextMenu();
    hideTooltip("node");
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

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (state.searchQuery.trim()) {
        clearSearch();
      } else if (state.view === "explorer") {
        resetSelection();
      }
    } else if (event.key === "ArrowDown") {
      if (!state.searchQuery.trim()) {
        return;
      }
      event.preventDefault();
      moveSearchSelection(1);
    } else if (event.key === "ArrowUp") {
      if (!state.searchQuery.trim()) {
        return;
      }
      event.preventDefault();
      moveSearchSelection(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      focusFirstSearchResult();
    }
  });

  noteContent.addEventListener("click", (event) => {
    if (event.target.closest("[data-go-back]")) {
      event.preventDefault();
      goBackInNavigationHistory();
      return;
    }
    const bookmarkButton = event.target.closest("[data-toggle-bookmark]");
    if (bookmarkButton) {
      event.preventDefault();
      toggleBookmark(bookmarkButton.dataset.toggleBookmark);
      return;
    }
    const openLocalGraphButton = event.target.closest("[data-open-local-graph]");
    if (openLocalGraphButton) {
      event.preventDefault();
      openLocalGraph(openLocalGraphButton.dataset.openLocalGraph);
      return;
    }
    const expandNeighborsButton = event.target.closest("[data-expand-neighbors]");
    if (expandNeighborsButton) {
      event.preventDefault();
      expandNeighborhood(expandNeighborsButton.dataset.expandNeighbors);
      return;
    }
    const openLinkPickerButton = event.target.closest("[data-open-note-link-picker]");
    if (openLinkPickerButton) {
      event.preventDefault();
      event.stopPropagation();
      openNoteLinkPicker(openLinkPickerButton.dataset.openNoteLinkPicker);
      return;
    }
    if (event.target.closest("[data-close-note-link-picker]")) {
      event.preventDefault();
      event.stopPropagation();
      closeNoteLinkPicker();
      document.getElementById("node-note-editor")?.focus();
      return;
    }
    const insertNoteLinkButton = event.target.closest("[data-insert-note-link]");
    if (insertNoteLinkButton) {
      event.preventDefault();
      event.stopPropagation();
      insertNodeLinkIntoCurrentNote(insertNoteLinkButton.dataset.insertNoteLink);
      return;
    }
    if (event.target.closest("[data-create-note-link-node]")) {
      event.preventDefault();
      event.stopPropagation();
      createLinkedNodeFromSelection();
      return;
    }
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
    const searchCompletionButton = event.target.closest("[data-search-completion-node-id]");
    if (searchCompletionButton) {
      event.preventDefault();
      commitSearchSelection(searchCompletionButton.dataset.searchCompletionNodeId);
      return;
    }
    const tagButton = event.target.closest("[data-tag]");
    if (tagButton) {
      event.preventDefault();
      toggleTagFilter(tagButton.dataset.tag);
      return;
    }
    const nodeLink = event.target.closest("[data-node-id]");
    if (!nodeLink) return;
    event.preventDefault();
    selectNode(nodeLink.dataset.nodeId);
  });

  graphFilterToolbar.addEventListener("click", (event) => {
    const toggleButton = event.target.closest("[data-toggle-graph-filter-mode]");
    if (toggleButton) {
      event.preventDefault();
      toggleGraphTagMode(toggleButton.dataset.toggleGraphFilterMode);
      return;
    }
    const removeButton = event.target.closest("[data-remove-graph-filter-tag]");
    if (removeButton) {
      event.preventDefault();
      removeGraphTag(removeButton.dataset.removeGraphFilterTag);
    }
  });

  graphFilterToolbar.addEventListener("input", (event) => {
    if (event.target.id === "graph-filter-tag-input") {
      setGraphTagFilterInput(event.target.value);
      syncGraphFilterTagOptions();
      const exactTag = resolveExactGraphTagFilterInput(event.target.value);
      if (shouldCommitExactGraphTagFromInputEvent(event, exactTag)) {
        commitGraphTagFilterInput(event.target, { allowFallback: false });
        return;
      }
      if (!exactTag) {
        state.graphTagFilterSelectionArmed = false;
      }
    }
  });

  graphFilterToolbar.addEventListener("change", (event) => {
    if (event.target.id === "graph-filter-tag-input") {
      state.graphTagFilterSelectionArmed = false;
      commitGraphTagFilterInput(event.target, { allowFallback: false });
    }
  });

  graphFilterToolbar.addEventListener("keydown", (event) => {
    if (event.target.id !== "graph-filter-tag-input") {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      state.graphTagFilterSelectionArmed = true;
      return;
    }
    if (event.target.id === "graph-filter-tag-input" && event.key === "Enter") {
      event.preventDefault();
      commitGraphTagFilterInput(event.target);
    }
  });

  noteContent.addEventListener("input", (event) => {
    if (event.target.id === "node-note-editor") {
      recordNoteCursor(event.target);
      updateNodeNoteText(currentNodeId(), event.target.value);
      if (state.noteLinkPickerNodeId === currentNodeId()) {
        refreshNoteLinkPickerUI(currentNodeId());
      }
      return;
    }
    if (event.target.id === "note-link-query-input") {
      state.noteLinkQuery = event.target.value;
      const results = document.getElementById("note-link-result-list");
      if (results) {
        results.innerHTML = renderLinkSuggestionList(currentNodeId());
      }
    }
  });

  noteContent.addEventListener("change", (event) => {
    const currentId = currentNodeId();
    if (!currentId) {
      return;
    }
    if (event.target.id === "custom-node-title-input") {
      updateCustomNode(currentId, {
        title: event.target.value.trim() || "Untitled Lead",
      });
      loadNote(currentId);
      render();
      return;
    }
    if (event.target.id === "custom-node-tags-input") {
      updateCustomNode(currentId, {
        tags: sanitizeStringList(event.target.value.split(",").map((value) => value.trim())),
      });
      loadNote(currentId);
      render();
      return;
    }
    if (event.target.id === "custom-node-aliases-input") {
      updateCustomNode(currentId, {
        aliases: sanitizeStringList(event.target.value.split(",").map((value) => value.trim())),
      });
      loadNote(currentId);
      render();
    }
  });

  noteContent.addEventListener("keyup", (event) => {
    if (event.target.id === "node-note-editor") {
      recordNoteCursor(event.target);
      if (state.noteLinkPickerNodeId === currentNodeId()) {
        refreshNoteLinkPickerUI(currentNodeId());
      }
    }
  });

  noteContent.addEventListener("click", (event) => {
    if (event.target.id === "node-note-editor") {
      recordNoteCursor(event.target);
      if (state.noteLinkPickerNodeId === currentNodeId()) {
        refreshNoteLinkPickerUI(currentNodeId());
      }
    }
  });

  investigatorTools.addEventListener("input", (event) => {
    if (event.target.id === "layer-notes-editor") {
      state.investigationNotes = event.target.value;
      debouncedSaveInvestigationState();
      return;
    }
    const searchTarget = event.target.dataset?.searchTarget;
    if (searchTarget) {
      const query = event.target.value.trim();
      const resultsContainer = document.getElementById(`${searchTarget}-results`);
      if (!resultsContainer) return;
      if (!query) {
        resultsContainer.innerHTML = "";
        return;
      }
      const results = searchNodesLocally(query);
      if (!results.length) {
        resultsContainer.innerHTML = '<div class="detective-search-no-results">No nodes found</div>';
        return;
      }
      resultsContainer.innerHTML = results.map((node) => `
        <button type="button" class="detective-search-result" data-select-detective-node="${escapeHtml(node.id)}" data-target="${escapeHtml(searchTarget)}">
          <strong>${escapeHtml(node.title)}</strong>
          <small>${escapeHtml(node.group || "node")}</small>
        </button>
      `).join("");
      return;
    }
  });

  investigatorTools.addEventListener("keydown", (event) => {
    const searchTarget = event.target.dataset?.searchTarget;
    if (!searchTarget) return;
    const resultsContainer = document.getElementById(`${searchTarget}-results`);
    if (!resultsContainer) return;
    const buttons = resultsContainer.querySelectorAll("[data-select-detective-node]");
    if (!buttons.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const active = resultsContainer.querySelector(".is-selected");
      let nextIndex = 0;
      if (active) {
        const currentIndex = [...buttons].indexOf(active);
        active.classList.remove("is-selected");
        nextIndex = event.key === "ArrowDown"
          ? (currentIndex + 1) % buttons.length
          : (currentIndex - 1 + buttons.length) % buttons.length;
      }
      buttons[nextIndex].classList.add("is-selected");
      buttons[nextIndex].scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const active = resultsContainer.querySelector(".is-selected") || buttons[0];
      if (active) {
        active.click();
      }
      return;
    }

    if (event.key === "Escape") {
      resultsContainer.innerHTML = "";
    }
  });

  investigatorTools.addEventListener("click", (event) => {
    if (event.target.closest("[data-toggle-canon-visible]")) {
      toggleCanonLayerVisibility();
      return;
    }

    const toggleLayerVisibilityButton = event.target.closest("[data-toggle-layer-visible]");
    if (toggleLayerVisibilityButton) {
      toggleLayerVisibility(toggleLayerVisibilityButton.dataset.toggleLayerVisible);
      return;
    }

    const selectLayerButton = event.target.closest("[data-select-layer]");
    if (selectLayerButton) {
      hideLayerContextMenu();
      setActiveLayer(selectLayerButton.dataset.selectLayer, { shouldRender: true, shouldFit: false });
    }

    const renameLayerButton = event.target.closest("[data-rename-layer]");
    if (renameLayerButton) {
      hideLayerContextMenu();
      promptRenameLayer(renameLayerButton.dataset.renameLayer);
    }

    if (event.target.closest("#trace-path-button")) {
      const fromId = state.pathFromNodeId;
      const toId = state.pathToNodeId;
      if (!fromId || !toId) {
        setToolStatusMessage("Select both From and To nodes.");
        return;
      }
      const path = findShortestPath(fromId, toId);
      if (!path.length) {
        setToolStatusMessage("No path found between those nodes.");
        return;
      }
      applyPath(path, toId);
      setToolStatusMessage(`Traced path: ${describePath(path)}`);
      return;
    }

    if (event.target.closest("#path-focus-button")) {
      setPathFocus(!state.pathFocus);
      return;
    }

    if (event.target.closest("#save-path-button")) {
      saveCurrentPath();
      return;
    }

    if (event.target.closest("#find-shared-neighbors-button")) {
      /* Shared neighbors tool removed */
      return;
    }

    if (event.target.closest(".shared-neighbor-list .path-node-chip")) {
      const nodeId = event.target.closest(".path-node-chip").dataset.selectNode;
      selectNode(nodeId, true);
      return;
    }

    const openSavedPathButton = event.target.closest("[data-open-saved-path]");
    if (openSavedPathButton) {
      openSavedPath(openSavedPathButton.dataset.openSavedPath);
      return;
    }

    const removeSavedPathButton = event.target.closest("[data-remove-saved-path]");
    if (removeSavedPathButton) {
      removeSavedPath(removeSavedPathButton.dataset.removeSavedPath);
      return;
    }

    const selectNodeButton = event.target.closest("[data-select-node]");
    if (selectNodeButton) {
      selectNode(selectNodeButton.dataset.selectNode, true);
      return;
    }

    const detectiveSelectNode = event.target.closest("[data-select-detective-node]");
    if (detectiveSelectNode) {
      const nodeId = detectiveSelectNode.dataset.selectDetectiveNode;
      const target = detectiveSelectNode.dataset.target;
      if (target === "path-from") state.pathFromNodeId = nodeId;
      else if (target === "path-to") state.pathToNodeId = nodeId;
      else if (target === "shared-left") state.sharedNeighborLeftId = nodeId;
      else if (target === "shared-right") state.sharedNeighborRightId = nodeId;
      const input = document.getElementById(`${target}-input`);
      if (input) input.value = state.nodeById.get(nodeId)?.title || "";
      const results = document.getElementById(`${target}-results`);
      if (results) results.innerHTML = "";
      const hidden = document.getElementById(`${target}-value`);
      if (hidden) hidden.value = nodeId;
      return;
    }

    const clearSearchButton = event.target.closest("[data-clear-search]");
    if (clearSearchButton) {
      const target = clearSearchButton.dataset.clearSearch;
      if (target === "path-from") state.pathFromNodeId = null;
      else if (target === "path-to") state.pathToNodeId = null;
      else if (target === "shared-left") state.sharedNeighborLeftId = null;
      else if (target === "shared-right") state.sharedNeighborRightId = null;
      const input = document.getElementById(`${target}-input`);
      if (input) input.value = "";
      const hidden = document.getElementById(`${target}-value`);
      if (hidden) hidden.value = "";
      return;
    }

    const deleteCustomNodeButton = event.target.closest("[data-delete-custom-node]");
    if (deleteCustomNodeButton) {
      deleteCustomNode(deleteCustomNodeButton.dataset.deleteCustomNode);
      return;
    }
  });

  investigatorTools.addEventListener("contextmenu", (event) => {
    const selectLayerButton = event.target.closest("[data-select-layer]");
    if (!selectLayerButton) {
      return;
    }
    event.preventDefault();
    showLayerContextMenu(event.clientX, event.clientY, selectLayerButton.dataset.selectLayer);
  });

  layerImportInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    try {
      const content = await file.text();
      importInvestigationLayers(content);
      render();
    } catch (error) {
      setToolStatusMessage(`Import failed: ${error.message}`);
    }
  });
}

function buildAdjacency() {
  state.adjacency = new Map();
  state.outboundAdjacency = new Map();
  state.inboundAdjacency = new Map();
  for (const node of state.nodes) {
    state.adjacency.set(node.id, new Set());
    state.outboundAdjacency.set(node.id, new Set());
    state.inboundAdjacency.set(node.id, new Set());
  }
  for (const edge of state.edges) {
    if (!isRuntimeEdgeVisible(edge)) {
      continue;
    }
    if (!state.adjacency.has(edge.source)) {
      state.adjacency.set(edge.source, new Set());
    }
    if (!state.adjacency.has(edge.target)) {
      state.adjacency.set(edge.target, new Set());
    }
    if (!state.outboundAdjacency.has(edge.source)) {
      state.outboundAdjacency.set(edge.source, new Set());
    }
    if (!state.outboundAdjacency.has(edge.target)) {
      state.outboundAdjacency.set(edge.target, new Set());
    }
    if (!state.inboundAdjacency.has(edge.source)) {
      state.inboundAdjacency.set(edge.source, new Set());
    }
    if (!state.inboundAdjacency.has(edge.target)) {
      state.inboundAdjacency.set(edge.target, new Set());
    }
    state.adjacency.get(edge.source).add(edge.target);
    state.adjacency.get(edge.target).add(edge.source);
    state.outboundAdjacency.get(edge.source).add(edge.target);
    state.inboundAdjacency.get(edge.target).add(edge.source);
  }
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const nodeId = params.get("node");
  const inspectNodeId = params.get("inspect");
  const tagFilter = params.get("tag");

  state.neighborMode = Boolean(nodeId);
  hideContextMenu();

  if (nodeId && state.nodeById.has(nodeId)) {
    setActiveView("explorer");
    if (tagFilter && state.tagIndex.has(canonicalizeTag(tagFilter))) {
      state.activeTagFilter = tagFilter;
    }
    selectNode(nodeId, true, false, false);
    if (inspectNodeId && state.nodeById.has(inspectNodeId)) {
      inspectNode(inspectNodeId, false, false);
    }
    fitGraph();
    return;
  }

  if (!nodeId) {
    clearActivePath(false);
    setActiveView("landing");
    state.activeCommunityId = null;
    state.graphRootNodeId = null;
    state.inspectNodeId = null;
    state.activeTagFilter = null;
    state.neighborMode = false;
    resetSearchState();
    searchInput.value = "";
    showEmptyNoteState();
    render();
  }
}

worker.onmessage = (event) => {
  if (event.data.type === "ready") {
    state.searchWorkerReady = true;
    if (state.searchQuery.trim()) {
      querySearch(state.searchQuery);
    }
    return;
  }
  if (event.data.type === "results") {
    applySearchResults(event.data.payload);
  }
};

async function bootstrap() {
  renderSharedToolbarIcons();
  initializeToolbarTooltipTargets();
  bindEvents();
  resizeCanvas();
  loadInvestigationState();
  loadDisplaySettings();

  const graphResponse = await fetchWithRetry("./data/graph.json");
  const searchResponse = await fetchWithRetry("./data/search-docs.json");

  const graph = await graphResponse.json();
  const searchDocs = await searchResponse.json();

  state.baseNodes = graph.nodes;
  state.baseEdges = graph.edges;
  state.baseCommunityNodes = graph.communityNodes || [];
  state.baseCommunityEdges = graph.communityEdges || [];
  state.communityById = new Map(state.baseCommunityNodes.map((community) => [community.id, community]));
  state.baseMeta = graph.meta;
  state.baseSearchDocs = searchDocs;
  validateInvestigationLayersAgainstGraph();
  rebuildRuntimeGraphData();
  saveInvestigationState();
  updateDetectiveButton();
  applyPanelWidths(state.panelWidth, state.detectivePanelWidth, "detective");
  colorModeSelect.value = state.colorMode;
  shapeModeSelect.value = state.shapeMode;

  state.hasFitted = false;
  state.fittedSize = { width: 0, height: 0 };
  showEmptyNoteState();
  setActiveView("landing");
  applyUrlState();
  scheduleLandingFit();
  requestAnimationFrame(() => {
    searchInput.focus({ preventScroll: true });
  });
}

bootstrap().catch((error) => {
  console.error(error);
  noteMeta.innerHTML = "";
  noteContent.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
});
