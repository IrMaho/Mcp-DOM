import { describe, it, expect } from 'vitest';
import { ForensicMCPServer } from '../../src/mcp/server';
import { MemoryStorageProvider } from '../../src/storage/memory-storage';
import { DOMSnapshot, VirtualDOMNodeType } from '../../src/types/dom-node';
import { BaseEvent } from '../../src/types/events';
import { SessionMetadata } from '../../src/types/session';

describe('E2E Acceptance Scenario — Injected UI Disappearance Forensic Investigation', () => {
  it('should capture injected UI lifecycle, parent subtree replacement, and prove root cause via MCP', async () => {
    const storage = new MemoryStorageProvider();
    const sessionId = 'sess_e2e_disappearing_panel';

    // 1. Initial State: Host Application Page with dynamic React/Vue container
    const initialSnapshot: DOMSnapshot = {
      snapshotId: 'snap_init_e2e',
      sessionId,
      timestamp: 0,
      sequence: 1,
      rootId: 1,
      nodes: {
        1: { id: 1, nodeType: VirtualDOMNodeType.DOCUMENT_NODE, children: [2], parentId: null },
        2: { id: 2, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'html', children: [3], parentId: 1 },
        3: { id: 3, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'body', children: [4], parentId: 2 },
        4: { id: 4, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'div', attributes: { id: 'app-root' }, children: [5], parentId: 3 },
        5: { id: 5, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'section', attributes: { id: 'sidebar-container', class: 'sidebar' }, children: [], parentId: 4 },
      },
      title: 'Host Web App',
      url: 'https://host-app.com/dashboard',
      origin: 'https://host-app.com',
      viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
      totalNodeCount: 5,
    };

    const sessionMetadata: SessionMetadata = {
      id: sessionId,
      name: 'E2E Disappearing Component Investigation',
      url: 'https://host-app.com/dashboard',
      origin: 'https://host-app.com',
      title: 'Host Web App',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      schemaVersion: '2.0.0',
      recorderVersion: '2.0.0',
      extensionVersion: '2.0.0',
      startTime: 1000,
      endTime: 1600,
      durationMs: 600,
      status: 'stopped',
      health: {
        domRecording: 'HEALTHY',
        userEvents: 'HEALTHY',
        console: 'HEALTHY',
        network: 'HEALTHY',
        screenshots: 'HEALTHY',
        shadowDom: 'HEALTHY',
        iframes: 'HEALTHY',
      },
      stats: {
        eventCount: 6,
        mutationCount: 4,
        errorCount: 1,
        consoleCount: 0,
        networkCount: 1,
        checkpointCount: 1,
        screenshotCount: 0,
        nodeCount: 7,
      },
    };

    // 2. Timeline Sequence of Recorded Events:
    const events: BaseEvent[] = [
      // T = 120ms: Extension injects Assistant Floating Button inside #sidebar-container (Node ID 5)
      {
        id: 'evt_inject_10',
        sessionId,
        timestamp: 120.5,
        sequence: 2,
        wallClockTime: 1120,
        type: 'DOM_MUTATION_ADD',
        category: 'DOM',
        source: 'CONTENT_SCRIPT',
        targetNodeId: 10,
        targetSelector: '.gpt-floating-panel',
        payload: {
          node: {
            id: 10,
            nodeType: VirtualDOMNodeType.ELEMENT_NODE,
            tagName: 'div',
            attributes: { class: 'gpt-floating-panel', 'data-version': '1.0' },
            children: [11],
            parentId: 5,
          },
          parentId: 5,
          index: 0,
        },
      },
      // T = 125ms: Injected panel child text
      {
        id: 'evt_inject_11',
        sessionId,
        timestamp: 125.0,
        sequence: 3,
        wallClockTime: 1125,
        type: 'DOM_MUTATION_ADD',
        category: 'DOM',
        source: 'CONTENT_SCRIPT',
        targetNodeId: 11,
        targetSelector: '.gpt-floating-panel > span',
        payload: {
          node: {
            id: 11,
            nodeType: VirtualDOMNodeType.ELEMENT_NODE,
            tagName: 'span',
            attributes: { class: 'panel-text' },
            textContent: 'AI Assistant Ready',
            children: [],
            parentId: 10,
          },
          parentId: 10,
          index: 0,
        },
      },
      // T = 200ms: Panel state mutation (class change to 'gpt-floating-panel active')
      {
        id: 'evt_mutate_10',
        sessionId,
        timestamp: 200.0,
        sequence: 4,
        wallClockTime: 1200,
        type: 'DOM_MUTATION_ATTR',
        category: 'DOM',
        source: 'CONTENT_SCRIPT',
        targetNodeId: 10,
        targetSelector: '.gpt-floating-panel',
        payload: {
          nodeId: 10,
          attributeName: 'class',
          oldValue: 'gpt-floating-panel',
          newValue: 'gpt-floating-panel active',
        },
      },
      // T = 310ms: Correlated network response completes on host page (triggers React state update)
      {
        id: 'evt_net_resp',
        sessionId,
        timestamp: 310.2,
        sequence: 5,
        wallClockTime: 1310,
        type: 'NETWORK_RESPONSE_COMPLETE',
        category: 'NETWORK',
        source: 'PAGE',
        payload: {
          requestId: 'req_sync_user',
          url: 'https://host-app.com/api/user/sync',
          method: 'GET',
          status: 200,
          durationMs: 52.0,
        },
      },
      // T = 330ms: Host application React re-render unmounts #sidebar-container (Node ID 5), causing child 10 to disappear!
      {
        id: 'evt_remove_sidebar',
        sessionId,
        timestamp: 330.0,
        sequence: 6,
        wallClockTime: 1330,
        type: 'DOM_MUTATION_REMOVE',
        category: 'DOM',
        source: 'PAGE',
        targetNodeId: 5,
        targetSelector: '#sidebar-container',
        payload: {
          nodeId: 5,
          parentId: 4,
          index: 0,
          removedSubtreeNodeCount: 3, // Sidebar + Panel + Span
        },
      },
      // T = 335ms: Page throws runtime warning
      {
        id: 'evt_err_1',
        sessionId,
        timestamp: 335.0,
        sequence: 7,
        wallClockTime: 1335,
        type: 'RUNTIME_ERROR',
        category: 'ERROR',
        source: 'PAGE',
        payload: {
          message: 'Warning: Can only update a mounted or mounting component.',
          name: 'ReactWarning',
        },
      },
    ];

    // 3. Save to Storage
    await storage.saveSession(sessionMetadata);
    await storage.saveInitialSnapshot(sessionId, initialSnapshot);
    await storage.saveCheckpoint({
      checkpointId: 'chk_init',
      sessionId,
      timestamp: 0,
      sequence: 1,
      wallClockTime: 1000,
      snapshot: initialSnapshot,
      eventIndex: 0,
      eventsSinceLastCheckpoint: 0,
      trigger: 'INITIAL',
    });
    await storage.appendEvents(sessionId, events);

    // 4. AI Agent executes MCP Investigative Workflow
    const server = new ForensicMCPServer(storage);

    // Step A: Agent calls `get_session` to understand environment
    const sessionRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'get_session', arguments: { sessionId } },
    });
    expect(sessionRes?.result).toBeDefined();

    // Step B: Agent calls `get_timeline`
    const timelineRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'get_timeline', arguments: { sessionId } },
    });
    expect(timelineRes?.result).toBeDefined();
    const timelineData = JSON.parse((timelineRes?.result as any).content[0].text);
    expect(timelineData.totalEvents).toBe(6);

    // Step C: Agent calls `trace_element` for `.gpt-floating-panel`
    const traceRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'trace_element', arguments: { sessionId, selector: '.gpt-floating-panel' } },
    });
    expect(traceRes?.result).toBeDefined();
    const traceData = JSON.parse((traceRes?.result as any).content[0].text);
    expect(traceData.targetNodeId).toBe(10);
    expect(traceData.createdAt).toBe(120.5);
    expect(traceData.removedAt).toBe(330.0);
    expect(traceData.lifespanMs).toBe(209.5);
    expect(traceData.isCurrentlyAlive).toBe(false);

    // Step D: Agent calls `diff_dom` between T=150ms (panel visible) and T=350ms (panel disappeared)
    const diffRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'diff_dom', arguments: { sessionId, t1: 150, t2: 350 } },
    });
    expect(diffRes?.result).toBeDefined();
    const diffText = (diffRes?.result as any).content[0].text;
    expect(diffText).toContain('Removed Nodes');
    expect(diffText).toContain('#sidebar-container');

    // Step E: Agent calls `why_did_element_disappear` for `.gpt-floating-panel`
    const diagnosisRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'why_did_element_disappear', arguments: { sessionId, target: '.gpt-floating-panel' } },
    });
    expect(diagnosisRes?.result).toBeDefined();
    const diagnosis = JSON.parse((diagnosisRes?.result as any).content[0].text);

    // 5. Verify Diagnostic Assertions
    expect(diagnosis.found).toBe(true);
    expect(diagnosis.targetNodeId).toBe(10);
    expect(diagnosis.disappearanceMechanism).toBe('PARENT_SUBTREE_REPLACED');
    expect(diagnosis.confidenceScore).toBeGreaterThanOrEqual(90);
    expect(diagnosis.likelyRootCause).toContain('Ancestor container [ID: 5]');
    expect(diagnosis.evidentiaryTrail.length).toBeGreaterThanOrEqual(2);

    // Check preceding network and error correlation
    expect(diagnosis.precedingEvents.some((e: any) => e.type === 'NETWORK_RESPONSE_COMPLETE')).toBe(true);
    expect(diagnosis.followingEvents.some((e: any) => e.type === 'RUNTIME_ERROR')).toBe(true);
  });
});
