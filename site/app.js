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
const toolbarExportLayerButton = document.getElementById("toolbar-export-layer-button");
const toolbarImportLayerButton = document.getElementById("toolbar-import-layer-button");
const toolbarLocalGraphButton = document.getElementById("toolbar-local-graph-button");
const toolbarExpandButton = document.getElementById("toolbar-expand-button");
const toolbarBookmarkButton = document.getElementById("toolbar-bookmark-button");
const toolbarBookmarksButton = document.getElementById("toolbar-bookmarks-button");
const toolbarBookmarksPanel = document.getElementById("toolbar-bookmarks-panel");
const toolbarOptionsButton = document.getElementById("toolbar-options-button");
const toolbarOptionsPanel = document.getElementById("toolbar-options-panel");
const colorModeSelect = document.getElementById("color-mode");
const shapeModeSelect = document.getElementById("shape-mode");
const highlightModeSelect = document.getElementById("highlight-mode");
const hoverLabelRadiusInput = document.getElementById("hover-label-radius");
const dynamicGraphThresholdInput = document.getElementById("dynamic-graph-threshold");
const graphFilterToolbar = document.getElementById("graph-filter-toolbar");
const graphStatsBadge = document.getElementById("graph-stats-badge");
const noteContent = document.getElementById("note-content");
const noteMeta = document.getElementById("note-meta");
const detectivePanel = document.getElementById("detective-panel");
const investigatorTools = document.getElementById("investigator-tools");
const layerImportInput = document.getElementById("layer-import-input");
const graphStage = document.querySelector(".graph-stage");
const graphContextMenu = document.getElementById("graph-context-menu");
const contextOpenLocalGraphButton = document.getElementById("context-open-local-graph");
const contextExpandNodeButton = document.getElementById("context-expand-node");
const contextToggleBookmarkButton = document.getElementById("context-toggle-bookmark");
const contextDeleteCustomNodeButton = document.getElementById("context-delete-custom-node");
const layerContextMenu = document.getElementById("layer-context-menu");
const contextRenameLayerButton = document.getElementById("context-rename-layer");
const appTooltip = document.getElementById("app-tooltip");
const appScript = document.querySelector('script[src$="app.js"]');
const siteBaseUrl = new URL(".", appScript?.src || window.location.href);
const searchModeButton = document.getElementById("search-mode-button");

const worker = new Worker("./search-worker.js");

const state = {
  baseNodes: [],
  baseEdges: [],
  baseCommunityNodes: [],
  baseCommunityEdges: [],
  baseMeta: {},
  baseSearchDocs: [],
  baseSearchContentById: new Map(),
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
  searchMode: "title",
  colorMode: "backlinks",
  shapeMode: "semantic",
  highlightMode: "none",
  hoverLabelRadius: 160,
  dynamicGraphThreshold: 100,
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
  dynamicGraphFrame: 0,
  dynamicGraphLastTs: 0,
  tagIndex: new Map(),
  tagDisplayByKey: new Map(),
  primaryTagById: new Map(),
  metricExtents: new Map(),
  structuralMetricsById: new Map(),
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
  searchIndexStatus: "idle",
  searchIndexError: "",
  searchContentStatus: "idle",
  searchContentError: "",
  searchContentPromise: null,
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
  pathMode: "shortest",
  investigationNoteView: "preview",
  noteEditorAutoFocus: false,
};

const INVESTIGATION_STORAGE_KEY = "org-roam-investigator-v1";
const DISPLAY_SETTINGS_STORAGE_KEY = "org-roam-display-settings-v1";
const DEFAULT_DYNAMIC_GRAPH_THRESHOLD = 100;
const DEFAULT_HOVER_LABEL_RADIUS = 160;
const INVESTIGATION_EXPORT_TYPE = "org-roam-investigation-layer";
const INVESTIGATION_SCHEMA_VERSION = 1;
const COLOR_MODES = new Set(["group", "links", "backlinks", "primary-tag"]);
const SHAPE_MODES = new Set(["none", "semantic"]);
const HIGHLIGHT_MODES = new Set(["none", "bridges", "outliers", "all"]);
const INVESTIGATION_LINK_RE = /\[\[((?:node|id):([^[\]]+))(?:\]\[([^\]]+))?\]\]/g;
const CUSTOM_NODE_STATE_META = {
  evidence: { label: "Evidence", color: "#7ce38b" },
  hypothesis: { label: "Hypothesis", color: "#63d8ea" },
  question: { label: "Question", color: "#ffd46b" },
  contradiction: { label: "Contradiction", color: "#ff8c6b" },
};
const STRUCTURAL_HIGHLIGHT_META = {
  bridge: { label: "Bridge", color: "#63d8ea" },
  outlier: { label: "Outlier", color: "#ff8c6b" },
};
const PATH_MODE_META = {
  shortest: { label: "Shortest" },
  interesting: { label: "Interesting" },
  chronological: { label: "Chronological" },
};
const HIGHLIGHT_MODE_META = {
  none: { label: "None" },
  bridges: { label: "Bridges" },
  outliers: { label: "Outliers" },
  all: { label: "Bridges + Outliers" },
};
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

