import { MCPContentItem, MCPToolCallResult } from '../types/mcp-types';
import { ForensicStorageProvider } from '../storage/storage-interface';
import { StateReconstructor } from '../reconstruction/state-reconstructor';
import { DOMDiffEngine } from '../diff/dom-diff-engine';
import { DiffFormatter } from '../diff/diff-formatter';
import { LifecycleTracer } from '../lifecycle/lifecycle-tracer';
import { DisappearingElementAnalyzer } from '../lifecycle/disappearing-analyzer';
import { SessionSerializer } from '../storage/session-serializer';
import { VirtualQueryEngine } from '../reconstruction/virtual-query';
import { VirtualTreeBuilder } from '../reconstruction/tree-builder';

export class MCPToolsHandler {
  private storage: ForensicStorageProvider;

  constructor(storage: ForensicStorageProvider) {
    this.storage = storage;
  }

  public async handleToolCall(name: string, args: Record<string, any>): Promise<MCPToolCallResult> {
    try {
      switch (name) {
        case 'list_sessions':
          return await this.handleListSessions(args);
        case 'get_session':
          return await this.handleGetSession(args);
        case 'export_session':
          return await this.handleExportSession(args);
        case 'import_session':
          return await this.handleImportSession(args);
        case 'delete_session':
          return await this.handleDeleteSession(args);
        case 'get_timeline':
          return await this.handleGetTimeline(args);
        case 'get_events':
          return await this.handleGetEvents(args);
        case 'get_events_around':
          return await this.handleGetEventsAround(args);
        case 'get_dom_state':
          return await this.handleGetDOMState(args);
        case 'get_dom_node':
          return await this.handleGetDOMNode(args);
        case 'get_dom_subtree':
          return await this.handleGetDOMSubtree(args);
        case 'diff_dom':
          return await this.handleDiffDOM(args);
        case 'trace_element':
          return await this.handleTraceElement(args);
        case 'find_disappearing_elements':
          return await this.handleFindDisappearingElements(args);
        case 'why_did_element_disappear':
          return await this.handleWhyDidElementDisappear(args);
        case 'get_diagnostics':
          return await this.handleGetDiagnostics(args);
        case 'get_network_events':
          return await this.handleGetNetworkEvents(args);
        case 'get_screenshots':
          return await this.handleGetScreenshots(args);
        case 'annotate_session':
          return await this.handleAnnotateSession(args);
        case 'get_annotations':
          return await this.handleGetAnnotations(args);
        case 'get_recording_health':
          return await this.handleGetRecordingHealth(args);
        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          };
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool error in ${name}: ${err.message}` }],
      };
    }
  }

  private async getReconstructor(sessionId: string): Promise<StateReconstructor> {
    const checkpoints = await this.storage.getCheckpoints(sessionId);
    const events = await this.storage.getEvents(sessionId);
    return new StateReconstructor(checkpoints, events);
  }

  private async handleListSessions(args: Record<string, any>): Promise<MCPToolCallResult> {
    const sessions = await this.storage.listSessions();
    const limit = args.limit || 20;
    const items = sessions.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalSessions: sessions.length,
            sessions: items.map((s) => ({
              id: s.id,
              name: s.name,
              url: s.url,
              startTime: s.startTime,
              durationMs: s.durationMs,
              status: s.status,
              stats: s.stats,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetSession(args: Record<string, any>): Promise<MCPToolCallResult> {
    const session = await this.storage.getSession(args.sessionId);
    if (!session) {
      return { isError: true, content: [{ type: 'text', text: `Session '${args.sessionId}' not found` }] };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(session, null, 2) }],
    };
  }

  private async handleExportSession(args: Record<string, any>): Promise<MCPToolCallResult> {
    const session = await this.storage.getSession(args.sessionId);
    if (!session) {
      return { isError: true, content: [{ type: 'text', text: `Session '${args.sessionId}' not found` }] };
    }
    const initialSnapshot = (await this.storage.getInitialSnapshot(args.sessionId)) || (await this.storage.getCheckpoints(args.sessionId))[0]?.snapshot;
    if (!initialSnapshot) {
      return { isError: true, content: [{ type: 'text', text: 'No snapshot available to export' }] };
    }

    const events = await this.storage.getEvents(args.sessionId);
    const checkpoints = await this.storage.getCheckpoints(args.sessionId);
    const annotations = await this.storage.getAnnotations(args.sessionId);

    const bundle = SessionSerializer.exportBundle(session, initialSnapshot, events, checkpoints, annotations);
    return {
      content: [{ type: 'text', text: SessionSerializer.exportToJson(bundle) }],
    };
  }

  private async handleImportSession(args: Record<string, any>): Promise<MCPToolCallResult> {
    const bundle = SessionSerializer.importFromJson(args.bundleJson);
    const integrity = SessionSerializer.validateIntegrity(bundle);

    await this.storage.saveSession(bundle.metadata);
    await this.storage.saveInitialSnapshot(bundle.metadata.id, bundle.initialSnapshot);
    await this.storage.appendEvents(bundle.metadata.id, bundle.events);
    for (const chk of bundle.checkpoints) {
      await this.storage.saveCheckpoint(chk);
    }
    for (const ann of bundle.annotations) {
      await this.storage.addAnnotation(ann);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Session '${bundle.metadata.id}' successfully imported`,
            eventsCount: bundle.events.length,
            checkpointsCount: bundle.checkpoints.length,
            integrity,
          }, null, 2),
        },
      ],
    };
  }

  private async handleDeleteSession(args: Record<string, any>): Promise<MCPToolCallResult> {
    const success = await this.storage.deleteSession(args.sessionId);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success, sessionId: args.sessionId }) }],
    };
  }

  private async handleGetTimeline(args: Record<string, any>): Promise<MCPToolCallResult> {
    const session = await this.storage.getSession(args.sessionId);
    const events = await this.storage.getEvents(args.sessionId);

    const breakdown: Record<string, number> = {};
    for (const evt of events) {
      breakdown[evt.category] = (breakdown[evt.category] || 0) + 1;
    }

    const firstTime = events.length > 0 ? events[0].timestamp : 0;
    const lastTime = events.length > 0 ? events[events.length - 1].timestamp : 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: args.sessionId,
            durationMs: lastTime - firstTime,
            firstTimestamp: firstTime,
            lastTimestamp: lastTime,
            totalEvents: events.length,
            categoryBreakdown: breakdown,
            sessionStatus: session?.status,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetEvents(args: Record<string, any>): Promise<MCPToolCallResult> {
    const events = await this.storage.getEvents(args.sessionId, {
      category: args.category,
      type: args.type,
      fromTimestamp: args.fromTimestamp,
      toTimestamp: args.toTimestamp,
      targetNodeId: args.targetNodeId,
      targetSelector: args.targetSelector,
      searchQuery: args.searchQuery,
      limit: args.limit || 50,
      offset: args.offset || 0,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: args.sessionId,
            returnedEvents: events.length,
            events: events.map((e) => ({
              id: e.id,
              sequence: e.sequence,
              timestamp: e.timestamp,
              type: e.type,
              category: e.category,
              targetNodeId: e.targetNodeId,
              targetSelector: e.targetSelector,
              payload: e.payload,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetEventsAround(args: Record<string, any>): Promise<MCPToolCallResult> {
    const events = await this.storage.getEvents(args.sessionId);
    let targetTime = args.timestamp;

    if (typeof targetTime !== 'number' && args.eventId) {
      const match = events.find((e) => e.id === args.eventId);
      if (match) targetTime = match.timestamp;
    }

    if (typeof targetTime !== 'number') {
      return { isError: true, content: [{ type: 'text', text: 'Target timestamp or eventId must be provided' }] };
    }

    const windowMs = args.windowMs || 300;
    const windowEvents = events.filter((e) => Math.abs(e.timestamp - targetTime) <= windowMs);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: args.sessionId,
            targetTimestamp: targetTime,
            windowMs,
            totalEventsInWindow: windowEvents.length,
            events: windowEvents,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetDOMState(args: Record<string, any>): Promise<MCPToolCallResult> {
    const reconstructor = await this.getReconstructor(args.sessionId);
    const snapshot = reconstructor.getStateAt({
      timestamp: args.timestamp,
      eventId: args.eventId,
    });

    const format = args.format || 'html';

    if (format === 'html') {
      const treeBuilder = new VirtualTreeBuilder(snapshot.nodes, snapshot.rootId);
      const html = treeBuilder.toHTML();
      return {
        content: [{ type: 'text', text: html }],
      };
    }

    if (format === 'json_summary') {
      const activeNodes = Object.values(snapshot.nodes).filter((n) => !n.isDetached);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              snapshotId: snapshot.snapshotId,
              timestamp: snapshot.timestamp,
              sequence: snapshot.sequence,
              title: snapshot.title,
              url: snapshot.url,
              totalNodeCount: snapshot.totalNodeCount,
              activeNodes: activeNodes.map((n) => ({
                id: n.id,
                tag: n.tagName,
                selector: VirtualQueryEngine.computeSelector(n, snapshot.nodes),
                attributes: n.attributes,
                childrenCount: n.children?.length || 0,
              })),
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }],
    };
  }

  private async handleGetDOMNode(args: Record<string, any>): Promise<MCPToolCallResult> {
    const reconstructor = await this.getReconstructor(args.sessionId);
    const snapshot = reconstructor.getStateAt({ timestamp: args.timestamp || 0 });

    let targetNode = args.nodeId ? snapshot.nodes[args.nodeId] : undefined;

    if (!targetNode && args.selector) {
      const match = VirtualQueryEngine.querySelector(args.selector, snapshot.rootId, snapshot.nodes);
      if (match) targetNode = match;
    }

    if (!targetNode) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Node not found in DOM state at timestamp ${args.timestamp}` }],
      };
    }

    const selector = VirtualQueryEngine.computeSelector(targetNode, snapshot.nodes);
    const parentNode = targetNode.parentId ? snapshot.nodes[targetNode.parentId] : null;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: targetNode.id,
            tagName: targetNode.tagName,
            nodeType: targetNode.nodeType,
            selector,
            attributes: targetNode.attributes,
            textContent: targetNode.textContent,
            parentId: targetNode.parentId,
            parentSelector: parentNode ? VirtualQueryEngine.computeSelector(parentNode, snapshot.nodes) : null,
            childrenIds: targetNode.children,
            isDetached: targetNode.isDetached || false,
            isHidden: targetNode.isHidden || false,
            computedStyles: targetNode.computedStyles,
            boundingClientRect: targetNode.boundingClientRect,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetDOMSubtree(args: Record<string, any>): Promise<MCPToolCallResult> {
    const reconstructor = await this.getReconstructor(args.sessionId);
    const snapshot = reconstructor.getStateAt({ timestamp: args.timestamp || 0 });

    let targetId = args.nodeId;
    if (!targetId && args.selector) {
      const match = VirtualQueryEngine.querySelector(args.selector, snapshot.rootId, snapshot.nodes);
      if (match) targetId = match.id;
    }

    if (!targetId || !snapshot.nodes[targetId]) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Subtree target not found at timestamp ${args.timestamp}` }],
      };
    }

    const treeBuilder = new VirtualTreeBuilder(snapshot.nodes, targetId);
    const html = treeBuilder.toHTML(targetId);

    return {
      content: [{ type: 'text', text: html }],
    };
  }

  private async handleDiffDOM(args: Record<string, any>): Promise<MCPToolCallResult> {
    const reconstructor = await this.getReconstructor(args.sessionId);

    const s1 = reconstructor.getStateAt({ timestamp: args.t1, eventId: args.e1 });
    const s2 = reconstructor.getStateAt({ timestamp: args.t2, eventId: args.e2 });

    const diff = DOMDiffEngine.diff(s1, s2);
    const markdownFormatted = DiffFormatter.formatMarkdown(diff);

    return {
      content: [
        {
          type: 'text',
          text: markdownFormatted + '\n\n' + JSON.stringify(diff, null, 2),
        },
      ],
    };
  }

  private async handleTraceElement(args: Record<string, any>): Promise<MCPToolCallResult> {
    const events = await this.storage.getEvents(args.sessionId);
    const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);

    const trace = LifecycleTracer.traceElement(
      { nodeId: args.nodeId, selector: args.selector },
      events,
      initialSnapshot || undefined
    );

    if (!trace) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Element could not be found to trace: ${JSON.stringify(args)}` }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(trace, null, 2) }],
    };
  }

  private async handleFindDisappearingElements(args: Record<string, any>): Promise<MCPToolCallResult> {
    const events = await this.storage.getEvents(args.sessionId);
    const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);
    const maxLifespan = args.maxLifespanMs || 5000;

    const removedEvents = events.filter((e) => e.type === 'DOM_MUTATION_REMOVE');
    const results = [];

    for (const rem of removedEvents) {
      const nodeId = (rem.payload as any)?.nodeId;
      if (nodeId) {
        const trace = LifecycleTracer.traceElement({ nodeId }, events, initialSnapshot || undefined);
        if (trace && trace.lifespanMs <= maxLifespan) {
          results.push({
            nodeId: trace.targetNodeId,
            tagName: trace.tagName,
            selector: trace.selectorHint,
            createdAt: trace.createdAt,
            removedAt: trace.removedAt,
            lifespanMs: trace.lifespanMs,
            mutationCount: trace.mutationCount,
          });
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: args.sessionId,
            maxLifespanMs: maxLifespan,
            disappearingElementsCount: results.length,
            elements: results,
          }, null, 2),
        },
      ],
    };
  }

  private async handleWhyDidElementDisappear(args: Record<string, any>): Promise<MCPToolCallResult> {
    const events = await this.storage.getEvents(args.sessionId);
    const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);

    const report = DisappearingElementAnalyzer.analyze(args.target, events, initialSnapshot || undefined);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  }

  private async handleGetDiagnostics(args: Record<string, any>): Promise<MCPToolCallResult> {
    const events = await this.storage.getEvents(args.sessionId);
    const filtered = events.filter((e) => {
      if (e.category !== 'CONSOLE' && e.category !== 'ERROR') return false;
      if (typeof args.fromTimestamp === 'number' && e.timestamp < args.fromTimestamp) return false;
      if (typeof args.toTimestamp === 'number' && e.timestamp > args.toTimestamp) return false;
      if (args.level && args.level !== 'all') {
        const level = (e.payload as any)?.level;
        if (args.level === 'error' && e.category !== 'ERROR' && level !== 'error') return false;
        if (args.level !== 'error' && level !== args.level) return false;
      }
      return true;
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: args.sessionId,
            totalDiagnostics: filtered.length,
            diagnostics: filtered,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetNetworkEvents(args: Record<string, any>): Promise<MCPToolCallResult> {
    const events = await this.storage.getEvents(args.sessionId);
    const networkEvents = events.filter((e) => e.category === 'NETWORK');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: args.sessionId,
            totalNetworkEvents: networkEvents.length,
            events: networkEvents,
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetScreenshots(args: Record<string, any>): Promise<MCPToolCallResult> {
    const events = await this.storage.getEvents(args.sessionId);
    const screenshotEvents = events.filter((e) => e.category === 'SCREENSHOT');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: args.sessionId,
            totalScreenshots: screenshotEvents.length,
            screenshots: screenshotEvents.map((s) => ({
              id: s.id,
              timestamp: s.timestamp,
              sequence: s.sequence,
              triggerReason: (s.payload as any)?.triggerReason,
              hasDataUrl: !!(s.payload as any)?.dataUrl,
            })),
          }, null, 2),
        },
      ],
    };
  }

  private async handleAnnotateSession(args: Record<string, any>): Promise<MCPToolCallResult> {
    const annotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: args.sessionId,
      timestamp: args.timestamp || 0,
      nodeId: args.nodeId,
      author: 'AGENT' as const,
      label: args.label,
      comment: args.comment,
      category: args.category || 'NOTE',
      createdAt: Date.now(),
    };

    await this.storage.addAnnotation(annotation);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, annotation }, null, 2),
        },
      ],
    };
  }

  private async handleGetAnnotations(args: Record<string, any>): Promise<MCPToolCallResult> {
    const annotations = await this.storage.getAnnotations(args.sessionId);
    return {
      content: [{ type: 'text', text: JSON.stringify({ sessionId: args.sessionId, annotations }, null, 2) }],
    };
  }

  private async handleGetRecordingHealth(args: Record<string, any>): Promise<MCPToolCallResult> {
    const session = await this.storage.getSession(args.sessionId);
    if (!session) {
      return { isError: true, content: [{ type: 'text', text: `Session '${args.sessionId}' not found` }] };
    }
    const initialSnapshot = await this.storage.getInitialSnapshot(args.sessionId);
    const events = await this.storage.getEvents(args.sessionId);
    const checkpoints = await this.storage.getCheckpoints(args.sessionId);

    const snapshotToUse =
      initialSnapshot ||
      checkpoints[0]?.snapshot || {
        snapshotId: 'snap_empty',
        sessionId: session.id,
        timestamp: 0,
        sequence: 0,
        rootId: 1,
        nodes: {},
        title: session.title || '',
        url: session.url || '',
        origin: session.origin || '',
        viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
        totalNodeCount: 0,
      };

    const bundle = SessionSerializer.exportBundle(session, snapshotToUse, events, checkpoints);
    const integrity = SessionSerializer.validateIntegrity(bundle);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: args.sessionId,
            health: session.health,
            stats: session.stats,
            integrity,
          }, null, 2),
        },
      ],
    };
  }
}
