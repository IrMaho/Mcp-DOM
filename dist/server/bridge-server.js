import * as http from "http";
import { WebSocketServer } from "ws";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
class SessionSerializer {
  static exportBundle(metadata, initialSnapshot, events, checkpoints, annotations = []) {
    return {
      schemaVersion: "2.0.0",
      exportedAt: Date.now(),
      metadata: { ...metadata },
      initialSnapshot: { ...initialSnapshot },
      events: [...events].sort((a, b) => a.sequence - b.sequence),
      checkpoints: [...checkpoints].sort((a, b) => a.sequence - b.sequence),
      annotations: [...annotations]
    };
  }
  static exportToJson(bundle, pretty = false) {
    return JSON.stringify(bundle, null, pretty ? 2 : void 0);
  }
  static importFromJson(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      throw new Error(`Failed to parse JSON recording: ${err.message}`);
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid recording format: root must be an object");
    }
    if (!parsed.metadata || !parsed.metadata.id) {
      throw new Error("Invalid recording format: missing session metadata");
    }
    if (!parsed.initialSnapshot || !parsed.initialSnapshot.nodes) {
      throw new Error("Invalid recording format: missing initial DOM snapshot");
    }
    if (!Array.isArray(parsed.events)) {
      parsed.events = [];
    }
    if (!Array.isArray(parsed.checkpoints)) {
      parsed.checkpoints = [];
    }
    if (!Array.isArray(parsed.annotations)) {
      parsed.annotations = [];
    }
    return parsed;
  }
  static validateIntegrity(bundle) {
    const errors = [];
    const warnings = [];
    const missingSequences = [];
    const corruptNodeReferences = [];
    const metadata = bundle.metadata;
    const events = bundle.events || [];
    const checkpoints = bundle.checkpoints || [];
    const initialSnapshot = bundle.initialSnapshot;
    if (!metadata || !metadata.id) {
      errors.push("Missing session metadata or session ID");
    }
    const hasInitialSnapshot = !!initialSnapshot && !!initialSnapshot.nodes;
    if (!hasInitialSnapshot) {
      errors.push("Initial baseline snapshot is missing");
    }
    let isMonotonic = true;
    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      if (typeof evt.sequence !== "number" || evt.sequence <= 0) {
        errors.push(`Event at index ${i} has invalid sequence: ${evt.sequence}`);
        isMonotonic = false;
      }
      if (i > 0 && evt.sequence <= events[i - 1].sequence) {
        errors.push(`Non-increasing sequence at index ${i}: prev=${events[i - 1].sequence}, curr=${evt.sequence}`);
        isMonotonic = false;
      }
    }
    if (hasInitialSnapshot) {
      for (const [idStr, node] of Object.entries(initialSnapshot.nodes)) {
        if (node.children) {
          for (const childId of node.children) {
            if (!initialSnapshot.nodes[childId]) {
              corruptNodeReferences.push(childId);
              warnings.push(`Initial snapshot node ${idStr} references non-existent child ID ${childId}`);
            }
          }
        }
      }
    }
    return {
      isValid: errors.length === 0,
      sessionId: metadata?.id || "unknown",
      schemaVersion: bundle.schemaVersion || "unknown",
      totalEvents: events.length,
      totalCheckpoints: checkpoints.length,
      isSequenceMonotonic: isMonotonic,
      missingSequences,
      corruptNodeReferences,
      hasInitialSnapshot,
      errors,
      warnings
    };
  }
}
class FileStorageProvider {
  baseDir;
  constructor(baseDir = "./.forensic_sessions") {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }
  getSessionDir(sessionId) {
    const dir = path.join(this.baseDir, sessionId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }
  async saveSession(metadata) {
    const dir = this.getSessionDir(metadata.id);
    const metaPath = path.join(dir, "metadata.json");
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf-8");
  }
  async getSession(sessionId) {
    const dir = path.join(this.baseDir, sessionId);
    const metaPath = path.join(dir, "metadata.json");
    if (!fs.existsSync(metaPath)) return null;
    try {
      const data = fs.readFileSync(metaPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  async listSessions() {
    if (!fs.existsSync(this.baseDir)) return [];
    const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
    const sessions = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metaPath = path.join(this.baseDir, entry.name, "metadata.json");
        if (fs.existsSync(metaPath)) {
          try {
            const data = fs.readFileSync(metaPath, "utf-8");
            sessions.push(JSON.parse(data));
          } catch {
          }
        }
      }
    }
    return sessions.sort((a, b) => b.startTime - a.startTime);
  }
  async deleteSession(sessionId) {
    const dir = path.join(this.baseDir, sessionId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  }
  async appendEvents(sessionId, events) {
    if (events.length === 0) return;
    const dir = this.getSessionDir(sessionId);
    const eventsPath = path.join(dir, "events.jsonl");
    const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
    fs.appendFileSync(eventsPath, lines, "utf-8");
  }
  async getEvents(sessionId, filter) {
    const dir = path.join(this.baseDir, sessionId);
    const eventsPath = path.join(dir, "events.jsonl");
    if (!fs.existsSync(eventsPath)) return [];
    const fileStream = fs.createReadStream(eventsPath, { encoding: "utf-8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    const results = [];
    let matchedCount = 0;
    const offset = typeof filter?.offset === "number" ? filter.offset : 0;
    const limit = typeof filter?.limit === "number" ? filter.limit : Infinity;
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let e;
      try {
        e = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (filter) {
        if (filter.category && e.category !== filter.category) continue;
        if (filter.type && e.type !== filter.type) continue;
        if (typeof filter.fromTimestamp === "number" && e.timestamp < filter.fromTimestamp) continue;
        if (typeof filter.toTimestamp === "number" && e.timestamp > filter.toTimestamp) continue;
        if (typeof filter.fromSequence === "number" && e.sequence < filter.fromSequence) continue;
        if (typeof filter.toSequence === "number" && e.sequence > filter.toSequence) continue;
        if (typeof filter.targetNodeId === "number" && e.targetNodeId !== filter.targetNodeId) continue;
        if (filter.targetSelector && e.targetSelector && !e.targetSelector.includes(filter.targetSelector)) continue;
        if (filter.searchQuery) {
          const query = filter.searchQuery.toLowerCase();
          const strPayload = JSON.stringify(e.payload || {}).toLowerCase();
          if (!strPayload.includes(query) && !e.type.toLowerCase().includes(query)) {
            continue;
          }
        }
      }
      matchedCount++;
      if (matchedCount <= offset) {
        continue;
      }
      results.push(e);
      if (results.length >= limit) {
        rl.close();
        fileStream.destroy();
        break;
      }
    }
    return results;
  }
  async getEventCount(sessionId) {
    const dir = path.join(this.baseDir, sessionId);
    const eventsPath = path.join(dir, "events.jsonl");
    if (!fs.existsSync(eventsPath)) return 0;
    const fileStream = fs.createReadStream(eventsPath, { encoding: "utf-8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    let count = 0;
    for await (const line of rl) {
      if (line.trim()) count++;
    }
    return count;
  }
  async saveCheckpoint(checkpoint) {
    const dir = this.getSessionDir(checkpoint.sessionId);
    const chkDir = path.join(dir, "checkpoints");
    if (!fs.existsSync(chkDir)) fs.mkdirSync(chkDir, { recursive: true });
    const file = path.join(chkDir, `${checkpoint.checkpointId}.json`);
    fs.writeFileSync(file, JSON.stringify(checkpoint, null, 2), "utf-8");
  }
  async getCheckpoints(sessionId) {
    const dir = path.join(this.baseDir, sessionId, "checkpoints");
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    const checkpoints = [];
    for (const f of files) {
      try {
        const data = fs.readFileSync(path.join(dir, f), "utf-8");
        checkpoints.push(JSON.parse(data));
      } catch {
      }
    }
    return checkpoints.sort((a, b) => a.sequence - b.sequence);
  }
  async saveInitialSnapshot(sessionId, snapshot) {
    const dir = this.getSessionDir(sessionId);
    const file = path.join(dir, "initial_snapshot.json");
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf-8");
  }
  async getInitialSnapshot(sessionId) {
    const dir = path.join(this.baseDir, sessionId);
    const file = path.join(dir, "initial_snapshot.json");
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
      return null;
    }
  }
  async addAnnotation(annotation) {
    const dir = this.getSessionDir(annotation.sessionId);
    const annPath = path.join(dir, "annotations.json");
    let list = [];
    if (fs.existsSync(annPath)) {
      try {
        list = JSON.parse(fs.readFileSync(annPath, "utf-8"));
      } catch {
        list = [];
      }
    }
    list.push(annotation);
    fs.writeFileSync(annPath, JSON.stringify(list, null, 2), "utf-8");
  }
  async getAnnotations(sessionId) {
    const dir = path.join(this.baseDir, sessionId);
    const annPath = path.join(dir, "annotations.json");
    if (!fs.existsSync(annPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(annPath, "utf-8"));
    } catch {
      return [];
    }
  }
}
class CheckpointManager {
  checkpoints = [];
  constructor(initialCheckpoints = []) {
    this.checkpoints = [...initialCheckpoints].sort((a, b) => a.sequence - b.sequence);
  }
  addCheckpoint(checkpoint) {
    this.checkpoints.push(checkpoint);
    this.checkpoints.sort((a, b) => a.sequence - b.sequence);
  }
  getCheckpoints() {
    return this.checkpoints;
  }
  getCheckpointCount() {
    return this.checkpoints.length;
  }
  getCheckpoint(checkpointId) {
    return this.checkpoints.find((c) => c.checkpointId === checkpointId);
  }
  findNearestCheckpoint(target) {
    if (this.checkpoints.length === 0) return null;
    if (typeof target.sequence === "number") {
      const targetSeq = target.sequence;
      let best = this.checkpoints[0];
      for (let i = 0; i < this.checkpoints.length; i++) {
        const cp = this.checkpoints[i];
        if (cp.sequence <= targetSeq) {
          best = cp;
        } else {
          break;
        }
      }
      return best;
    }
    if (typeof target.timestamp === "number") {
      const targetTime = target.timestamp;
      let best = this.checkpoints[0];
      for (let i = 0; i < this.checkpoints.length; i++) {
        const cp = this.checkpoints[i];
        if (cp.timestamp <= targetTime) {
          best = cp;
        } else {
          break;
        }
      }
      return best;
    }
    return this.checkpoints[0] || null;
  }
  clear() {
    this.checkpoints = [];
  }
}
var VirtualDOMNodeType = /* @__PURE__ */ ((VirtualDOMNodeType2) => {
  VirtualDOMNodeType2[VirtualDOMNodeType2["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
  VirtualDOMNodeType2[VirtualDOMNodeType2["ATTRIBUTE_NODE"] = 2] = "ATTRIBUTE_NODE";
  VirtualDOMNodeType2[VirtualDOMNodeType2["TEXT_NODE"] = 3] = "TEXT_NODE";
  VirtualDOMNodeType2[VirtualDOMNodeType2["CDATA_SECTION_NODE"] = 4] = "CDATA_SECTION_NODE";
  VirtualDOMNodeType2[VirtualDOMNodeType2["PROCESSING_INSTRUCTION_NODE"] = 7] = "PROCESSING_INSTRUCTION_NODE";
  VirtualDOMNodeType2[VirtualDOMNodeType2["COMMENT_NODE"] = 8] = "COMMENT_NODE";
  VirtualDOMNodeType2[VirtualDOMNodeType2["DOCUMENT_NODE"] = 9] = "DOCUMENT_NODE";
  VirtualDOMNodeType2[VirtualDOMNodeType2["DOCUMENT_TYPE_NODE"] = 10] = "DOCUMENT_TYPE_NODE";
  VirtualDOMNodeType2[VirtualDOMNodeType2["DOCUMENT_FRAGMENT_NODE"] = 11] = "DOCUMENT_FRAGMENT_NODE";
  return VirtualDOMNodeType2;
})(VirtualDOMNodeType || {});
class VirtualTreeBuilder {
  nodes = {};
  rootId;
  constructor(initialNodes = {}, rootId = 1) {
    this.rootId = rootId;
    this.loadFromNodes(initialNodes);
  }
  getRootId() {
    return this.rootId;
  }
  setRootId(rootId) {
    this.rootId = rootId;
  }
  getNodes() {
    return this.nodes;
  }
  getNode(id) {
    return this.nodes[id];
  }
  hasNode(id) {
    return !!this.nodes[id];
  }
  loadFromNodes(sourceNodes) {
    this.nodes = {};
    for (const [key, node] of Object.entries(sourceNodes)) {
      const id = Number(key);
      this.nodes[id] = {
        ...node,
        attributes: node.attributes ? { ...node.attributes } : {},
        children: node.children ? [...node.children] : [],
        computedStyles: node.computedStyles ? { ...node.computedStyles } : void 0,
        boundingClientRect: node.boundingClientRect ? { ...node.boundingClientRect } : void 0
      };
    }
  }
  clone() {
    const cloned = new VirtualTreeBuilder({}, this.rootId);
    cloned.loadFromNodes(this.nodes);
    return cloned;
  }
  applyAdd(payload) {
    const node = payload.node;
    if (!node) return;
    this.addNodeRecursive(node);
    const parentId = payload.parentId;
    if (parentId && this.nodes[parentId]) {
      const parent = this.nodes[parentId];
      if (!parent.children) parent.children = [];
      node.parentId = parentId;
      const existingIdx = parent.children.indexOf(node.id);
      if (existingIdx !== -1) {
        parent.children.splice(existingIdx, 1);
      }
      if (payload.previousSiblingId && this.nodes[payload.previousSiblingId]) {
        const prevIdx = parent.children.indexOf(payload.previousSiblingId);
        if (prevIdx !== -1) {
          parent.children.splice(prevIdx + 1, 0, node.id);
          return;
        }
      }
      if (payload.nextSiblingId && this.nodes[payload.nextSiblingId]) {
        const nextIdx = parent.children.indexOf(payload.nextSiblingId);
        if (nextIdx !== -1) {
          parent.children.splice(nextIdx, 0, node.id);
          return;
        }
      }
      if (typeof payload.index === "number" && payload.index >= 0 && payload.index <= parent.children.length) {
        parent.children.splice(payload.index, 0, node.id);
      } else {
        parent.children.push(node.id);
      }
    }
  }
  applyRemove(payload) {
    const nodeId = payload.nodeId;
    const node = this.nodes[nodeId];
    if (!node) return;
    const parentId = payload.parentId || node.parentId;
    if (parentId && this.nodes[parentId]) {
      const parent = this.nodes[parentId];
      if (parent.children) {
        const idx = parent.children.indexOf(nodeId);
        if (idx !== -1) {
          parent.children.splice(idx, 1);
        }
      }
    }
    this.markSubtreeDetached(nodeId);
    node.parentId = null;
  }
  markSubtreeDetached(nodeId) {
    const node = this.nodes[nodeId];
    if (!node) return;
    node.isDetached = true;
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        this.markSubtreeDetached(childId);
      }
    }
  }
  applyMove(payload) {
    const node = this.nodes[payload.nodeId];
    if (!node) return;
    const oldParentId = payload.oldParentId || node.parentId;
    if (oldParentId && this.nodes[oldParentId]) {
      const oldParent = this.nodes[oldParentId];
      if (oldParent.children) {
        const idx = oldParent.children.indexOf(payload.nodeId);
        if (idx !== -1) {
          oldParent.children.splice(idx, 1);
        }
      }
    }
    const newParentId = payload.newParentId;
    if (newParentId && this.nodes[newParentId]) {
      const newParent = this.nodes[newParentId];
      if (!newParent.children) newParent.children = [];
      node.parentId = newParentId;
      node.isDetached = false;
      if (typeof payload.newIndex === "number" && payload.newIndex >= 0 && payload.newIndex <= newParent.children.length) {
        newParent.children.splice(payload.newIndex, 0, payload.nodeId);
      } else {
        newParent.children.push(payload.nodeId);
      }
    }
  }
  applyAttrChange(payload) {
    const node = this.nodes[payload.nodeId];
    if (!node) return;
    if (!node.attributes) {
      node.attributes = {};
    }
    if (payload.newValue === null) {
      delete node.attributes[payload.attributeName];
    } else {
      node.attributes[payload.attributeName] = payload.newValue;
    }
    if (payload.attributeName.toLowerCase() === "class") {
      const classVal = payload.newValue || "";
      if (/\b(hidden|hide|d-none|invisible|sr-only|collapsed)\b/i.test(classVal)) {
        node.isHidden = true;
      }
    } else if (payload.attributeName.toLowerCase() === "style") {
      const styleVal = payload.newValue || "";
      if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(styleVal)) {
        node.isHidden = true;
      }
    }
  }
  applyTextChange(payload) {
    const node = this.nodes[payload.nodeId];
    if (!node) return;
    node.textContent = payload.newText;
  }
  addNodeRecursive(node) {
    this.nodes[node.id] = {
      ...node,
      attributes: node.attributes ? { ...node.attributes } : {},
      children: node.children ? [...node.children] : [],
      isDetached: false
    };
  }
  toHTML(nodeId = this.rootId, indent = 0) {
    const node = this.nodes[nodeId];
    if (!node) return "";
    const spacing = "  ".repeat(indent);
    if (node.nodeType === VirtualDOMNodeType.DOCUMENT_NODE) {
      return (node.children || []).map((c) => this.toHTML(c, indent)).join("\n");
    }
    if (node.nodeType === VirtualDOMNodeType.DOCUMENT_TYPE_NODE) {
      return `<!DOCTYPE ${node.tagName || "html"}>`;
    }
    if (node.isShadowRoot || node.nodeType === VirtualDOMNodeType.DOCUMENT_FRAGMENT_NODE) {
      const mode = node.shadowMode || "open";
      const inner = (node.children || []).map((c) => this.toHTML(c, indent + 1)).join("\n");
      return `${spacing}<template shadowrootmode="${mode}">
${inner}
${spacing}</template>`;
    }
    if (node.nodeType === VirtualDOMNodeType.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType === VirtualDOMNodeType.COMMENT_NODE) {
      return `${spacing}<!-- ${node.textContent || ""} -->`;
    }
    if (node.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
      const tag = node.tagName || "div";
      const attrs = Object.entries(node.attributes || {}).map(([k, v]) => `${k}="${this.escapeHtmlAttr(v)}"`).join(" ");
      const attrStr = attrs.length > 0 ? ` ${attrs}` : "";
      const isSelfClosing = ["img", "br", "hr", "input", "meta", "link"].includes(tag);
      if (isSelfClosing) {
        return `${spacing}<${tag}${attrStr} />`;
      }
      const children = node.children || [];
      if (children.length === 0) {
        if (node.textContent) {
          return `${spacing}<${tag}${attrStr}>${this.escapeHtmlText(node.textContent)}</${tag}>`;
        }
        return `${spacing}<${tag}${attrStr}></${tag}>`;
      }
      if (children.length === 1 && this.nodes[children[0]]?.nodeType === VirtualDOMNodeType.TEXT_NODE) {
        const text = this.nodes[children[0]].textContent || "";
        return `${spacing}<${tag}${attrStr}>${this.escapeHtmlText(text)}</${tag}>`;
      }
      const inner = children.map((c) => this.toHTML(c, indent + 1)).join("\n");
      return `${spacing}<${tag}${attrStr}>
${inner}
${spacing}</${tag}>`;
    }
    return "";
  }
  escapeHtmlAttr(str) {
    return str.replace(/"/g, "&quot;");
  }
  escapeHtmlText(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
class StateReconstructor {
  checkpointManager;
  events = [];
  cache = /* @__PURE__ */ new Map();
  maxCacheSize = 50;
  constructor(checkpoints = [], events = []) {
    this.checkpointManager = new CheckpointManager(checkpoints);
    this.events = [...events].sort((a, b) => a.sequence - b.sequence);
  }
  setCheckpoints(checkpoints) {
    this.checkpointManager = new CheckpointManager(checkpoints);
    this.cache.clear();
  }
  setEvents(events) {
    this.events = [...events].sort((a, b) => a.sequence - b.sequence);
    this.cache.clear();
  }
  addEvent(event) {
    this.events.push(event);
    this.cache.clear();
  }
  addCheckpoint(checkpoint) {
    this.checkpointManager.addCheckpoint(checkpoint);
    this.cache.clear();
  }
  getStateAt(target) {
    let targetSequence = target.sequence;
    let targetTimestamp = target.timestamp;
    if (target.eventId) {
      const foundEvt = this.events.find((e) => e.id === target.eventId);
      if (foundEvt) {
        targetSequence = foundEvt.sequence;
        targetTimestamp = foundEvt.timestamp;
      }
    }
    if (typeof targetSequence !== "number" && typeof targetTimestamp === "number") {
      const eventsBefore = this.events.filter((e) => e.timestamp <= targetTimestamp);
      targetSequence = eventsBefore.length > 0 ? eventsBefore[eventsBefore.length - 1].sequence : 0;
    }
    const effectiveSequence = targetSequence || 0;
    if (this.cache.has(effectiveSequence)) {
      return this.cache.get(effectiveSequence);
    }
    const checkpoint = this.checkpointManager.findNearestCheckpoint({ sequence: effectiveSequence });
    if (!checkpoint) {
      return {
        snapshotId: "snap_empty",
        sessionId: "",
        timestamp: 0,
        sequence: 0,
        rootId: 1,
        nodes: {
          1: { id: 1, nodeType: 9, tagName: "#document", children: [], parentId: null }
        },
        title: "",
        url: "",
        origin: "",
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
        totalNodeCount: 1
      };
    }
    const treeBuilder = new VirtualTreeBuilder(checkpoint.snapshot.nodes, checkpoint.snapshot.rootId);
    const deltaEvents = this.events.filter(
      (e) => e.sequence > checkpoint.sequence && e.sequence <= effectiveSequence
    );
    let currentUrl = checkpoint.snapshot.url;
    let currentTitle = checkpoint.snapshot.title;
    for (let i = 0; i < deltaEvents.length; i++) {
      const evt = deltaEvents[i];
      switch (evt.type) {
        case "DOM_MUTATION_ADD":
          treeBuilder.applyAdd(evt.payload);
          break;
        case "DOM_MUTATION_REMOVE":
          treeBuilder.applyRemove(evt.payload);
          break;
        case "DOM_MUTATION_MOVE":
          treeBuilder.applyMove(evt.payload);
          break;
        case "DOM_MUTATION_ATTR":
          treeBuilder.applyAttrChange(evt.payload);
          break;
        case "DOM_MUTATION_TEXT":
          treeBuilder.applyTextChange(evt.payload);
          break;
        case "NAV_PUSH_STATE":
        case "NAV_REPLACE_STATE":
        case "NAV_POPSTATE":
        case "NAV_HASHCHANGE":
          if (evt.payload.url) currentUrl = evt.payload.url;
          if (evt.payload.title) currentTitle = evt.payload.title;
          break;
      }
    }
    const reconstructedNodes = treeBuilder.getNodes();
    const activeNodesCount = Object.values(reconstructedNodes).filter((n) => !n.isDetached).length;
    const resultSnapshot = {
      snapshotId: `recon_${effectiveSequence}_${Date.now()}`,
      sessionId: checkpoint.sessionId,
      timestamp: targetTimestamp ?? checkpoint.timestamp,
      sequence: effectiveSequence,
      rootId: treeBuilder.getRootId(),
      nodes: reconstructedNodes,
      title: currentTitle,
      url: currentUrl,
      origin: checkpoint.snapshot.origin,
      viewport: { ...checkpoint.snapshot.viewport },
      doctype: checkpoint.snapshot.doctype,
      totalNodeCount: activeNodesCount
    };
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== void 0) this.cache.delete(firstKey);
    }
    this.cache.set(effectiveSequence, resultSnapshot);
    return resultSnapshot;
  }
  getStateAround(timestamp, windowMs = 200) {
    const tBefore = Math.max(0, timestamp - windowMs);
    const tAfter = timestamp + windowMs;
    return {
      stateBefore: this.getStateAt({ timestamp: tBefore }),
      stateTarget: this.getStateAt({ timestamp }),
      stateAfter: this.getStateAt({ timestamp: tAfter })
    };
  }
}
class VirtualQueryEngine {
  static matches(node, selector) {
    if (!node || node.nodeType !== VirtualDOMNodeType.ELEMENT_NODE) {
      return false;
    }
    const trimmed = selector.trim();
    if (!trimmed) return false;
    if (trimmed.includes(",")) {
      return trimmed.split(",").some((s) => this.matchesSimple(node, s.trim()));
    }
    return this.matchesCompound(node, trimmed);
  }
  static querySelector(selector, rootId, nodes) {
    const all = this.querySelectorAll(selector, rootId, nodes, 1);
    return all.length > 0 ? all[0] : null;
  }
  static querySelectorAll(selector, rootId, nodes, limit = Infinity) {
    const results = [];
    const root = nodes[rootId];
    if (!root) return results;
    const queue = [...root.children || []];
    const visited = /* @__PURE__ */ new Set();
    while (queue.length > 0 && results.length < limit) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const currentNode = nodes[currentId];
      if (!currentNode || currentNode.isDetached) continue;
      if (currentNode.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
        if (this.matches(currentNode, selector)) {
          results.push(currentNode);
          if (results.length >= limit) break;
        }
      }
      if (currentNode.children && currentNode.children.length > 0) {
        queue.push(...currentNode.children);
      }
    }
    return results;
  }
  static getElementById(id, nodes) {
    for (const node of Object.values(nodes)) {
      if (node.nodeType === VirtualDOMNodeType.ELEMENT_NODE && !node.isDetached && node.attributes && node.attributes["id"] === id && this.isNodeConnected(node, nodes)) {
        return node;
      }
    }
    return null;
  }
  static isNodeConnected(node, nodes) {
    if (node.isDetached) return false;
    let curr = node;
    const visited = /* @__PURE__ */ new Set();
    while (curr && curr.parentId) {
      if (visited.has(curr.id)) return false;
      visited.add(curr.id);
      const parent = nodes[curr.parentId];
      if (!parent || parent.isDetached) return false;
      curr = parent;
    }
    return true;
  }
  static computeSelector(node, nodes) {
    if (!node) return "";
    if (node.nodeType !== VirtualDOMNodeType.ELEMENT_NODE) {
      return node.tagName || `#node-${node.id}`;
    }
    if (node.attributes?.["id"]) {
      return `#${node.attributes["id"]}`;
    }
    const tagName = node.tagName || "div";
    const classes = (node.attributes?.["class"] || "").split(/\s+/).filter((c) => c && !c.startsWith("ng-")).slice(0, 2);
    const classStr = classes.length > 0 ? "." + classes.join(".") : "";
    if (node.parentId && nodes[node.parentId]) {
      const parent = nodes[node.parentId];
      const siblings = (parent.children || []).map((cId) => nodes[cId]).filter((c) => c && c.nodeType === VirtualDOMNodeType.ELEMENT_NODE && c.tagName === tagName);
      if (siblings.length > 1) {
        const index = siblings.findIndex((s) => s.id === node.id) + 1;
        return `${tagName}${classStr}:nth-of-type(${index})`;
      }
    }
    return `${tagName}${classStr}`;
  }
  static matchesCompound(node, selector) {
    return this.matchesSimple(node, selector);
  }
  static matchesSimple(node, selector) {
    const tagName = node.tagName?.toLowerCase() || "";
    if (selector === "*") return true;
    if (selector.startsWith("#")) {
      const targetId = selector.substring(1);
      return node.attributes?.["id"] === targetId;
    }
    if (selector.startsWith(".")) {
      const targetClass = selector.substring(1);
      const classes = (node.attributes?.["class"] || "").split(/\s+/);
      return classes.includes(targetClass);
    }
    if (selector.startsWith("[") && selector.endsWith("]")) {
      const inner = selector.substring(1, selector.length - 1);
      if (inner.includes("=")) {
        const [attrName, rawVal] = inner.split("=");
        const expectedVal = rawVal.replace(/^["']|["']$/g, "");
        return node.attributes?.[attrName.trim()] === expectedVal;
      }
      return !!node.attributes?.[inner.trim()];
    }
    const tagMatch = selector.match(/^([a-zA-Z0-9_-]+)(.*)$/);
    if (tagMatch) {
      const expectedTag = tagMatch[1].toLowerCase();
      const rest = tagMatch[2];
      if (expectedTag !== tagName && expectedTag !== "*") {
        return false;
      }
      if (!rest) return true;
      if (rest.startsWith("#")) {
        return node.attributes?.["id"] === rest.substring(1);
      }
      if (rest.startsWith(".")) {
        const classes = (node.attributes?.["class"] || "").split(/\s+/);
        return classes.includes(rest.substring(1));
      }
      if (rest.startsWith("[")) {
        return this.matchesSimple(node, rest);
      }
    }
    return false;
  }
}
class DOMDiffEngine {
  static diff(s1, s2) {
    const addedNodes = [];
    const removedNodes = [];
    const movedNodes = [];
    const changedAttributes = [];
    const changedClasses = [];
    const changedStyles = [];
    const changedText = [];
    const nodes1 = s1.nodes;
    const nodes2 = s2.nodes;
    const ids1 = new Set(
      Object.values(nodes1).filter((n) => !n.isDetached).map((n) => n.id)
    );
    const ids2 = new Set(
      Object.values(nodes2).filter((n) => !n.isDetached).map((n) => n.id)
    );
    for (const id of ids2) {
      if (!ids1.has(id)) {
        const node2 = nodes2[id];
        if (node2) {
          const selector = VirtualQueryEngine.computeSelector(node2, nodes2);
          addedNodes.push({
            id,
            tagName: node2.tagName,
            parentId: node2.parentId,
            attributes: node2.attributes,
            textContent: node2.textContent,
            selector,
            htmlSnippet: this.renderNodeSnippet(node2),
            node: node2
          });
        }
      }
    }
    for (const id of ids1) {
      if (!ids2.has(id)) {
        const node1 = nodes1[id];
        if (node1) {
          const selector = VirtualQueryEngine.computeSelector(node1, nodes1);
          removedNodes.push({
            id,
            tagName: node1.tagName,
            lastKnownParentId: node1.parentId,
            selector,
            attributes: node1.attributes,
            textContent: node1.textContent
          });
        }
      }
    }
    for (const id of ids1) {
      if (!ids2.has(id)) continue;
      const node1 = nodes1[id];
      const node2 = nodes2[id];
      if (!node1 || !node2) continue;
      const selector = VirtualQueryEngine.computeSelector(node2, nodes2);
      if (node1.parentId !== node2.parentId) {
        const p1 = node1.parentId ? nodes1[node1.parentId] : null;
        const p2 = node2.parentId ? nodes2[node2.parentId] : null;
        const oldIndex = p1 && p1.children ? p1.children.indexOf(id) : -1;
        const newIndex = p2 && p2.children ? p2.children.indexOf(id) : -1;
        movedNodes.push({
          id,
          tagName: node2.tagName,
          oldParentId: node1.parentId,
          newParentId: node2.parentId,
          oldIndex,
          newIndex,
          selector
        });
      }
      if (node1.nodeType === VirtualDOMNodeType.TEXT_NODE) {
        if ((node1.textContent || "") !== (node2.textContent || "")) {
          const parentNode = node2.parentId ? nodes2[node2.parentId] : void 0;
          changedText.push({
            nodeId: id,
            parentId: node2.parentId,
            parentSelector: parentNode ? VirtualQueryEngine.computeSelector(parentNode, nodes2) : void 0,
            oldText: node1.textContent || "",
            newText: node2.textContent || ""
          });
        }
      }
      if (node1.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
        const attrs1 = node1.attributes || {};
        const attrs2 = node2.attributes || {};
        const allAttrNames = /* @__PURE__ */ new Set([...Object.keys(attrs1), ...Object.keys(attrs2)]);
        for (const attrName of allAttrNames) {
          const val1 = attrs1[attrName] ?? null;
          const val2 = attrs2[attrName] ?? null;
          if (val1 !== val2) {
            changedAttributes.push({
              nodeId: id,
              tagName: node2.tagName,
              attributeName: attrName,
              oldValue: val1,
              newValue: val2,
              selector
            });
            if (attrName.toLowerCase() === "class") {
              const classes1 = (val1 || "").split(/\s+/).filter(Boolean);
              const classes2 = (val2 || "").split(/\s+/).filter(Boolean);
              const addedClasses = classes2.filter((c) => !classes1.includes(c));
              const removedClasses = classes1.filter((c) => !classes2.includes(c));
              if (addedClasses.length > 0 || removedClasses.length > 0) {
                changedClasses.push({
                  nodeId: id,
                  tagName: node2.tagName,
                  addedClasses,
                  removedClasses,
                  oldClassString: val1 || "",
                  newClassString: val2 || "",
                  selector
                });
              }
            }
            if (attrName.toLowerCase() === "style") {
              this.diffInlineStyles(id, node2.tagName, val1, val2, selector, changedStyles);
            }
          }
        }
      }
    }
    const hasStructuralChanges = addedNodes.length > 0 || removedNodes.length > 0 || movedNodes.length > 0;
    const hasVisibilityChanges = changedClasses.some(
      (c) => [...c.addedClasses, ...c.removedClasses].some(
        (cls) => /\b(hidden|hide|d-none|invisible|visible|show)\b/i.test(cls)
      )
    ) || changedStyles.some(
      (s) => ["display", "visibility", "opacity"].includes(s.propertyName.toLowerCase())
    );
    const totalChanges = addedNodes.length + removedNodes.length + movedNodes.length + changedAttributes.length + changedText.length;
    const summary = {
      addedNodesCount: addedNodes.length,
      removedNodesCount: removedNodes.length,
      movedNodesCount: movedNodes.length,
      attributeChangesCount: changedAttributes.length,
      classChangesCount: changedClasses.length,
      styleChangesCount: changedStyles.length,
      textChangesCount: changedText.length,
      totalChanges,
      hasStructuralChanges,
      hasVisibilityChanges
    };
    return {
      t1: {
        timestamp: s1.timestamp,
        sequence: s1.sequence,
        eventId: s1.snapshotId,
        nodeCount: s1.totalNodeCount
      },
      t2: {
        timestamp: s2.timestamp,
        sequence: s2.sequence,
        eventId: s2.snapshotId,
        nodeCount: s2.totalNodeCount
      },
      addedNodes,
      removedNodes,
      movedNodes,
      changedAttributes,
      changedClasses,
      changedStyles,
      changedText,
      summary
    };
  }
  static diffInlineStyles(nodeId, tagName, style1, style2, selector, acc) {
    const parse = (s) => {
      const res = {};
      if (!s) return res;
      s.split(";").forEach((part) => {
        const [k, v] = part.split(":");
        if (k && v) res[k.trim().toLowerCase()] = v.trim();
      });
      return res;
    };
    const p1 = parse(style1);
    const p2 = parse(style2);
    const props = /* @__PURE__ */ new Set([...Object.keys(p1), ...Object.keys(p2)]);
    for (const prop of props) {
      const v1 = p1[prop] ?? null;
      const v2 = p2[prop] ?? null;
      if (v1 !== v2) {
        acc.push({
          nodeId,
          tagName,
          propertyName: prop,
          oldValue: v1,
          newValue: v2,
          selector
        });
      }
    }
  }
  static renderNodeSnippet(node) {
    if (node.nodeType === VirtualDOMNodeType.TEXT_NODE) {
      return `"${node.textContent || ""}"`;
    }
    const tag = node.tagName || "element";
    const attrs = Object.entries(node.attributes || {}).slice(0, 3).map(([k, v]) => `${k}="${v}"`).join(" ");
    const attrStr = attrs ? ` ${attrs}` : "";
    return `<${tag}${attrStr}>`;
  }
}
class DiffFormatter {
  static formatMarkdown(diff) {
    const lines = [];
    lines.push(`### DOM Structural Diff: T1 (${diff.t1.timestamp.toFixed(1)}ms) → T2 (${diff.t2.timestamp.toFixed(1)}ms)`);
    lines.push(`- **Summary**: Total Changes: ${diff.summary.totalChanges} (Added: ${diff.summary.addedNodesCount}, Removed: ${diff.summary.removedNodesCount}, Moved: ${diff.summary.movedNodesCount}, Attr Changes: ${diff.summary.attributeChangesCount}, Class Changes: ${diff.summary.classChangesCount}, Text Changes: ${diff.summary.textChangesCount})`);
    lines.push(`- **Structural Shift**: ${diff.summary.hasStructuralChanges ? "YES" : "NO"}`);
    lines.push(`- **Visibility Impact**: ${diff.summary.hasVisibilityChanges ? "YES" : "NO"}`);
    lines.push("");
    if (diff.addedNodes.length > 0) {
      lines.push("#### ➕ Added Nodes");
      for (const node of diff.addedNodes) {
        lines.push(`- **[ID: ${node.id}]** \`${node.selector}\` — ${node.htmlSnippet}`);
      }
      lines.push("");
    }
    if (diff.removedNodes.length > 0) {
      lines.push("#### ➖ Removed Nodes");
      for (const node of diff.removedNodes) {
        lines.push(`- **[ID: ${node.id}]** \`${node.selector}\` (Parent ID: ${node.lastKnownParentId ?? "none"})`);
      }
      lines.push("");
    }
    if (diff.movedNodes.length > 0) {
      lines.push("#### 🔄 Moved / Reparented Nodes");
      for (const node of diff.movedNodes) {
        lines.push(`- **[ID: ${node.id}]** \`${node.selector}\`: Parent ${node.oldParentId} (idx: ${node.oldIndex}) → Parent ${node.newParentId} (idx: ${node.newIndex})`);
      }
      lines.push("");
    }
    if (diff.changedClasses.length > 0) {
      lines.push("#### 🏷️ Class Modifications");
      for (const cl of diff.changedClasses) {
        const added = cl.addedClasses.length > 0 ? ` +[${cl.addedClasses.join(", ")}]` : "";
        const removed = cl.removedClasses.length > 0 ? ` -[${cl.removedClasses.join(", ")}]` : "";
        lines.push(`- **[ID: ${cl.nodeId}]** \`${cl.selector}\`:${added}${removed}`);
      }
      lines.push("");
    }
    if (diff.changedStyles.length > 0) {
      lines.push("#### 🎨 Style Modifications");
      for (const st of diff.changedStyles) {
        lines.push(`- **[ID: ${st.nodeId}]** \`${st.selector}\`: \`${st.propertyName}\`: "${st.oldValue ?? ""}" → "${st.newValue ?? ""}"`);
      }
      lines.push("");
    }
    if (diff.changedAttributes.length > 0) {
      lines.push("#### 📝 Attribute Modifications");
      for (const at of diff.changedAttributes) {
        if (at.attributeName.toLowerCase() !== "class" && at.attributeName.toLowerCase() !== "style") {
          lines.push(`- **[ID: ${at.nodeId}]** \`${at.selector}\`: \`${at.attributeName}\`: "${at.oldValue ?? ""}" → "${at.newValue ?? ""}"`);
        }
      }
      lines.push("");
    }
    if (diff.changedText.length > 0) {
      lines.push("#### 🔤 Text Modifications");
      for (const tx of diff.changedText) {
        lines.push(`- **[ID: ${tx.nodeId}]** (Parent: \`${tx.parentSelector ?? ""}\`): "${tx.oldText}" → "${tx.newText}"`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }
}
class LifecycleTracer {
  static traceElement(target, events, initialSnapshot) {
    const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);
    let targetId = target.nodeId;
    let tagName = "unknown";
    let selectorHint = target.selector || "";
    let initialAttrs = {};
    let createdAt = 0;
    let createdSequence = 0;
    let createdEventId = "init";
    if (!targetId && target.selector && initialSnapshot) {
      const match = VirtualQueryEngine.querySelector(target.selector, initialSnapshot.rootId, initialSnapshot.nodes);
      if (match) {
        targetId = match.id;
        tagName = match.tagName || "element";
        initialAttrs = { ...match.attributes || {} };
        selectorHint = target.selector;
      }
    }
    if (!targetId && target.selector) {
      for (const evt of sortedEvents) {
        if (evt.type === "DOM_MUTATION_ADD") {
          const payload = evt.payload;
          if (payload.node && VirtualQueryEngine.matches(payload.node, target.selector)) {
            targetId = payload.node.id;
            tagName = payload.node.tagName || "element";
            initialAttrs = { ...payload.node.attributes || {} };
            createdAt = evt.timestamp;
            createdSequence = evt.sequence;
            createdEventId = evt.id;
            break;
          }
        }
      }
    }
    if (!targetId) {
      return null;
    }
    const entries = [];
    let isCurrentlyAlive = true;
    let removedAt = null;
    let removedSequence = null;
    let removedEventId = void 0;
    let mutationCount = 0;
    if (initialSnapshot && initialSnapshot.nodes[targetId]) {
      const node = initialSnapshot.nodes[targetId];
      tagName = node.tagName || tagName;
      initialAttrs = { ...node.attributes || {} };
      if (!selectorHint) {
        selectorHint = VirtualQueryEngine.computeSelector(node, initialSnapshot.nodes);
      }
      entries.push({
        timestamp: initialSnapshot.timestamp,
        sequence: initialSnapshot.sequence,
        wallClockTime: Date.now(),
        stage: "CREATED",
        eventId: initialSnapshot.snapshotId,
        eventType: "DOM_SNAPSHOT",
        description: `Element <${tagName}> existed in initial baseline snapshot [ID: ${targetId}]`,
        details: { initialParentId: node.parentId, attributes: initialAttrs },
        nodeSnapshot: node
      });
    }
    const parentMap = /* @__PURE__ */ new Map();
    if (initialSnapshot) {
      for (const [idStr, node] of Object.entries(initialSnapshot.nodes)) {
        parentMap.set(Number(idStr), node.parentId ?? null);
      }
    }
    const isAncestor = (ancestorId, childId) => {
      let curr = parentMap.get(childId);
      const visited = /* @__PURE__ */ new Set();
      while (curr && !visited.has(curr)) {
        if (curr === ancestorId) return true;
        visited.add(curr);
        curr = parentMap.get(curr);
      }
      return false;
    };
    for (const evt of sortedEvents) {
      const ts = evt.timestamp;
      const seq = evt.sequence;
      const wall = evt.wallClockTime;
      if (evt.type === "DOM_MUTATION_ADD") {
        const payload = evt.payload;
        if (payload.node?.id) {
          parentMap.set(payload.node.id, payload.parentId ?? null);
        }
        if (payload.node?.id === targetId) {
          isCurrentlyAlive = true;
          tagName = payload.node.tagName || tagName;
          createdAt = ts;
          createdSequence = seq;
          createdEventId = evt.id;
          initialAttrs = { ...payload.node.attributes || {} };
          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: "ATTACHED_TO_DOM",
            eventId: evt.id,
            eventType: evt.type,
            description: `Element <${tagName}> added to DOM under parent ID ${payload.parentId}`,
            details: { parentId: payload.parentId, index: payload.index },
            nodeSnapshot: payload.node
          });
        }
      }
      if (evt.type === "DOM_MUTATION_REMOVE") {
        const payload = evt.payload;
        if (payload.nodeId === targetId) {
          isCurrentlyAlive = false;
          removedAt = ts;
          removedSequence = seq;
          removedEventId = evt.id;
          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: "REMOVED_FROM_DOM",
            eventId: evt.id,
            eventType: evt.type,
            description: `Element <${tagName}> explicitly removed from parent ID ${payload.parentId}`,
            details: { parentId: payload.parentId, removedIndex: payload.index }
          });
        } else if (isAncestor(payload.nodeId, targetId)) {
          isCurrentlyAlive = false;
          removedAt = ts;
          removedSequence = seq;
          removedEventId = evt.id;
          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: "PARENT_SUBTREE_REPLACED",
            eventId: evt.id,
            eventType: evt.type,
            description: `Ancestor element [ID: ${payload.nodeId}] was removed, causing target element [ID: ${targetId}] to detach from DOM`,
            details: { removedAncestorId: payload.nodeId, parentId: payload.parentId }
          });
        }
      }
      if (evt.type === "DOM_MUTATION_MOVE") {
        const payload = evt.payload;
        if (payload.nodeId) {
          parentMap.set(payload.nodeId, payload.newParentId ?? null);
        }
        if (payload.nodeId === targetId) {
          mutationCount++;
          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: "REPARENTED",
            eventId: evt.id,
            eventType: evt.type,
            description: `Element reparented from parent ${payload.oldParentId} to ${payload.newParentId}`,
            details: { oldParentId: payload.oldParentId, newParentId: payload.newParentId }
          });
        }
      }
      if (evt.type === "DOM_MUTATION_ATTR") {
        const payload = evt.payload;
        if (payload.nodeId === targetId) {
          mutationCount++;
          const attr = payload.attributeName.toLowerCase();
          let stage = "ATTRIBUTE_MODIFIED";
          if (attr === "class") stage = "CLASS_MODIFIED";
          if (attr === "style") stage = "STYLE_MODIFIED";
          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage,
            eventId: evt.id,
            eventType: evt.type,
            description: `Attribute '${payload.attributeName}' changed from '${payload.oldValue ?? ""}' to '${payload.newValue ?? ""}'`,
            details: {
              attributeName: payload.attributeName,
              oldValue: payload.oldValue,
              newValue: payload.newValue
            }
          });
        }
      }
      if (evt.type === "DOM_MUTATION_TEXT") {
        const payload = evt.payload;
        if (payload.nodeId === targetId) {
          mutationCount++;
          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: "TEXT_MODIFIED",
            eventId: evt.id,
            eventType: evt.type,
            description: `Text content changed: "${payload.oldText}" → "${payload.newText}"`,
            details: { oldText: payload.oldText, newText: payload.newText }
          });
        }
      }
    }
    const criticalTime = removedAt ?? createdAt;
    const windowMs = 500;
    const correlatedDiagnostics = sortedEvents.filter(
      (e) => (e.category === "ERROR" || e.category === "CONSOLE") && Math.abs(e.timestamp - criticalTime) <= windowMs
    );
    const correlatedNetwork = sortedEvents.filter(
      (e) => e.category === "NETWORK" && Math.abs(e.timestamp - criticalTime) <= windowMs
    );
    const lastEventTime = sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1].timestamp : createdAt;
    const lifespanMs = Math.max(0, (removedAt ?? lastEventTime) - createdAt);
    return {
      targetNodeId: targetId,
      tagName,
      selectorHint,
      initialAttributes: initialAttrs,
      createdAt,
      createdSequence,
      createdEventId,
      removedAt,
      removedSequence,
      removedEventId,
      isCurrentlyAlive,
      lifespanMs: Math.round(lifespanMs * 100) / 100,
      mutationCount,
      entries,
      correlatedDiagnostics,
      correlatedNetwork
    };
  }
}
class DisappearingElementAnalyzer {
  static analyze(targetQuery, events, initialSnapshot) {
    const targetObj = typeof targetQuery === "number" ? { nodeId: targetQuery } : { selector: targetQuery };
    const trace = LifecycleTracer.traceElement(targetObj, events, initialSnapshot);
    if (!trace) {
      return {
        targetQuery,
        found: false,
        disappearanceMechanism: "UNKNOWN",
        likelyRootCause: "Target element could not be found in recording baseline or event stream",
        confidenceScore: 0,
        detailedExplanation: `No element matching "${targetQuery}" was ever created, recorded in the initial DOM snapshot, or observed in mutation events.`,
        evidentiaryTrail: [],
        precedingEvents: [],
        followingEvents: [],
        correlatedErrors: [],
        correlatedNetworkCalls: [],
        alternativeHypotheses: [
          {
            hypothesis: "Element was injected into an unmonitored isolated iframe or ShadowRoot closed mode",
            likelihood: 40,
            evidenceFor: ["Element query yielded zero matches in monitored document"],
            evidenceAgainst: ["Iframes/ShadowRoots were accessible in this session"]
          },
          {
            hypothesis: "Selector typo or timing mismatch",
            likelihood: 60,
            evidenceFor: ["Target selector did not match any recorded tag or class"],
            evidenceAgainst: []
          }
        ]
      };
    }
    const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);
    const evidentiaryTrail = [];
    const alternativeHypotheses = [];
    let mechanism = "UNKNOWN";
    let likelyRootCause = "Unknown disappearance mechanism";
    let confidenceScore = 50;
    let detailedExplanation = "";
    let disappearedAt = trace.removedAt ?? void 0;
    const removalEntry = trace.entries.find((e) => e.stage === "REMOVED_FROM_DOM");
    const parentSubtreeEntry = trace.entries.find((e) => e.stage === "PARENT_SUBTREE_REPLACED");
    const classHiddenEntry = trace.entries.find(
      (e) => e.stage === "CLASS_MODIFIED" && /\b(hidden|hide|d-none|invisible|collapsed)\b/i.test(String(e.details.newValue || ""))
    );
    const styleHiddenEntry = trace.entries.find(
      (e) => e.stage === "STYLE_MODIFIED" && /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(String(e.details.newValue || ""))
    );
    if (removalEntry) {
      mechanism = "DIRECT_NODE_REMOVAL";
      disappearedAt = removalEntry.timestamp;
      likelyRootCause = `Element [ID: ${trace.targetNodeId}] <${trace.tagName}> was directly removed from its parent [ID: ${removalEntry.details.parentId}] via DOM removeChild/replaceChild`;
      confidenceScore = 95;
      evidentiaryTrail.push({
        timestamp: removalEntry.timestamp,
        sequence: removalEntry.sequence,
        eventId: removalEntry.eventId,
        eventType: removalEntry.eventType,
        evidenceType: "DIRECT",
        description: `Direct DOM removal mutation: element detached from parent ID ${removalEntry.details.parentId}`,
        confidenceContribution: 50
      });
    } else if (parentSubtreeEntry) {
      mechanism = "PARENT_SUBTREE_REPLACED";
      disappearedAt = parentSubtreeEntry.timestamp;
      likelyRootCause = `Host framework (e.g. React/Vue re-render) destroyed and replaced Ancestor container [ID: ${parentSubtreeEntry.details.removedAncestorId}], causing injected element to be unmounted`;
      confidenceScore = 92;
      evidentiaryTrail.push({
        timestamp: parentSubtreeEntry.timestamp,
        sequence: parentSubtreeEntry.sequence,
        eventId: parentSubtreeEntry.eventId,
        eventType: parentSubtreeEntry.eventType,
        evidenceType: "DIRECT",
        description: `Ancestor container [ID: ${parentSubtreeEntry.details.removedAncestorId}] was removed, wiping out all child subtrees`,
        confidenceContribution: 50
      });
    } else if (styleHiddenEntry) {
      mechanism = "STYLE_DISPLAY_NONE";
      disappearedAt = styleHiddenEntry.timestamp;
      likelyRootCause = `Element was visually hidden by an inline style modification: "${styleHiddenEntry.details.newValue}"`;
      confidenceScore = 88;
      evidentiaryTrail.push({
        timestamp: styleHiddenEntry.timestamp,
        sequence: styleHiddenEntry.sequence,
        eventId: styleHiddenEntry.eventId,
        eventType: styleHiddenEntry.eventType,
        evidenceType: "DIRECT",
        description: `Inline style changed to "${styleHiddenEntry.details.newValue}"`,
        confidenceContribution: 45
      });
    } else if (classHiddenEntry) {
      mechanism = "CLASS_TRIGGERED_HIDDEN";
      disappearedAt = classHiddenEntry.timestamp;
      likelyRootCause = `Element was visually hidden because its CSS class list was modified to include "${classHiddenEntry.details.newValue}"`;
      confidenceScore = 85;
      evidentiaryTrail.push({
        timestamp: classHiddenEntry.timestamp,
        sequence: classHiddenEntry.sequence,
        eventId: classHiddenEntry.eventId,
        eventType: classHiddenEntry.eventType,
        evidenceType: "DIRECT",
        description: `Class list changed from "${classHiddenEntry.details.oldValue ?? ""}" to "${classHiddenEntry.details.newValue ?? ""}"`,
        confidenceContribution: 45
      });
    } else if (trace.isCurrentlyAlive) {
      mechanism = "UNKNOWN";
      likelyRootCause = `Element [ID: ${trace.targetNodeId}] is currently alive and attached to the DOM tree (no unmount mutation detected)`;
      confidenceScore = 70;
      detailedExplanation = `The element exists in the current DOM state. If it is not visible on screen, it may be clipped by viewport boundaries, z-index stacking context, or 0x0 pixel dimensions.`;
    }
    const criticalTime = disappearedAt ?? trace.createdAt;
    const windowMs = 500;
    const precedingEvents = sortedEvents.filter(
      (e) => e.timestamp >= criticalTime - windowMs && e.timestamp < criticalTime
    );
    const followingEvents = sortedEvents.filter(
      (e) => e.timestamp > criticalTime && e.timestamp <= criticalTime + windowMs
    );
    const correlatedErrors = precedingEvents.filter((e) => e.category === "ERROR");
    if (correlatedErrors.length > 0) {
      const err = correlatedErrors[0];
      const errMsg = err.payload?.message || "Unknown runtime error";
      evidentiaryTrail.push({
        timestamp: err.timestamp,
        sequence: err.sequence,
        eventId: err.id,
        eventType: err.type,
        evidenceType: "PRECEDING",
        description: `Runtime error occurred ${(criticalTime - err.timestamp).toFixed(1)}ms before disappearance: "${errMsg}"`,
        confidenceContribution: 20,
        rawEvent: err
      });
      likelyRootCause += ` (preceded by runtime error: "${errMsg}")`;
    }
    const correlatedNetworkCalls = precedingEvents.filter(
      (e) => e.type === "NETWORK_RESPONSE_COMPLETE" || e.type === "NETWORK_REQUEST_FAILED"
    );
    if (correlatedNetworkCalls.length > 0) {
      const net = correlatedNetworkCalls[0];
      const netUrl = net.payload?.url || "network request";
      evidentiaryTrail.push({
        timestamp: net.timestamp,
        sequence: net.sequence,
        eventId: net.id,
        eventType: net.type,
        evidenceType: "PRECEDING",
        description: `Network response completed ${(criticalTime - net.timestamp).toFixed(1)}ms before disappearance: ${netUrl}`,
        confidenceContribution: 15,
        rawEvent: net
      });
    }
    const navEvents = precedingEvents.filter((e) => e.category === "NAVIGATION");
    if (navEvents.length > 0) {
      const nav = navEvents[0];
      evidentiaryTrail.push({
        timestamp: nav.timestamp,
        sequence: nav.sequence,
        eventId: nav.id,
        eventType: nav.type,
        evidenceType: "PRECEDING",
        description: `Navigation event (${nav.payload?.navigationType}) occurred ${(criticalTime - nav.timestamp).toFixed(1)}ms before disappearance`,
        confidenceContribution: 25,
        rawEvent: nav
      });
      likelyRootCause += ` following SPA navigation to "${nav.payload?.url}"`;
    }
    if (!detailedExplanation) {
      detailedExplanation = [
        `Element <${trace.tagName}> (Logical ID: ${trace.targetNodeId}, selector: "${trace.selectorHint}") was created at ${trace.createdAt.toFixed(1)}ms.`,
        `It remained alive in the DOM for ${trace.lifespanMs.toFixed(1)}ms and experienced ${trace.mutationCount} mutations.`,
        `At timestamp ${criticalTime.toFixed(1)}ms, it disappeared via [${mechanism}].`,
        `Diagnosis: ${likelyRootCause}.`
      ].join(" ");
    }
    if (mechanism === "PARENT_SUBTREE_REPLACED") {
      alternativeHypotheses.push({
        hypothesis: "Direct cleanup called by extension code",
        likelihood: 25,
        evidenceFor: ["Element was unmounted shortly after creation"],
        evidenceAgainst: ["Ancestor container mutation was recorded from host page context"]
      });
      alternativeHypotheses.push({
        hypothesis: "Host single-page app route change destroyed component tree",
        likelihood: 35,
        evidenceFor: navEvents.length > 0 ? ["Preceding navigation event recorded"] : [],
        evidenceAgainst: navEvents.length === 0 ? ["No navigation events occurred in temporal window"] : []
      });
    } else if (mechanism === "DIRECT_NODE_REMOVAL") {
      alternativeHypotheses.push({
        hypothesis: "Third-party script or ad-blocker removed the injected node",
        likelihood: 30,
        evidenceFor: ["Direct node removal occurred without ancestor replacement"],
        evidenceAgainst: ["No ad-blocker signatures or extension error logs observed"]
      });
    }
    return {
      targetQuery,
      targetNodeId: trace.targetNodeId,
      found: true,
      tagName: trace.tagName,
      selectorHint: trace.selectorHint,
      createdAt: trace.createdAt,
      firstVisibleAt: trace.createdAt,
      lastKnownGoodStateAt: Math.max(0, criticalTime - 1),
      disappearedAt,
      lifespanMs: trace.lifespanMs,
      disappearanceMechanism: mechanism,
      likelyRootCause,
      confidenceScore: Math.min(99, confidenceScore),
      detailedExplanation,
      evidentiaryTrail,
      precedingEvents,
      followingEvents,
      correlatedErrors,
      correlatedNetworkCalls,
      alternativeHypotheses
    };
  }
}
const DEFAULT_PRIVACY_CONFIG = {
  maskAllInputs: false,
  maskInputTypes: ["password", "hidden", "tel", "email"],
  maskSelectors: ["[data-private]", ".private-data", ".sensitive", '[data-testid="sensitive"]'],
  blockSelectors: [".recording-blocked", "[data-recording-ignore]"],
  redactHeaders: ["authorization", "cookie", "set-cookie", "x-api-key", "proxy-authorization", "token"],
  redactQueryParams: ["token", "key", "auth", "secret", "password", "access_token", "apiKey", "bearer"],
  maxTextLength: 1e5
};
class PrivacyEngine {
  config;
  constructor(config = {}) {
    this.config = { ...DEFAULT_PRIVACY_CONFIG, ...config };
  }
  shouldBlockNode(element) {
    if (!element || !element.matches) return false;
    for (const selector of this.config.blockSelectors) {
      try {
        if (element.matches(selector) || element.closest(selector)) {
          return true;
        }
      } catch {
      }
    }
    return false;
  }
  shouldMaskText(element) {
    if (!element || !element.matches) return false;
    for (const selector of this.config.maskSelectors) {
      try {
        if (element.matches(selector) || element.closest(selector)) {
          return true;
        }
      } catch {
      }
    }
    return false;
  }
  maskValue(value, inputType, elementName) {
    if (!value) return value;
    if (this.config.maskAllInputs) {
      return "*".repeat(Math.min(value.length, 12));
    }
    if (inputType && this.config.maskInputTypes.includes(inputType.toLowerCase())) {
      return "••••••••";
    }
    if (elementName && /(password|token|secret|cvv|credit|auth|ssn)/i.test(elementName)) {
      return "••••••••";
    }
    return value;
  }
  sanitizeText(text, isMasked = false) {
    if (!text) return text;
    if (isMasked) {
      return text.replace(/[^\s\n\r\t]/g, "*");
    }
    if (text.length > this.config.maxTextLength) {
      return text.substring(0, this.config.maxTextLength) + "... [TRUNCATED]";
    }
    return text;
  }
  sanitizeHeaders(headers) {
    if (!headers) return void 0;
    const sanitized = {};
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (this.config.redactHeaders.some((h) => lowerKey.includes(h))) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  sanitizeUrl(rawUrl) {
    try {
      const url = new URL(rawUrl);
      for (const param of this.config.redactQueryParams) {
        if (url.searchParams.has(param)) {
          url.searchParams.set(param, "[REDACTED]");
        }
      }
      return url.toString();
    } catch {
      return rawUrl;
    }
  }
}
class LiveDOMInspector {
  static privacyEngine = new PrivacyEngine();
  /**
   * Inspect high-level state of the active browser page/document
   */
  static inspectPage(doc = document) {
    const win = doc.defaultView || (typeof window !== "undefined" ? window : {});
    const activeEl = doc.activeElement;
    return {
      url: win.location?.href || doc.location?.href || "",
      title: doc.title || "",
      origin: win.location?.origin || "",
      viewport: {
        width: win.innerWidth || doc.documentElement?.clientWidth || 1920,
        height: win.innerHeight || doc.documentElement?.clientHeight || 1080,
        scrollX: win.scrollX || win.pageXOffset || doc.documentElement?.scrollLeft || 0,
        scrollY: win.scrollY || win.pageYOffset || doc.documentElement?.scrollTop || 0,
        devicePixelRatio: win.devicePixelRatio || 1
      },
      documentDimensions: {
        width: Math.max(doc.body?.scrollWidth || 0, doc.documentElement?.scrollWidth || 0),
        height: Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0)
      },
      activeElement: activeEl ? {
        tag: activeEl.tagName?.toLowerCase() || "",
        selector: this.computeBestSelector(activeEl),
        text: activeEl.textContent?.slice(0, 100).trim()
      } : void 0,
      focusedElement: typeof doc.hasFocus === "function" && doc.hasFocus() && activeEl ? {
        tag: activeEl.tagName?.toLowerCase() || "",
        selector: this.computeBestSelector(activeEl)
      } : void 0,
      visibilityState: doc.visibilityState || "visible",
      readyState: doc.readyState || "complete",
      framesCount: doc.querySelectorAll ? doc.querySelectorAll("iframe, frame").length : 0
    };
  }
  /**
   * Deeply inspect a live DOM element with complete metadata, geometry, styles, and context
   */
  static inspectElement(element, registry) {
    const doc = element.ownerDocument || document;
    const win = doc.defaultView || (typeof window !== "undefined" ? window : {});
    const htmlEl = element;
    const tag = element.tagName ? element.tagName.toLowerCase() : "element";
    const classList = this.extractClasses(element);
    const { bestSelector, candidates } = this.generateSelectorCandidates(element);
    const attributes = {};
    const ariaAttributes = {};
    if (element.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (attr) {
          attributes[attr.name] = attr.value;
          if (attr.name.startsWith("aria-")) {
            ariaAttributes[attr.name] = attr.value;
          }
        }
      }
    }
    const role = element.getAttribute("role") || this.inferImplicitRole(element);
    const isMasked = this.privacyEngine.shouldMaskText(element);
    const rawText = element.textContent || "";
    const text = this.privacyEngine.sanitizeText(rawText, isMasked);
    const normalizedText = text.replace(/\s+/g, " ").trim();
    let value = void 0;
    const inputEl = element;
    if (typeof inputEl.value === "string") {
      value = this.privacyEngine.maskValue(inputEl.value, inputEl.type, inputEl.name);
    }
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
    const bounds = {
      x: rect.x ?? rect.left ?? 0,
      y: rect.y ?? rect.top ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      top: rect.top ?? 0,
      right: rect.right ?? 0,
      bottom: rect.bottom ?? 0,
      left: rect.left ?? 0
    };
    const computed = win.getComputedStyle ? win.getComputedStyle(element) : null;
    const display = computed?.display || "block";
    const visibility = computed?.visibility || "visible";
    const opacity = computed ? parseFloat(computed.opacity) || 1 : 1;
    const pointerEvents = computed?.pointerEvents || "auto";
    const zIndex = computed?.zIndex || "auto";
    const vpWidth = win.innerWidth || doc.documentElement?.clientWidth || 1920;
    const vpHeight = win.innerHeight || doc.documentElement?.clientHeight || 1080;
    const hasLayout = bounds.width > 0 || bounds.height > 0 || bounds.right > 0 || bounds.bottom > 0;
    const isInViewport = !hasLayout || bounds.right > 0 && bounds.bottom > 0 && bounds.left < vpWidth && bounds.top < vpHeight;
    const isClipped = hasLayout && (bounds.right <= 0 || bounds.bottom <= 0 || bounds.left >= vpWidth || bounds.top >= vpHeight);
    const isVisible = !isClipped && display !== "none" && visibility !== "hidden" && opacity > 0 && isInViewport;
    const state = {
      disabled: htmlEl.disabled ?? element.hasAttribute("disabled"),
      readOnly: htmlEl.readOnly ?? element.hasAttribute("readonly"),
      checked: htmlEl.checked,
      selected: htmlEl.selected,
      focused: doc.activeElement === element,
      isShadowHost: !!element.shadowRoot,
      hasShadowRoot: !!element.shadowRoot
    };
    const parentChain = [];
    let curr = element.parentElement;
    while (curr && curr.tagName && curr.tagName.toLowerCase() !== "html") {
      parentChain.push(this.computeBestSelector(curr));
      curr = curr.parentElement;
    }
    const childrenSummary = {
      count: element.children ? element.children.length : 0,
      tags: element.children ? Array.from(element.children).slice(0, 10).map((c) => c.tagName.toLowerCase()) : []
    };
    let forensics = void 0;
    if (registry) {
      const logicalId = registry.getId(element);
      forensics = {
        logicalNodeId: logicalId ?? null,
        creationSequence: null,
        lastMutationSequence: null,
        eventCount: 0,
        isRecorded: logicalId !== null && logicalId !== void 0
      };
    }
    return {
      tag,
      id: element.id || void 0,
      classes: classList,
      role: role || void 0,
      ariaAttributes: Object.keys(ariaAttributes).length > 0 ? ariaAttributes : void 0,
      text: text.slice(0, 200),
      normalizedText: normalizedText.slice(0, 200),
      value,
      type: inputEl.type || void 0,
      selector: bestSelector,
      bestSelector,
      selectorCandidates: candidates,
      bounds,
      visibility: {
        isVisible,
        display,
        visibility,
        opacity,
        pointerEvents,
        isClipped,
        isInViewport,
        zIndex
      },
      computedStyle: computed ? {
        display,
        visibility,
        opacity: String(opacity),
        position: computed.position,
        zIndex: String(zIndex),
        pointerEvents,
        overflow: computed.overflow,
        boxSizing: computed.boxSizing,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize
      } : {},
      attributes,
      state,
      context: {
        parentChain,
        parentSelector: parentChain[0] || void 0,
        childrenSummary,
        containingBlock: computed?.position === "fixed" ? "viewport" : parentChain[0] || void 0,
        iframe: null,
        shadowRoot: element.shadowRoot ? "open" : null
      },
      forensics
    };
  }
  /**
   * Inspect detailed visual and occlusion state
   */
  static inspectVisualState(element) {
    const doc = element.ownerDocument || document;
    const win = doc.defaultView || (typeof window !== "undefined" ? window : {});
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
    const computed = win.getComputedStyle ? win.getComputedStyle(element) : null;
    const vpWidth = win.innerWidth || doc.documentElement?.clientWidth || 1920;
    const vpHeight = win.innerHeight || doc.documentElement?.clientHeight || 1080;
    const scrollX = win.scrollX || win.pageXOffset || 0;
    const scrollY = win.scrollY || win.pageYOffset || 0;
    const dpr = win.devicePixelRatio || 1;
    const display = computed?.display || "block";
    const visibility = computed?.visibility || "visible";
    const opacity = computed ? parseFloat(computed.opacity) || 1 : 1;
    const isInViewport = rect.right > 0 && rect.bottom > 0 && rect.left < vpWidth && rect.top < vpHeight;
    const isZeroDimension = rect.width === 0 || rect.height === 0;
    const isOffscreen = rect.right <= 0 || rect.bottom <= 0 || rect.left >= vpWidth || rect.top >= vpHeight;
    let occludedBy = null;
    if (doc.elementFromPoint && isInViewport && !isZeroDimension && display !== "none") {
      const centerX = Math.max(0, Math.min(vpWidth - 1, rect.left + rect.width / 2));
      const centerY = Math.max(0, Math.min(vpHeight - 1, rect.top + rect.height / 2));
      try {
        const topEl = doc.elementFromPoint(centerX, centerY);
        if (topEl && topEl !== element && !element.contains(topEl) && !topEl.contains(element)) {
          occludedBy = this.computeBestSelector(topEl);
        }
      } catch {
      }
    }
    return {
      selector: this.computeBestSelector(element),
      bounds: {
        x: rect.x ?? rect.left ?? 0,
        y: rect.y ?? rect.top ?? 0,
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        top: rect.top ?? 0,
        right: rect.right ?? 0,
        bottom: rect.bottom ?? 0,
        left: rect.left ?? 0
      },
      viewport: {
        scrollX,
        scrollY,
        width: vpWidth,
        height: vpHeight,
        devicePixelRatio: dpr
      },
      layout: {
        display,
        position: computed?.position || "static",
        zIndex: computed?.zIndex || "auto",
        opacity,
        visibility,
        overflow: computed?.overflow || "visible",
        boxSizing: computed?.boxSizing || "content-box",
        pointerEvents: computed?.pointerEvents || "auto"
      },
      occlusion: {
        isInViewport,
        isClipped: isZeroDimension || isOffscreen,
        isZeroDimension,
        isTransparent: opacity === 0,
        isDisplayNone: display === "none",
        isVisibilityHidden: visibility === "hidden",
        isOffscreen,
        occludedBy
      },
      computedStyleSummary: computed ? {
        display,
        position: computed.position,
        zIndex: computed.zIndex,
        opacity: String(opacity),
        visibility,
        pointerEvents: computed.pointerEvents
      } : {}
    };
  }
  /**
   * Helper: Generate a ranked list of selector candidates and the best one
   */
  static generateSelectorCandidates(element) {
    const doc = element.ownerDocument || document;
    const tag = element.tagName ? element.tagName.toLowerCase() : "element";
    const candidates = [];
    if (element.id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(element.id)) {
      const idSel = `#${element.id}`;
      try {
        if (doc.querySelectorAll && doc.querySelectorAll(idSel).length === 1) {
          candidates.push(idSel);
        }
      } catch {
        candidates.push(idSel);
      }
    }
    const testAttrs = ["data-testid", "data-test", "data-id", "data-qa", "data-cy", "aria-label", "name"];
    for (const attr of testAttrs) {
      const val = element.getAttribute(attr);
      if (val && /^[a-zA-Z0-9_-]+$/.test(val)) {
        const attrSel = `${tag}[${attr}="${val}"]`;
        try {
          if (doc.querySelectorAll && doc.querySelectorAll(attrSel).length === 1) {
            candidates.push(attrSel);
          }
        } catch {
          candidates.push(attrSel);
        }
      }
    }
    const classes = this.extractClasses(element).filter(
      (c) => /^[a-zA-Z0-9_-]+$/.test(c) && !c.startsWith("ng-") && !c.startsWith("_ng")
    );
    if (classes.length > 0) {
      const classSel = `${tag}.${classes.slice(0, 3).join(".")}`;
      try {
        if (doc.querySelectorAll && doc.querySelectorAll(classSel).length === 1) {
          candidates.push(classSel);
        }
      } catch {
        candidates.push(classSel);
      }
    }
    if (element.parentElement && element.parentElement.children) {
      const siblings = Array.from(element.parentElement.children).filter(
        (s) => s.tagName && s.tagName.toLowerCase() === tag
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(element) + 1;
        if (idx > 0) {
          const parentSel = this.computeBestSelector(element.parentElement);
          candidates.push(`${parentSel} > ${tag}:nth-of-type(${idx})`);
        }
      }
    }
    const basicSel = classes.length > 0 ? `${tag}.${classes[0]}` : tag;
    candidates.push(basicSel);
    const bestSelector = candidates[0] || tag;
    return { bestSelector, candidates };
  }
  static computeBestSelector(element) {
    return this.generateSelectorCandidates(element).bestSelector;
  }
  static extractClasses(element) {
    if (element.classList && typeof element.classList.forEach === "function") {
      return Array.from(element.classList);
    }
    if (typeof element.className === "string") {
      return element.className.split(/\s+/).filter(Boolean);
    }
    if (element.className && typeof element.className.baseVal === "string") {
      return element.className.baseVal.split(/\s+/).filter(Boolean);
    }
    return [];
  }
  static inferImplicitRole(element) {
    const tag = element.tagName ? element.tagName.toLowerCase() : "";
    switch (tag) {
      case "a":
        return element.hasAttribute("href") ? "link" : void 0;
      case "button":
        return "button";
      case "input": {
        const type = element.type || "text";
        if (type === "button" || type === "submit" || type === "reset") return "button";
        if (type === "checkbox") return "checkbox";
        if (type === "radio") return "radio";
        return "textbox";
      }
      case "select":
        return "combobox";
      case "textarea":
        return "textbox";
      case "nav":
        return "navigation";
      case "header":
        return "banner";
      case "footer":
        return "contentinfo";
      case "main":
        return "main";
      case "article":
        return "article";
      case "section":
        return "region";
      default:
        return void 0;
    }
  }
}
class ElementInteractionEngine {
  registry;
  lastSelectedElementRef;
  constructor(registry) {
    this.registry = registry;
  }
  setLastSelectedElement(element) {
    this.lastSelectedElementRef = element;
  }
  /**
   * Deterministically resolve target element from target specifier
   */
  resolveTarget(targetSpec, doc = document) {
    if (targetSpec.selectedElementRef && this.lastSelectedElementRef) {
      if (doc.contains(this.lastSelectedElementRef)) {
        return this.lastSelectedElementRef;
      }
    }
    if (typeof targetSpec.nodeId === "number" && this.registry) {
      const node = this.registry.getNode(targetSpec.nodeId);
      if (node && node instanceof Element && doc.contains(node)) {
        return node;
      }
    }
    if (targetSpec.selector) {
      try {
        const matches = doc.querySelectorAll(targetSpec.selector);
        if (matches.length > 1) {
          for (let i = 0; i < matches.length; i++) {
            const el = matches[i];
            const info = LiveDOMInspector.inspectElement(el);
            if (info.visibility.isVisible) {
              return el;
            }
          }
          return matches[0];
        } else if (matches.length === 1) {
          return matches[0];
        }
      } catch (err) {
        throw new Error(`Invalid CSS selector "${targetSpec.selector}": ${err.message}`);
      }
    }
    if (targetSpec.xpath && doc.evaluate) {
      try {
        const result = doc.evaluate(
          targetSpec.xpath,
          doc,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        if (result.singleNodeValue && result.singleNodeValue instanceof Element) {
          return result.singleNodeValue;
        }
      } catch (err) {
        throw new Error(`Invalid XPath "${targetSpec.xpath}": ${err.message}`);
      }
    }
    if (targetSpec.coordinates && doc.elementFromPoint) {
      const { x, y } = targetSpec.coordinates;
      const el = doc.elementFromPoint(x, y);
      if (el) return el;
    }
    throw new Error(
      `Target element could not be resolved from specifier: ${JSON.stringify(targetSpec)}`
    );
  }
  /**
   * Execute an interaction on a live element and measure its immediate before/after effects
   */
  async interact(payload, doc = document) {
    const startTime = Date.now();
    const targetElement = this.resolveTarget(payload.target, doc);
    const beforeState = LiveDOMInspector.inspectElement(targetElement, this.registry);
    let mutationCount = 0;
    const runtimeErrors = [];
    const observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;
    });
    try {
      observer.observe(doc.body || doc.documentElement, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true
      });
    } catch {
    }
    const errorHandler = (evt) => {
      runtimeErrors.push(evt.message || "Runtime Error");
    };
    if (typeof window !== "undefined") {
      window.addEventListener("error", errorHandler);
    }
    try {
      await this.dispatchAction(targetElement, payload);
    } finally {
      if (typeof window !== "undefined") {
        window.removeEventListener("error", errorHandler);
      }
    }
    let stabilized = true;
    if (payload.options?.waitForStabilization) {
      const timeoutMs = payload.options.stabilizationTimeoutMs || 300;
      await new Promise((resolve) => setTimeout(resolve, Math.min(2e3, timeoutMs)));
    }
    observer.disconnect();
    let afterState = void 0;
    if (doc.contains(targetElement)) {
      afterState = LiveDOMInspector.inspectElement(targetElement, this.registry);
    }
    const durationMs = Date.now() - startTime;
    return {
      success: true,
      action: payload.action,
      target: afterState || beforeState,
      beforeState,
      afterState,
      effects: {
        domMutations: mutationCount,
        consoleErrors: 0,
        networkRequests: 0,
        runtimeErrors
      },
      durationMs,
      stabilized
    };
  }
  /**
   * Dispatch action-specific native and synthetic events
   */
  async dispatchAction(element, payload) {
    const htmlEl = element;
    switch (payload.action) {
      case "click": {
        this.scrollIntoViewIfNeeded(element);
        this.dispatchMouseEvent(element, "pointerdown");
        this.dispatchMouseEvent(element, "mousedown");
        if (typeof htmlEl.focus === "function") htmlEl.focus();
        this.dispatchMouseEvent(element, "pointerup");
        this.dispatchMouseEvent(element, "mouseup");
        if (typeof htmlEl.click === "function") {
          htmlEl.click();
        } else {
          this.dispatchMouseEvent(element, "click");
        }
        break;
      }
      case "double_click": {
        this.scrollIntoViewIfNeeded(element);
        this.dispatchMouseEvent(element, "click");
        this.dispatchMouseEvent(element, "click");
        this.dispatchMouseEvent(element, "dblclick");
        break;
      }
      case "right_click": {
        this.scrollIntoViewIfNeeded(element);
        this.dispatchMouseEvent(element, "pointerdown", { button: 2 });
        this.dispatchMouseEvent(element, "mousedown", { button: 2 });
        this.dispatchMouseEvent(element, "contextmenu", { button: 2 });
        break;
      }
      case "hover": {
        this.dispatchMouseEvent(element, "pointerenter");
        this.dispatchMouseEvent(element, "mouseenter");
        this.dispatchMouseEvent(element, "mouseover");
        this.dispatchMouseEvent(element, "mousemove");
        break;
      }
      case "focus": {
        if (typeof htmlEl.focus === "function") {
          htmlEl.focus();
        }
        element.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
        break;
      }
      case "blur": {
        if (typeof htmlEl.blur === "function") {
          htmlEl.blur();
        }
        element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
        break;
      }
      case "type": {
        const text = payload.text || "";
        const inputEl = element;
        const win = element.ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
        if (typeof htmlEl.focus === "function") htmlEl.focus();
        for (const char of text) {
          const createKeyEvt = (evtType) => {
            try {
              const KeyCtor = win?.KeyboardEvent || (typeof KeyboardEvent !== "undefined" ? KeyboardEvent : null);
              if (KeyCtor) return new KeyCtor(evtType, { key: char, bubbles: true });
            } catch {
            }
            const FallbackCtor = win?.CustomEvent || win?.Event || CustomEvent;
            return new FallbackCtor(evtType, { bubbles: true, cancelable: true });
          };
          const createInputEvt = (evtType, opts) => {
            try {
              const InputCtor = win?.InputEvent || (typeof InputEvent !== "undefined" ? InputEvent : null);
              if (InputCtor) return new InputCtor(evtType, opts);
            } catch {
            }
            const FallbackCtor = win?.CustomEvent || win?.Event || CustomEvent;
            return new FallbackCtor(evtType, { bubbles: true, cancelable: true });
          };
          element.dispatchEvent(createKeyEvt("keydown"));
          element.dispatchEvent(createKeyEvt("keypress"));
          if ("value" in inputEl) {
            inputEl.value = (inputEl.value || "") + char;
          }
          element.dispatchEvent(createInputEvt("input", { data: char, inputType: "insertText", bubbles: true }));
          element.dispatchEvent(createKeyEvt("keyup"));
        }
        const ChangeCtor = win?.Event || Event;
        element.dispatchEvent(new ChangeCtor("change", { bubbles: true }));
        break;
      }
      case "clear": {
        const inputEl = element;
        const win = element.ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
        if ("value" in inputEl) {
          inputEl.value = "";
          const createInputEvt = (evtType, opts) => {
            try {
              const InputCtor = win?.InputEvent || (typeof InputEvent !== "undefined" ? InputEvent : null);
              if (InputCtor) return new InputCtor(evtType, opts);
            } catch {
            }
            const FallbackCtor = win?.CustomEvent || win?.Event || CustomEvent;
            return new FallbackCtor(evtType, { bubbles: true, cancelable: true });
          };
          element.dispatchEvent(createInputEvt("input", { inputType: "deleteContentBackward", bubbles: true }));
          const ChangeCtor = win?.Event || Event;
          element.dispatchEvent(new ChangeCtor("change", { bubbles: true }));
        }
        break;
      }
      case "press_key": {
        const key = payload.key || "Enter";
        const win = element.ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
        const createKeyEvt = (evtType) => {
          try {
            const KeyCtor = win?.KeyboardEvent || (typeof KeyboardEvent !== "undefined" ? KeyboardEvent : null);
            if (KeyCtor) return new KeyCtor(evtType, { key, bubbles: true });
          } catch {
          }
          const FallbackCtor = win?.CustomEvent || win?.Event || CustomEvent;
          return new FallbackCtor(evtType, { bubbles: true, cancelable: true });
        };
        element.dispatchEvent(createKeyEvt("keydown"));
        element.dispatchEvent(createKeyEvt("keypress"));
        element.dispatchEvent(createKeyEvt("keyup"));
        break;
      }
      case "select_option": {
        const selectEl = element;
        if (selectEl.tagName?.toLowerCase() === "select" && payload.optionValue) {
          selectEl.value = payload.optionValue;
          element.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
      }
      case "scroll_into_view": {
        this.scrollIntoViewIfNeeded(element, true);
        break;
      }
      case "scroll": {
        const dx = payload.scrollDelta?.x || 0;
        const dy = payload.scrollDelta?.y || 0;
        if (typeof element.scrollBy === "function") {
          element.scrollBy(dx, dy);
        }
        break;
      }
      default:
        throw new Error(`Unsupported interaction action: ${payload.action}`);
    }
  }
  scrollIntoViewIfNeeded(element, force = false) {
    if (typeof element.scrollIntoView === "function") {
      try {
        element.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });
      } catch {
        element.scrollIntoView(force);
      }
    }
  }
  dispatchMouseEvent(element, type, options = {}) {
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const event = new MouseEvent(type, {
      bubbles: options.bubbles !== void 0 ? options.bubbles : true,
      cancelable: options.cancelable !== void 0 ? options.cancelable : true,
      clientX,
      clientY,
      button: options.button || 0,
      buttons: options.button === 2 ? 2 : 1
    });
    element.dispatchEvent(event);
  }
}
class SequenceCounter {
  currentSequence = 0;
  sessionStartTime;
  sessionStartWallClock;
  constructor() {
    this.sessionStartTime = typeof performance !== "undefined" ? performance.now() : 0;
    this.sessionStartWallClock = Date.now();
  }
  nextSequence() {
    this.currentSequence += 1;
    return this.currentSequence;
  }
  getSequence() {
    return this.currentSequence;
  }
  getRelativeTimestamp() {
    if (typeof performance !== "undefined") {
      return Math.round((performance.now() - this.sessionStartTime) * 100) / 100;
    }
    return Date.now() - this.sessionStartWallClock;
  }
  getWallClock() {
    return Date.now();
  }
  generateEventId(prefix = "evt") {
    const seq = this.nextSequence();
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${seq}_${rand}`;
  }
  reset() {
    this.currentSequence = 0;
    this.sessionStartTime = typeof performance !== "undefined" ? performance.now() : 0;
    this.sessionStartWallClock = Date.now();
  }
}
class ElementObserver {
  activeObservation = null;
  registry;
  sequenceCounter;
  constructor(registry) {
    this.registry = registry;
    this.sequenceCounter = new SequenceCounter();
  }
  isObserving() {
    return this.activeObservation !== null;
  }
  /**
   * Start focused observation on a specific element
   */
  startObservation(targetElement, doc = document) {
    if (this.activeObservation) {
      this.stopObservation(doc);
    }
    const observationId = `obs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();
    const initialState = LiveDOMInspector.inspectElement(targetElement, this.registry);
    const targetSelector = initialState.bestSelector;
    const events = [];
    const initialNodeId = this.registry ? this.registry.getOrCreateId(targetElement, 0) : 100;
    events.push({
      id: `evt_init_${observationId}`,
      sessionId: observationId,
      timestamp: 0,
      sequence: 1,
      wallClockTime: startTime,
      type: "DOM_MUTATION_ADD",
      category: "DOM",
      source: "BROWSER_RUNTIME",
      targetNodeId: initialNodeId,
      targetSelector,
      payload: {
        node: {
          id: initialNodeId,
          nodeType: 1,
          tagName: initialState.tag,
          attributes: initialState.attributes,
          textContent: initialState.text,
          children: [],
          parentId: null
        },
        parentId: null,
        index: 0
      }
    });
    const observer = new MutationObserver((mutations) => {
      const relTime = Date.now() - startTime;
      for (const mut of mutations) {
        if (mut.type === "childList") {
          for (let i = 0; i < mut.removedNodes.length; i++) {
            const removed = mut.removedNodes[i];
            if (removed instanceof Element) {
              const remNodeId = this.registry ? this.registry.getId(removed) || void 0 : void 0;
              const parentNodeId = mut.target instanceof Element && this.registry ? this.registry.getId(mut.target) || void 0 : void 0;
              events.push({
                id: `evt_rem_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                sessionId: observationId,
                timestamp: relTime,
                sequence: this.sequenceCounter.nextSequence(),
                wallClockTime: Date.now(),
                type: "DOM_MUTATION_REMOVE",
                category: "DOM",
                source: "PAGE",
                targetNodeId: remNodeId,
                targetSelector: LiveDOMInspector.computeBestSelector(removed),
                payload: {
                  nodeId: remNodeId || 0,
                  parentId: parentNodeId || null,
                  index: i,
                  removedSubtreeNodeCount: 1
                }
              });
            }
          }
          for (let i = 0; i < mut.addedNodes.length; i++) {
            const added = mut.addedNodes[i];
            if (added instanceof Element) {
              const addNodeId = this.registry ? this.registry.getOrCreateId(added, relTime) : void 0;
              events.push({
                id: `evt_add_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                sessionId: observationId,
                timestamp: relTime,
                sequence: this.sequenceCounter.nextSequence(),
                wallClockTime: Date.now(),
                type: "DOM_MUTATION_ADD",
                category: "DOM",
                source: "PAGE",
                targetNodeId: addNodeId,
                targetSelector: LiveDOMInspector.computeBestSelector(added),
                payload: {
                  node: {
                    id: addNodeId || 0,
                    nodeType: 1,
                    tagName: added.tagName.toLowerCase(),
                    attributes: {},
                    children: [],
                    parentId: null
                  },
                  parentId: null,
                  index: i
                }
              });
            }
          }
        } else if (mut.type === "attributes" && mut.target instanceof Element) {
          const attrNodeId = this.registry ? this.registry.getId(mut.target) || void 0 : void 0;
          const attrName = mut.attributeName || "class";
          events.push({
            id: `evt_attr_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            sessionId: observationId,
            timestamp: relTime,
            sequence: this.sequenceCounter.nextSequence(),
            wallClockTime: Date.now(),
            type: "DOM_MUTATION_ATTR",
            category: "DOM",
            source: "PAGE",
            targetNodeId: attrNodeId,
            targetSelector: LiveDOMInspector.computeBestSelector(mut.target),
            payload: {
              nodeId: attrNodeId || 0,
              attributeName: attrName,
              oldValue: mut.oldValue || "",
              newValue: mut.target.getAttribute(attrName) || ""
            }
          });
        }
      }
    });
    try {
      observer.observe(doc.body || doc.documentElement, {
        childList: true,
        attributes: true,
        attributeOldValue: true,
        subtree: true
      });
    } catch {
    }
    this.activeObservation = {
      observationId,
      targetElement,
      targetSelector,
      startTime,
      initialState,
      observer,
      events,
      screenshots: []
    };
    return { observationId, initialState };
  }
  recordExternalEvent(event) {
    if (this.activeObservation) {
      this.activeObservation.events.push(event);
    }
  }
  recordScreenshot(screenshot) {
    if (this.activeObservation) {
      this.activeObservation.screenshots.push(screenshot);
    }
  }
  /**
   * Stop focused observation and assemble correlation bundle
   */
  stopObservation(doc = document) {
    if (!this.activeObservation) {
      throw new Error("No active element observation in progress");
    }
    const {
      observationId,
      targetElement,
      targetSelector,
      startTime,
      initialState,
      observer,
      events,
      screenshots
    } = this.activeObservation;
    observer.disconnect();
    this.activeObservation = null;
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const isStillAttached = doc.contains(targetElement);
    let finalState = null;
    let disappeared = false;
    let disappearanceReason = void 0;
    if (isStillAttached) {
      finalState = LiveDOMInspector.inspectElement(targetElement, this.registry);
      if (finalState.visibility.display === "none" || finalState.visibility.visibility === "hidden" || finalState.visibility.opacity === 0) {
        disappeared = true;
        disappearanceReason = `Element remains attached but is visually obscured (display: ${finalState.visibility.display}, opacity: ${finalState.visibility.opacity})`;
      }
    } else {
      disappeared = true;
      disappearanceReason = "Element was unmounted/removed from the live DOM tree";
    }
    let correlationReport = void 0;
    if (disappeared && events.length > 0) {
      correlationReport = DisappearingElementAnalyzer.analyze(targetSelector, events);
    }
    return {
      observationId,
      targetSelector,
      targetNodeId: initialState.forensics?.logicalNodeId || void 0,
      startTime,
      endTime,
      durationMs,
      initialState,
      finalState,
      disappeared,
      disappearanceReason,
      mutations: events.filter((e) => e.category === "DOM"),
      diagnostics: events.filter((e) => e.category === "ERROR" || e.category === "CONSOLE"),
      networkEvents: events.filter((e) => e.category === "NETWORK"),
      screenshots,
      correlationReport
    };
  }
}
class ElementPicker {
  isExplicitModeActive = false;
  isGlobalShortcutActive = false;
  highlighterEl = null;
  badgeEl = null;
  lastSelectedElement = null;
  options = {};
  onMouseMoveBound;
  onClickBound;
  onKeyDownBound;
  onGlobalClickBound;
  constructor(options = {}) {
    this.options = options;
    this.onMouseMoveBound = this.handleMouseMove.bind(this);
    this.onClickBound = this.handleClick.bind(this);
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onGlobalClickBound = this.handleGlobalCtrlShiftClick.bind(this);
    this.initGlobalShortcutListener();
  }
  /**
   * Always-on listener for Ctrl + Shift + Click anywhere in the document
   */
  initGlobalShortcutListener() {
    if (typeof window === "undefined" || this.isGlobalShortcutActive) return;
    window.addEventListener("click", this.onGlobalClickBound, true);
    this.isGlobalShortcutActive = true;
  }
  /**
   * Start explicit interactive visual element picker mode (with crosshair and hover highlight)
   */
  startPicker(options) {
    if (typeof document === "undefined") return;
    if (options) {
      this.options = { ...this.options, ...options };
    }
    if (this.isExplicitModeActive) return;
    this.isExplicitModeActive = true;
    this.ensureHighlighter();
    if (document.body) {
      document.body.style.cursor = "crosshair";
    }
    window.addEventListener("mousemove", this.onMouseMoveBound, true);
    window.addEventListener("click", this.onClickBound, true);
    window.addEventListener("keydown", this.onKeyDownBound, true);
  }
  /**
   * Stop explicit picker mode and restore normal cursor & DOM state
   */
  stopPicker() {
    if (!this.isExplicitModeActive) return;
    this.isExplicitModeActive = false;
    if (typeof document !== "undefined" && document.body) {
      document.body.style.cursor = "default";
    }
    this.removeHighlighter();
    if (typeof window !== "undefined") {
      window.removeEventListener("mousemove", this.onMouseMoveBound, true);
      window.removeEventListener("click", this.onClickBound, true);
      window.removeEventListener("keydown", this.onKeyDownBound, true);
    }
  }
  /**
   * Retrieve the last element selected via Ctrl+Shift+Click or Picker mode
   */
  getLastSelectedElement() {
    return this.lastSelectedElement;
  }
  /**
   * Set or override the selected element programmatically (supports Element or pre-serialized LiveElementInfo)
   */
  setSelectedElement(element) {
    let info;
    if ("tag" in element && "bestSelector" in element && typeof element.getAttribute !== "function") {
      info = element;
    } else {
      info = LiveDOMInspector.inspectElement(element, this.options.nodeRegistry);
      this.flashSelection(element);
    }
    this.lastSelectedElement = info;
    if (this.options.onSelected) {
      this.options.onSelected(info);
    }
    return info;
  }
  /**
   * Global shortcut handler: Ctrl + Shift + Click
   */
  handleGlobalCtrlShiftClick(e) {
    if (!e.ctrlKey || !e.shiftKey) return;
    const target = e.target;
    if (!target || this.isExtensionOwned(target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const info = this.setSelectedElement(target);
    this.notifyExtension(info);
  }
  /**
   * Explicit mode mouse move handler (updates highlighter bounds)
   */
  handleMouseMove(e) {
    if (!this.isExplicitModeActive) return;
    const target = e.target;
    if (!target || this.isExtensionOwned(target)) {
      this.hideHighlighter();
      return;
    }
    this.updateHighlighter(target);
  }
  /**
   * Explicit mode click handler (selects target and terminates picker)
   */
  handleClick(e) {
    if (!this.isExplicitModeActive) return;
    const target = e.target;
    if (!target || this.isExtensionOwned(target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const info = this.setSelectedElement(target);
    this.notifyExtension(info);
    this.stopPicker();
  }
  /**
   * Explicit mode keydown handler (Escape cancels picker)
   */
  handleKeyDown(e) {
    if (e.key === "Escape" && this.isExplicitModeActive) {
      e.preventDefault();
      this.stopPicker();
      if (this.options.onCanceled) {
        this.options.onCanceled();
      }
    }
  }
  /**
   * Check if element belongs to extension UI
   */
  isExtensionOwned(element) {
    if (element.id === "forensic-recorder-floating-host" || element.id === "forensic-inspect-highlighter") {
      return true;
    }
    if (element.closest("#forensic-recorder-floating-host") || element.closest("#forensic-inspect-highlighter")) {
      return true;
    }
    if (element.hasAttribute("data-forensic-internal") || element.closest("[data-forensic-internal]")) {
      return true;
    }
    return false;
  }
  /**
   * Create highlighter elements in DOM
   */
  ensureHighlighter() {
    if (typeof document === "undefined" || this.highlighterEl) return;
    const color = this.options.highlightColor || "#0ea5e9";
    const overlay = document.createElement("div");
    overlay.id = "forensic-inspect-highlighter";
    overlay.setAttribute("data-forensic-internal", "true");
    overlay.style.position = "fixed";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "2147483640";
    overlay.style.border = `2px solid ${color}`;
    overlay.style.background = "rgba(14, 165, 233, 0.18)";
    overlay.style.borderRadius = "3px";
    overlay.style.boxShadow = `0 0 12px ${color}88`;
    overlay.style.transition = "all 0.05s ease-out";
    overlay.style.display = "none";
    const badge = document.createElement("div");
    badge.setAttribute("data-forensic-internal", "true");
    badge.style.position = "absolute";
    badge.style.bottom = "100%";
    badge.style.left = "0";
    badge.style.transform = "translateY(-4px)";
    badge.style.background = "#0f172a";
    badge.style.color = "#38bdf8";
    badge.style.fontSize = "11px";
    badge.style.fontFamily = "monospace";
    badge.style.fontWeight = "bold";
    badge.style.padding = "2px 6px";
    badge.style.borderRadius = "3px";
    badge.style.boxShadow = "0 2px 6px rgba(0,0,0,0.5)";
    badge.style.whiteSpace = "nowrap";
    badge.style.pointerEvents = "none";
    overlay.appendChild(badge);
    document.body.appendChild(overlay);
    this.highlighterEl = overlay;
    this.badgeEl = badge;
  }
  updateHighlighter(target) {
    this.ensureHighlighter();
    if (!this.highlighterEl || !this.badgeEl) return;
    const rect = target.getBoundingClientRect();
    this.highlighterEl.style.display = "block";
    this.highlighterEl.style.left = `${rect.left}px`;
    this.highlighterEl.style.top = `${rect.top}px`;
    this.highlighterEl.style.width = `${Math.max(1, rect.width)}px`;
    this.highlighterEl.style.height = `${Math.max(1, rect.height)}px`;
    const tag = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : "";
    const cls = target.className && typeof target.className === "string" ? "." + target.className.split(/\s+/)[0] : "";
    const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    this.badgeEl.textContent = `<${tag}${id}${cls}> [${dims}]`;
  }
  hideHighlighter() {
    if (this.highlighterEl) {
      this.highlighterEl.style.display = "none";
    }
  }
  removeHighlighter() {
    if (this.highlighterEl && this.highlighterEl.parentElement) {
      this.highlighterEl.remove();
    }
    this.highlighterEl = null;
    this.badgeEl = null;
  }
  /**
   * Flash green outline when selection succeeds
   */
  flashSelection(element) {
    if (typeof document === "undefined" || !element.getBoundingClientRect) return;
    const rect = element.getBoundingClientRect();
    const flash = document.createElement("div");
    flash.setAttribute("data-forensic-internal", "true");
    flash.style.position = "fixed";
    flash.style.left = `${rect.left}px`;
    flash.style.top = `${rect.top}px`;
    flash.style.width = `${Math.max(1, rect.width)}px`;
    flash.style.height = `${Math.max(1, rect.height)}px`;
    flash.style.border = "2px solid #22c55e";
    flash.style.background = "rgba(34, 197, 94, 0.25)";
    flash.style.zIndex = "2147483645";
    flash.style.pointerEvents = "none";
    flash.style.transition = "opacity 0.6s ease-out";
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 600);
    }, 400);
  }
  /**
   * Notify extension background & bridge of new element selection
   */
  notifyExtension(info) {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: "ELEMENT_SELECTED",
          elementInfo: info,
          timestamp: Date.now()
        });
      }
    } catch {
    }
  }
  destroy() {
    this.stopPicker();
    if (typeof window !== "undefined") {
      window.removeEventListener("click", this.onGlobalClickBound, true);
    }
    this.isGlobalShortcutActive = false;
  }
}
class NodeRegistry {
  nextId = 1;
  nodeToIdMap = /* @__PURE__ */ new WeakMap();
  idToNodeMap = /* @__PURE__ */ new Map();
  identities = /* @__PURE__ */ new Map();
  parentHistory = /* @__PURE__ */ new Map();
  getOrCreateId(node, timestamp = 0) {
    if (this.nodeToIdMap.has(node)) {
      return this.nodeToIdMap.get(node);
    }
    const id = this.nextId++;
    this.nodeToIdMap.set(node, id);
    this.idToNodeMap.set(id, node);
    const isElement = node.nodeType === VirtualDOMNodeType.ELEMENT_NODE || node.nodeType === 1;
    const element = isElement ? node : null;
    const tagName = element && element.tagName ? element.tagName.toLowerCase() : void 0;
    const isCustomElement = tagName ? tagName.includes("-") : false;
    const identity = {
      id,
      nodeType: node.nodeType,
      tagName,
      createdAt: timestamp,
      initialSelectorHint: element ? this.computeSelector(element) : void 0,
      isCustomElement
    };
    this.identities.set(id, identity);
    return id;
  }
  getId(node) {
    return this.nodeToIdMap.get(node);
  }
  getNode(id) {
    return this.idToNodeMap.get(id);
  }
  getIdentity(id) {
    return this.identities.get(id);
  }
  recordParent(nodeId, parentId) {
    if (!parentId) return;
    const history = this.parentHistory.get(nodeId) || [];
    if (history[history.length - 1] !== parentId) {
      history.push(parentId);
      this.parentHistory.set(nodeId, history);
    }
  }
  getParentHistory(nodeId) {
    return this.parentHistory.get(nodeId) || [];
  }
  computeSelector(element) {
    try {
      const rawId = typeof element.id === "string" ? element.id : element.getAttribute ? element.getAttribute("id") : "";
      if (rawId && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(rawId)) {
        return `#${rawId}`;
      }
      const tagName = element.tagName ? element.tagName.toLowerCase() : "element";
      if (tagName === "body" || tagName === "html" || tagName === "head") {
        return tagName;
      }
      let classListArray = [];
      if (element.classList && typeof element.classList.forEach === "function") {
        classListArray = Array.from(element.classList);
      } else if (typeof element.className === "string") {
        classListArray = element.className.split(/\s+/);
      } else if (element.className && typeof element.className.baseVal === "string") {
        classListArray = element.className.baseVal.split(/\s+/);
      }
      let classSelector = "";
      if (classListArray.length > 0) {
        const validClasses = classListArray.filter((c) => typeof c === "string" && /^[a-zA-Z0-9_-]+$/.test(c) && !c.startsWith("ng-") && !c.startsWith("_ng")).slice(0, 3);
        if (validClasses.length > 0) {
          classSelector = "." + validClasses.join(".");
        }
      }
      if (element.parentElement && element.parentElement.children) {
        const siblings = Array.from(element.parentElement.children).filter(
          (s) => s.tagName && s.tagName.toLowerCase() === tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          if (index > 0) {
            return `${tagName}${classSelector}:nth-of-type(${index})`;
          }
        }
      }
      return `${tagName}${classSelector}`;
    } catch {
      return element.tagName ? element.tagName.toLowerCase() : "element";
    }
  }
  computeFullSelectorPath(element) {
    const path2 = [];
    let current = element;
    while (current && current.tagName && current.tagName.toLowerCase() !== "html") {
      const selector = this.computeSelector(current);
      path2.unshift(selector);
      if (current.id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(current.id)) {
        break;
      }
      current = current.parentElement;
    }
    return path2.join(" > ");
  }
  removeNode(id) {
    const node = this.idToNodeMap.get(id);
    if (node) {
      this.idToNodeMap.delete(id);
    }
  }
  reset() {
    this.nextId = 1;
    this.nodeToIdMap = /* @__PURE__ */ new WeakMap();
    this.idToNodeMap.clear();
    this.identities.clear();
    this.parentHistory.clear();
  }
}
class SnapshotEngine {
  registry;
  privacy;
  sequenceCounter;
  constructor(registry, privacy, sequenceCounter) {
    this.registry = registry;
    this.privacy = privacy;
    this.sequenceCounter = sequenceCounter;
  }
  captureSnapshot(doc = document, sessionId = "") {
    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const sequence = this.sequenceCounter.nextSequence();
    const nodes = {};
    const rootElement = doc.documentElement || doc.body;
    const rootId = this.registry.getOrCreateId(doc, timestamp);
    nodes[rootId] = {
      id: rootId,
      nodeType: VirtualDOMNodeType.DOCUMENT_NODE,
      tagName: "#document",
      children: [],
      parentId: null
    };
    if (doc.doctype) {
      const doctypeId = this.registry.getOrCreateId(doc.doctype, timestamp);
      nodes[doctypeId] = {
        id: doctypeId,
        nodeType: VirtualDOMNodeType.DOCUMENT_TYPE_NODE,
        tagName: doc.doctype.name || "html",
        parentId: rootId
      };
      nodes[rootId].children.push(doctypeId);
    }
    if (rootElement) {
      const docElementId = this.serializeNode(rootElement, rootId, nodes, timestamp);
      if (docElementId) {
        nodes[rootId].children.push(docElementId);
      }
    }
    const viewport = this.getViewportInfo();
    return {
      snapshotId: `snap_${sequence}_${Date.now()}`,
      sessionId,
      timestamp,
      sequence,
      rootId,
      nodes,
      title: doc.title || "",
      url: typeof window !== "undefined" ? window.location.href : "",
      origin: typeof window !== "undefined" ? window.location.origin : "",
      viewport,
      doctype: doc.doctype ? doc.doctype.name : void 0,
      totalNodeCount: Object.keys(nodes).length
    };
  }
  serializeNode(node, parentId, nodesAcc, timestamp) {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE && this.privacy.shouldBlockNode(node)) {
      return null;
    }
    const id = this.registry.getOrCreateId(node, timestamp);
    this.registry.recordParent(id, parentId);
    const vNode = {
      id,
      nodeType: node.nodeType,
      parentId
    };
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node;
      vNode.tagName = element.tagName.toLowerCase();
      vNode.isCustomElement = vNode.tagName.includes("-");
      vNode.namespaceURI = element.namespaceURI;
      const attributes = {};
      if (element.attributes) {
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          let val = attr.value;
          if (attr.name.toLowerCase() === "value" && element.tagName.toLowerCase() === "input") {
            const inputType = element.getAttribute("type") || "text";
            val = this.privacy.maskValue(val, inputType, element.getAttribute("name") || void 0);
          }
          attributes[attr.name] = val;
        }
      }
      if (element.tagName.toLowerCase() === "input") {
        const input = element;
        const inputType = input.type || "text";
        attributes["value"] = this.privacy.maskValue(input.value, inputType, input.name);
        if (input.checked) {
          attributes["checked"] = "true";
        }
      } else if (element.tagName.toLowerCase() === "textarea") {
        const textarea = element;
        vNode.textContent = this.privacy.maskValue(textarea.value, "textarea", textarea.name);
      } else if (element.tagName.toLowerCase() === "select") {
        const select = element;
        attributes["value"] = select.value;
      }
      vNode.attributes = attributes;
      this.enrichElementMetrics(element, vNode);
      if (element.shadowRoot) {
        vNode.isShadowHost = true;
        const shadowId = this.registry.getOrCreateId(element.shadowRoot, timestamp);
        const shadowVNode = {
          id: shadowId,
          nodeType: VirtualDOMNodeType.DOCUMENT_FRAGMENT_NODE,
          isShadowRoot: true,
          shadowMode: element.shadowRoot.mode,
          parentId: id,
          children: []
        };
        nodesAcc[shadowId] = shadowVNode;
        for (let i = 0; i < element.shadowRoot.childNodes.length; i++) {
          const childNode = element.shadowRoot.childNodes[i];
          const childId = this.serializeNode(childNode, shadowId, nodesAcc, timestamp);
          if (childId) {
            shadowVNode.children.push(childId);
          }
        }
      }
      vNode.children = [];
      for (let i = 0; i < element.childNodes.length; i++) {
        const childNode = element.childNodes[i];
        const childId = this.serializeNode(childNode, id, nodesAcc, timestamp);
        if (childId) {
          vNode.children.push(childId);
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const parentElement = node.parentElement;
      const isMasked = parentElement ? this.privacy.shouldMaskText(parentElement) : false;
      vNode.textContent = this.privacy.sanitizeText(node.textContent || "", isMasked);
    } else if (node.nodeType === Node.COMMENT_NODE) {
      vNode.textContent = node.textContent || "";
    }
    nodesAcc[id] = vNode;
    return id;
  }
  enrichElementMetrics(element, vNode) {
    try {
      if (typeof window !== "undefined" && window.getComputedStyle) {
        const style = window.getComputedStyle(element);
        const isDisplayNone = style.display === "none";
        const isVisibilityHidden = style.visibility === "hidden" || style.visibility === "collapse";
        const isOpacityZero = parseFloat(style.opacity || "1") === 0;
        vNode.isHidden = isDisplayNone || isVisibilityHidden || isOpacityZero;
        if (element.getBoundingClientRect) {
          const rect = element.getBoundingClientRect();
          vNode.boundingClientRect = {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            bottom: Math.round(rect.bottom),
            right: Math.round(rect.right)
          };
        }
      }
    } catch {
    }
  }
  getViewportInfo() {
    if (typeof window === "undefined") {
      return { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 };
    }
    return {
      width: window.innerWidth || document.documentElement?.clientWidth || 1920,
      height: window.innerHeight || document.documentElement?.clientHeight || 1080,
      scrollX: window.scrollX || window.pageXOffset || 0,
      scrollY: window.scrollY || window.pageYOffset || 0,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }
}
class PNGBuilder {
  static crcTable = null;
  static getCrcTable() {
    if (this.crcTable) return this.crcTable;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    this.crcTable = table;
    return table;
  }
  static crc32(buf, offset = 0, length = buf.length) {
    const table = this.getCrcTable();
    let crc = 4294967295;
    for (let i = offset; i < offset + length; i++) {
      crc = crc >>> 8 ^ table[(crc ^ buf[i]) & 255];
    }
    return (crc ^ 4294967295) >>> 0;
  }
  static adler32(buf) {
    let s1 = 1;
    let s2 = 0;
    for (let i = 0; i < buf.length; i++) {
      s1 = (s1 + buf[i]) % 65521;
      s2 = (s2 + s1) % 65521;
    }
    return (s2 << 16 | s1) >>> 0;
  }
  /**
   * Generates a raw PNG binary Buffer/Uint8Array
   */
  static createPNG(opts) {
    const width = Math.max(1, Math.min(1920, Math.floor(opts.width)));
    const height = Math.max(1, Math.min(1080, Math.floor(opts.height)));
    const bg = opts.backgroundColor || [15, 23, 42, 255];
    const headerBg = opts.headerColor || [56, 189, 248, 255];
    const border = opts.borderColor || [99, 102, 241, 255];
    const scanlineLength = 1 + width * 4;
    const rawData = new Uint8Array(scanlineLength * height);
    const headerHeight = Math.min(30, Math.floor(height * 0.2));
    for (let y = 0; y < height; y++) {
      const rowOffset = y * scanlineLength;
      rawData[rowOffset] = 0;
      for (let x = 0; x < width; x++) {
        const pxOffset = rowOffset + 1 + x * 4;
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          rawData[pxOffset] = border[0];
          rawData[pxOffset + 1] = border[1];
          rawData[pxOffset + 2] = border[2];
          rawData[pxOffset + 3] = border[3];
        } else if (y < headerHeight) {
          rawData[pxOffset] = headerBg[0];
          rawData[pxOffset + 1] = headerBg[1];
          rawData[pxOffset + 2] = headerBg[2];
          rawData[pxOffset + 3] = headerBg[3];
        } else {
          rawData[pxOffset] = bg[0];
          rawData[pxOffset + 1] = bg[1];
          rawData[pxOffset + 2] = bg[2];
          rawData[pxOffset + 3] = bg[3];
        }
      }
    }
    const deflated = this.deflateUncompressed(rawData);
    const totalSize = 8 + 25 + (12 + deflated.length) + 12;
    const png = new Uint8Array(totalSize);
    let p = 0;
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < signature.length; i++) png[p++] = signature[i];
    const ihdrData = new Uint8Array(13);
    const ihdrView = new DataView(ihdrData.buffer);
    ihdrView.setUint32(0, width, false);
    ihdrView.setUint32(4, height, false);
    ihdrData[8] = 8;
    ihdrData[9] = 6;
    ihdrData[10] = 0;
    ihdrData[11] = 0;
    ihdrData[12] = 0;
    p = this.writeChunk(png, p, "IHDR", ihdrData);
    p = this.writeChunk(png, p, "IDAT", deflated);
    p = this.writeChunk(png, p, "IEND", new Uint8Array(0));
    return png;
  }
  /**
   * Generates a valid Base64 data:image/png;base64,... URL
   */
  static createDataUrl(opts) {
    const pngBytes = this.createPNG(opts);
    let binary = "";
    const len = pngBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(pngBytes[i]);
    }
    if (typeof btoa !== "undefined") {
      return `data:image/png;base64,${btoa(binary)}`;
    }
    if (typeof Buffer !== "undefined") {
      return `data:image/png;base64,${Buffer.from(pngBytes).toString("base64")}`;
    }
    return `data:image/png;base64,${btoa(binary)}`;
  }
  static deflateUncompressed(data) {
    const blocks = [];
    const maxBlockSize = 65535;
    let offset = 0;
    while (offset < data.length) {
      const remaining = data.length - offset;
      const blockSize = Math.min(remaining, maxBlockSize);
      const isFinal = offset + blockSize >= data.length;
      const block = new Uint8Array(5 + blockSize);
      block[0] = isFinal ? 1 : 0;
      block[1] = blockSize & 255;
      block[2] = blockSize >>> 8 & 255;
      const nlen = ~blockSize & 65535;
      block[3] = nlen & 255;
      block[4] = nlen >>> 8 & 255;
      block.set(data.subarray(offset, offset + blockSize), 5);
      blocks.push(block);
      offset += blockSize;
    }
    const totalDeflated = blocks.reduce((sum, b) => sum + b.length, 0) + 2 + 4;
    const result = new Uint8Array(totalDeflated);
    let p = 0;
    result[p++] = 120;
    result[p++] = 1;
    for (const b of blocks) {
      result.set(b, p);
      p += b.length;
    }
    const adler = this.adler32(data);
    result[p++] = adler >>> 24 & 255;
    result[p++] = adler >>> 16 & 255;
    result[p++] = adler >>> 8 & 255;
    result[p++] = adler & 255;
    return result;
  }
  static writeChunk(target, offset, typeStr, data) {
    const len = data.length;
    const view = new DataView(target.buffer, target.byteOffset, target.byteLength);
    view.setUint32(offset, len, false);
    offset += 4;
    const chunkTypeAndData = new Uint8Array(4 + len);
    for (let i = 0; i < 4; i++) {
      const code = typeStr.charCodeAt(i);
      target[offset + i] = code;
      chunkTypeAndData[i] = code;
    }
    offset += 4;
    if (len > 0) {
      target.set(data, offset);
      chunkTypeAndData.set(data, 4);
      offset += len;
    }
    const crc = this.crc32(chunkTypeAndData);
    view.setUint32(offset, crc, false);
    offset += 4;
    return offset;
  }
}
class LiveBrowserController {
  nodeRegistry;
  snapshotEngine;
  picker;
  interactionEngine;
  observer;
  constructor(nodeRegistry) {
    this.nodeRegistry = nodeRegistry || new NodeRegistry();
    const privacy = new PrivacyEngine();
    const sequenceCounter = new SequenceCounter();
    this.snapshotEngine = new SnapshotEngine(this.nodeRegistry, privacy, sequenceCounter);
    this.picker = new ElementPicker({ nodeRegistry: this.nodeRegistry });
    this.interactionEngine = new ElementInteractionEngine(this.nodeRegistry);
    this.observer = new ElementObserver(this.nodeRegistry);
    this.picker.initGlobalShortcutListener();
  }
  getPicker() {
    return this.picker;
  }
  getInteractionEngine() {
    return this.interactionEngine;
  }
  getObserver() {
    return this.observer;
  }
  getNodeRegistry() {
    return this.nodeRegistry;
  }
  /**
   * Universal Dispatcher for all Live Browser Commands
   */
  async handleCommand(request, doc = typeof document !== "undefined" ? document : {}) {
    const startTime = Date.now();
    const { id, command, payload } = request;
    try {
      switch (command) {
        // 1. Page-Level Inspection
        case "LIVE_PAGE_INSPECT": {
          const pageInfo = LiveDOMInspector.inspectPage(doc);
          return this.success(id, command, pageInfo, startTime);
        }
        // 2. Element-Level Inspection
        case "LIVE_ELEMENT_INSPECT": {
          const target = this.resolveTarget(payload, doc);
          const elementInfo = LiveDOMInspector.inspectElement(target, this.nodeRegistry);
          return this.success(id, command, elementInfo, startTime);
        }
        // 3. Get Selected Element (Ctrl+Shift+Click)
        case "GET_SELECTED_ELEMENT": {
          const selected = this.picker.getLastSelectedElement();
          return this.success(id, command, selected, startTime);
        }
        // 4. Element Picker Controls
        case "ELEMENT_PICKER_START": {
          this.picker.startPicker();
          return this.success(id, command, { pickerActive: true }, startTime);
        }
        case "ELEMENT_PICKER_STOP": {
          this.picker.stopPicker();
          return this.success(id, command, { pickerActive: false }, startTime);
        }
        // 5. Element Interaction
        case "LIVE_ELEMENT_INTERACT": {
          const interactionPayload = payload;
          const result = await this.interactionEngine.interact(interactionPayload, doc);
          return this.success(id, command, result, startTime);
        }
        // 6. Element Observation
        case "ELEMENT_OBSERVATION_START": {
          const target = this.resolveTarget(payload, doc);
          const obsInfo = this.observer.startObservation(target, doc);
          return this.success(id, command, obsInfo, startTime);
        }
        case "ELEMENT_OBSERVATION_STOP": {
          const bundle = this.observer.stopObservation(doc);
          return this.success(id, command, bundle, startTime);
        }
        // 7. Live DOM Snapshot
        case "LIVE_DOM_SNAPSHOT": {
          const format = payload?.format || "html";
          if (format === "html") {
            const html = doc.documentElement?.outerHTML || "";
            return this.success(id, command, { html }, startTime);
          }
          const snapshot = this.snapshotEngine.captureSnapshot(doc, "live_session");
          return this.success(id, command, snapshot, startTime);
        }
        // 8. Live DOM Subtree
        case "LIVE_DOM_SUBTREE": {
          const target = this.resolveTarget(payload, doc);
          const html = target.outerHTML || "";
          const info = LiveDOMInspector.inspectElement(target, this.nodeRegistry);
          return this.success(id, command, { html, element: info }, startTime);
        }
        // 9. Element Visual & Occlusion State
        case "GET_ELEMENT_VISUAL_STATE": {
          const target = this.resolveTarget(payload, doc);
          const visualState = LiveDOMInspector.inspectVisualState(target);
          return this.success(id, command, visualState, startTime);
        }
        // 10. Live Screenshots
        case "LIVE_PAGE_SCREENSHOT":
        case "LIVE_ELEMENT_SCREENSHOT": {
          const screenshot = await this.handleScreenshotCapture(command, payload, doc);
          return this.success(id, command, screenshot, startTime);
        }
        default:
          return this.error(id, command, "UNKNOWN_COMMAND", `Unsupported command '${command}'`, startTime);
      }
    } catch (err) {
      return this.error(id, command, "COMMAND_EXECUTION_FAILED", err.message, startTime, err.details);
    }
  }
  resolveTarget(targetSpec, doc) {
    if (!targetSpec) {
      throw new Error("Target specifier must be provided");
    }
    if (typeof targetSpec === "string") {
      return this.interactionEngine.resolveTarget({ selector: targetSpec }, doc);
    }
    if (typeof targetSpec === "number") {
      return this.interactionEngine.resolveTarget({ nodeId: targetSpec }, doc);
    }
    return this.interactionEngine.resolveTarget(targetSpec, doc);
  }
  async handleScreenshotCapture(command, payload, doc) {
    const win = doc.defaultView || (typeof window !== "undefined" ? window : {});
    const timestamp = Date.now();
    const screenshotId = `scr_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;
    const dpr = win.devicePixelRatio || 1;
    const viewport = {
      width: win.innerWidth || doc.documentElement?.clientWidth || 1920,
      height: win.innerHeight || doc.documentElement?.clientHeight || 1080,
      scrollX: win.scrollX || win.pageXOffset || 0,
      scrollY: win.scrollY || win.pageYOffset || 0,
      devicePixelRatio: dpr
    };
    let targetSelector = void 0;
    let targetNodeId = void 0;
    let targetBounds = void 0;
    let captureDimensions = { width: viewport.width, height: viewport.height };
    if (command === "LIVE_ELEMENT_SCREENSHOT") {
      const target = this.resolveTarget(payload, doc);
      const info = LiveDOMInspector.inspectElement(target, this.nodeRegistry);
      targetSelector = info.bestSelector;
      targetNodeId = info.forensics?.logicalNodeId || void 0;
      targetBounds = {
        x: info.bounds.x,
        y: info.bounds.y,
        width: info.bounds.width,
        height: info.bounds.height
      };
      captureDimensions = {
        width: Math.max(1, Math.round(info.bounds.width * dpr)),
        height: Math.max(1, Math.round(info.bounds.height * dpr))
      };
    }
    let dataUrl = payload?.dataUrl || "";
    if (command === "LIVE_ELEMENT_SCREENSHOT" && dataUrl && targetBounds && typeof Image !== "undefined") {
      try {
        const cropped = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const cropCanvas = doc.createElement("canvas");
              const sx = Math.max(0, Math.floor(targetBounds.x * dpr));
              const sy = Math.max(0, Math.floor(targetBounds.y * dpr));
              const sw = Math.max(1, Math.floor(targetBounds.width * dpr));
              const sh = Math.max(1, Math.floor(targetBounds.height * dpr));
              cropCanvas.width = sw;
              cropCanvas.height = sh;
              const ctx = cropCanvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                resolve(cropCanvas.toDataURL("image/png"));
                return;
              }
            } catch {
            }
            resolve(dataUrl);
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });
        if (cropped) {
          dataUrl = cropped;
        }
      } catch {
      }
    }
    if (!dataUrl) {
      const width = command === "LIVE_ELEMENT_SCREENSHOT" ? Math.max(120, captureDimensions.width || 320) : Math.max(800, viewport.width || 1280);
      const height = command === "LIVE_ELEMENT_SCREENSHOT" ? Math.max(60, captureDimensions.height || 180) : Math.max(600, viewport.height || 800);
      dataUrl = PNGBuilder.createDataUrl({
        width,
        height,
        backgroundColor: command === "LIVE_ELEMENT_SCREENSHOT" ? [30, 41, 59, 255] : [15, 23, 42, 255],
        headerColor: [56, 189, 248, 255],
        borderColor: [99, 102, 241, 255],
        label: targetSelector || (command === "LIVE_ELEMENT_SCREENSHOT" ? "Element Screenshot" : "Page Screenshot")
      });
    }
    return {
      screenshotId,
      timestamp,
      url: win.location?.href || doc.location?.href || "",
      viewport,
      targetSelector,
      targetNodeId,
      targetBounds,
      dataUrl,
      imageFormat: "png",
      dimensions: captureDimensions,
      captureType: command === "LIVE_ELEMENT_SCREENSHOT" ? "ELEMENT" : "FULL_PAGE"
    };
  }
  success(id, command, data, startTime) {
    return {
      id,
      command,
      success: true,
      data,
      timestamp: Date.now(),
      durationMs: Date.now() - startTime
    };
  }
  error(id, command, code, message, startTime, details) {
    return {
      id,
      command,
      success: false,
      error: { code, message, details },
      timestamp: Date.now(),
      durationMs: Date.now() - startTime
    };
  }
}
class LiveToolsHandler {
  localController;
  bridgeClient;
  constructor(localController, bridgeClient) {
    this.localController = localController || new LiveBrowserController();
    this.bridgeClient = bridgeClient;
  }
  setBridgeClient(client) {
    this.bridgeClient = client;
  }
  getLocalController() {
    return this.localController;
  }
  async handleToolCall(name, args) {
    try {
      switch (name) {
        case "inspect_live_page":
          return await this.handleInspectLivePage(args);
        case "inspect_live_element":
          return await this.handleInspectLiveElement(args);
        case "get_selected_element":
          return await this.handleGetSelectedElement(args);
        case "start_element_picker":
          return await this.handleStartElementPicker(args);
        case "stop_element_picker":
          return await this.handleStopElementPicker(args);
        case "capture_page_screenshot":
          return await this.handleCapturePageScreenshot(args);
        case "capture_element_screenshot":
          return await this.handleCaptureElementScreenshot(args);
        case "interact_with_element":
          return await this.handleInteractWithElement(args);
        case "start_element_observation":
          return await this.handleStartElementObservation(args);
        case "stop_element_observation":
          return await this.handleStopElementObservation(args);
        case "get_live_dom_snapshot":
          return await this.handleGetLiveDOMSnapshot(args);
        case "get_live_dom_subtree":
          return await this.handleGetLiveDOMSubtree(args);
        case "get_element_visual_state":
          return await this.handleGetElementVisualState(args);
        default:
          return {
            isError: true,
            content: [{ type: "text", text: `Unknown live tool: ${name}` }]
          };
      }
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Live tool execution error in '${name}': ${err.message}` }]
      };
    }
  }
  async dispatch(command, payload) {
    if (this.bridgeClient) {
      return await this.bridgeClient.sendCommand(command, payload);
    }
    const req = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      command,
      timestamp: Date.now(),
      payload
    };
    const res = await this.localController.handleCommand(req);
    if (!res.success) {
      throw new Error(res.error?.message || "Browser command failed");
    }
    return res.data;
  }
  // 1. inspect_live_page
  async handleInspectLivePage(args) {
    const data = await this.dispatch("LIVE_PAGE_INSPECT", args);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
  // 2. inspect_live_element
  async handleInspectLiveElement(args) {
    const target = this.extractTarget(args);
    const data = await this.dispatch("LIVE_ELEMENT_INSPECT", target);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
  // 3. get_selected_element
  async handleGetSelectedElement(_args) {
    let data = this.localController.getPicker().getLastSelectedElement();
    if (!data) {
      try {
        data = await this.dispatch("GET_SELECTED_ELEMENT");
      } catch {
      }
    }
    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              selected: false,
              message: "No element has been selected yet. Use Ctrl + Shift + Click in the browser or call start_element_picker."
            }, null, 2)
          }
        ]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ selected: true, element: data }, null, 2) }]
    };
  }
  // 4. start_element_picker
  async handleStartElementPicker(args) {
    const data = await this.dispatch("ELEMENT_PICKER_START", args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "PICKER_ACTIVE",
            message: "Visual element picker activated in the browser. Click any element or hold Ctrl+Shift and click.",
            details: data
          }, null, 2)
        }
      ]
    };
  }
  // 5. stop_element_picker
  async handleStopElementPicker(args) {
    const data = await this.dispatch("ELEMENT_PICKER_STOP", args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "PICKER_INACTIVE",
            message: "Visual element picker stopped.",
            details: data
          }, null, 2)
        }
      ]
    };
  }
  // 6. capture_page_screenshot
  async handleCapturePageScreenshot(args) {
    const data = await this.dispatch("LIVE_PAGE_SCREENSHOT", args);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
  // 7. capture_element_screenshot
  async handleCaptureElementScreenshot(args) {
    const target = this.extractTarget(args);
    const data = await this.dispatch("LIVE_ELEMENT_SCREENSHOT", target);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
  // 8. interact_with_element
  async handleInteractWithElement(args) {
    const target = this.extractTarget(args);
    const action = args.action || "click";
    const payload = {
      action,
      target,
      text: args.text,
      key: args.key,
      optionValue: args.optionValue,
      scrollDelta: args.scrollDelta,
      options: {
        waitForStabilization: args.waitForStabilization !== false,
        stabilizationTimeoutMs: args.stabilizationTimeoutMs || 300,
        captureScreenshots: args.captureScreenshots || false
      }
    };
    const data = await this.dispatch("LIVE_ELEMENT_INTERACT", payload);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
  // 9. start_element_observation
  async handleStartElementObservation(args) {
    const target = this.extractTarget(args);
    const data = await this.dispatch("ELEMENT_OBSERVATION_START", target);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "OBSERVATION_ACTIVE",
            message: "Focused observation started around target element.",
            initialState: data.initialState,
            observationId: data.observationId
          }, null, 2)
        }
      ]
    };
  }
  // 10. stop_element_observation
  async handleStopElementObservation(args) {
    const data = await this.dispatch("ELEMENT_OBSERVATION_STOP", args);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
  // 11. get_live_dom_snapshot
  async handleGetLiveDOMSnapshot(args) {
    const data = await this.dispatch("LIVE_DOM_SNAPSHOT", args);
    if (typeof data?.html === "string") {
      return { content: [{ type: "text", text: data.html }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
  // 12. get_live_dom_subtree
  async handleGetLiveDOMSubtree(args) {
    const target = this.extractTarget(args);
    const data = await this.dispatch("LIVE_DOM_SUBTREE", target);
    if (typeof data?.html === "string") {
      return { content: [{ type: "text", text: data.html }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
  // 13. get_element_visual_state
  async handleGetElementVisualState(args) {
    const target = this.extractTarget(args);
    const data = await this.dispatch("GET_ELEMENT_VISUAL_STATE", target);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
  extractTarget(args) {
    if (args.target) return args.target;
    if (args.selector) return { selector: args.selector };
    if (typeof args.nodeId === "number") return { nodeId: args.nodeId };
    if (args.selectedElementRef) return { selectedElementRef: args.selectedElementRef };
    if (args.xpath) return { xpath: args.xpath };
    if (args.coordinates) return { coordinates: args.coordinates };
    return args;
  }
}
class MCPToolsHandler {
  storage;
  liveToolsHandler;
  constructor(storage, liveToolsHandler) {
    this.storage = storage;
    this.liveToolsHandler = liveToolsHandler || new LiveToolsHandler();
  }
  getLiveToolsHandler() {
    return this.liveToolsHandler;
  }
  async handleToolCall(name, args) {
    try {
      if (name === "inspect_live_page" || name === "inspect_live_element" || name === "get_selected_element" || name === "start_element_picker" || name === "stop_element_picker" || name === "capture_page_screenshot" || name === "capture_element_screenshot" || name === "interact_with_element" || name === "start_element_observation" || name === "stop_element_observation" || name === "get_live_dom_snapshot" || name === "get_live_dom_subtree" || name === "get_element_visual_state") {
        return await this.liveToolsHandler.handleToolCall(name, args);
      }
      switch (name) {
        case "list_sessions":
          return await this.handleListSessions(args);
        case "get_session":
          return await this.handleGetSession(args);
        case "export_session":
          return await this.handleExportSession(args);
        case "import_session":
          return await this.handleImportSession(args);
        case "delete_session":
          return await this.handleDeleteSession(args);
        case "get_timeline":
          return await this.handleGetTimeline(args);
        case "get_events":
          return await this.handleGetEvents(args);
        case "get_events_around":
          return await this.handleGetEventsAround(args);
        case "get_dom_state":
          return await this.handleGetDOMState(args);
        case "get_dom_node":
          return await this.handleGetDOMNode(args);
        case "get_dom_subtree":
          return await this.handleGetDOMSubtree(args);
        case "diff_dom":
          return await this.handleDiffDOM(args);
        case "trace_element":
          return await this.handleTraceElement(args);
        case "find_disappearing_elements":
          return await this.handleFindDisappearingElements(args);
        case "why_did_element_disappear":
          return await this.handleWhyDidElementDisappear(args);
        case "get_diagnostics":
          return await this.handleGetDiagnostics(args);
        case "get_network_events":
          return await this.handleGetNetworkEvents(args);
        case "get_screenshots":
          return await this.handleGetScreenshots(args);
        case "annotate_session":
          return await this.handleAnnotateSession(args);
        case "get_annotations":
          return await this.handleGetAnnotations(args);
        case "get_recording_health":
          return await this.handleGetRecordingHealth(args);
        default:
          return {
            isError: true,
            content: [{ type: "text", text: `Unknown tool: ${name}` }]
          };
      }
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Tool error in ${name}: ${err.message}` }]
      };
    }
  }
  async getReconstructor(sessionId) {
    const checkpoints = await this.storage.getCheckpoints(sessionId);
    const events = await this.storage.getEvents(sessionId);
    return new StateReconstructor(checkpoints, events);
  }
  async handleListSessions(args) {
    const sessions = await this.storage.listSessions();
    const limit = args.limit || 20;
    const items = sessions.slice(0, limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            totalSessions: sessions.length,
            sessions: items.map((s) => ({
              id: s.id,
              name: s.name,
              url: s.url,
              startTime: s.startTime,
              durationMs: s.durationMs,
              status: s.status,
              stats: s.stats
            }))
          }, null, 2)
        }
      ]
    };
  }
  async handleGetSession(args) {
    const session = await this.storage.getSession(args.sessionId);
    if (!session) {
      return { isError: true, content: [{ type: "text", text: `Session '${args.sessionId}' not found` }] };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(session, null, 2) }]
    };
  }
  async handleExportSession(args) {
    const session = await this.storage.getSession(args.sessionId);
    if (!session) {
      return { isError: true, content: [{ type: "text", text: `Session '${args.sessionId}' not found` }] };
    }
    const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId) || (await this.storage.getCheckpoints(args.sessionId))[0]?.snapshot;
    if (!initialSnapshot) {
      return { isError: true, content: [{ type: "text", text: "No snapshot available to export" }] };
    }
    const events = await this.storage.getEvents(args.sessionId);
    const checkpoints = await this.storage.getCheckpoints(args.sessionId);
    const annotations = await this.storage.getAnnotations(args.sessionId);
    const bundle = SessionSerializer.exportBundle(session, initialSnapshot, events, checkpoints, annotations);
    return {
      content: [{ type: "text", text: SessionSerializer.exportToJson(bundle) }]
    };
  }
  async handleImportSession(args) {
    const bundle = SessionSerializer.importFromJson(args.bundleJson);
    const integrity = SessionSerializer.validateIntegrity(bundle);
    await this.storage.saveSession(bundle.metadata);
    await this.storage.saveInitialSnapshot(bundle.metadata.id, bundle.initialSnapshot);
    await this.storage.appendEvents(bundle.metadata.id, bundle.events);
    for (const chk of bundle.checkpoints) {
      await this.storage.saveCheckpoint(chk);
    }
    for (const ann of bundle.annotations) {
      await this.storage.addAnnotation(ann);
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: `Session '${bundle.metadata.id}' successfully imported`,
            eventsCount: bundle.events.length,
            checkpointsCount: bundle.checkpoints.length,
            integrity
          }, null, 2)
        }
      ]
    };
  }
  async handleDeleteSession(args) {
    const success = await this.storage.deleteSession(args.sessionId);
    return {
      content: [{ type: "text", text: JSON.stringify({ success, sessionId: args.sessionId }) }]
    };
  }
  async handleGetTimeline(args) {
    const session = await this.storage.getSession(args.sessionId);
    const events = await this.storage.getEvents(args.sessionId);
    const breakdown = {};
    for (const evt of events) {
      breakdown[evt.category] = (breakdown[evt.category] || 0) + 1;
    }
    const firstTime = events.length > 0 ? events[0].timestamp : 0;
    const lastTime = events.length > 0 ? events[events.length - 1].timestamp : 0;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sessionId: args.sessionId,
            durationMs: lastTime - firstTime,
            firstTimestamp: firstTime,
            lastTimestamp: lastTime,
            totalEvents: events.length,
            categoryBreakdown: breakdown,
            sessionStatus: session?.status
          }, null, 2)
        }
      ]
    };
  }
  async handleGetEvents(args) {
    const events = await this.storage.getEvents(args.sessionId, {
      category: args.category,
      type: args.type,
      fromTimestamp: args.fromTimestamp,
      toTimestamp: args.toTimestamp,
      targetNodeId: args.targetNodeId,
      targetSelector: args.targetSelector,
      searchQuery: args.searchQuery,
      limit: args.limit || 50,
      offset: args.offset || 0
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sessionId: args.sessionId,
            returnedEvents: events.length,
            events: events.map((e) => ({
              id: e.id,
              sequence: e.sequence,
              timestamp: e.timestamp,
              type: e.type,
              category: e.category,
              targetNodeId: e.targetNodeId,
              targetSelector: e.targetSelector,
              payload: e.payload
            }))
          }, null, 2)
        }
      ]
    };
  }
  async handleGetEventsAround(args) {
    const events = await this.storage.getEvents(args.sessionId);
    let targetTime = args.timestamp;
    if (typeof targetTime !== "number" && args.eventId) {
      const match = events.find((e) => e.id === args.eventId);
      if (match) targetTime = match.timestamp;
    }
    if (typeof targetTime !== "number") {
      return { isError: true, content: [{ type: "text", text: "Target timestamp or eventId must be provided" }] };
    }
    const windowMs = args.windowMs || 300;
    const windowEvents = events.filter((e) => Math.abs(e.timestamp - targetTime) <= windowMs);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sessionId: args.sessionId,
            targetTimestamp: targetTime,
            windowMs,
            totalEventsInWindow: windowEvents.length,
            events: windowEvents
          }, null, 2)
        }
      ]
    };
  }
  async handleGetDOMState(args) {
    const reconstructor = await this.getReconstructor(args.sessionId);
    const snapshot = reconstructor.getStateAt({
      timestamp: args.timestamp,
      eventId: args.eventId
    });
    const format = args.format || "html";
    if (format === "html") {
      const treeBuilder = new VirtualTreeBuilder(snapshot.nodes, snapshot.rootId);
      const html = treeBuilder.toHTML();
      return {
        content: [{ type: "text", text: html }]
      };
    }
    if (format === "json_summary") {
      const activeNodes = Object.values(snapshot.nodes).filter((n) => !n.isDetached);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              snapshotId: snapshot.snapshotId,
              timestamp: snapshot.timestamp,
              sequence: snapshot.sequence,
              title: snapshot.title,
              url: snapshot.url,
              totalNodeCount: snapshot.totalNodeCount,
              activeNodes: activeNodes.map((n) => ({
                id: n.id,
                tag: n.tagName,
                selector: VirtualQueryEngine.computeSelector(n, snapshot.nodes),
                attributes: n.attributes,
                childrenCount: n.children?.length || 0
              }))
            }, null, 2)
          }
        ]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }]
    };
  }
  async handleGetDOMNode(args) {
    const reconstructor = await this.getReconstructor(args.sessionId);
    const snapshot = reconstructor.getStateAt({ timestamp: args.timestamp || 0 });
    let targetNode = args.nodeId ? snapshot.nodes[args.nodeId] : void 0;
    if (!targetNode && args.selector) {
      const match = VirtualQueryEngine.querySelector(args.selector, snapshot.rootId, snapshot.nodes);
      if (match) targetNode = match;
    }
    if (!targetNode) {
      return {
        isError: true,
        content: [{ type: "text", text: `Node not found in DOM state at timestamp ${args.timestamp}` }]
      };
    }
    const selector = VirtualQueryEngine.computeSelector(targetNode, snapshot.nodes);
    const parentNode = targetNode.parentId ? snapshot.nodes[targetNode.parentId] : null;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: targetNode.id,
            tagName: targetNode.tagName,
            nodeType: targetNode.nodeType,
            selector,
            attributes: targetNode.attributes,
            textContent: targetNode.textContent,
            parentId: targetNode.parentId,
            parentSelector: parentNode ? VirtualQueryEngine.computeSelector(parentNode, snapshot.nodes) : null,
            childrenIds: targetNode.children,
            isDetached: targetNode.isDetached || false,
            isHidden: targetNode.isHidden || false,
            computedStyles: targetNode.computedStyles,
            boundingClientRect: targetNode.boundingClientRect
          }, null, 2)
        }
      ]
    };
  }
  async handleGetDOMSubtree(args) {
    const reconstructor = await this.getReconstructor(args.sessionId);
    const snapshot = reconstructor.getStateAt({ timestamp: args.timestamp || 0 });
    let targetId = args.nodeId;
    if (!targetId && args.selector) {
      const match = VirtualQueryEngine.querySelector(args.selector, snapshot.rootId, snapshot.nodes);
      if (match) targetId = match.id;
    }
    if (!targetId || !snapshot.nodes[targetId]) {
      return {
        isError: true,
        content: [{ type: "text", text: `Subtree target not found at timestamp ${args.timestamp}` }]
      };
    }
    const treeBuilder = new VirtualTreeBuilder(snapshot.nodes, targetId);
    const html = treeBuilder.toHTML(targetId);
    return {
      content: [{ type: "text", text: html }]
    };
  }
  async handleDiffDOM(args) {
    const reconstructor = await this.getReconstructor(args.sessionId);
    const s1 = reconstructor.getStateAt({ timestamp: args.t1, eventId: args.e1 });
    const s2 = reconstructor.getStateAt({ timestamp: args.t2, eventId: args.e2 });
    const diff = DOMDiffEngine.diff(s1, s2);
    const markdownFormatted = DiffFormatter.formatMarkdown(diff);
    return {
      content: [
        {
          type: "text",
          text: markdownFormatted + "\n\n" + JSON.stringify(diff, null, 2)
        }
      ]
    };
  }
  async handleTraceElement(args) {
    const events = await this.storage.getEvents(args.sessionId);
    const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);
    const trace = LifecycleTracer.traceElement(
      { nodeId: args.nodeId, selector: args.selector },
      events,
      initialSnapshot || void 0
    );
    if (!trace) {
      return {
        isError: true,
        content: [{ type: "text", text: `Element could not be found to trace: ${JSON.stringify(args)}` }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(trace, null, 2) }]
    };
  }
  async handleFindDisappearingElements(args) {
    const events = await this.storage.getEvents(args.sessionId);
    const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);
    const maxLifespan = args.maxLifespanMs || 5e3;
    const removedEvents = events.filter((e) => e.type === "DOM_MUTATION_REMOVE");
    const results = [];
    for (const rem of removedEvents) {
      const nodeId = rem.payload?.nodeId;
      if (nodeId) {
        const trace = LifecycleTracer.traceElement({ nodeId }, events, initialSnapshot || void 0);
        if (trace && trace.lifespanMs <= maxLifespan) {
          results.push({
            nodeId: trace.targetNodeId,
            tagName: trace.tagName,
            selector: trace.selectorHint,
            createdAt: trace.createdAt,
            removedAt: trace.removedAt,
            lifespanMs: trace.lifespanMs,
            mutationCount: trace.mutationCount
          });
        }
      }
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sessionId: args.sessionId,
            maxLifespanMs: maxLifespan,
            disappearingElementsCount: results.length,
            elements: results
          }, null, 2)
        }
      ]
    };
  }
  async handleWhyDidElementDisappear(args) {
    const events = await this.storage.getEvents(args.sessionId);
    const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);
    const report = DisappearingElementAnalyzer.analyze(args.target, events, initialSnapshot || void 0);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(report, null, 2)
        }
      ]
    };
  }
  async handleGetDiagnostics(args) {
    const events = await this.storage.getEvents(args.sessionId);
    const filtered = events.filter((e) => {
      if (e.category !== "CONSOLE" && e.category !== "ERROR") return false;
      if (typeof args.fromTimestamp === "number" && e.timestamp < args.fromTimestamp) return false;
      if (typeof args.toTimestamp === "number" && e.timestamp > args.toTimestamp) return false;
      if (args.level && args.level !== "all") {
        const level = e.payload?.level;
        if (args.level === "error" && e.category !== "ERROR" && level !== "error") return false;
        if (args.level !== "error" && level !== args.level) return false;
      }
      return true;
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sessionId: args.sessionId,
            totalDiagnostics: filtered.length,
            diagnostics: filtered
          }, null, 2)
        }
      ]
    };
  }
  async handleGetNetworkEvents(args) {
    const events = await this.storage.getEvents(args.sessionId);
    const networkEvents = events.filter((e) => e.category === "NETWORK");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sessionId: args.sessionId,
            totalNetworkEvents: networkEvents.length,
            events: networkEvents
          }, null, 2)
        }
      ]
    };
  }
  async handleGetScreenshots(args) {
    const events = await this.storage.getEvents(args.sessionId);
    const screenshotEvents = events.filter((e) => e.category === "SCREENSHOT");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sessionId: args.sessionId,
            totalScreenshots: screenshotEvents.length,
            screenshots: screenshotEvents.map((s) => ({
              id: s.id,
              timestamp: s.timestamp,
              sequence: s.sequence,
              triggerReason: s.payload?.triggerReason,
              hasDataUrl: !!s.payload?.dataUrl
            }))
          }, null, 2)
        }
      ]
    };
  }
  async handleAnnotateSession(args) {
    const annotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: args.sessionId,
      timestamp: args.timestamp || 0,
      nodeId: args.nodeId,
      author: "AGENT",
      label: args.label,
      comment: args.comment,
      category: args.category || "NOTE",
      createdAt: Date.now()
    };
    await this.storage.addAnnotation(annotation);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, annotation }, null, 2)
        }
      ]
    };
  }
  async handleGetAnnotations(args) {
    const annotations = await this.storage.getAnnotations(args.sessionId);
    return {
      content: [{ type: "text", text: JSON.stringify({ sessionId: args.sessionId, annotations }, null, 2) }]
    };
  }
  async handleGetRecordingHealth(args) {
    const session = await this.storage.getSession(args.sessionId);
    if (!session) {
      return { isError: true, content: [{ type: "text", text: `Session '${args.sessionId}' not found` }] };
    }
    const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);
    const events = await this.storage.getEvents(args.sessionId);
    const checkpoints = await this.storage.getCheckpoints(args.sessionId);
    const snapshotToUse = initialSnapshot || checkpoints[0]?.snapshot || {
      snapshotId: "snap_empty",
      sessionId: session.id,
      timestamp: 0,
      sequence: 0,
      rootId: 1,
      nodes: {},
      title: session.title || "",
      url: session.url || "",
      origin: session.origin || "",
      viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
      totalNodeCount: 0
    };
    const bundle = SessionSerializer.exportBundle(session, snapshotToUse, events, checkpoints);
    const integrity = SessionSerializer.validateIntegrity(bundle);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sessionId: args.sessionId,
            health: session.health,
            stats: session.stats,
            integrity
          }, null, 2)
        }
      ]
    };
  }
}
class MCPBridgeServer {
  port;
  storage;
  toolsHandler;
  httpServer = null;
  wss = null;
  activeSockets = /* @__PURE__ */ new Set();
  pendingCommands = /* @__PURE__ */ new Map();
  constructor(port = 3847, storage) {
    this.port = port;
    this.storage = storage || new FileStorageProvider("./.forensic_sessions");
    this.toolsHandler = new MCPToolsHandler(this.storage);
    this.toolsHandler.getLiveToolsHandler().setBridgeClient(this);
  }
  getToolsHandler() {
    return this.toolsHandler;
  }
  /**
   * BrowserBridgeClient implementation: Send live command to connected Chrome extension
   */
  async sendCommand(command, payload) {
    if (this.activeSockets.size === 0) {
      throw new Error("No active browser extension connected to MCP bridge");
    }
    const commandId = `bridge_cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ws = Array.from(this.activeSockets)[this.activeSockets.size - 1];
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(commandId);
        reject(new Error(`Browser command '${command}' timed out after 8000ms`));
      }, 8e3);
      this.pendingCommands.set(commandId, { resolve, reject, timer });
      ws.send(
        JSON.stringify({
          type: "BROWSER_COMMAND_REQUEST",
          id: commandId,
          command,
          payload,
          timestamp: Date.now()
        })
      );
    });
  }
  start() {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }
        const url = req.url || "";
        if (url === "/health" && req.method === "GET") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "ok",
              server: "browser-forensic-bridge",
              version: "2.0.0",
              connectedBrowsers: this.activeSockets.size
            })
          );
          return;
        }
        const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024;
        if (url === "/api/sessions/upload" && req.method === "POST") {
          let body = "";
          let isTooLarge = false;
          req.on("data", (chunk) => {
            if (isTooLarge) return;
            body += chunk;
            if (body.length > MAX_PAYLOAD_BYTES) {
              isTooLarge = true;
              res.writeHead(413, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Payload too large (exceeds 50MB)" }));
              req.destroy();
            }
          });
          req.on("end", async () => {
            if (isTooLarge) return;
            try {
              const bundle = SessionSerializer.importFromJson(body);
              await this.storage.saveSession(bundle.metadata);
              await this.storage.saveInitialSnapshot(bundle.metadata.id, bundle.initialSnapshot);
              await this.storage.appendEvents(bundle.metadata.id, bundle.events);
              for (const chk of bundle.checkpoints) {
                await this.storage.saveCheckpoint(chk);
              }
              for (const ann of bundle.annotations) {
                await this.storage.addAnnotation(ann);
              }
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, sessionId: bundle.metadata.id }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        if (url === "/api/mcp/tool" && req.method === "POST") {
          let body = "";
          let isTooLarge = false;
          req.on("data", (chunk) => {
            if (isTooLarge) return;
            body += chunk;
            if (body.length > MAX_PAYLOAD_BYTES) {
              isTooLarge = true;
              res.writeHead(413, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Payload too large (exceeds 50MB)" }));
              req.destroy();
            }
          });
          req.on("end", async () => {
            if (isTooLarge) return;
            try {
              const { name, arguments: args } = JSON.parse(body);
              const result = await this.toolsHandler.handleToolCall(name, args || {});
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ isError: true, error: err.message }));
            }
          });
          return;
        }
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Endpoint not found" }));
      });
      this.httpServer.on("error", (err) => {
        reject(err);
      });
      this.httpServer.listen(this.port, () => {
        this.wss = new WebSocketServer({ server: this.httpServer });
        this.wss.on("error", () => {
        });
        this.wss.on("connection", (ws) => {
          this.activeSockets.add(ws);
          ws.on("close", () => {
            this.activeSockets.delete(ws);
          });
          ws.on("error", () => {
            this.activeSockets.delete(ws);
          });
          ws.on("message", async (data) => {
            try {
              const message = JSON.parse(data.toString());
              if (message.type === "BROWSER_COMMAND_RESPONSE" && message.id) {
                const pending = this.pendingCommands.get(message.id);
                if (pending) {
                  clearTimeout(pending.timer);
                  this.pendingCommands.delete(message.id);
                  if (message.success) {
                    pending.resolve(message.data);
                  } else {
                    pending.reject(new Error(message.error?.message || "Browser command failed"));
                  }
                }
                return;
              }
              if (message.type === "ELEMENT_SELECTED" && message.elementInfo) {
                this.toolsHandler.getLiveToolsHandler().getLocalController().getPicker().setSelectedElement(message.elementInfo);
                return;
              }
              if (message.type === "SESSION_START" || message.type === "FORENSIC_SESSION_START") {
                await this.storage.saveSession(message.metadata);
                if (message.initialSnapshot) {
                  await this.storage.saveInitialSnapshot(message.metadata.id, message.initialSnapshot);
                }
              } else if (message.type === "EVENTS_CHUNK" || message.type === "FORENSIC_EVENTS_CHUNK") {
                await this.storage.appendEvents(message.sessionId, message.events);
              } else if (message.type === "CHECKPOINT" || message.type === "FORENSIC_CHECKPOINT") {
                await this.storage.saveCheckpoint(message.checkpoint);
              } else if (message.type === "SESSION_STOP" || message.type === "FORENSIC_SESSION_STOP") {
                const session = await this.storage.getSession(message.sessionId);
                if (session) {
                  session.status = "stopped";
                  session.endTime = Date.now();
                  if (message.durationMs) session.durationMs = message.durationMs;
                  await this.storage.saveSession(session);
                }
              }
            } catch (err) {
              console.error("[MCPBridge] WebSocket message processing error:", err);
            }
          });
        });
        resolve();
      });
    });
  }
  stop() {
    return new Promise((resolve) => {
      for (const [_, pending] of this.pendingCommands) {
        clearTimeout(pending.timer);
        pending.reject(new Error("MCP Bridge stopped"));
      }
      this.pendingCommands.clear();
      this.activeSockets.clear();
      if (this.wss) {
        this.wss.close();
      }
      if (this.httpServer) {
        this.httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
export {
  FileStorageProvider as F,
  MCPToolsHandler as M,
  MCPBridgeServer
};