function normalizeUrlTagList(values) {
  const tags = [];
  for (const value of values) {
    for (const part of String(value || "").split(",")) {
      const tag = canonicalizeTag(part);
      if (tag && state.tagDisplayByKey.has(tag) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }
  return tags;
}

function getUrlGraphTagFilters(params) {
  const requireAll = normalizeUrlTagList([
    ...params.getAll("tags"),
    ...params.getAll("show"),
    ...params.getAll("require"),
  ]);
  const exclude = normalizeUrlTagList([
    ...params.getAll("hide"),
    ...params.getAll("exclude"),
  ]).filter((tag) => !requireAll.includes(tag));
  return { requireAll, exclude };
}

function appendUrlTagParams(params, name, tags) {
  for (const tag of tags) {
    params.append(name, getGraphFilterDisplayTag(tag));
  }
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

function normalizePathMode(value) {
  if (typeof value !== "string") {
    return "shortest";
  }
  return Object.hasOwn(PATH_MODE_META, value) ? value : "shortest";
}

function getPathModeMeta(pathMode) {
  return PATH_MODE_META[normalizePathMode(pathMode)];
}

function normalizeHighlightMode(value) {
  if (typeof value !== "string") {
    return "none";
  }
  return HIGHLIGHT_MODES.has(value) ? value : "none";
}

function getHighlightModeMeta(highlightMode) {
  return HIGHLIGHT_MODE_META[normalizeHighlightMode(highlightMode)];
}

function buildEmptyLayer(name = `Investigation ${state.investigationLayers.length + 1}`) {
  return {
    id: generateId("layer"),
    name,
    visible: true,
    color: colorForLayer(state.investigationLayers.length),
    defaultFocusNodeId: null,
    notes: "",
    bookmarks: [],
    savedPaths: [],
    savedFilters: [],
    nodeNotes: {},
    customNodes: [],
    pathTargetNodeId: null,
    pathMode: "shortest",
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
    mode: normalizePathMode(raw.mode),
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

function normalizeCustomNodeState(value) {
  if (typeof value !== "string") {
    return "question";
  }
  return Object.hasOwn(CUSTOM_NODE_STATE_META, value) ? value : "question";
}

function getCustomNodeStateMeta(stateKey) {
  return CUSTOM_NODE_STATE_META[normalizeCustomNodeState(stateKey)];
}

function renderCustomNodeStateBadge(stateKey) {
  const meta = getCustomNodeStateMeta(stateKey);
  return `
    <span
      class="note-meta-badge note-meta-badge-state"
      style="--badge-color: ${escapeHtml(meta.color)}; --badge-color-soft: ${escapeHtml(rgbaFromHex(meta.color, 0.18))};"
    >${escapeHtml(meta.label)}</span>
  `;
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
    state: normalizeCustomNodeState(raw?.state),
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
  layer.defaultFocusNodeId = typeof raw.defaultFocusNodeId === "string" ? raw.defaultFocusNodeId : null;
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
  layer.pathMode = normalizePathMode(raw.pathMode);
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
    state.pathMode = "shortest";
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
  state.pathMode = normalizePathMode(layer.pathMode);
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
    pathMode: normalizePathMode(state.pathMode),
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

function removeInvestigationLinksToNode(text, nodeId, fallbackLabel = nodeId) {
  if (!text || !nodeId) {
    return text || "";
  }
  INVESTIGATION_LINK_RE.lastIndex = 0;
  return String(text).replace(INVESTIGATION_LINK_RE, (match, fullTarget, targetId, label) => (
    targetId === nodeId ? (label || fallbackLabel || targetId) : match
  ));
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

function buildSearchDocFromNode(node, snippet = "", content = "") {
  const textSnippet = snippet || node.snippet || "";
  const searchContent = content || textSnippet;
  return {
    id: node.id,
    title: node.title,
    aliases: node.aliases || [],
    tags: node.tags || [],
    group: node.group || "misc",
    degree: node.degree || 0,
    snippet: textSnippet,
    content: searchContent,
    titleNorm: normalize(node.title),
    aliasNorms: (node.aliases || []).map((alias) => normalize(alias)),
    tagNorms: (node.tags || []).map((tag) => normalize(tag)),
    snippetNorm: normalize(textSnippet),
    contentNorm: normalize(searchContent),
  };
}

function applySearchContentToBaseDocs() {
  if (!state.baseSearchContentById.size) {
    return;
  }
  for (const doc of state.baseSearchDocs) {
    const content = state.baseSearchContentById.get(doc.id);
    if (!content) {
      continue;
    }
    doc.content = content;
    doc.contentNorm = normalize(content);
  }
}

function refreshSearchWorkerIndex() {
  if (state.searchIndexStatus !== "indexing" && state.searchIndexStatus !== "ready") {
    state.searchDocs = [];
    state.searchWorkerReady = false;
    return;
  }
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
  applySearchContentToBaseDocs();
  state.searchDocs = [...state.baseSearchDocs, ...customDocs];
  state.searchWorkerReady = false;
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
        customState: normalizeCustomNodeState(customNode.state),
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

function getMedian(values) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function getPercentile(values, percentile) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = clamp(Math.floor((sorted.length - 1) * percentile), 0, sorted.length - 1);
  return sorted[index];
}

function normalizeDynamicGraphThreshold(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_DYNAMIC_GRAPH_THRESHOLD;
  }
  return Math.max(0, Math.min(500, Math.round(numeric)));
}

function normalizeHoverLabelRadius(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_HOVER_LABEL_RADIUS;
  }
  return Math.max(40, Math.min(420, Math.round(numeric)));
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
      highlightMode: state.highlightMode,
      hoverLabelRadius: state.hoverLabelRadius,
      dynamicGraphThreshold: state.dynamicGraphThreshold,
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
    state.highlightMode = normalizeHighlightMode(parsed.highlightMode);
    state.hoverLabelRadius = normalizeHoverLabelRadius(parsed.hoverLabelRadius);
    state.dynamicGraphThreshold = normalizeDynamicGraphThreshold(parsed.dynamicGraphThreshold);
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
    nextLayer.defaultFocusNodeId = validNodeIds.has(nextLayer.defaultFocusNodeId) ? nextLayer.defaultFocusNodeId : null;
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

function extractNodeYears(node) {
  if (!node?.tags?.length) {
    return [];
  }
  return [...new Set(
    node.tags
      .filter((tag) => isYearTag(tag))
      .map((tag) => Number.parseInt(tag, 10))
      .filter(Number.isFinite),
  )].sort((left, right) => left - right);
}

function getNodeYearRange(node) {
  const years = extractNodeYears(node);
  if (!years.length) {
    return null;
  }
  return {
    min: years[0],
    max: years[years.length - 1],
    center: (years[0] + years[years.length - 1]) / 2,
  };
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

  const nodesByPrimaryTag = new Map();
  for (const node of state.nodes) {
    const primaryTag = primaryTags.get(node.id) || node.group || "misc";
    if (!nodesByPrimaryTag.has(primaryTag)) {
      nodesByPrimaryTag.set(primaryTag, []);
    }
    nodesByPrimaryTag.get(primaryTag).push(node);
  }

  const globalDegreeMedian = getMedian(state.nodes.map((node) => node.degree || 0));
  const globalBacklinkMedian = getMedian(state.nodes.map((node) => node.inbound || 0));
  const peerStatsByTag = new Map(
    [...nodesByPrimaryTag.entries()].map(([primaryTag, nodes]) => [primaryTag, {
      size: nodes.length,
      degreeMedian: getMedian(nodes.map((node) => node.degree || 0)),
      backlinkMedian: getMedian(nodes.map((node) => node.inbound || 0)),
    }]),
  );

  const structuralMetricsById = new Map();
  const bridgeScores = [];
  const outlierScores = [];

  for (const node of state.nodes) {
    const primaryTag = primaryTags.get(node.id) || node.group || "misc";
    const peerStats = peerStatsByTag.get(primaryTag) || {
      size: state.nodes.length,
      degreeMedian: globalDegreeMedian,
      backlinkMedian: globalBacklinkMedian,
    };
    const peerDegreeMedian = peerStats.size >= 5 ? peerStats.degreeMedian : globalDegreeMedian;
    const peerBacklinkMedian = peerStats.size >= 5 ? peerStats.backlinkMedian : globalBacklinkMedian;
    const degreeRatio = (node.degree + 1.5) / Math.max(2.5, peerDegreeMedian + 1.5);
    const backlinkRatio = (node.inbound + 1.5) / Math.max(2.5, peerBacklinkMedian + 1.5);
    const outlierScore = Math.max(degreeRatio, backlinkRatio);

    const neighbors = [...(state.adjacency.get(node.id) || new Set())];
    const neighborPrimaryTags = new Set();
    const neighborGroups = new Set();
    for (const neighborId of neighbors) {
      const neighborNode = state.nodeById.get(neighborId);
      if (!neighborNode) {
        continue;
      }
      const neighborPrimaryTag = primaryTags.get(neighborId) || neighborNode.group || "misc";
      if (neighborPrimaryTag !== primaryTag) {
        neighborPrimaryTags.add(neighborPrimaryTag);
      }
      if (neighborNode.group && neighborNode.group !== node.group) {
        neighborGroups.add(neighborNode.group);
      }
    }

    let linkedNeighborPairs = 0;
    const possibleNeighborPairs = neighbors.length > 1 ? (neighbors.length * (neighbors.length - 1)) / 2 : 0;
    if (possibleNeighborPairs) {
      for (let leftIndex = 0; leftIndex < neighbors.length; leftIndex += 1) {
        const leftNeighbors = state.adjacency.get(neighbors[leftIndex]) || new Set();
        for (let rightIndex = leftIndex + 1; rightIndex < neighbors.length; rightIndex += 1) {
          if (leftNeighbors.has(neighbors[rightIndex])) {
            linkedNeighborPairs += 1;
          }
        }
      }
    }
    const clustering = possibleNeighborPairs ? (linkedNeighborPairs / possibleNeighborPairs) : 1;
    const bridgeDiversity = neighborPrimaryTags.size + (neighborGroups.size * 0.45);
    const bridgeScore = neighbors.length >= 3
      ? Math.log1p(neighbors.length) * bridgeDiversity * (1.18 - clustering)
      : 0;

    if (neighbors.length >= 4 && neighborPrimaryTags.size >= 2 && bridgeScore > 0) {
      bridgeScores.push(bridgeScore);
    }
    if (Math.max(node.degree || 0, node.inbound || 0) >= 5) {
      outlierScores.push(outlierScore);
    }

    structuralMetricsById.set(node.id, {
      primaryTag,
      peerDegreeMedian,
      peerBacklinkMedian,
      peerSize: peerStats.size,
      degreeRatio,
      backlinkRatio,
      outlierScore,
      neighborCount: neighbors.length,
      bridgeTagDiversity: neighborPrimaryTags.size,
      bridgeGroupDiversity: neighborGroups.size,
      bridgeClustering: clustering,
      bridgeScore,
      isBridge: false,
      isOutlier: false,
    });
  }

  const bridgeThreshold = Math.max(3.2, getPercentile(bridgeScores, 0.9));
  const outlierThreshold = Math.max(2.1, getPercentile(outlierScores, 0.9));

  for (const [nodeId, metricsForNode] of structuralMetricsById.entries()) {
    metricsForNode.isBridge = (
      metricsForNode.neighborCount >= 4
      && metricsForNode.bridgeTagDiversity >= 2
      && metricsForNode.bridgeScore >= bridgeThreshold
    );
    metricsForNode.isOutlier = (
      Math.max(state.nodeById.get(nodeId)?.degree || 0, state.nodeById.get(nodeId)?.inbound || 0) >= 5
      && metricsForNode.outlierScore >= outlierThreshold
    );
  }

  state.structuralMetricsById = structuralMetricsById;
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

function getStructuralMetrics(nodeId) {
  return state.structuralMetricsById.get(nodeId) || null;
}

function getNodeStructuralHighlights(node, highlightMode = state.highlightMode) {
  if (!node) {
    return [];
  }
  const metricsForNode = getStructuralMetrics(node.id);
  if (!metricsForNode) {
    return [];
  }
  const normalizedMode = normalizeHighlightMode(highlightMode);
  const highlights = [];
  if ((normalizedMode === "bridges" || normalizedMode === "all") && metricsForNode.isBridge) {
    highlights.push(STRUCTURAL_HIGHLIGHT_META.bridge);
  }
  if ((normalizedMode === "outliers" || normalizedMode === "all") && metricsForNode.isOutlier) {
    highlights.push(STRUCTURAL_HIGHLIGHT_META.outlier);
  }
  return highlights;
}

function getNodeStructuralFacts(node) {
  const metricsForNode = getStructuralMetrics(node?.id);
  if (!node || !metricsForNode) {
    return [];
  }
  const facts = [];
  if (metricsForNode.isBridge) {
    facts.push({
      kind: "bridge",
      label: "Bridge",
      detail: `Links ${metricsForNode.bridgeTagDiversity} tag families with ${Math.round(metricsForNode.bridgeClustering * 100)}% local overlap`,
    });
  }
  if (metricsForNode.isOutlier) {
    const peerLabel = state.tagDisplayByKey.get(canonicalizeTag(metricsForNode.primaryTag)) || metricsForNode.primaryTag;
    facts.push({
      kind: "outlier",
      label: "Outlier",
      detail: `${node.inbound || 0} backlinks and ${node.degree || 0} links vs ${Math.round(metricsForNode.peerBacklinkMedian)} / ${Math.round(metricsForNode.peerDegreeMedian)} median for ${peerLabel}`,
    });
  }
  return facts;
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

function includeConnectedCustomNodes(visibleIds) {
  if (!visibleIds || !state.detectiveMode) {
    return visibleIds;
  }
  const nextVisibleIds = new Set(visibleIds);
  for (const edge of state.edges) {
    if (!edge?.layerId || !isRuntimeEdgeVisible(edge)) {
      continue;
    }
    const sourceVisible = nextVisibleIds.has(edge.source);
    const targetVisible = nextVisibleIds.has(edge.target);
    if (sourceVisible === targetVisible) {
      continue;
    }
    const sourceNode = state.nodeById.get(edge.source);
    const targetNode = state.nodeById.get(edge.target);
    if (sourceVisible && targetNode?.isCustom) {
      nextVisibleIds.add(targetNode.id);
    } else if (targetVisible && sourceNode?.isCustom) {
      nextVisibleIds.add(sourceNode.id);
    }
  }
  return nextVisibleIds;
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
  visibleIds = includeConnectedCustomNodes(visibleIds);

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
  if (payload.query !== undefined && payload.query !== state.searchQuery) {
    return;
  }
  if (payload.mode && payload.mode !== state.searchMode) {
    return;
  }
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
  if (!state.searchWorkerReady) {
    state.results = [];
    state.searchSuggestion = null;
    state.searchSelectedIndex = -1;
    state.searchExactNodeIds = [];
    updateCurrentNoteMeta();
    return;
  }
  querySearch(query);
}

function updateSearchModeButton() {
  if (!searchModeButton) {
    return;
  }
  const isContentMode = state.searchMode === "content";
  searchModeButton.textContent = isContentMode ? "Content" : "Titles";
  searchModeButton.classList.toggle("is-active", isContentMode);
  searchModeButton.setAttribute("aria-label", isContentMode ? "Switch to title search" : "Switch to content search");
  searchModeButton.dataset.tooltip = isContentMode ? "Search node titles and content" : "Search titles only";
}

function setSearchMode(mode) {
  const nextMode = mode === "content" ? "content" : "title";
  if (state.searchMode === nextMode) {
    return;
  }
  state.searchMode = nextMode;
  updateSearchModeButton();
  state.results = [];
  state.searchSuggestion = null;
  state.searchSelectedIndex = -1;
  state.searchExactNodeIds = [];
  updateCurrentNoteMeta();
  if (nextMode === "content" && state.searchContentStatus !== "ready") {
    loadSearchContentDocsInBackground();
    return;
  }
  if (state.searchWorkerReady && state.searchQuery.trim()) {
    querySearch(state.searchQuery);
  }
}

function toggleSearchMode() {
  setSearchMode(state.searchMode === "content" ? "title" : "content");
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

function shouldRunDynamicGraph() {
  if (isClusterLandingView() || state.dragging || state.pinching) {
    return false;
  }
  if (state.detectiveMode && state.pathFocus) {
    return false;
  }
  const visibleNodes = getVisibleNodes();
  return visibleNodes.length > 1 && visibleNodes.length <= state.dynamicGraphThreshold;
}

function cancelDynamicGraphFrame() {
  if (state.dynamicGraphFrame) {
    cancelAnimationFrame(state.dynamicGraphFrame);
    state.dynamicGraphFrame = 0;
  }
  state.dynamicGraphLastTs = 0;
}

function stepDynamicGraphSimulation(dtSeconds) {
  const visibleNodes = getVisibleNodes();
  if (visibleNodes.length <= 1 || visibleNodes.length > state.dynamicGraphThreshold) {
    return false;
  }
  const nodeCount = visibleNodes.length;
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = getVisibleEdgeRefs().filter((edge) => (
    visibleNodeIds.has(edge.source.id) && visibleNodeIds.has(edge.target.id)
  ));
  const densityFactor = clamp((nodeCount - 36) / 64, 0, 1);
  const anchorStrength = 9.5 + (densityFactor * 4.8);
  const linkStrength = 3.6 + (densityFactor * 1.5);
  const repulsionStrength = 30000 - (densityFactor * 7000);
  const collisionStrength = 22 + (densityFactor * 6);
  const damping = 0.82 - (densityFactor * 0.08);
  const maxSpeed = 220 + (densityFactor * 80);
  const substeps = nodeCount >= 72 ? 2 : 1;
  const stepDt = dtSeconds / substeps;
  let totalMotion = 0;

  for (let substep = 0; substep < substeps; substep += 1) {
    const forces = new Map(visibleNodes.map((node) => [node.id, { x: 0, y: 0 }]));

    for (const node of visibleNodes) {
      const force = forces.get(node.id);
      force.x += (node.anchorX - node.x) * anchorStrength;
      force.y += (node.anchorY - node.y) * anchorStrength;
    }

    for (let index = 0; index < visibleNodes.length; index += 1) {
      const left = visibleNodes[index];
      const leftForce = forces.get(left.id);
      for (let inner = index + 1; inner < visibleNodes.length; inner += 1) {
        const right = visibleNodes[inner];
        const rightForce = forces.get(right.id);
        let dx = right.x - left.x;
        let dy = right.y - left.y;
        let distanceSq = dx * dx + dy * dy;
        if (distanceSq < 1) {
          dx = 1;
          dy = 0;
          distanceSq = 1;
        }
        const distance = Math.sqrt(distanceSq);
        const minDistance = 34 + (left.size + right.size) * 2.2;
        const repel = repulsionStrength / (distanceSq + 200);
        const overlap = Math.max(0, minDistance - distance);
        const separation = repel + overlap * collisionStrength;
        const offsetX = (dx / distance) * separation;
        const offsetY = (dy / distance) * separation;
        leftForce.x -= offsetX;
        leftForce.y -= offsetY;
        rightForce.x += offsetX;
        rightForce.y += offsetY;
      }
    }

    for (const edge of visibleEdges) {
      let dx = edge.target.x - edge.source.x;
      let dy = edge.target.y - edge.source.y;
      let distanceSq = dx * dx + dy * dy;
      if (distanceSq < 1) {
        dx = 1;
        dy = 0;
        distanceSq = 1;
      }
      const distance = Math.sqrt(distanceSq);
      const desiredDistance = 56 + ((edge.source.size + edge.target.size) * 3.2);
      const stretch = distance - desiredDistance;
      const springForce = stretch * linkStrength;
      const offsetX = (dx / distance) * springForce;
      const offsetY = (dy / distance) * springForce;
      forces.get(edge.source.id).x += offsetX;
      forces.get(edge.source.id).y += offsetY;
      forces.get(edge.target.id).x -= offsetX;
      forces.get(edge.target.id).y -= offsetY;
    }

    for (const node of visibleNodes) {
      const force = forces.get(node.id);
      node.vx = (node.vx + force.x * stepDt) * damping;
      node.vy = (node.vy + force.y * stepDt) * damping;
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        node.vx *= scale;
        node.vy *= scale;
      }
      node.x += node.vx * stepDt;
      node.y += node.vy * stepDt;
      totalMotion += Math.abs(node.vx) + Math.abs(node.vy);
    }
  }

  return totalMotion > 0.02;
}

function runDynamicGraphFrame(timestamp) {
  state.dynamicGraphFrame = 0;
  if (!shouldRunDynamicGraph()) {
    state.dynamicGraphLastTs = 0;
    return;
  }
  const previousTs = state.dynamicGraphLastTs || timestamp;
  const dtSeconds = Math.min(0.032, Math.max(0.012, (timestamp - previousTs) / 1000));
  state.dynamicGraphLastTs = timestamp;
  stepDynamicGraphSimulation(dtSeconds);
  render();
}

function ensureDynamicGraphFrame() {
  if (!shouldRunDynamicGraph()) {
    cancelDynamicGraphFrame();
    return;
  }
  if (!state.dynamicGraphFrame) {
    state.dynamicGraphFrame = requestAnimationFrame(runDynamicGraphFrame);
  }
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

  const radius = state.neighborMode && rootId
    ? Math.round(state.hoverLabelRadius * 1.375)
    : state.hoverLabelRadius;
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

function formatByteCount(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function waitForNextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function setGraphLoadingStatus(label, tooltip = label) {
  if (!graphStatsBadge) {
    return;
  }
  graphStatsBadge.classList.add("is-loading");
  graphStatsBadge.textContent = label;
  setTooltipLabel(graphStatsBadge, tooltip);
}

function reportVisibleGraphStats(visibleNodeCount, visibleLinkCount) {
  if (graphStatsBadge) {
    const totalNodeCount = state.baseMeta?.nodeCount ?? state.baseNodes.length;
    const totalLinkCount = state.baseMeta?.edgeCount ?? state.baseEdges.length;
    graphStatsBadge.classList.remove("is-loading");
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
  cancelDynamicGraphFrame();
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
    const structuralHighlights = getNodeStructuralHighlights(node);
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
    if (
      state.highlightMode !== "none"
      && !structuralHighlights.length
      && !isHoveredNode
      && !isHoveredNeighbor
      && !isActivePathNode
      && node.id !== state.graphRootNodeId
      && node.id !== state.inspectNodeId
    ) {
      nodeAlpha *= 0.44;
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
    if (node.isCustom) {
      const stateMeta = getCustomNodeStateMeta(node.customState);
      strokeNodeHalo(shape, point.x, point.y, radius, 2, stateMeta.color, 1.8, 0.9);
    }
    structuralHighlights.forEach((highlight, index) => {
      strokeNodeHalo(shape, point.x, point.y, radius, 4 + (index * 2.8), highlight.color, 1.8, 0.96);
    });
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
  ensureDynamicGraphFrame();
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
  for (const layer of getVisibleInvestigationLayers()) {
    for (const [sourceId, noteText] of Object.entries(layer.nodeNotes || {})) {
      if (sourceId === nodeId || !extractNodeReferencesFromText(noteText).includes(nodeId)) {
        continue;
      }
      const sourceNode = state.nodeById.get(sourceId);
      if (!sourceNode || !isRuntimeNodeVisible(sourceNode)) {
        continue;
      }
      backlinks.set(sourceNode.id, sourceNode);
    }
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

function normalizeLayerColorHex(value, fallback = "#63d8ea") {
  const normalized = typeof value === "string" ? value.trim().replace(/^#/, "") : "";
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    return fallback;
  }
  return `#${expanded.toLowerCase()}`;
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
  const structuralFacts = getNodeStructuralFacts(node);
  return `
    <div class="app-tooltip-card">
      <div class="app-tooltip-title">${escapeHtml(node.title)}</div>
      <div class="app-tooltip-meta">
        ${escapeHtml(node.group || "node")}
        ${tags ? `<span> · ${escapeHtml(tags)}</span>` : ""}
      </div>
      ${structuralFacts.length ? `
        <div class="app-tooltip-section-title">Structure</div>
        <div class="app-tooltip-layer-list">
          ${structuralFacts.map((fact) => `
            <div class="app-tooltip-layer-row">
              <span
                class="app-tooltip-layer-swatch"
                style="--tooltip-layer-color: ${escapeHtml(STRUCTURAL_HIGHLIGHT_META[fact.kind].color)};"
              ></span>
              <span class="app-tooltip-layer-copy">
                <strong>${escapeHtml(fact.label)}</strong>
                <small>${escapeHtml(fact.detail)}</small>
              </span>
            </div>
          `).join("")}
        </div>
      ` : ""}
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
    if (wasPathFocus) {
      syncLayout(true);
    }
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
  syncLayout(true);
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
    // Treat paths as graph relationships, not document navigation direction.
    // Many meaningful lore connections are backlinks or co-mentions from an article.
    const neighbors = state.adjacency.get(currentId) || new Set();
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

function reconstructPathFromParents(parentById, endId) {
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

function buildDistanceMapFromTarget(targetId) {
  const distanceById = new Map();
  if (!targetId || !state.nodeById.has(targetId)) {
    return distanceById;
  }
  const queue = [targetId];
  distanceById.set(targetId, 0);

  while (queue.length) {
    const currentId = queue.shift();
    const currentDistance = distanceById.get(currentId) || 0;
    const neighbors = state.adjacency.get(currentId) || new Set();
    for (const neighborId of neighbors) {
      if (distanceById.has(neighborId)) {
        continue;
      }
      distanceById.set(neighborId, currentDistance + 1);
      queue.push(neighborId);
    }
  }

  return distanceById;
}

function isBroadIndexNode(node) {
  const title = normalize(node?.title || "");
  return [
    "individuals",
    "corporations",
    "commodities",
    "rare commodities",
    "goods",
    "components",
    "materials",
    "data",
    "species",
    "star systems with in game descriptions",
  ].includes(title);
}

function collectPathCandidates(startId, endId, shortestPathNodeIds, {
  maxExtraEdges = 2,
  maxCandidates = 120,
} = {}) {
  if (!shortestPathNodeIds.length) {
    return [];
  }
  if (shortestPathNodeIds.length <= 2) {
    return [shortestPathNodeIds.slice()];
  }

  const shortestEdgeCount = Math.max(0, shortestPathNodeIds.length - 1);
  const maxEdgeCount = shortestEdgeCount + maxExtraEdges;
  const distanceToTarget = buildDistanceMapFromTarget(endId);
  const candidates = [];
  const signatures = new Set();

  const visit = (currentId, pathNodeIds, visitedNodeIds) => {
    if (candidates.length >= maxCandidates) {
      return;
    }
    const usedEdgeCount = pathNodeIds.length - 1;
    const remainingEdgeCount = distanceToTarget.get(currentId);
    if (remainingEdgeCount === undefined || (usedEdgeCount + remainingEdgeCount) > maxEdgeCount) {
      return;
    }
    if (currentId === endId) {
      const signature = pathNodeIds.join("|");
      if (!signatures.has(signature)) {
        signatures.add(signature);
        candidates.push(pathNodeIds.slice());
      }
      return;
    }

    const neighborIds = [...(state.adjacency.get(currentId) || new Set())]
      .filter((neighborId) => !visitedNodeIds.has(neighborId) && distanceToTarget.has(neighborId))
      .sort((leftId, rightId) => (
        (distanceToTarget.get(leftId) - distanceToTarget.get(rightId))
        || ((state.nodeById.get(rightId)?.degree || 0) - (state.nodeById.get(leftId)?.degree || 0))
        || ((state.nodeById.get(leftId)?.title || "").localeCompare(state.nodeById.get(rightId)?.title || ""))
      ));

    for (const neighborId of neighborIds) {
      if (candidates.length >= maxCandidates) {
        break;
      }
      visitedNodeIds.add(neighborId);
      pathNodeIds.push(neighborId);
      visit(neighborId, pathNodeIds, visitedNodeIds);
      pathNodeIds.pop();
      visitedNodeIds.delete(neighborId);
    }
  };

  visit(startId, [startId], new Set([startId]));
  if (!candidates.length) {
    return [shortestPathNodeIds.slice()];
  }
  return candidates;
}

function scoreInterestingPath(pathNodeIds, shortestEdgeCount) {
  let score = (pathNodeIds.length - 1 - shortestEdgeCount) * 0.9;
  for (let index = 1; index < pathNodeIds.length - 1; index += 1) {
    const node = state.nodeById.get(pathNodeIds[index]);
    const metrics = getStructuralMetrics(pathNodeIds[index]);
    if (!node || !metrics) {
      score += 0.45;
      continue;
    }
    if (isBroadIndexNode(node)) {
      score += 1.45;
    }
    if (metrics.isBridge) {
      score -= 1.15;
    }
    if (metrics.isOutlier) {
      score -= 0.55;
    }
    score -= Math.min(0.55, metrics.bridgeTagDiversity * 0.13);
    if ((node.degree || 0) <= 1) {
      score += 0.25;
    }
  }
  return score;
}

function getYearRangeDistance(leftRange, rightRange) {
  if (!leftRange || !rightRange) {
    return null;
  }
  if (leftRange.max < rightRange.min) {
    return rightRange.min - leftRange.max;
  }
  if (rightRange.max < leftRange.min) {
    return leftRange.min - rightRange.max;
  }
  return 0;
}

function scoreChronologicalPath(pathNodeIds, shortestEdgeCount, direction) {
  let score = (pathNodeIds.length - 1 - shortestEdgeCount) * 0.72;
  let datedNodeCount = 0;

  for (let index = 0; index < pathNodeIds.length; index += 1) {
    const node = state.nodeById.get(pathNodeIds[index]);
    const range = getNodeYearRange(node);
    if (range) {
      datedNodeCount += 1;
      if (index > 0 && index < pathNodeIds.length - 1) {
        score -= 0.18;
      }
    }
    if (node && isBroadIndexNode(node)) {
      score += 0.4;
    }
  }

  for (let index = 1; index < pathNodeIds.length; index += 1) {
    const previousNode = state.nodeById.get(pathNodeIds[index - 1]);
    const currentNode = state.nodeById.get(pathNodeIds[index]);
    const previousRange = getNodeYearRange(previousNode);
    const currentRange = getNodeYearRange(currentNode);
    if (!previousRange && !currentRange) {
      score += 0.6;
      continue;
    }
    if (!previousRange || !currentRange) {
      score += 0.34;
      continue;
    }
    const gap = getYearRangeDistance(previousRange, currentRange) || 0;
    score += Math.min(1.45, gap / 8);
    if (direction > 0 && currentRange.center < previousRange.center - 2) {
      score += 2.25;
    } else if (direction < 0 && currentRange.center > previousRange.center + 2) {
      score += 2.25;
    }
  }

  if (datedNodeCount < 2) {
    score += 1.4;
  } else if (datedNodeCount >= 3) {
    score -= 0.32;
  }

  return score;
}

function selectBestRankedPath(pathCandidates, scorePath) {
  return [...pathCandidates].sort((leftPath, rightPath) => (
    scorePath(leftPath) - scorePath(rightPath)
    || leftPath.length - rightPath.length
    || leftPath.join("|").localeCompare(rightPath.join("|"))
  ))[0] || [];
}

function findInterestingPath(startId, endId) {
  const shortestPathNodeIds = findShortestPath(startId, endId);
  if (!shortestPathNodeIds.length) {
    return [];
  }
  const shortestEdgeCount = Math.max(0, shortestPathNodeIds.length - 1);
  const pathCandidates = collectPathCandidates(startId, endId, shortestPathNodeIds, {
    maxExtraEdges: shortestEdgeCount <= 3 ? 3 : 2,
    maxCandidates: 160,
  });
  return selectBestRankedPath(pathCandidates, (pathNodeIds) => (
    scoreInterestingPath(pathNodeIds, shortestEdgeCount)
  ));
}

function findChronologicalPath(startId, endId) {
  const startNode = state.nodeById.get(startId);
  const endNode = state.nodeById.get(endId);
  const startRange = getNodeYearRange(startNode);
  const endRange = getNodeYearRange(endNode);
  const shortestPathNodeIds = findShortestPath(startId, endId);
  if (!shortestPathNodeIds.length) {
    return [];
  }
  const direction = startRange && endRange && endRange.center !== startRange.center
    ? Math.sign(endRange.center - startRange.center)
    : 0;
  const shortestEdgeCount = Math.max(0, shortestPathNodeIds.length - 1);
  const pathCandidates = collectPathCandidates(startId, endId, shortestPathNodeIds, {
    maxExtraEdges: shortestEdgeCount <= 3 ? 3 : 2,
    maxCandidates: 160,
  });
  return selectBestRankedPath(pathCandidates, (pathNodeIds) => (
    scoreChronologicalPath(pathNodeIds, shortestEdgeCount, direction)
  ));
}

function findPath(startId, endId, pathMode = state.pathMode) {
  const normalizedMode = normalizePathMode(pathMode);
  if (normalizedMode === "interesting") {
    return findInterestingPath(startId, endId);
  }
  if (normalizedMode === "chronological") {
    return findChronologicalPath(startId, endId);
  }
  return findShortestPath(startId, endId);
}

function getSharedNeighbors(leftId, rightId) {
  if (!leftId || !rightId) {
    return [];
  }
  const leftNeighbors = state.adjacency.get(leftId) || new Set();
  const rightNeighbors = state.adjacency.get(rightId) || new Set();
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
  syncLayout(true);
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
  const pathNodeIds = findPath(startId, targetNodeId, state.pathMode);
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

function traceSelectedPath({ shouldFit = true } = {}) {
  const fromId = state.pathFromNodeId;
  const toId = state.pathToNodeId;
  if (!fromId || !toId) {
    setToolStatusMessage("Select both From and To nodes.");
    return false;
  }
  const path = findPath(fromId, toId, state.pathMode);
  if (!path.length) {
    setToolStatusMessage(`No ${getPathModeMeta(state.pathMode).label.toLowerCase()} path found between those nodes.`);
    return false;
  }
  applyPath(path, toId, { shouldFit, preserveFocus: state.pathFocus });
  setToolStatusMessage(`${getPathModeMeta(state.pathMode).label} path: ${describePath(path)}`);
  return true;
}

function setPathMode(pathMode, { retrace = true } = {}) {
  const nextMode = normalizePathMode(pathMode);
  if (state.pathMode === nextMode) {
    return;
  }
  state.pathMode = nextMode;
  saveInvestigationState();
  if (retrace && state.activePathNodeIds.length && state.pathFromNodeId && state.pathToNodeId) {
    traceSelectedPath({ shouldFit: true });
    return;
  }
  renderInvestigatorTools();
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
    mode: normalizePathMode(state.pathMode),
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
  state.pathMode = normalizePathMode(savedPath.mode);
  applyPath(savedPath.nodeIds, savedPath.toId, { shouldFit: true, preserveFocus: state.pathFocus });
  setToolStatusMessage(`Opened ${getPathModeMeta(state.pathMode).label.toLowerCase()} path: ${savedPath.name}`);
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
    state: "question",
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

function createCustomNode(title = "Untitled Lead") {
  const customNode = createCustomNodeRecord(title);
  if (!customNode) {
    return;
  }
  setToolStatusMessage(`Created custom node in ${getActiveLayer()?.name || "layer"}: ${customNode.title}`);
  selectNode(customNode.id, true);
}

function createCustomNodeFromPanel() {
  const input = document.getElementById("custom-node-create-title");
  const title = input?.value.trim() || "Untitled Lead";
  const customNode = createCustomNodeRecord(title);
  if (!customNode) {
    return;
  }
  if (input) {
    input.value = "";
  }
  setToolStatusMessage(`Created custom node: ${customNode.title}`);
  renderInvestigatorTools();
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

function scrubSavedPathsForDeletedNode(savedPaths, nodeId) {
  return (savedPaths || [])
    .map((savedPath) => ({
      ...savedPath,
      nodeIds: (savedPath.nodeIds || []).filter((pathNodeId) => pathNodeId !== nodeId),
    }))
    .filter((savedPath) => savedPath.nodeIds.length >= 2);
}

function scrubNodeNotesForDeletedNode(nodeNotes, nodeId, fallbackLabel) {
  return Object.fromEntries(
    Object.entries(nodeNotes || {})
      .filter(([noteNodeId]) => noteNodeId !== nodeId)
      .map(([noteNodeId, text]) => [
        noteNodeId,
        removeInvestigationLinksToNode(text, nodeId, fallbackLabel),
      ]),
  );
}

function scrubLayerForDeletedCustomNode(layer, nodeId, fallbackLabel) {
  return {
    ...layer,
    bookmarks: (layer.bookmarks || []).filter((bookmarkId) => bookmarkId !== nodeId),
    savedPaths: scrubSavedPathsForDeletedNode(layer.savedPaths, nodeId),
    nodeNotes: scrubNodeNotesForDeletedNode(layer.nodeNotes, nodeId, fallbackLabel),
    customNodes: (layer.customNodes || []).filter((customNode) => customNode.id !== nodeId),
    pathTargetNodeId: layer.pathTargetNodeId === nodeId ? null : layer.pathTargetNodeId,
    activePathNodeIds: (layer.activePathNodeIds || []).filter((pathNodeId) => pathNodeId !== nodeId),
    pathFocus: layer.pathFocus && (layer.activePathNodeIds || []).filter((pathNodeId) => pathNodeId !== nodeId).length >= 2,
    updatedAt: timestamp(),
  };
}

function deleteCustomNode(nodeId) {
  if (!nodeId) {
    return;
  }
  const deletedNode = state.nodeById.get(nodeId) || state.customNodes.find((node) => node.id === nodeId);
  if (!deletedNode?.isCustom && !state.customNodes.some((node) => node.id === nodeId)) {
    return;
  }
  const fallbackLabel = deletedNode?.title || nodeId;
  state.customNodes = state.customNodes.filter((node) => node.id !== nodeId);
  state.nodeNotes = scrubNodeNotesForDeletedNode(state.nodeNotes, nodeId, fallbackLabel);
  state.bookmarkedNodeIds = state.bookmarkedNodeIds.filter((bookmarkId) => bookmarkId !== nodeId);
  state.savedPaths = scrubSavedPathsForDeletedNode(state.savedPaths, nodeId);
  state.pathTargetNodeId = state.pathTargetNodeId === nodeId ? null : state.pathTargetNodeId;
  state.pathFromNodeId = state.pathFromNodeId === nodeId ? null : state.pathFromNodeId;
  state.pathToNodeId = state.pathToNodeId === nodeId ? null : state.pathToNodeId;
  state.activePathNodeIds = state.activePathNodeIds.filter((pathNodeId) => pathNodeId !== nodeId);
  state.pathFocus = state.pathFocus && state.activePathNodeIds.length >= 2;
  state.activePathEdgeKeys = new Set();
  for (let index = 1; index < state.activePathNodeIds.length; index += 1) {
    state.activePathEdgeKeys.add(edgeKey(state.activePathNodeIds[index - 1], state.activePathNodeIds[index]));
  }
  persistActiveLayerIntoCollection();
  state.investigationLayers = state.investigationLayers.map((layer) => (
    layer.id === state.activeLayerId ? layer : scrubLayerForDeletedCustomNode(layer, nodeId, fallbackLabel)
  ));
  saveInvestigationState({ syncLayer: false });
  rebuildRuntimeGraphData();
  if (currentNodeId() === nodeId) {
    state.graphRootNodeId = null;
    state.inspectNodeId = null;
    state.neighborMode = false;
    state.expandedNodeIds = new Set();
    showEmptyNoteState();
    noteMeta.innerHTML = renderSearchCompletionsPanel();
    updateUrlState();
  }
  renderInvestigatorTools();
  render();
  setToolStatusMessage("Custom node deleted.");
}

function confirmDeleteCustomNode(nodeId) {
  const node = state.nodeById.get(nodeId) || state.customNodes.find((entry) => entry.id === nodeId);
  if (!node) {
    return;
  }
  if (!window.confirm(`Delete custom node "${node.title}" from this investigation layer?`)) {
    return;
  }
  deleteCustomNode(nodeId);
}

function refreshCurrentGraphViewAfterVisibilityChange() {
  const focusNodeId = currentNodeId();
  if (focusNodeId && state.nodeById.has(focusNodeId)) {
    loadNote(focusNodeId);
  }
  renderInvestigatorTools();
  if (state.view === "explorer") {
    syncLayout(true);
    fitGraph();
    return;
  }
  render();
}

function openLayerDefaultFocus(layerId = state.activeLayerId, updateUrl = true) {
  const layer = state.investigationLayers.find((entry) => entry.id === layerId);
  const focusNodeId = layer?.defaultFocusNodeId;
  if (!focusNodeId || !state.nodeById.has(focusNodeId)) {
    return false;
  }
  selectNode(focusNodeId, true, updateUrl, false);
  return true;
}

function toggleCanonLayerVisibility() {
  state.canonLayerVisible = !state.canonLayerVisible;
  saveInvestigationState({ syncLayer: false });
  buildAdjacency();
  refreshSearchWorkerIndex();
  refreshCurrentGraphViewAfterVisibilityChange();
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
  refreshCurrentGraphViewAfterVisibilityChange();
}

function deleteLayer(layerId = state.activeLayerId) {
  if (!layerId) {
    return;
  }
  persistActiveLayerIntoCollection();
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
  const previousLayer = state.investigationLayers.find((layer) => layer.id === layerId);
  const remainingLayers = state.investigationLayers.filter((layer) => layer.id !== layerId);
  state.investigationLayers = remainingLayers;
  if (state.activeLayerId === layerId) {
    state.activeLayerId = remainingLayers[0].id;
    applyLayerToState(remainingLayers[0]);
  } else {
    applyLayerToState(getActiveLayer());
  }
  saveInvestigationState({ syncLayer: false });
  rebuildRuntimeGraphData();
  if (currentNodeId() && state.nodeById.has(currentNodeId())) {
    loadNote(currentNodeId());
  }
  setToolStatusMessage(previousLayer ? `Deleted layer: ${previousLayer.name}` : "Deleted layer.");
  renderInvestigatorTools();
  render();
}

function deleteActiveLayer() {
  deleteLayer(state.activeLayerId);
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

function setLayerColor(layerId, color) {
  if (!layerId) {
    return;
  }
  const targetLayer = state.investigationLayers.find((layer) => layer.id === layerId);
  if (!targetLayer) {
    return;
  }
  const nextColor = normalizeLayerColorHex(color, targetLayer.color || colorForLayer(0));
  if (nextColor === targetLayer.color) {
    return;
  }
  state.investigationLayers = state.investigationLayers.map((layer) => (
    layer.id === layerId
      ? { ...layer, color: nextColor, updatedAt: timestamp() }
      : layer
  ));
  saveInvestigationState({ syncLayer: false });
  rebuildRuntimeGraphData();
  const focusNodeId = currentNodeId();
  if (focusNodeId && state.nodeById.has(focusNodeId)) {
    loadNote(focusNodeId);
  }
  renderInvestigatorTools();
  if (state.view === "explorer") {
    syncLayout(true);
    fitGraph();
    return;
  }
  render();
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

function setLayerDefaultFocus(layerId, nodeId) {
  if (!layerId) {
    return;
  }
  const targetLayer = state.investigationLayers.find((layer) => layer.id === layerId);
  if (!targetLayer) {
    return;
  }
  const nextFocusNodeId = nodeId && state.nodeById.has(nodeId) ? nodeId : null;
  if (targetLayer.defaultFocusNodeId === nextFocusNodeId) {
    return;
  }
  state.investigationLayers = state.investigationLayers.map((layer) => (
    layer.id === layerId
      ? { ...layer, defaultFocusNodeId: nextFocusNodeId, updatedAt: timestamp() }
      : layer
  ));
  saveInvestigationState({ syncLayer: false });
  renderInvestigatorTools();
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
  if (!openLayerDefaultFocus(nextLayers[0].id, false) && currentNodeId() && state.nodeById.has(currentNodeId())) {
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
  const hasActivePath = state.activePathNodeIds.length > 1;
  const pathToolOpen = hasActivePath || state.pathFromNodeId || state.pathToNodeId;
  const layerNotesOpen = Boolean((activeLayer?.notes || "").trim());
  const layerDefaultFocusNode = activeLayer?.defaultFocusNodeId ? state.nodeById.get(activeLayer.defaultFocusNodeId) : null;
  const currentFocusNodeId = currentNodeId();
  const canSetLayerDefaultFocus = Boolean(activeLayer && currentFocusNodeId && state.nodeById.has(currentFocusNodeId));

  investigatorTools.innerHTML = `
    <div class="tool-card">
      <section class="tool-card-toolbar detective-layer-summary">
        <div>
          <div class="tool-kicker">Active layer</div>
          <div class="detective-layer-title">${escapeHtml(activeLayer?.name || "No investigation layer")}</div>
        </div>
        <div class="detective-layer-start">
          <div class="tool-kicker">Start here</div>
          <div class="detective-layer-start-row">
            <div class="detective-layer-start-copy">
              ${layerDefaultFocusNode ? escapeHtml(layerDefaultFocusNode.title) : "No default start node"}
            </div>
            <div class="tool-inline-group detective-layer-start-actions">
              <button
                type="button"
                class="mini-button"
                data-open-layer-start="true"
                ${layerDefaultFocusNode ? "" : "disabled"}
              >Open start</button>
              <button
                type="button"
                class="mini-button"
                data-set-layer-start="true"
                ${canSetLayerDefaultFocus ? "" : "disabled"}
              >Set current</button>
              <button
                type="button"
                class="mini-button"
                data-clear-layer-start="true"
                ${layerDefaultFocusNode ? "" : "disabled"}
              >Clear</button>
            </div>
          </div>
        </div>
        <div class="tool-status">${escapeHtml(state.toolStatusMessage || "Ready")}</div>
      </section>

      <div class="tool-card-toolbar layer-management-section">
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
              <label
                class="layer-color-picker"
                aria-label="Choose color for ${escapeHtml(layer.name)}"
                data-tooltip="Choose color for ${escapeHtml(layer.name)}"
              >
                <input
                  type="color"
                  class="layer-color-picker-input"
                  value="${escapeHtml(normalizeLayerColorHex(layer.color, colorForLayer(0)))}"
                  data-layer-color="${layer.id}"
                  aria-label="Choose color for ${escapeHtml(layer.name)}"
                />
              </label>
              <button
                type="button"
                class="layer-action-button"
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
                class="layer-action-button is-danger"
                data-delete-layer="${layer.id}"
                aria-label="Delete ${escapeHtml(layer.name)}"
                data-tooltip="Delete ${escapeHtml(layer.name)}"
              >${iconMarkup("trash")}</button>
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
            <button
              type="button"
              class="layer-action-button"
              data-create-layer="true"
              aria-label="Create layer"
              data-tooltip="Create layer"
            >${iconMarkup("add")}</button>
          </div>
        </div>
      </div>

      <section class="tool-card-toolbar custom-node-section">
        <div class="tool-card-title">Custom Nodes (${activeCustomNodes.length})</div>
        <div class="custom-node-create-row">
          <input
            id="custom-node-create-title"
            class="layer-name-input"
            type="text"
            placeholder="New custom node title"
            autocomplete="off"
          />
          <button type="button" class="mini-button" id="create-custom-node-from-title">Create</button>
        </div>
        ${activeCustomNodes.length ? `
          <div class="saved-item-list">
            ${activeCustomNodes.map((customNode) => `
              <div class="saved-item">
                <button type="button" class="saved-item-open" data-select-node="${escapeHtml(customNode.id)}">
                  <strong>${escapeHtml(customNode.title)}</strong>
                  <small>${escapeHtml([
                    getCustomNodeStateMeta(customNode.state).label,
                    (customNode.tags || []).join(", "),
                  ].filter(Boolean).join(" · "))}</small>
                </button>
                <button type="button" class="mini-button is-danger" data-delete-custom-node="${escapeHtml(customNode.id)}">Delete</button>
              </div>
            `).join("")}
          </div>
        ` : '<div class="tool-empty">No custom nodes in this layer yet.</div>'}
      </section>

      <details class="tool-section tool-section-path" ${pathToolOpen ? "open" : ""}>
        <summary>
          <span>Path tracer</span>
          <small>${hasActivePath ? `${getPathModeMeta(state.pathMode).label} · ${state.activePathNodeIds.length} nodes` : "find route"}</small>
        </summary>
        <div class="tool-section-body">
        ${renderNodeSearchInput("path-from", state.pathFromNodeId, "Search from node...", "From")}
        ${renderNodeSearchInput("path-to", state.pathToNodeId, "Search to node...", "To")}
        <div class="path-controls">
          <select id="path-mode-select" class="path-mode-select" aria-label="Path mode">
            ${Object.entries(PATH_MODE_META).map(([modeKey, meta]) => `
              <option value="${escapeHtml(modeKey)}" ${state.pathMode === modeKey ? "selected" : ""}>${escapeHtml(meta.label)}</option>
            `).join("")}
          </select>
          <button type="button" class="mini-button" id="trace-path-button">Trace</button>
          <button
            type="button"
            class="mini-button ${state.pathFocus ? "is-active" : ""}"
            id="path-focus-button"
            ${hasActivePath ? "" : "disabled"}
          >${state.pathFocus ? "Unfocus" : "Focus"}</button>
          <button type="button" class="mini-button" id="save-path-button" ${hasActivePath ? "" : "disabled"}>Save</button>
        </div>
        <div class="path-summary" id="path-summary-text">
          ${hasActivePath ? `${getPathModeMeta(state.pathMode).label} · ${state.activePathNodeIds.length} nodes · ${describePath(state.activePathNodeIds)}` : "No active path"}
        </div>
        </div>
      </details>

      ${activeSavedPaths.length ? `
      <details class="tool-section saved-paths-section" open>
        <summary>
          <span>Saved paths</span>
          <small>${activeSavedPaths.length}</small>
        </summary>
        <div class="tool-section-body">
        <div class="saved-item-list">
          ${activeSavedPaths.map((path) => `
            <div class="saved-item">
              <button type="button" class="saved-item-open" data-open-saved-path="${escapeHtml(path.id)}">
                <strong>${escapeHtml(path.name)}</strong>
                <small>${escapeHtml(getPathModeMeta(path.mode).label)} · ${describePath(path.nodeIds)} · ${path.nodeIds.length} nodes</small>
              </button>
              <button type="button" class="mini-button" data-remove-saved-path="${escapeHtml(path.id)}">Remove</button>
            </div>
          `).join("")}
        </div>
        </div>
      </details>
      ` : ""}

      <details class="tool-section layer-notes-section" ${layerNotesOpen ? "open" : ""}>
        <summary>
          <span>Layer notes</span>
          <small>${layerNotesOpen ? "has notes" : "empty"}</small>
        </summary>
        <div class="tool-section-body">
        <textarea
          id="layer-notes-editor"
          class="investigation-notes"
          placeholder="General notes about this investigation layer..."
        >${escapeHtml(activeLayer?.notes || "")}</textarea>
        </div>
      </details>
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
  if (
    state.searchIndexStatus === "loading"
    || state.searchIndexStatus === "idle"
    || state.searchIndexStatus === "indexing"
    || (state.searchIndexStatus === "ready" && !state.searchWorkerReady)
  ) {
    return `
      <div class="search-completions-panel">
        <div class="search-completions-header">
          <span class="meta-label">Search</span>
          <small>Search loading</small>
        </div>
        <div class="tool-empty">Search index is loading. Results will update automatically.</div>
      </div>
    `;
  }
  if (state.searchIndexStatus === "error") {
    return `
      <div class="search-completions-panel">
        <div class="search-completions-header">
          <span class="meta-label">Search</span>
          <small>Search unavailable</small>
        </div>
        <div class="tool-empty">${escapeHtml(state.searchIndexError || "Search index could not be loaded.")}</div>
      </div>
    `;
  }
  if (state.searchMode === "content" && state.searchContentStatus === "loading") {
    return `
      <div class="search-completions-panel">
        <div class="search-completions-header">
          <span class="meta-label">Search</span>
          <small>Content loading</small>
        </div>
        <div class="tool-empty">Full-text index is loading. Results will update automatically.</div>
      </div>
    `;
  }
  if (state.searchMode === "content" && state.searchContentStatus === "error") {
    return `
      <div class="search-completions-panel">
        <div class="search-completions-header">
          <span class="meta-label">Search</span>
          <small>Content unavailable</small>
        </div>
        <div class="tool-empty">${escapeHtml(state.searchContentError || "Full-text search index could not be loaded.")}</div>
      </div>
    `;
  }
  const results = getVisibleSearchResults();
  const countLabel = state.results.length
    ? `${state.results.length} match${state.results.length === 1 ? "" : "es"}`
    : "No matches";
  return `
    <div class="search-completions-panel">
      <div class="search-completions-header">
        <span class="meta-label">Search</span>
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
                <small>${escapeHtml(result.group || "node")}${result.matchType ? ` · ${escapeHtml(result.matchType)}` : ""}</small>
                ${state.searchMode === "content" && result.excerpt ? `<span class="search-completion-excerpt">${escapeHtml(result.excerpt)}</span>` : ""}
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
  const customStateBadge = node.isCustom ? renderCustomNodeStateBadge(node.customState) : "";
  return `
    <div class="note-meta-stack">
      ${renderSearchCompletionsPanel()}
      <div class="note-tag-list">${renderTagButtons(node)}</div>
      <div class="note-inline-meta">
        ${layerBadge}
        ${customStateBadge}
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
      ${selectionText
        ? `<div class="note-link-selection-text">${escapeHtml(selectionText)}</div>`
        : '<div class="tool-empty">Select text first, then choose a node.</div>'}
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
        <div class="tool-card-title">Edit Node</div>
      </div>
      <div class="custom-node-fields">
        <label class="custom-node-field">
          <span>Title</span>
          <input id="custom-node-title-input" type="text" value="${escapeHtml(customNode.title)}" />
        </label>
        <div class="custom-node-field-grid">
          <label class="custom-node-field">
            <span>State</span>
            <select id="custom-node-state-input">
              ${Object.entries(CUSTOM_NODE_STATE_META).map(([stateKey, meta]) => `
                <option value="${escapeHtml(stateKey)}" ${customNode.state === stateKey ? "selected" : ""}>${escapeHtml(meta.label)}</option>
              `).join("")}
            </select>
          </label>
          <label class="custom-node-field">
            <span>Tags</span>
            <input id="custom-node-tags-input" type="text" value="${escapeHtml((customNode.tags || []).join(", "))}" placeholder="tag, another tag" />
          </label>
          <label class="custom-node-field">
            <span>Aliases</span>
            <input id="custom-node-aliases-input" type="text" value="${escapeHtml((customNode.aliases || []).join(", "))}" placeholder="alias, another alias" />
          </label>
        </div>
      </div>
    </section>
  `;
}

function renderInvestigationNoteEditor(node) {
  if (!state.detectiveMode || !getActiveLayer()) {
    return "";
  }
  const noteText = state.nodeNotes[node.id] || "";
  const isEditMode = state.investigationNoteView === "edit";
  return `
    <section class="investigation-note-card">
      <div class="investigation-note-card-header">
        <div class="tool-card-title">Notes</div>
        <div class="investigation-note-actions">
          ${isEditMode ? `<button type="button" class="mini-button" data-open-note-link-picker="${escapeHtml(node.id)}">Link selected text</button>` : ""}
          ${isEditMode && state.noteLinkPickerNodeId === node.id ? '<button type="button" class="mini-button" data-close-note-link-picker="true">Close linker</button>' : ""}
          <button
            type="button"
            class="mini-button"
            data-toggle-note-view="true"
          >${isEditMode ? "Preview" : "Edit"}</button>
        </div>
      </div>
      ${isEditMode ? `
        <textarea
          id="node-note-editor"
          class="investigation-note-editor"
          placeholder="Write investigation notes. Select text, then link it to another node."
        >${escapeHtml(noteText)}</textarea>
        <div id="note-link-picker-container">${renderNoteLinkPicker(node.id)}</div>
      ` : `
        <div class="investigation-note-preview">
          ${noteText.trim() ? renderInvestigationNoteHtml(noteText) : '<div class="tool-empty">No investigation note yet.</div>'}
        </div>
      `}
    </section>
  `;
}

function renderCustomNodeBody(node) {
  return `
    <article class="note-body custom-node-body">
      <header><h1>${escapeHtml(node.title)}</h1></header>
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
  const deleteCustomNodeButton = node.isCustom
    ? `
      <button
        type="button"
        class="toolbar-icon-button is-danger"
        data-delete-custom-node="${escapeHtml(node.id)}"
        aria-label="Delete custom node ${escapeHtml(node.title)}"
      >
        ${iconMarkup("trash")}
      </button>
    `
    : "";
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
      ${deleteCustomNodeButton}
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
  const deleteButton = noteContent.querySelector(`[data-delete-custom-node="${CSS.escape(nodeId)}"]`);
  if (deleteButton) {
    deleteButton.hidden = !node.isCustom;
    deleteButton.setAttribute("aria-label", `Delete custom node ${node.title}`);
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
    const textarea = document.getElementById("node-note-editor");
    if (state.noteCursorNodeId === node.id && textarea) {
        const end = Math.min(state.noteCursorEnd, textarea.value.length);
        const start = Math.min(state.noteCursorStart, end);
        textarea.setSelectionRange(start, end);
    }
    if (state.noteEditorAutoFocus && textarea) {
      textarea.focus();
      state.noteEditorAutoFocus = false;
    } else {
      state.noteEditorAutoFocus = false;
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

function refreshCurrentNoteDerivedSections() {
  const nodeId = currentNodeId();
  const node = state.nodeById.get(nodeId);
  if (!node) {
    updateCurrentNoteMeta();
    return;
  }
  const backlinksSection = noteContent.querySelector(".note-backlinks-section");
  if (backlinksSection) {
    const wasOpen = backlinksSection.hasAttribute("open");
    backlinksSection.outerHTML = renderBacklinksSection(nodeId);
    if (wasOpen) {
      noteContent.querySelector(".note-backlinks-section")?.setAttribute("open", "");
    }
  }
  updateCurrentNoteMeta();
  syncNoteTitleActions(nodeId);
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

function setInvestigationNoteView(view, { focusEditor = false } = {}) {
  const nextView = view === "edit" ? "edit" : "preview";
  if (state.investigationNoteView === nextView && (!focusEditor || nextView !== "edit")) {
    return;
  }
  state.investigationNoteView = nextView;
  if (nextView !== "edit") {
    closeNoteLinkPicker();
  }
  state.noteEditorAutoFocus = focusEditor && nextView === "edit";
  const nodeId = currentNodeId();
  if (nodeId && state.nodeById.has(nodeId)) {
    loadNote(nodeId);
  }
}

function openNoteLinkPicker(nodeId) {
  const textarea = document.getElementById("node-note-editor");
  if (!nodeId || !textarea) {
    return;
  }
  recordNoteCursor(textarea, nodeId);
  if (state.noteCursorStart === state.noteCursorEnd) {
    setToolStatusMessage("Select note text before linking it.");
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
    rebuildRuntimeGraphData();
    render();
    refreshCurrentNoteDerivedSections();
  }
}

function setGraphTagFilterInput(value) {
  state.graphTagFilterInput = value;
}

function refreshGraphAfterTagFilterChange() {
  syncLayout(true);
  fitGraph();
  updateUrlState();
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

async function readResponseTextWithProgress(response, label) {
  if (!response.body?.getReader) {
    setGraphLoadingStatus(`Loading ${label}…`);
    await waitForNextPaint();
    return response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let receivedBytes = 0;
  let lastStatusUpdate = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    receivedBytes += value.byteLength;
    text += decoder.decode(value, { stream: true });

    const now = performance.now();
    if (now - lastStatusUpdate > 160) {
      lastStatusUpdate = now;
      setGraphLoadingStatus(
        `Downloading ${label}: ${formatByteCount(receivedBytes)}`,
        `Received ${formatByteCount(receivedBytes)} of ${label} data`,
      );
    }
  }

  text += decoder.decode();
  setGraphLoadingStatus(
    `Downloaded ${label}: ${formatByteCount(receivedBytes)}`,
    `Received ${formatByteCount(receivedBytes)} of ${label} data`,
  );
  await waitForNextPaint();
  return text;
}

async function fetchJsonWithProgress(url, label) {
  setGraphLoadingStatus(`Downloading ${label}…`);
  const response = await fetchWithRetry(url);
  const text = await readResponseTextWithProgress(response, label);
  setGraphLoadingStatus(`Parsing ${label}…`);
  await waitForNextPaint();
  return JSON.parse(text);
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
  if (state.activeTagFilter) {
    hash.set("tag", state.activeTagFilter);
  }
  appendUrlTagParams(hash, "tags", state.graphTagFilters.requireAll);
  appendUrlTagParams(hash, "hide", state.graphTagFilters.exclude);
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
  const node = state.nodeById.get(nodeId);
  const isCustomNode = Boolean(node?.isCustom);
  const menuWidth = 210;
  const menuHeight = isCustomNode ? 148 : 110;
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
  contextOpenLocalGraphButton.disabled = state.neighborMode && nodeId === state.graphRootNodeId;
  contextExpandNodeButton.disabled = (
    !state.neighborMode
    || !state.graphRootNodeId
    || nodeId === state.graphRootNodeId
    || state.expandedNodeIds.has(nodeId)
  );
  contextToggleBookmarkButton.textContent = isBookmarked(nodeId) ? "Remove Bookmark" : "Bookmark Node";
  contextDeleteCustomNodeButton.hidden = !isCustomNode;
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

function centerAnchoredNodes(nodes, resetPositions = true) {
  if (!nodes.length) {
    return;
  }
  const bounds = {
    minX: Math.min(...nodes.map((node) => node.anchorX)),
    maxX: Math.max(...nodes.map((node) => node.anchorX)),
    minY: Math.min(...nodes.map((node) => node.anchorY)),
    maxY: Math.max(...nodes.map((node) => node.anchorY)),
  };
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  nodes.forEach((node) => {
    setNodeAnchor(node, node.anchorX - centerX, node.anchorY - centerY, resetPositions);
  });
}

function applyPathLayout(resetPositions = true) {
  restoreGlobalLayout(false);
  const pathNodes = state.activePathNodeIds
    .map((nodeId) => state.nodeById.get(nodeId))
    .filter(Boolean);
  if (!pathNodes.length) {
    return;
  }
  if (pathNodes.length === 1) {
    setNodeAnchor(pathNodes[0], 0, 0, resetPositions);
    return;
  }

  const rect = graphStage.getBoundingClientRect();
  const aspectRatio = rect.width && rect.height ? rect.width / rect.height : 1.6;
  const idealColumns = Math.ceil(Math.sqrt(pathNodes.length * Math.max(0.9, aspectRatio)));
  const columnCount = pathNodes.length <= 6
    ? pathNodes.length
    : Math.max(4, Math.min(7, idealColumns));
  const rowCount = Math.ceil(pathNodes.length / columnCount);
  const columnSpacing = pathNodes.length <= 4 ? 164 : 142;
  const rowSpacing = 126;

  pathNodes.forEach((node, index) => {
    const row = Math.floor(index / columnCount);
    const rowStart = row * columnCount;
    const rowLength = Math.min(columnCount, pathNodes.length - rowStart);
    const indexInRow = index - rowStart;
    const column = row % 2 === 0 ? indexInRow : rowLength - 1 - indexInRow;
    const progress = rowLength > 1 ? indexInRow / (rowLength - 1) : 0.5;
    const rowArc = rowCount === 1 ? Math.sin(progress * Math.PI) * 28 : 0;
    const waveOffset = rowCount > 1 ? ((indexInRow % 2 === 0 ? -1 : 1) * 10) : 0;
    const x = column * columnSpacing;
    const y = row * rowSpacing + rowArc + waveOffset;
    setNodeAnchor(node, x, y, resetPositions);
  });

  centerAnchoredNodes(pathNodes, resetPositions);
}

function syncLayout(resetPositions = true) {
  if (state.detectiveMode && state.pathFocus && state.activePathNodeIds.length > 1) {
    applyPathLayout(resetPositions);
    return;
  }
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
      ...edge,
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
  if (state.searchMode === "content" && state.searchContentStatus !== "ready") {
    loadSearchContentDocsInBackground();
    return;
  }
  worker.postMessage({ type: "query", payload: { query: value, mode: state.searchMode } });
}

function expandCompactRows(fields, rows) {
  if (!Array.isArray(fields) || !Array.isArray(rows)) {
    return [];
  }
  return rows.map((row) => Object.fromEntries(fields.map((field, index) => [field, row[index]])));
}

function decodeGraphPayload(graph) {
  if (graph?.schema !== "compact-graph-v1") {
    return graph;
  }
  const nodes = expandCompactRows(graph.nodeFields, graph.nodes);
  const edges = graph.edgeNodeIndexes
    ? (graph.edges || []).map(([sourceIndex, targetIndex]) => ({
      source: nodes[sourceIndex]?.id,
      target: nodes[targetIndex]?.id,
    })).filter((edge) => edge.source && edge.target)
    : expandCompactRows(graph.edgeFields, graph.edges);

  return {
    nodes,
    edges,
    communityNodes: expandCompactRows(graph.communityNodeFields, graph.communityNodes),
    communityEdges: expandCompactRows(graph.communityEdgeFields, graph.communityEdges),
    meta: graph.meta || {},
  };
}

function decodeSearchDocsPayload(payload) {
  if (payload?.schema !== "compact-search-docs-v1" && payload?.schema !== "compact-search-docs-v2") {
    return Array.isArray(payload) ? payload : [];
  }
  return expandCompactRows(payload.docFields, payload.docs)
    .map((doc) => {
      const node = state.nodeById.get(doc.id);
      return node ? buildSearchDocFromNode(node, doc.snippet || "", doc.content || doc.snippet || "") : null;
    })
    .filter(Boolean);
}

function decodeSearchContentDocsPayload(payload) {
  if (payload?.schema !== "compact-search-content-docs-v1") {
    return new Map();
  }
  return new Map(
    expandCompactRows(payload.docFields, payload.docs)
      .filter((doc) => doc.id && doc.content)
      .map((doc) => [doc.id, doc.content]),
  );
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
  toolbarExportLayerButton.addEventListener("click", () => exportActiveLayer());
  toolbarImportLayerButton.addEventListener("click", () => {
    layerImportInput.value = "";
    layerImportInput.click();
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
  highlightModeSelect?.addEventListener("change", (event) => {
    state.highlightMode = normalizeHighlightMode(event.target.value);
    saveDisplaySettings();
    render();
  });
  hoverLabelRadiusInput?.addEventListener("change", (event) => {
    state.hoverLabelRadius = normalizeHoverLabelRadius(event.target.value);
    hoverLabelRadiusInput.value = String(state.hoverLabelRadius);
    saveDisplaySettings();
    render();
  });
  dynamicGraphThresholdInput?.addEventListener("change", (event) => {
    state.dynamicGraphThreshold = normalizeDynamicGraphThreshold(event.target.value);
    dynamicGraphThresholdInput.value = String(state.dynamicGraphThreshold);
    saveDisplaySettings();
    render();
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
  contextDeleteCustomNodeButton.addEventListener("click", () => {
    if (!state.contextMenu.nodeId) {
      return;
    }
    confirmDeleteCustomNode(state.contextMenu.nodeId);
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

  searchModeButton?.addEventListener("click", (event) => {
    event.preventDefault();
    toggleSearchMode();
    searchInput.focus();
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
    const deleteCustomNodeButton = event.target.closest("[data-delete-custom-node]");
    if (deleteCustomNodeButton) {
      event.preventDefault();
      confirmDeleteCustomNode(deleteCustomNodeButton.dataset.deleteCustomNode);
      return;
    }
    const noteViewButton = event.target.closest("[data-toggle-note-view]");
    if (noteViewButton) {
      event.preventDefault();
      const nextView = state.investigationNoteView === "edit" ? "preview" : "edit";
      setInvestigationNoteView(nextView, { focusEditor: nextView === "edit" });
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
    const currentId = currentNodeId();
    if (event.target.id === "custom-node-title-input" && currentId) {
      const title = event.target.value.trim() || "Untitled Lead";
      updateCustomNode(currentId, { title });
      const titleElement = noteContent.querySelector(".note-title-row h1");
      if (titleElement) {
        titleElement.textContent = title;
      }
      updateCurrentNoteMeta();
      render();
      return;
    }
    if (event.target.id === "custom-node-tags-input" && currentId) {
      updateCustomNode(currentId, {
        tags: sanitizeStringList(event.target.value.split(",").map((value) => value.trim())),
      });
      updateCurrentNoteMeta();
      render();
      return;
    }
    if (event.target.id === "custom-node-state-input" && currentId) {
      updateCustomNode(currentId, {
        state: normalizeCustomNodeState(event.target.value),
      });
      updateCurrentNoteMeta();
      renderInvestigatorTools();
      render();
      return;
    }
    if (event.target.id === "custom-node-aliases-input" && currentId) {
      updateCustomNode(currentId, {
        aliases: sanitizeStringList(event.target.value.split(",").map((value) => value.trim())),
      });
      render();
    }
  });

  noteContent.addEventListener("change", (event) => {
    const currentId = currentNodeId();
    if (!currentId) {
      return;
    }
    if (event.target.id === "custom-node-title-input") {
      loadNote(currentId);
      renderInvestigatorTools();
      render();
      return;
    }
    if (event.target.id === "custom-node-tags-input") {
      loadNote(currentId);
      renderInvestigatorTools();
      render();
      return;
    }
    if (event.target.id === "custom-node-state-input") {
      loadNote(currentId);
      renderInvestigatorTools();
      render();
      return;
    }
    if (event.target.id === "custom-node-aliases-input") {
      loadNote(currentId);
      renderInvestigatorTools();
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
    if (event.target.id === "path-mode-select") {
      setPathMode(event.target.value, { retrace: true });
      return;
    }
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
    if (event.target.id === "custom-node-create-title" && event.key === "Enter") {
      event.preventDefault();
      createCustomNodeFromPanel();
      return;
    }

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
      return;
    }

    if (event.target.closest("[data-create-layer]")) {
      createLayer();
      return;
    }

    if (event.target.closest("[data-open-layer-start]")) {
      openLayerDefaultFocus();
      return;
    }

    if (event.target.closest("[data-set-layer-start]")) {
      const focusNodeId = currentNodeId();
      if (state.activeLayerId && focusNodeId && state.nodeById.has(focusNodeId)) {
        setLayerDefaultFocus(state.activeLayerId, focusNodeId);
      }
      return;
    }

    if (event.target.closest("[data-clear-layer-start]")) {
      if (state.activeLayerId) {
        setLayerDefaultFocus(state.activeLayerId, null);
      }
      return;
    }

    const deleteLayerButton = event.target.closest("[data-delete-layer]");
    if (deleteLayerButton) {
      deleteLayer(deleteLayerButton.dataset.deleteLayer);
      return;
    }

    if (event.target.closest("#trace-path-button")) {
      traceSelectedPath({ shouldFit: true });
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

    if (event.target.closest("#create-custom-node-from-title")) {
      createCustomNodeFromPanel();
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
      confirmDeleteCustomNode(deleteCustomNodeButton.dataset.deleteCustomNode);
      return;
    }
  });

  investigatorTools.addEventListener("input", (event) => {
    const layerColorInput = event.target.closest("[data-layer-color]");
    if (!layerColorInput) {
      return;
    }
    setLayerColor(layerColorInput.dataset.layerColor, layerColorInput.value);
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
  const graphTagFilters = getUrlGraphTagFilters(params);
  const hasUrlGraphTagFilters = graphTagFilters.requireAll.length > 0 || graphTagFilters.exclude.length > 0;
  const legacyTagFilter = tagFilter && state.tagIndex.has(canonicalizeTag(tagFilter))
    ? canonicalizeTag(tagFilter)
    : null;

  state.neighborMode = Boolean(nodeId);
  hideContextMenu();

  if (nodeId && state.nodeById.has(nodeId)) {
    setActiveView("explorer");
    state.graphTagFilters = graphTagFilters;
    state.activeTagFilter = !hasUrlGraphTagFilters && legacyTagFilter ? legacyTagFilter : null;
    renderGraphFilterToolbar();
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
    state.graphTagFilters = hasUrlGraphTagFilters
      ? graphTagFilters
      : {
        requireAll: legacyTagFilter ? [legacyTagFilter] : [],
        exclude: [],
      };
    state.graphTagFilterInput = "";
    state.graphTagFilterSelectionArmed = false;
    state.neighborMode = false;
    resetSearchState();
    searchInput.value = "";
    showEmptyNoteState();
    renderGraphFilterToolbar();
    render();
  }
}

worker.onmessage = (event) => {
  if (event.data.type === "ready") {
    state.searchWorkerReady = true;
    state.searchIndexStatus = "ready";
    if (state.searchQuery.trim()) {
      querySearch(state.searchQuery);
    }
    updateCurrentNoteMeta();
    return;
  }
  if (event.data.type === "results") {
    applySearchResults(event.data.payload);
  }
};

async function loadSearchDocsInBackground() {
  state.searchIndexStatus = "loading";
  state.searchIndexError = "";
  updateCurrentNoteMeta();

  try {
    const searchResponse = await fetchWithRetry("./data/search-docs.json");
    state.baseSearchDocs = decodeSearchDocsPayload(await searchResponse.json());
    state.searchIndexStatus = "indexing";
    refreshSearchWorkerIndex();
  } catch (error) {
    console.error(error);
    state.baseSearchDocs = [];
    state.searchDocs = [];
    state.searchWorkerReady = false;
    state.searchIndexStatus = "error";
    state.searchIndexError = error.message || "Search index could not be loaded.";
    updateCurrentNoteMeta();
  }
}

async function loadSearchContentDocsInBackground() {
  if (state.searchContentStatus === "ready") {
    return true;
  }
  if (state.searchContentPromise) {
    return state.searchContentPromise;
  }

  state.searchContentStatus = "loading";
  state.searchContentError = "";
  updateCurrentNoteMeta();

  state.searchContentPromise = (async () => {
    try {
      const searchResponse = await fetchWithRetry("./data/search-content-docs.json");
      state.baseSearchContentById = decodeSearchContentDocsPayload(await searchResponse.json());
      state.searchContentStatus = "ready";
      refreshSearchWorkerIndex();
      updateCurrentNoteMeta();
      return true;
    } catch (error) {
      console.error(error);
      state.baseSearchContentById = new Map();
      state.searchContentStatus = "error";
      state.searchContentError = error.message || "Full-text search index could not be loaded.";
      updateCurrentNoteMeta();
      return false;
    } finally {
      state.searchContentPromise = null;
    }
  })();

  return state.searchContentPromise;
}

async function bootstrap() {
  setGraphLoadingStatus("Loading interface…");
  renderSharedToolbarIcons();
  initializeToolbarTooltipTargets();
  updateSearchModeButton();
  bindEvents();
  resizeCanvas();
  loadInvestigationState();
  loadDisplaySettings();

  const graph = decodeGraphPayload(await fetchJsonWithProgress("./data/graph.json", "graph"));

  setGraphLoadingStatus("Preparing graph…");
  await waitForNextPaint();
  state.baseNodes = graph.nodes;
  state.baseEdges = graph.edges;
  state.baseCommunityNodes = graph.communityNodes || [];
  state.baseCommunityEdges = graph.communityEdges || [];
  state.communityById = new Map(state.baseCommunityNodes.map((community) => [community.id, community]));
  state.baseMeta = graph.meta;
  validateInvestigationLayersAgainstGraph();
  rebuildRuntimeGraphData();
  saveInvestigationState();
  setGraphLoadingStatus("Rendering graph…");
  await waitForNextPaint();
  updateDetectiveButton();
  applyPanelWidths(state.panelWidth, state.detectivePanelWidth, "detective");
  colorModeSelect.value = state.colorMode;
  shapeModeSelect.value = state.shapeMode;
  if (highlightModeSelect) {
    highlightModeSelect.value = state.highlightMode;
  }
  if (hoverLabelRadiusInput) {
    hoverLabelRadiusInput.value = String(state.hoverLabelRadius);
  }
  if (dynamicGraphThresholdInput) {
    dynamicGraphThresholdInput.value = String(state.dynamicGraphThreshold);
  }

  state.hasFitted = false;
  state.fittedSize = { width: 0, height: 0 };
  showEmptyNoteState();
  setActiveView("landing");
  applyUrlState();
  scheduleLandingFit();
  requestAnimationFrame(() => {
    searchInput.focus({ preventScroll: true });
  });
  loadSearchDocsInBackground();
}

bootstrap().catch((error) => {
  console.error(error);
  setGraphLoadingStatus("Graph failed to load", error.message || "Could not load graph data.");
  noteMeta.innerHTML = "";
  noteContent.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
});
