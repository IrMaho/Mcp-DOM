import { describe, it, expect } from 'vitest';
import { DisappearingElementAnalyzer } from '../../src/lifecycle/disappearing-analyzer';
import { BaseEvent } from '../../src/types/events';
import { VirtualDOMNodeType, DOMSnapshot } from '../../src/types/dom-node';

describe('DisappearingElementAnalyzer', () => {
  it('should diagnose PARENT_SUBTREE_REPLACED when host container is unmounted by React re-render', () => {
    const initialSnapshot: DOMSnapshot = {
      snapshotId: 'init',
      sessionId: 'sess_disappear',
      timestamp: 0,
      sequence: 1,
      rootId: 1,
      nodes: {
        1: { id: 1, nodeType: VirtualDOMNodeType.DOCUMENT_NODE, children: [2], parentId: null },
        2: { id: 2, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'div', attributes: { id: 'react-root' }, children: [3], parentId: 1 },
        3: { id: 3, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'main', attributes: { class: 'content-wrapper' }, children: [], parentId: 2 },
      },
      title: 'App',
      url: 'https://app.test',
      origin: 'https://app.test',
      viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
      totalNodeCount: 3,
    };

    const events: BaseEvent[] = [
      // 1. Extension injects assistant panel under main (ID: 3)
      {
        id: 'evt_1',
        sessionId: 'sess_disappear',
        timestamp: 120,
        sequence: 2,
        wallClockTime: 1000,
        type: 'DOM_MUTATION_ADD',
        category: 'DOM',
        source: 'CONTENT_SCRIPT',
        targetNodeId: 42,
        targetSelector: '.gpt-assistant-panel',
        payload: {
          node: {
            id: 42,
            nodeType: VirtualDOMNodeType.ELEMENT_NODE,
            tagName: 'div',
            attributes: { class: 'gpt-assistant-panel' },
            parentId: 3,
            children: [],
          },
          parentId: 3,
          index: 0,
        },
      },
      // 2. Preceding network response triggers state update in host page
      {
        id: 'net_1',
        sessionId: 'sess_disappear',
        timestamp: 230,
        sequence: 3,
        wallClockTime: 1110,
        type: 'NETWORK_RESPONSE_COMPLETE',
        category: 'NETWORK',
        source: 'PAGE',
        payload: {
          requestId: 'req_1',
          url: 'https://app.test/api/user/status',
          status: 200,
          durationMs: 45,
        },
      },
      // 3. Host framework (React) re-renders and removes main (ID: 3), unmounting ID: 42
      {
        id: 'evt_2',
        sessionId: 'sess_disappear',
        timestamp: 250,
        sequence: 4,
        wallClockTime: 1130,
        type: 'DOM_MUTATION_REMOVE',
        category: 'DOM',
        source: 'PAGE',
        targetNodeId: 3,
        targetSelector: '.content-wrapper',
        payload: {
          nodeId: 3,
          parentId: 2,
          index: 0,
          removedSubtreeNodeCount: 2,
        },
      },
    ];

    const report = DisappearingElementAnalyzer.analyze('.gpt-assistant-panel', events, initialSnapshot);

    expect(report.found).toBe(true);
    expect(report.targetNodeId).toBe(42);
    expect(report.disappearanceMechanism).toBe('PARENT_SUBTREE_REPLACED');
    expect(report.confidenceScore).toBeGreaterThanOrEqual(90);
    expect(report.evidentiaryTrail.length).toBeGreaterThanOrEqual(2);
    expect(report.likelyRootCause).toContain('Ancestor container [ID: 3]');
  });
});
