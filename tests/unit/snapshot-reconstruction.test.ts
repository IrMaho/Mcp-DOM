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

  it('should recursively mark child descendants as detached and exclude them from getElementById', () => {
    const tree = new VirtualTreeBuilder({}, 1);

    tree.loadFromNodes({
      1: { id: 1, nodeType: VirtualDOMNodeType.DOCUMENT_NODE, children: [2], parentId: null },
      2: { id: 2, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'html', children: [3], parentId: 1 },
      3: { id: 3, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'body', children: [10], parentId: 2 },
      10: { id: 10, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'div', attributes: { id: 'container' }, children: [11], parentId: 3 },
      11: { id: 11, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'button', attributes: { id: 'nested-btn' }, children: [], parentId: 10 },
    });

    expect(VirtualQueryEngine.getElementById('nested-btn', tree.getNodes())?.id).toBe(11);

    // Remove the parent container (ID 10)
    tree.applyRemove({
      nodeId: 10,
      parentId: 3,
      index: 0,
      removedSubtreeNodeCount: 2,
    });

    // Parent container should be detached
    expect(tree.getNode(10)?.isDetached).toBe(true);
    // Nested child button should also be marked detached recursively
    expect(tree.getNode(11)?.isDetached).toBe(true);

    // getElementById must NOT return the detached child
    expect(VirtualQueryEngine.getElementById('nested-btn', tree.getNodes())).toBeNull();
    expect(VirtualQueryEngine.getElementById('container', tree.getNodes())).toBeNull();
  });

  it('should render Declarative Shadow DOM templates in toHTML', () => {
    const tree = new VirtualTreeBuilder({}, 1);

    tree.loadFromNodes({
      1: { id: 1, nodeType: VirtualDOMNodeType.DOCUMENT_NODE, children: [2], parentId: null },
      2: {
        id: 2,
        nodeType: VirtualDOMNodeType.ELEMENT_NODE,
        tagName: 'custom-widget',
        isShadowHost: true,
        children: [3],
        parentId: 1,
      },
      3: {
        id: 3,
        nodeType: VirtualDOMNodeType.DOCUMENT_FRAGMENT_NODE,
        isShadowRoot: true,
        shadowMode: 'open',
        children: [4],
        parentId: 2,
      },
      4: {
        id: 4,
        nodeType: VirtualDOMNodeType.ELEMENT_NODE,
        tagName: 'span',
        textContent: 'Shadow Content',
        children: [],
        parentId: 3,
      },
    });

    const html = tree.toHTML();
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain('Shadow Content');
    expect(html).toContain('</template>');
  });
});
