import { VirtualDOMNodeType } from '../types/dom-node';
export class VirtualQueryEngine {
    static matches(node, selector) {
        if (!node || node.nodeType !== VirtualDOMNodeType.ELEMENT_NODE) {
            return false;
        }
        const trimmed = selector.trim();
        if (!trimmed)
            return false;
        // Split compound comma-separated selectors e.g. "div, span"
        if (trimmed.includes(',')) {
            return trimmed.split(',').some((s) => this.matchesSimple(node, s.trim()));
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
        if (!root)
            return results;
        const queue = [...(root.children || [])];
        const visited = new Set();
        while (queue.length > 0 && results.length < limit) {
            const currentId = queue.shift();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            const currentNode = nodes[currentId];
            if (!currentNode || currentNode.isDetached)
                continue;
            if (currentNode.nodeType === VirtualDOMNodeType.ELEMENT_NODE) {
                if (this.matches(currentNode, selector)) {
                    results.push(currentNode);
                    if (results.length >= limit)
                        break;
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
            if (node.nodeType === VirtualDOMNodeType.ELEMENT_NODE &&
                !node.isDetached &&
                node.attributes &&
                node.attributes['id'] === id) {
                return node;
            }
        }
        return null;
    }
    static computeSelector(node, nodes) {
        if (!node)
            return '';
        if (node.nodeType !== VirtualDOMNodeType.ELEMENT_NODE) {
            return node.tagName || `#node-${node.id}`;
        }
        if (node.attributes?.['id']) {
            return `#${node.attributes['id']}`;
        }
        const tagName = node.tagName || 'div';
        const classes = (node.attributes?.['class'] || '')
            .split(/\s+/)
            .filter((c) => c && !c.startsWith('ng-'))
            .slice(0, 2);
        const classStr = classes.length > 0 ? '.' + classes.join('.') : '';
        // Calculate nth-of-type if parent is accessible
        if (node.parentId && nodes[node.parentId]) {
            const parent = nodes[node.parentId];
            const siblings = (parent.children || [])
                .map((cId) => nodes[cId])
                .filter((c) => c && c.nodeType === VirtualDOMNodeType.ELEMENT_NODE && c.tagName === tagName);
            if (siblings.length > 1) {
                const index = siblings.findIndex((s) => s.id === node.id) + 1;
                return `${tagName}${classStr}:nth-of-type(${index})`;
            }
        }
        return `${tagName}${classStr}`;
    }
    static matchesCompound(node, selector) {
        // Basic single element selector matching: tag#id.class[attr=val]
        return this.matchesSimple(node, selector);
    }
    static matchesSimple(node, selector) {
        const tagName = node.tagName?.toLowerCase() || '';
        // 1. Universal Selector
        if (selector === '*')
            return true;
        // 2. ID match: #my-id
        if (selector.startsWith('#')) {
            const targetId = selector.substring(1);
            return node.attributes?.['id'] === targetId;
        }
        // 3. Class match: .my-class
        if (selector.startsWith('.')) {
            const targetClass = selector.substring(1);
            const classes = (node.attributes?.['class'] || '').split(/\s+/);
            return classes.includes(targetClass);
        }
        // 4. Attribute match: [attr] or [attr=val]
        if (selector.startsWith('[') && selector.endsWith(']')) {
            const inner = selector.substring(1, selector.length - 1);
            if (inner.includes('=')) {
                const [attrName, rawVal] = inner.split('=');
                const expectedVal = rawVal.replace(/^["']|["']$/g, '');
                return node.attributes?.[attrName.trim()] === expectedVal;
            }
            return !!node.attributes?.[inner.trim()];
        }
        // 5. Tag + Class: div.my-class or Tag#id: div#app
        const tagMatch = selector.match(/^([a-zA-Z0-9_-]+)(.*)$/);
        if (tagMatch) {
            const expectedTag = tagMatch[1].toLowerCase();
            const rest = tagMatch[2];
            if (expectedTag !== tagName && expectedTag !== '*') {
                return false;
            }
            if (!rest)
                return true;
            // Check remaining parts like #id or .class
            if (rest.startsWith('#')) {
                return node.attributes?.['id'] === rest.substring(1);
            }
            if (rest.startsWith('.')) {
                const classes = (node.attributes?.['class'] || '').split(/\s+/);
                return classes.includes(rest.substring(1));
            }
            if (rest.startsWith('[')) {
                return this.matchesSimple(node, rest);
            }
        }
        return false;
    }
}
//# sourceMappingURL=virtual-query.js.map