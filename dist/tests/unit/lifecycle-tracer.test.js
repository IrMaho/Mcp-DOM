import { describe, it, expect } from 'vitest';
import { LifecycleTracer } from '../../src/lifecycle/lifecycle-tracer';
import { VirtualDOMNodeType } from '../../src/types/dom-node';
describe('LifecycleTracer', () => {
    it('should trace complete element lifecycle across addition, mutations, and removal', () => {
        const events = [
            {
                id: 'evt_1',
                sessionId: 's1',
                timestamp: 100,
                sequence: 1,
                wallClockTime: 1000,
                type: 'DOM_MUTATION_ADD',
                category: 'DOM',
                source: 'CONTENT_SCRIPT',
                targetNodeId: 10,
                targetSelector: '.injected-panel',
                payload: {
                    node: {
                        id: 10,
                        nodeType: VirtualDOMNodeType.ELEMENT_NODE,
                        tagName: 'div',
                        attributes: { class: 'injected-panel' },
                        parentId: 2,
                        children: [],
                    },
                    parentId: 2,
                    index: 0,
                },
            },
            {
                id: 'evt_2',
                sessionId: 's1',
                timestamp: 250,
                sequence: 2,
                wallClockTime: 1150,
                type: 'DOM_MUTATION_ATTR',
                category: 'DOM',
                source: 'PAGE',
                targetNodeId: 10,
                targetSelector: '.injected-panel',
                payload: {
                    nodeId: 10,
                    attributeName: 'class',
                    oldValue: 'injected-panel',
                    newValue: 'injected-panel visible',
                },
            },
            {
                id: 'evt_3',
                sessionId: 's1',
                timestamp: 400,
                sequence: 3,
                wallClockTime: 1300,
                type: 'DOM_MUTATION_REMOVE',
                category: 'DOM',
                source: 'PAGE',
                targetNodeId: 10,
                targetSelector: '.injected-panel',
                payload: {
                    nodeId: 10,
                    parentId: 2,
                    index: 0,
                    removedSubtreeNodeCount: 1,
                },
            },
        ];
        const trace = LifecycleTracer.traceElement({ nodeId: 10 }, events);
        expect(trace).not.toBeNull();
        expect(trace?.targetNodeId).toBe(10);
        expect(trace?.createdAt).toBe(100);
        expect(trace?.removedAt).toBe(400);
        expect(trace?.lifespanMs).toBe(300);
        expect(trace?.isCurrentlyAlive).toBe(false);
        expect(trace?.entries.length).toBe(3);
        expect(trace?.entries[0].stage).toBe('ATTACHED_TO_DOM');
        expect(trace?.entries[1].stage).toBe('CLASS_MODIFIED');
        expect(trace?.entries[2].stage).toBe('REMOVED_FROM_DOM');
    });
});
//# sourceMappingURL=lifecycle-tracer.test.js.map