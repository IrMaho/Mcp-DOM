import { describe, it, expect } from 'vitest';
import { DOMDiffEngine } from '../../src/diff/dom-diff-engine';
import { VirtualDOMNodeType } from '../../src/types/dom-node';
describe('DOMDiffEngine', () => {
    it('should compute structural additions, removals, and class mutations correctly', () => {
        const s1 = {
            snapshotId: 's1',
            sessionId: 'sess_1',
            timestamp: 100,
            sequence: 1,
            rootId: 1,
            nodes: {
                1: { id: 1, nodeType: VirtualDOMNodeType.DOCUMENT_NODE, children: [2], parentId: null },
                2: { id: 2, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'div', attributes: { id: 'app', class: 'container' }, children: [3], parentId: 1 },
                3: { id: 3, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'p', attributes: {}, textContent: 'Old Paragraph', children: [], parentId: 2 },
            },
            title: 'Test',
            url: 'https://example.com',
            origin: 'https://example.com',
            viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
            totalNodeCount: 3,
        };
        const s2 = {
            snapshotId: 's2',
            sessionId: 'sess_1',
            timestamp: 250,
            sequence: 5,
            rootId: 1,
            nodes: {
                1: { id: 1, nodeType: VirtualDOMNodeType.DOCUMENT_NODE, children: [2], parentId: null },
                2: { id: 2, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'div', attributes: { id: 'app', class: 'container active' }, children: [4], parentId: 1 },
                3: { id: 3, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'p', attributes: {}, isDetached: true, parentId: null },
                4: { id: 4, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'div', attributes: { class: 'gpt-modal' }, children: [], parentId: 2 },
            },
            title: 'Test',
            url: 'https://example.com',
            origin: 'https://example.com',
            viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
            totalNodeCount: 3,
        };
        const diff = DOMDiffEngine.diff(s1, s2);
        expect(diff.addedNodes.length).toBe(1);
        expect(diff.addedNodes[0].id).toBe(4);
        expect(diff.removedNodes.length).toBe(1);
        expect(diff.removedNodes[0].id).toBe(3);
        expect(diff.changedClasses.length).toBe(1);
        expect(diff.changedClasses[0].nodeId).toBe(2);
        expect(diff.changedClasses[0].addedClasses).toContain('active');
        expect(diff.summary.hasStructuralChanges).toBe(true);
    });
});
//# sourceMappingURL=dom-diff.test.js.map