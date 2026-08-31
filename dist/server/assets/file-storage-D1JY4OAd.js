import * as fs from "fs";
import * as path from "path";
//#region src/reconstruction/checkpoint-manager.ts
var CheckpointManager = class {
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
				if (cp.sequence <= targetSeq) best = cp;
				else break;
			}
			return best;
		}
		if (typeof target.timestamp === "number") {
			const targetTime = target.timestamp;
			let best = this.checkpoints[0];
			for (let i = 0; i < this.checkpoints.length; i++) {
				const cp = this.checkpoints[i];
				if (cp.timestamp <= targetTime) best = cp;
				else break;
			}
			return best;
		}
		return this.checkpoints[0] || null;
	}
	clear() {
		this.checkpoints = [];
	}
};
//#endregion
//#region src/types/dom-node.ts
var VirtualDOMNodeType = /* @__PURE__ */ function(VirtualDOMNodeType) {
	VirtualDOMNodeType[VirtualDOMNodeType["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
	VirtualDOMNodeType[VirtualDOMNodeType["ATTRIBUTE_NODE"] = 2] = "ATTRIBUTE_NODE";
	VirtualDOMNodeType[VirtualDOMNodeType["TEXT_NODE"] = 3] = "TEXT_NODE";
	VirtualDOMNodeType[VirtualDOMNodeType["CDATA_SECTION_NODE"] = 4] = "CDATA_SECTION_NODE";
	VirtualDOMNodeType[VirtualDOMNodeType["PROCESSING_INSTRUCTION_NODE"] = 7] = "PROCESSING_INSTRUCTION_NODE";
	VirtualDOMNodeType[VirtualDOMNodeType["COMMENT_NODE"] = 8] = "COMMENT_NODE";
	VirtualDOMNodeType[VirtualDOMNodeType["DOCUMENT_NODE"] = 9] = "DOCUMENT_NODE";
	VirtualDOMNodeType[VirtualDOMNodeType["DOCUMENT_TYPE_NODE"] = 10] = "DOCUMENT_TYPE_NODE";
	VirtualDOMNodeType[VirtualDOMNodeType["DOCUMENT_FRAGMENT_NODE"] = 11] = "DOCUMENT_FRAGMENT_NODE";
	return VirtualDOMNodeType;
}({});
//#endregion
//#region src/reconstruction/tree-builder.ts
var VirtualTreeBuilder = class VirtualTreeBuilder {
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
			if (existingIdx !== -1) parent.children.splice(existingIdx, 1);
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
			if (typeof payload.index === "number" && payload.index >= 0 && payload.index <= parent.children.length) parent.children.splice(payload.index, 0, node.id);
			else parent.children.push(node.id);
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
				if (idx !== -1) parent.children.splice(idx, 1);
			}
		}
		node.isDetached = true;
		node.parentId = null;
	}
	applyMove(payload) {
		const node = this.nodes[payload.nodeId];
		if (!node) return;
		const oldParentId = payload.oldParentId || node.parentId;
		if (oldParentId && this.nodes[oldParentId]) {
			const oldParent = this.nodes[oldParentId];
			if (oldParent.children) {
				const idx = oldParent.children.indexOf(payload.nodeId);
				if (idx !== -1) oldParent.children.splice(idx, 1);
			}
		}
		const newParentId = payload.newParentId;
		if (newParentId && this.nodes[newParentId]) {
			const newParent = this.nodes[newParentId];
			if (!newParent.children) newParent.children = [];
			node.parentId = newParentId;
			node.isDetached = false;
			if (typeof payload.newIndex === "number" && payload.newIndex >= 0 && payload.newIndex <= newParent.children.length) newParent.children.splice(payload.newIndex, 0, payload.nodeId);
			else newParent.children.push(payload.nodeId);
		}
	}
	applyAttrChange(payload) {
		const node = this.nodes[payload.nodeId];
		if (!node) return;
		if (!node.attributes) node.attributes = {};
		if (payload.newValue === null) delete node.attributes[payload.attributeName];
		else node.attributes[payload.attributeName] = payload.newValue;
		if (payload.attributeName.toLowerCase() === "class") {
			const classVal = payload.newValue || "";
			if (/\b(hidden|hide|d-none|invisible|sr-only|collapsed)\b/i.test(classVal)) node.isHidden = true;
		} else if (payload.attributeName.toLowerCase() === "style") {
			const styleVal = payload.newValue || "";
			if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(styleVal)) node.isHidden = true;
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
		if (node.nodeType === VirtualDOMNodeType.DOCUMENT_NODE) return (node.children || []).map((c) => this.toHTML(c, indent)).join("\n");
		if (node.nodeType === VirtualDOMNodeType.DOCUMENT_TYPE_NODE) return `<!DOCTYPE ${node.tagName || "html"}>`;
		if (node.nodeType === VirtualDOMNodeType.TEXT_NODE) return node.textContent || "";
		if (node.nodeType === VirtualDOMNodeType.COMMENT_NODE) return `${spacing}<!-- ${node.textContent || ""} -->`;
		if (node.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
			const tag = node.tagName || "div";
			const attrs = Object.entries(node.attributes || {}).map(([k, v]) => `${k}="${this.escapeHtmlAttr(v)}"`).join(" ");
			const attrStr = attrs.length > 0 ? ` ${attrs}` : "";
			if ([
				"img",
				"br",
				"hr",
				"input",
				"meta",
				"link"
			].includes(tag)) return `${spacing}<${tag}${attrStr} />`;
			const children = node.children || [];
			if (children.length === 0) {
				if (node.textContent) return `${spacing}<${tag}${attrStr}>${this.escapeHtmlText(node.textContent)}</${tag}>`;
				return `${spacing}<${tag}${attrStr}></${tag}>`;
			}
			if (children.length === 1 && this.nodes[children[0]]?.nodeType === VirtualDOMNodeType.TEXT_NODE) {
				const text = this.nodes[children[0]].textContent || "";
				return `${spacing}<${tag}${attrStr}>${this.escapeHtmlText(text)}</${tag}>`;
			}
			return `${spacing}<${tag}${attrStr}>\n${children.map((c) => this.toHTML(c, indent + 1)).join("\n")}\n${spacing}</${tag}>`;
		}
		return "";
	}
	escapeHtmlAttr(str) {
		return str.replace(/"/g, "&quot;");
	}
	escapeHtmlText(str) {
		return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}
};
//#endregion
//#region src/reconstruction/state-reconstructor.ts
var StateReconstructor = class {
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
		if (this.cache.has(effectiveSequence)) return this.cache.get(effectiveSequence);
		const checkpoint = this.checkpointManager.findNearestCheckpoint({ sequence: effectiveSequence });
		if (!checkpoint) throw new Error("No baseline checkpoint or initial snapshot available for reconstruction");
		const treeBuilder = new VirtualTreeBuilder(checkpoint.snapshot.nodes, checkpoint.snapshot.rootId);
		const deltaEvents = this.events.filter((e) => e.sequence > checkpoint.sequence && e.sequence <= effectiveSequence);
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
};
//#endregion
//#region src/reconstruction/virtual-query.ts
var VirtualQueryEngine = class {
	static matches(node, selector) {
		if (!node || node.nodeType !== VirtualDOMNodeType.ELEMENT_NODE) return false;
		const trimmed = selector.trim();
		if (!trimmed) return false;
		if (trimmed.includes(",")) return trimmed.split(",").some((s) => this.matchesSimple(node, s.trim()));
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
			if (currentNode.children && currentNode.children.length > 0) queue.push(...currentNode.children);
		}
		return results;
	}
	static getElementById(id, nodes) {
		for (const node of Object.values(nodes)) if (node.nodeType === VirtualDOMNodeType.ELEMENT_NODE && !node.isDetached && node.attributes && node.attributes["id"] === id) return node;
		return null;
	}
	static computeSelector(node, nodes) {
		if (!node) return "";
		if (node.nodeType !== VirtualDOMNodeType.ELEMENT_NODE) return node.tagName || `#node-${node.id}`;
		if (node.attributes?.["id"]) return `#${node.attributes["id"]}`;
		const tagName = node.tagName || "div";
		const classes = (node.attributes?.["class"] || "").split(/\s+/).filter((c) => c && !c.startsWith("ng-")).slice(0, 2);
		const classStr = classes.length > 0 ? "." + classes.join(".") : "";
		if (node.parentId && nodes[node.parentId]) {
			const siblings = (nodes[node.parentId].children || []).map((cId) => nodes[cId]).filter((c) => c && c.nodeType === VirtualDOMNodeType.ELEMENT_NODE && c.tagName === tagName);
			if (siblings.length > 1) return `${tagName}${classStr}:nth-of-type(${siblings.findIndex((s) => s.id === node.id) + 1})`;
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
			return (node.attributes?.["class"] || "").split(/\s+/).includes(targetClass);
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
			if (expectedTag !== tagName && expectedTag !== "*") return false;
			if (!rest) return true;
			if (rest.startsWith("#")) return node.attributes?.["id"] === rest.substring(1);
			if (rest.startsWith(".")) return (node.attributes?.["class"] || "").split(/\s+/).includes(rest.substring(1));
			if (rest.startsWith("[")) return this.matchesSimple(node, rest);
		}
		return false;
	}
};
//#endregion
//#region src/diff/dom-diff-engine.ts
var DOMDiffEngine = class {
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
		const ids1 = new Set(Object.values(nodes1).filter((n) => !n.isDetached).map((n) => n.id));
		const ids2 = new Set(Object.values(nodes2).filter((n) => !n.isDetached).map((n) => n.id));
		for (const id of ids2) if (!ids1.has(id)) {
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
		for (const id of ids1) if (!ids2.has(id)) {
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
							if (addedClasses.length > 0 || removedClasses.length > 0) changedClasses.push({
								nodeId: id,
								tagName: node2.tagName,
								addedClasses,
								removedClasses,
								oldClassString: val1 || "",
								newClassString: val2 || "",
								selector
							});
						}
						if (attrName.toLowerCase() === "style") this.diffInlineStyles(id, node2.tagName, val1, val2, selector, changedStyles);
					}
				}
			}
		}
		const hasStructuralChanges = addedNodes.length > 0 || removedNodes.length > 0 || movedNodes.length > 0;
		const hasVisibilityChanges = changedClasses.some((c) => [...c.addedClasses, ...c.removedClasses].some((cls) => /\b(hidden|hide|d-none|invisible|visible|show)\b/i.test(cls))) || changedStyles.some((s) => [
			"display",
			"visibility",
			"opacity"
		].includes(s.propertyName.toLowerCase()));
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
			if (v1 !== v2) acc.push({
				nodeId,
				tagName,
				propertyName: prop,
				oldValue: v1,
				newValue: v2,
				selector
			});
		}
	}
	static renderNodeSnippet(node) {
		if (node.nodeType === VirtualDOMNodeType.TEXT_NODE) return `"${node.textContent || ""}"`;
		const tag = node.tagName || "element";
		const attrs = Object.entries(node.attributes || {}).slice(0, 3).map(([k, v]) => `${k}="${v}"`).join(" ");
		return `<${tag}${attrs ? ` ${attrs}` : ""}>`;
	}
};
//#endregion
//#region src/diff/diff-formatter.ts
var DiffFormatter = class {
	static formatMarkdown(diff) {
		const lines = [];
		lines.push(`### DOM Structural Diff: T1 (${diff.t1.timestamp.toFixed(1)}ms) → T2 (${diff.t2.timestamp.toFixed(1)}ms)`);
		lines.push(`- **Summary**: Total Changes: ${diff.summary.totalChanges} (Added: ${diff.summary.addedNodesCount}, Removed: ${diff.summary.removedNodesCount}, Moved: ${diff.summary.movedNodesCount}, Attr Changes: ${diff.summary.attributeChangesCount}, Class Changes: ${diff.summary.classChangesCount}, Text Changes: ${diff.summary.textChangesCount})`);
		lines.push(`- **Structural Shift**: ${diff.summary.hasStructuralChanges ? "YES" : "NO"}`);
		lines.push(`- **Visibility Impact**: ${diff.summary.hasVisibilityChanges ? "YES" : "NO"}`);
		lines.push("");
		if (diff.addedNodes.length > 0) {
			lines.push("#### ➕ Added Nodes");
			for (const node of diff.addedNodes) lines.push(`- **[ID: ${node.id}]** \`${node.selector}\` — ${node.htmlSnippet}`);
			lines.push("");
		}
		if (diff.removedNodes.length > 0) {
			lines.push("#### ➖ Removed Nodes");
			for (const node of diff.removedNodes) lines.push(`- **[ID: ${node.id}]** \`${node.selector}\` (Parent ID: ${node.lastKnownParentId ?? "none"})`);
			lines.push("");
		}
		if (diff.movedNodes.length > 0) {
			lines.push("#### 🔄 Moved / Reparented Nodes");
			for (const node of diff.movedNodes) lines.push(`- **[ID: ${node.id}]** \`${node.selector}\`: Parent ${node.oldParentId} (idx: ${node.oldIndex}) → Parent ${node.newParentId} (idx: ${node.newIndex})`);
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
			for (const st of diff.changedStyles) lines.push(`- **[ID: ${st.nodeId}]** \`${st.selector}\`: \`${st.propertyName}\`: "${st.oldValue ?? ""}" → "${st.newValue ?? ""}"`);
			lines.push("");
		}
		if (diff.changedAttributes.length > 0) {
			lines.push("#### 📝 Attribute Modifications");
			for (const at of diff.changedAttributes) if (at.attributeName.toLowerCase() !== "class" && at.attributeName.toLowerCase() !== "style") lines.push(`- **[ID: ${at.nodeId}]** \`${at.selector}\`: \`${at.attributeName}\`: "${at.oldValue ?? ""}" → "${at.newValue ?? ""}"`);
			lines.push("");
		}
		if (diff.changedText.length > 0) {
			lines.push("#### 🔤 Text Modifications");
			for (const tx of diff.changedText) lines.push(`- **[ID: ${tx.nodeId}]** (Parent: \`${tx.parentSelector ?? ""}\`): "${tx.oldText}" → "${tx.newText}"`);
			lines.push("");
		}
		return lines.join("\n");
	}
};
//#endregion
//#region src/lifecycle/lifecycle-tracer.ts
var LifecycleTracer = class {
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
			for (const evt of sortedEvents) if (evt.type === "DOM_MUTATION_ADD") {
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
		if (!targetId) return null;
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
			if (!selectorHint) selectorHint = VirtualQueryEngine.computeSelector(node, initialSnapshot.nodes);
			entries.push({
				timestamp: initialSnapshot.timestamp,
				sequence: initialSnapshot.sequence,
				wallClockTime: Date.now(),
				stage: "CREATED",
				eventId: initialSnapshot.snapshotId,
				eventType: "DOM_SNAPSHOT",
				description: `Element <${tagName}> existed in initial baseline snapshot [ID: ${targetId}]`,
				details: {
					initialParentId: node.parentId,
					attributes: initialAttrs
				},
				nodeSnapshot: node
			});
		}
		const parentMap = /* @__PURE__ */ new Map();
		if (initialSnapshot) for (const [idStr, node] of Object.entries(initialSnapshot.nodes)) parentMap.set(Number(idStr), node.parentId ?? null);
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
				if (payload.node?.id) parentMap.set(payload.node.id, payload.parentId ?? null);
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
						details: {
							parentId: payload.parentId,
							index: payload.index
						},
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
						details: {
							parentId: payload.parentId,
							removedIndex: payload.index
						}
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
						details: {
							removedAncestorId: payload.nodeId,
							parentId: payload.parentId
						}
					});
				}
			}
			if (evt.type === "DOM_MUTATION_MOVE") {
				const payload = evt.payload;
				if (payload.nodeId) parentMap.set(payload.nodeId, payload.newParentId ?? null);
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
						details: {
							oldParentId: payload.oldParentId,
							newParentId: payload.newParentId
						}
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
						details: {
							oldText: payload.oldText,
							newText: payload.newText
						}
					});
				}
			}
		}
		const criticalTime = removedAt ?? createdAt;
		const windowMs = 500;
		const correlatedDiagnostics = sortedEvents.filter((e) => (e.category === "ERROR" || e.category === "CONSOLE") && Math.abs(e.timestamp - criticalTime) <= windowMs);
		const correlatedNetwork = sortedEvents.filter((e) => e.category === "NETWORK" && Math.abs(e.timestamp - criticalTime) <= windowMs);
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
};
//#endregion
//#region src/lifecycle/disappearing-analyzer.ts
var DisappearingElementAnalyzer = class {
	static analyze(targetQuery, events, initialSnapshot) {
		const targetObj = typeof targetQuery === "number" ? { nodeId: targetQuery } : { selector: targetQuery };
		const trace = LifecycleTracer.traceElement(targetObj, events, initialSnapshot);
		if (!trace) return {
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
			alternativeHypotheses: [{
				hypothesis: "Element was injected into an unmonitored isolated iframe or ShadowRoot closed mode",
				likelihood: 40,
				evidenceFor: ["Element query yielded zero matches in monitored document"],
				evidenceAgainst: ["Iframes/ShadowRoots were accessible in this session"]
			}, {
				hypothesis: "Selector typo or timing mismatch",
				likelihood: 60,
				evidenceFor: ["Target selector did not match any recorded tag or class"],
				evidenceAgainst: []
			}]
		};
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
		const classHiddenEntry = trace.entries.find((e) => e.stage === "CLASS_MODIFIED" && /\b(hidden|hide|d-none|invisible|collapsed)\b/i.test(String(e.details.newValue || "")));
		const styleHiddenEntry = trace.entries.find((e) => e.stage === "STYLE_MODIFIED" && /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(String(e.details.newValue || "")));
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
		const precedingEvents = sortedEvents.filter((e) => e.timestamp >= criticalTime - windowMs && e.timestamp < criticalTime);
		const followingEvents = sortedEvents.filter((e) => e.timestamp > criticalTime && e.timestamp <= criticalTime + windowMs);
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
		const correlatedNetworkCalls = precedingEvents.filter((e) => e.type === "NETWORK_RESPONSE_COMPLETE" || e.type === "NETWORK_REQUEST_FAILED");
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
		if (!detailedExplanation) detailedExplanation = [
			`Element <${trace.tagName}> (Logical ID: ${trace.targetNodeId}, selector: "${trace.selectorHint}") was created at ${trace.createdAt.toFixed(1)}ms.`,
			`It remained alive in the DOM for ${trace.lifespanMs.toFixed(1)}ms and experienced ${trace.mutationCount} mutations.`,
			`At timestamp ${criticalTime.toFixed(1)}ms, it disappeared via [${mechanism}].`,
			`Diagnosis: ${likelyRootCause}.`
		].join(" ");
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
		} else if (mechanism === "DIRECT_NODE_REMOVAL") alternativeHypotheses.push({
			hypothesis: "Third-party script or ad-blocker removed the injected node",
			likelihood: 30,
			evidenceFor: ["Direct node removal occurred without ancestor replacement"],
			evidenceAgainst: ["No ad-blocker signatures or extension error logs observed"]
		});
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
};
//#endregion
//#region src/storage/session-serializer.ts
var SessionSerializer = class {
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
	static exportToJson(bundle, pretty = true) {
		return JSON.stringify(bundle, null, pretty ? 2 : void 0);
	}
	static importFromJson(jsonString) {
		let parsed;
		try {
			parsed = JSON.parse(jsonString);
		} catch (err) {
			throw new Error(`Failed to parse JSON recording: ${err.message}`);
		}
		if (!parsed || typeof parsed !== "object") throw new Error("Invalid recording format: root must be an object");
		if (!parsed.metadata || !parsed.metadata.id) throw new Error("Invalid recording format: missing session metadata");
		if (!parsed.initialSnapshot || !parsed.initialSnapshot.nodes) throw new Error("Invalid recording format: missing initial DOM snapshot");
		if (!Array.isArray(parsed.events)) parsed.events = [];
		if (!Array.isArray(parsed.checkpoints)) parsed.checkpoints = [];
		if (!Array.isArray(parsed.annotations)) parsed.annotations = [];
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
		if (!metadata || !metadata.id) errors.push("Missing session metadata or session ID");
		const hasInitialSnapshot = !!initialSnapshot && !!initialSnapshot.nodes;
		if (!hasInitialSnapshot) errors.push("Initial baseline snapshot is missing");
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
			for (const [idStr, node] of Object.entries(initialSnapshot.nodes)) if (node.children) {
				for (const childId of node.children) if (!initialSnapshot.nodes[childId]) {
					corruptNodeReferences.push(childId);
					warnings.push(`Initial snapshot node ${idStr} references non-existent child ID ${childId}`);
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
};
//#endregion
//#region src/mcp/tools-handler.ts
var MCPToolsHandler = class {
	storage;
	constructor(storage) {
		this.storage = storage;
	}
	async handleToolCall(name, args) {
		try {
			switch (name) {
				case "list_sessions": return await this.handleListSessions(args);
				case "get_session": return await this.handleGetSession(args);
				case "export_session": return await this.handleExportSession(args);
				case "import_session": return await this.handleImportSession(args);
				case "delete_session": return await this.handleDeleteSession(args);
				case "get_timeline": return await this.handleGetTimeline(args);
				case "get_events": return await this.handleGetEvents(args);
				case "get_events_around": return await this.handleGetEventsAround(args);
				case "get_dom_state": return await this.handleGetDOMState(args);
				case "get_dom_node": return await this.handleGetDOMNode(args);
				case "get_dom_subtree": return await this.handleGetDOMSubtree(args);
				case "diff_dom": return await this.handleDiffDOM(args);
				case "trace_element": return await this.handleTraceElement(args);
				case "find_disappearing_elements": return await this.handleFindDisappearingElements(args);
				case "why_did_element_disappear": return await this.handleWhyDidElementDisappear(args);
				case "get_diagnostics": return await this.handleGetDiagnostics(args);
				case "get_network_events": return await this.handleGetNetworkEvents(args);
				case "get_screenshots": return await this.handleGetScreenshots(args);
				case "annotate_session": return await this.handleAnnotateSession(args);
				case "get_annotations": return await this.handleGetAnnotations(args);
				case "get_recording_health": return await this.handleGetRecordingHealth(args);
				default: return {
					isError: true,
					content: [{
						type: "text",
						text: `Unknown tool: ${name}`
					}]
				};
			}
		} catch (err) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Tool error in ${name}: ${err.message}`
				}]
			};
		}
	}
	async getReconstructor(sessionId) {
		return new StateReconstructor(await this.storage.getCheckpoints(sessionId), await this.storage.getEvents(sessionId));
	}
	async handleListSessions(args) {
		const sessions = await this.storage.listSessions();
		const limit = args.limit || 20;
		const items = sessions.slice(0, limit);
		return { content: [{
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
		}] };
	}
	async handleGetSession(args) {
		const session = await this.storage.getSession(args.sessionId);
		if (!session) return {
			isError: true,
			content: [{
				type: "text",
				text: `Session '${args.sessionId}' not found`
			}]
		};
		return { content: [{
			type: "text",
			text: JSON.stringify(session, null, 2)
		}] };
	}
	async handleExportSession(args) {
		const session = await this.storage.getSession(args.sessionId);
		if (!session) return {
			isError: true,
			content: [{
				type: "text",
				text: `Session '${args.sessionId}' not found`
			}]
		};
		const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId) || (await this.storage.getCheckpoints(args.sessionId))[0]?.snapshot;
		if (!initialSnapshot) return {
			isError: true,
			content: [{
				type: "text",
				text: "No snapshot available to export"
			}]
		};
		const events = await this.storage.getEvents(args.sessionId);
		const checkpoints = await this.storage.getCheckpoints(args.sessionId);
		const annotations = await this.storage.getAnnotations(args.sessionId);
		const bundle = SessionSerializer.exportBundle(session, initialSnapshot, events, checkpoints, annotations);
		return { content: [{
			type: "text",
			text: SessionSerializer.exportToJson(bundle)
		}] };
	}
	async handleImportSession(args) {
		const bundle = SessionSerializer.importFromJson(args.bundleJson);
		const integrity = SessionSerializer.validateIntegrity(bundle);
		await this.storage.saveSession(bundle.metadata);
		await this.storage.saveInitialSnapshot(bundle.metadata.id, bundle.initialSnapshot);
		await this.storage.appendEvents(bundle.metadata.id, bundle.events);
		for (const chk of bundle.checkpoints) await this.storage.saveCheckpoint(chk);
		for (const ann of bundle.annotations) await this.storage.addAnnotation(ann);
		return { content: [{
			type: "text",
			text: JSON.stringify({
				message: `Session '${bundle.metadata.id}' successfully imported`,
				eventsCount: bundle.events.length,
				checkpointsCount: bundle.checkpoints.length,
				integrity
			}, null, 2)
		}] };
	}
	async handleDeleteSession(args) {
		const success = await this.storage.deleteSession(args.sessionId);
		return { content: [{
			type: "text",
			text: JSON.stringify({
				success,
				sessionId: args.sessionId
			})
		}] };
	}
	async handleGetTimeline(args) {
		const session = await this.storage.getSession(args.sessionId);
		const events = await this.storage.getEvents(args.sessionId);
		const breakdown = {};
		for (const evt of events) breakdown[evt.category] = (breakdown[evt.category] || 0) + 1;
		const firstTime = events.length > 0 ? events[0].timestamp : 0;
		const lastTime = events.length > 0 ? events[events.length - 1].timestamp : 0;
		return { content: [{
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
		}] };
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
		return { content: [{
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
		}] };
	}
	async handleGetEventsAround(args) {
		const events = await this.storage.getEvents(args.sessionId);
		let targetTime = args.timestamp;
		if (typeof targetTime !== "number" && args.eventId) {
			const match = events.find((e) => e.id === args.eventId);
			if (match) targetTime = match.timestamp;
		}
		if (typeof targetTime !== "number") return {
			isError: true,
			content: [{
				type: "text",
				text: "Target timestamp or eventId must be provided"
			}]
		};
		const windowMs = args.windowMs || 300;
		const windowEvents = events.filter((e) => Math.abs(e.timestamp - targetTime) <= windowMs);
		return { content: [{
			type: "text",
			text: JSON.stringify({
				sessionId: args.sessionId,
				targetTimestamp: targetTime,
				windowMs,
				totalEventsInWindow: windowEvents.length,
				events: windowEvents
			}, null, 2)
		}] };
	}
	async handleGetDOMState(args) {
		const snapshot = (await this.getReconstructor(args.sessionId)).getStateAt({
			timestamp: args.timestamp,
			eventId: args.eventId
		});
		const format = args.format || "html";
		if (format === "html") return { content: [{
			type: "text",
			text: new VirtualTreeBuilder(snapshot.nodes, snapshot.rootId).toHTML()
		}] };
		if (format === "json_summary") {
			const activeNodes = Object.values(snapshot.nodes).filter((n) => !n.isDetached);
			return { content: [{
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
			}] };
		}
		return { content: [{
			type: "text",
			text: JSON.stringify(snapshot, null, 2)
		}] };
	}
	async handleGetDOMNode(args) {
		const snapshot = (await this.getReconstructor(args.sessionId)).getStateAt({ timestamp: args.timestamp || 0 });
		let targetNode = args.nodeId ? snapshot.nodes[args.nodeId] : void 0;
		if (!targetNode && args.selector) {
			const match = VirtualQueryEngine.querySelector(args.selector, snapshot.rootId, snapshot.nodes);
			if (match) targetNode = match;
		}
		if (!targetNode) return {
			isError: true,
			content: [{
				type: "text",
				text: `Node not found in DOM state at timestamp ${args.timestamp}`
			}]
		};
		const selector = VirtualQueryEngine.computeSelector(targetNode, snapshot.nodes);
		const parentNode = targetNode.parentId ? snapshot.nodes[targetNode.parentId] : null;
		return { content: [{
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
		}] };
	}
	async handleGetDOMSubtree(args) {
		const snapshot = (await this.getReconstructor(args.sessionId)).getStateAt({ timestamp: args.timestamp || 0 });
		let targetId = args.nodeId;
		if (!targetId && args.selector) {
			const match = VirtualQueryEngine.querySelector(args.selector, snapshot.rootId, snapshot.nodes);
			if (match) targetId = match.id;
		}
		if (!targetId || !snapshot.nodes[targetId]) return {
			isError: true,
			content: [{
				type: "text",
				text: `Subtree target not found at timestamp ${args.timestamp}`
			}]
		};
		return { content: [{
			type: "text",
			text: new VirtualTreeBuilder(snapshot.nodes, targetId).toHTML(targetId)
		}] };
	}
	async handleDiffDOM(args) {
		const reconstructor = await this.getReconstructor(args.sessionId);
		const s1 = reconstructor.getStateAt({
			timestamp: args.t1,
			eventId: args.e1
		});
		const s2 = reconstructor.getStateAt({
			timestamp: args.t2,
			eventId: args.e2
		});
		const diff = DOMDiffEngine.diff(s1, s2);
		return { content: [{
			type: "text",
			text: DiffFormatter.formatMarkdown(diff) + "\n\n" + JSON.stringify(diff, null, 2)
		}] };
	}
	async handleTraceElement(args) {
		const events = await this.storage.getEvents(args.sessionId);
		const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);
		const trace = LifecycleTracer.traceElement({
			nodeId: args.nodeId,
			selector: args.selector
		}, events, initialSnapshot || void 0);
		if (!trace) return {
			isError: true,
			content: [{
				type: "text",
				text: `Element could not be found to trace: ${JSON.stringify(args)}`
			}]
		};
		return { content: [{
			type: "text",
			text: JSON.stringify(trace, null, 2)
		}] };
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
				if (trace && trace.lifespanMs <= maxLifespan) results.push({
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
		return { content: [{
			type: "text",
			text: JSON.stringify({
				sessionId: args.sessionId,
				maxLifespanMs: maxLifespan,
				disappearingElementsCount: results.length,
				elements: results
			}, null, 2)
		}] };
	}
	async handleWhyDidElementDisappear(args) {
		const events = await this.storage.getEvents(args.sessionId);
		const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);
		const report = DisappearingElementAnalyzer.analyze(args.target, events, initialSnapshot || void 0);
		return { content: [{
			type: "text",
			text: JSON.stringify(report, null, 2)
		}] };
	}
	async handleGetDiagnostics(args) {
		const filtered = (await this.storage.getEvents(args.sessionId)).filter((e) => {
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
		return { content: [{
			type: "text",
			text: JSON.stringify({
				sessionId: args.sessionId,
				totalDiagnostics: filtered.length,
				diagnostics: filtered
			}, null, 2)
		}] };
	}
	async handleGetNetworkEvents(args) {
		const networkEvents = (await this.storage.getEvents(args.sessionId)).filter((e) => e.category === "NETWORK");
		return { content: [{
			type: "text",
			text: JSON.stringify({
				sessionId: args.sessionId,
				totalNetworkEvents: networkEvents.length,
				events: networkEvents
			}, null, 2)
		}] };
	}
	async handleGetScreenshots(args) {
		const screenshotEvents = (await this.storage.getEvents(args.sessionId)).filter((e) => e.category === "SCREENSHOT");
		return { content: [{
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
		}] };
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
		return { content: [{
			type: "text",
			text: JSON.stringify({
				success: true,
				annotation
			}, null, 2)
		}] };
	}
	async handleGetAnnotations(args) {
		const annotations = await this.storage.getAnnotations(args.sessionId);
		return { content: [{
			type: "text",
			text: JSON.stringify({
				sessionId: args.sessionId,
				annotations
			}, null, 2)
		}] };
	}
	async handleGetRecordingHealth(args) {
		const session = await this.storage.getSession(args.sessionId);
		if (!session) return {
			isError: true,
			content: [{
				type: "text",
				text: `Session '${args.sessionId}' not found`
			}]
		};
		const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);
		const events = await this.storage.getEvents(args.sessionId);
		const checkpoints = await this.storage.getCheckpoints(args.sessionId);
		const bundle = SessionSerializer.exportBundle(session, initialSnapshot || checkpoints[0]?.snapshot || {}, events, checkpoints);
		const integrity = SessionSerializer.validateIntegrity(bundle);
		return { content: [{
			type: "text",
			text: JSON.stringify({
				sessionId: args.sessionId,
				health: session.health,
				stats: session.stats,
				integrity
			}, null, 2)
		}] };
	}
};
//#endregion
//#region src/storage/file-storage.ts
var FileStorageProvider = class {
	baseDir;
	constructor(baseDir = "./.forensic_sessions") {
		this.baseDir = path.resolve(baseDir);
		if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
	}
	getSessionDir(sessionId) {
		const dir = path.join(this.baseDir, sessionId);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
		for (const entry of entries) if (entry.isDirectory()) {
			const metaPath = path.join(this.baseDir, entry.name, "metadata.json");
			if (fs.existsSync(metaPath)) try {
				const data = fs.readFileSync(metaPath, "utf-8");
				sessions.push(JSON.parse(data));
			} catch {}
		}
		return sessions.sort((a, b) => b.startTime - a.startTime);
	}
	async deleteSession(sessionId) {
		const dir = path.join(this.baseDir, sessionId);
		if (fs.existsSync(dir)) {
			fs.rmSync(dir, {
				recursive: true,
				force: true
			});
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
		const lines = fs.readFileSync(eventsPath, "utf-8").split("\n");
		const all = [];
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			try {
				all.push(JSON.parse(trimmed));
			} catch {}
		}
		if (!filter) return all;
		let filtered = all.filter((e) => {
			if (filter.category && e.category !== filter.category) return false;
			if (filter.type && e.type !== filter.type) return false;
			if (typeof filter.fromTimestamp === "number" && e.timestamp < filter.fromTimestamp) return false;
			if (typeof filter.toTimestamp === "number" && e.timestamp > filter.toTimestamp) return false;
			if (typeof filter.fromSequence === "number" && e.sequence < filter.fromSequence) return false;
			if (typeof filter.toSequence === "number" && e.sequence > filter.toSequence) return false;
			if (typeof filter.targetNodeId === "number" && e.targetNodeId !== filter.targetNodeId) return false;
			if (filter.targetSelector && e.targetSelector && !e.targetSelector.includes(filter.targetSelector)) return false;
			if (filter.searchQuery) {
				const query = filter.searchQuery.toLowerCase();
				if (!JSON.stringify(e.payload).toLowerCase().includes(query) && !e.type.toLowerCase().includes(query)) return false;
			}
			return true;
		});
		if (typeof filter.offset === "number") filtered = filtered.slice(filter.offset);
		if (typeof filter.limit === "number") filtered = filtered.slice(0, filter.limit);
		return filtered;
	}
	async getEventCount(sessionId) {
		const dir = path.join(this.baseDir, sessionId);
		const eventsPath = path.join(dir, "events.jsonl");
		if (!fs.existsSync(eventsPath)) return 0;
		return fs.readFileSync(eventsPath, "utf-8").split("\n").filter(Boolean).length;
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
		for (const f of files) try {
			const data = fs.readFileSync(path.join(dir, f), "utf-8");
			checkpoints.push(JSON.parse(data));
		} catch {}
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
		if (fs.existsSync(annPath)) try {
			list = JSON.parse(fs.readFileSync(annPath, "utf-8"));
		} catch {
			list = [];
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
};
//#endregion
export { MCPToolsHandler as n, SessionSerializer as r, FileStorageProvider as t };
