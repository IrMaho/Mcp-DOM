import { describe, it, expect } from 'vitest';
import { NodeRegistry } from '../../src/core/node-registry';

describe('NodeRegistry', () => {
  it('should assign stable LogicalNodeId to identical node references', () => {
    const registry = new NodeRegistry();
    const mockNode1 = { nodeType: 1, tagName: 'DIV' } as unknown as Node;
    const mockNode2 = { nodeType: 1, tagName: 'SPAN' } as unknown as Node;

    const id1a = registry.getOrCreateId(mockNode1, 100);
    const id1b = registry.getOrCreateId(mockNode1, 200);
    const id2 = registry.getOrCreateId(mockNode2, 300);

    expect(id1a).toBe(1);
    expect(id1b).toBe(1); // Stable identity preserved!
    expect(id2).toBe(2);
  });

  it('should compute valid selector hints for element nodes', () => {
    const registry = new NodeRegistry();
    const mockElemWithId = {
      nodeType: 1,
      tagName: 'DIV',
      id: 'main-panel',
      classList: ['gpt-panel'],
    } as unknown as Element;

    const selector = registry.computeSelector(mockElemWithId);
    expect(selector).toBe('#main-panel');
  });

  it('should record parent ancestry history', () => {
    const registry = new NodeRegistry();
    registry.recordParent(10, 5);
    registry.recordParent(10, 8);

    const history = registry.getParentHistory(10);
    expect(history).toEqual([5, 8]);
  });
});
