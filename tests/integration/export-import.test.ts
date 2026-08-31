import { describe, it, expect } from 'vitest';
import { SessionSerializer } from '../../src/storage/session-serializer';
import { VirtualDOMNodeType, DOMSnapshot } from '../../src/types/dom-node';
import { SessionMetadata } from '../../src/types/session';

describe('SessionSerializer Export & Import', () => {
  it('should serialize, export to JSON, re-import, and pass integrity verification', () => {
    const metadata: SessionMetadata = {
      id: 'sess_export_test',
      name: 'Export Test Session',
      url: 'https://site.com',
      origin: 'https://site.com',
      title: 'Site',
      userAgent: 'Agent',
      schemaVersion: '2.0.0',
      recorderVersion: '2.0.0',
      extensionVersion: '2.0.0',
      startTime: 1000,
      endTime: 1500,
      durationMs: 500,
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
        eventCount: 1,
        mutationCount: 0,
        errorCount: 0,
        consoleCount: 0,
        networkCount: 0,
        checkpointCount: 1,
        screenshotCount: 0,
        nodeCount: 2,
      },
    };

    const initialSnapshot: DOMSnapshot = {
      snapshotId: 'snap_0',
      sessionId: 'sess_export_test',
      timestamp: 0,
      sequence: 1,
      rootId: 1,
      nodes: {
        1: { id: 1, nodeType: VirtualDOMNodeType.DOCUMENT_NODE, children: [2], parentId: null },
        2: { id: 2, nodeType: VirtualDOMNodeType.ELEMENT_NODE, tagName: 'body', children: [], parentId: 1 },
      },
      title: 'Site',
      url: 'https://site.com',
      origin: 'https://site.com',
      viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
      totalNodeCount: 2,
    };

    const checkpoints = [
      {
        checkpointId: 'chk_init',
        sessionId: 'sess_export_test',
        timestamp: 0,
        sequence: 1,
        wallClockTime: 1000,
        snapshot: initialSnapshot,
        eventIndex: 0,
        eventsSinceLastCheckpoint: 0,
        trigger: 'INITIAL' as const,
      },
    ];

    const events = [
      {
        id: 'evt_clk_1',
        sessionId: 'sess_export_test',
        timestamp: 100,
        sequence: 2,
        wallClockTime: 1100,
        type: 'USER_CLICK' as const,
        category: 'USER' as const,
        source: 'USER_INTERACTION' as const,
        targetNodeId: 2,
        payload: { eventType: 'click' },
      },
    ];

    const bundle = SessionSerializer.exportBundle(metadata, initialSnapshot, events, checkpoints);
    const jsonString = SessionSerializer.exportToJson(bundle);

    expect(typeof jsonString).toBe('string');
    expect(jsonString).toContain('sess_export_test');

    const reimported = SessionSerializer.importFromJson(jsonString);
    expect(reimported.metadata.id).toBe('sess_export_test');
    expect(reimported.events.length).toBe(1);
    expect(reimported.events[0].id).toBe('evt_clk_1');

    const integrity = SessionSerializer.validateIntegrity(reimported);
    expect(integrity.isValid).toBe(true);
    expect(integrity.isSequenceMonotonic).toBe(true);
    expect(integrity.errors.length).toBe(0);
  });
});
