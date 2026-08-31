import { VirtualDOMNodeType } from '../types/dom-node';
import { VirtualQueryEngine } from '../reconstruction/virtual-query';
export class DOMDiffEngine {
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
        const ids1 = new Set(Object.values(nodes1)
            .filter((n) => !n.isDetached)
            .map((n) => n.id));
        const ids2 = new Set(Object.values(nodes2)
            .filter((n) => !n.isDetached)
            .map((n) => n.id));
        // 1. Detect Added Nodes (in S2, not in S1)
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
                        node: node2,
                    });
                }
            }
        }
        // 2. Detect Removed Nodes (in S1, not in S2)
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
                        textContent: node1.textContent,
                    });
                }
            }
        }
        // 3. Detect Modifications on Nodes existing in both
        for (const id of ids1) {
            if (!ids2.has(id))
                continue;
            const node1 = nodes1[id];
            const node2 = nodes2[id];
            if (!node1 || !node2)
                continue;
            const selector = VirtualQueryEngine.computeSelector(node2, nodes2);
            // (a) Movement / Reparenting
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
                    selector,
                });
            }
            // (b) Text content change
            if (node1.nodeType === VirtualDOMNodeType.TEXT_NODE) {
                if ((node1.textContent || '') !== (node2.textContent || '')) {
                    const parentNode = node2.parentId ? nodes2[node2.parentId] : undefined;
                    changedText.push({
                        nodeId: id,
                        parentId: node2.parentId,
                        parentSelector: parentNode ? VirtualQueryEngine.computeSelector(parentNode, nodes2) : undefined,
                        oldText: node1.textContent || '',
                        newText: node2.textContent || '',
                    });
                }
            }
            // (c) Attribute changes (elements only)
            if (node1.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
                const attrs1 = node1.attributes || {};
                const attrs2 = node2.attributes || {};
                const allAttrNames = new Set([...Object.keys(attrs1), ...Object.keys(attrs2)]);
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
                            selector,
                        });
                        // Special class diff breakdown
                        if (attrName.toLowerCase() === 'class') {
                            const classes1 = (val1 || '').split(/\s+/).filter(Boolean);
                            const classes2 = (val2 || '').split(/\s+/).filter(Boolean);
                            const addedClasses = classes2.filter((c) => !classes1.includes(c));
                            const removedClasses = classes1.filter((c) => !classes2.includes(c));
                            if (addedClasses.length > 0 || removedClasses.length > 0) {
                                changedClasses.push({
                                    nodeId: id,
                                    tagName: node2.tagName,
                                    addedClasses,
                                    removedClasses,
                                    oldClassString: val1 || '',
                                    newClassString: val2 || '',
                                    selector,
                                });
                            }
                        }
                        // Special style diff breakdown
                        if (attrName.toLowerCase() === 'style') {
                            this.diffInlineStyles(id, node2.tagName, val1, val2, selector, changedStyles);
                        }
                    }
                }
            }
        }
        const hasStructuralChanges = addedNodes.length > 0 || removedNodes.length > 0 || movedNodes.length > 0;
        const hasVisibilityChanges = changedClasses.some((c) => [...c.addedClasses, ...c.removedClasses].some((cls) => /\b(hidden|hide|d-none|invisible|visible|show)\b/i.test(cls))) ||
            changedStyles.some((s) => ['display', 'visibility', 'opacity'].includes(s.propertyName.toLowerCase()));
        const totalChanges = addedNodes.length +
            removedNodes.length +
            movedNodes.length +
            changedAttributes.length +
            changedText.length;
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
            hasVisibilityChanges,
        };
        return {
            t1: {
                timestamp: s1.timestamp,
                sequence: s1.sequence,
                eventId: s1.snapshotId,
                nodeCount: s1.totalNodeCount,
            },
            t2: {
                timestamp: s2.timestamp,
                sequence: s2.sequence,
                eventId: s2.snapshotId,
                nodeCount: s2.totalNodeCount,
            },
            addedNodes,
            removedNodes,
            movedNodes,
            changedAttributes,
            changedClasses,
            changedStyles,
            changedText,
            summary,
        };
    }
    static diffInlineStyles(nodeId, tagName, style1, style2, selector, acc) {
        const parse = (s) => {
            const res = {};
            if (!s)
                return res;
            s.split(';').forEach((part) => {
                const [k, v] = part.split(':');
                if (k && v)
                    res[k.trim().toLowerCase()] = v.trim();
            });
            return res;
        };
        const p1 = parse(style1);
        const p2 = parse(style2);
        const props = new Set([...Object.keys(p1), ...Object.keys(p2)]);
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
                    selector,
                });
            }
        }
    }
    static renderNodeSnippet(node) {
        if (node.nodeType === VirtualDOMNodeType.TEXT_NODE) {
            return `"${node.textContent || ''}"`;
        }
        const tag = node.tagName || 'element';
        const attrs = Object.entries(node.attributes || {})
            .slice(0, 3)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ');
        const attrStr = attrs ? ` ${attrs}` : '';
        return `<${tag}${attrStr}>`;
    }
}
//# sourceMappingURL=dom-diff-engine.js.map