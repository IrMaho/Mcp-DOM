import { describe, it, expect } from 'vitest';
import { VirtualTreeBuilder } from '../../src/reconstruction/tree-builder';
import { VirtualQueryEngine } from '../../src/reconstruction/virtual-query';
import { VirtualDOMNodeType } from '../../src/types/dom-node';
describe('VirtualTreeBuilder & VirtualQueryEngine', () => {
    it('should apply add, attribute mutation, and remove incrementally', () => {
        const tree = new VirtualTreeBuilder({}, 1);
        // 1. Initial Root Document
        tree.loadFromNodes({
            1: { id: 1, nodeType: VirtualDOMNodeType.DOCUMENT_NODE, children: [2], parentId: null },
            2: { id: 2, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'html', children: [3], parentId: 1 },
            3: { id: 3, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'body', children: [], parentId: 2 },
        });
        // 2. Add an injected element
        tree.applyAdd({
            node: {
                id: 4,
                nodeType: VirtualDOMNodeType.ELEMENT_NODE,
                tagName: 'div',
                attributes: { class: 'gpt-panel', id: 'my-panel' },
                children: [],
                parentId: 3,
            },
            parentId: 3,
            index: 0,
        });
        expect(tree.getNode(4)).toBeDefined();
        expect(tree.getNode(3)?.children).toContain(4);
        // 3. Query the element
        const queried = VirtualQueryEngine.querySelector('#my-panel', 1, tree.getNodes());
        expect(queried?.id).toBe(4);
        // 4. Modify attribute
        tree.applyAttrChange({
            nodeId: 4,
            attributeName: 'class',
            oldValue: 'gpt-panel',
            newValue: 'gpt-panel active',
        });
        expect(tree.getNode(4)?.attributes?.['class']).toBe('gpt-panel active');
        // 5. Remove node
        tree.applyRemove({
            nodeId: 4,
            parentId: 3,
            index: 0,
            removedSubtreeNodeCount: 1,
        });
        expect(tree.getNode(3)?.children).not.toContain(4);
        expect(tree.getNode(4)?.isDetached).toBe(true);
    });
});
//# sourceMappingURL=snapshot-reconstruction.test.js.map