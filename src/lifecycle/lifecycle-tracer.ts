import { DOMSnapshot, LogicalNodeId, VirtualDOMNode } from '../types/dom-node';
import {
  BaseEvent,
  DOMAddNodePayload,
  DOMAttrChangePayload,
  DOMMoveNodePayload,
  DOMRemoveNodePayload,
  DOMTextChangePayload,
} from '../types/events';
import { ElementLifecycleTrace, LifecycleEntry } from '../types/lifecycle';
import { VirtualQueryEngine } from '../reconstruction/virtual-query';

export class LifecycleTracer {
  public static traceElement(
    target: { nodeId?: LogicalNodeId; selector?: string },
    events: BaseEvent[],
    initialSnapshot?: DOMSnapshot
  ): ElementLifecycleTrace | null {
    const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);

    // 1. Identify target LogicalNodeId
    let targetId: LogicalNodeId | undefined = target.nodeId;
    let tagName = 'unknown';
    let selectorHint = target.selector || '';
    let initialAttrs: Record<string, string> = {};
    let createdAt = 0;
    let createdSequence = 0;
    let createdEventId = 'init';

    if (!targetId && target.selector && initialSnapshot) {
      const match = VirtualQueryEngine.querySelector(target.selector, initialSnapshot.rootId, initialSnapshot.nodes);
      if (match) {
        targetId = match.id;
        tagName = match.tagName || 'element';
        initialAttrs = { ...(match.attributes || {}) };
        selectorHint = target.selector;
      }
    }

    if (!targetId && target.selector) {
      // Search in ADD events for selector match
      for (const evt of sortedEvents) {
        if (evt.type === 'DOM_MUTATION_ADD') {
          const payload = evt.payload as unknown as DOMAddNodePayload;
          if (payload.node && VirtualQueryEngine.matches(payload.node, target.selector)) {
            targetId = payload.node.id;
            tagName = payload.node.tagName || 'element';
            initialAttrs = { ...(payload.node.attributes || {}) };
            createdAt = evt.timestamp;
            createdSequence = evt.sequence;
            createdEventId = evt.id;
            break;
          }
        }
      }
    }

    if (!targetId) {
      return null;
    }

    // 2. Build Lifecycle Entries
    const entries: LifecycleEntry[] = [];
    let isCurrentlyAlive = true;
    let removedAt: number | null = null;
    let removedSequence: number | null = null;
    let removedEventId: string | undefined = undefined;
    let mutationCount = 0;

    // Check presence in initial snapshot
    if (initialSnapshot && initialSnapshot.nodes[targetId]) {
      const node = initialSnapshot.nodes[targetId];
      tagName = node.tagName || tagName;
      initialAttrs = { ...(node.attributes || {}) };
      if (!selectorHint) {
        selectorHint = VirtualQueryEngine.computeSelector(node, initialSnapshot.nodes);
      }

      entries.push({
        timestamp: initialSnapshot.timestamp,
        sequence: initialSnapshot.sequence,
        wallClockTime: Date.now(),
        stage: 'CREATED',
        eventId: initialSnapshot.snapshotId,
        eventType: 'DOM_SNAPSHOT',
        description: `Element <${tagName}> existed in initial baseline snapshot [ID: ${targetId}]`,
        details: { initialParentId: node.parentId, attributes: initialAttrs },
        nodeSnapshot: node,
      });
    }

    // Track parent relationships dynamically across snapshots and mutations
    const parentMap = new Map<LogicalNodeId, LogicalNodeId | null>();
    if (initialSnapshot) {
      for (const [idStr, node] of Object.entries(initialSnapshot.nodes)) {
        parentMap.set(Number(idStr), node.parentId ?? null);
      }
    }

    const isAncestor = (ancestorId: LogicalNodeId, childId: LogicalNodeId): boolean => {
      let curr = parentMap.get(childId);
      const visited = new Set<LogicalNodeId>();
      while (curr && !visited.has(curr)) {
        if (curr === ancestorId) return true;
        visited.add(curr);
        curr = parentMap.get(curr);
      }
      return false;
    };

    for (const evt of sortedEvents) {
      const ts = evt.timestamp;
      const seq = evt.sequence;
      const wall = evt.wallClockTime;

      // Event is direct node ADD
      if (evt.type === 'DOM_MUTATION_ADD') {
        const payload = evt.payload as unknown as DOMAddNodePayload;
        if (payload.node?.id) {
          parentMap.set(payload.node.id, payload.parentId ?? null);
        }

        if (payload.node?.id === targetId) {
          isCurrentlyAlive = true;
          tagName = payload.node.tagName || tagName;
          createdAt = ts;
          createdSequence = seq;
          createdEventId = evt.id;
          initialAttrs = { ...(payload.node.attributes || {}) };

          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: 'ATTACHED_TO_DOM',
            eventId: evt.id,
            eventType: evt.type,
            description: `Element <${tagName}> added to DOM under parent ID ${payload.parentId}`,
            details: { parentId: payload.parentId, index: payload.index },
            nodeSnapshot: payload.node,
          });
        }
      }

      // Event is direct node REMOVE
      if (evt.type === 'DOM_MUTATION_REMOVE') {
        const payload = evt.payload as unknown as DOMRemoveNodePayload;
        if (payload.nodeId === targetId) {
          isCurrentlyAlive = false;
          removedAt = ts;
          removedSequence = seq;
          removedEventId = evt.id;

          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: 'REMOVED_FROM_DOM',
            eventId: evt.id,
            eventType: evt.type,
            description: `Element <${tagName}> explicitly removed from parent ID ${payload.parentId}`,
            details: { parentId: payload.parentId, removedIndex: payload.index },
          });
        } else if (isAncestor(payload.nodeId, targetId)) {
          // Ancestor was removed => this node was unmounted as part of ancestor removal!
          isCurrentlyAlive = false;
          removedAt = ts;
          removedSequence = seq;
          removedEventId = evt.id;

          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: 'PARENT_SUBTREE_REPLACED',
            eventId: evt.id,
            eventType: evt.type,
            description: `Ancestor element [ID: ${payload.nodeId}] was removed, causing target element [ID: ${targetId}] to detach from DOM`,
            details: { removedAncestorId: payload.nodeId, parentId: payload.parentId },
          });
        }
      }

      // Event is direct node MOVE
      if (evt.type === 'DOM_MUTATION_MOVE') {
        const payload = evt.payload as unknown as DOMMoveNodePayload;
        if (payload.nodeId) {
          parentMap.set(payload.nodeId, payload.newParentId ?? null);
        }
        if (payload.nodeId === targetId) {
          mutationCount++;
          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: 'REPARENTED',
            eventId: evt.id,
            eventType: evt.type,
            description: `Element reparented from parent ${payload.oldParentId} to ${payload.newParentId}`,
            details: { oldParentId: payload.oldParentId, newParentId: payload.newParentId },
          });
        }
      }

      // Event is direct node ATTR change
      if (evt.type === 'DOM_MUTATION_ATTR') {
        const payload = evt.payload as unknown as DOMAttrChangePayload;
        if (payload.nodeId === targetId) {
          mutationCount++;
          const attr = payload.attributeName.toLowerCase();
          let stage: LifecycleEntry['stage'] = 'ATTRIBUTE_MODIFIED';

          if (attr === 'class') stage = 'CLASS_MODIFIED';
          if (attr === 'style') stage = 'STYLE_MODIFIED';

          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage,
            eventId: evt.id,
            eventType: evt.type,
            description: `Attribute '${payload.attributeName}' changed from '${payload.oldValue ?? ''}' to '${payload.newValue ?? ''}'`,
            details: {
              attributeName: payload.attributeName,
              oldValue: payload.oldValue,
              newValue: payload.newValue,
            },
          });
        }
      }

      // Event is direct node TEXT change
      if (evt.type === 'DOM_MUTATION_TEXT') {
        const payload = evt.payload as unknown as DOMTextChangePayload;
        if (payload.nodeId === targetId) {
          mutationCount++;
          entries.push({
            timestamp: ts,
            sequence: seq,
            wallClockTime: wall,
            stage: 'TEXT_MODIFIED',
            eventId: evt.id,
            eventType: evt.type,
            description: `Text content changed: "${payload.oldText}" → "${payload.newText}"`,
            details: { oldText: payload.oldText, newText: payload.newText },
          });
        }
      }
    }

    // 3. Find Correlated Errors and Network Events within target lifespan / around removal
    const criticalTime = removedAt ?? createdAt;
    const windowMs = 500;

    const correlatedDiagnostics = sortedEvents.filter(
      (e) =>
        (e.category === 'ERROR' || e.category === 'CONSOLE') &&
        Math.abs(e.timestamp - criticalTime) <= windowMs
    );

    const correlatedNetwork = sortedEvents.filter(
      (e) => e.category === 'NETWORK' && Math.abs(e.timestamp - criticalTime) <= windowMs
    );

    const lastEventTime = sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1].timestamp : createdAt;
    const lifespanMs = Math.max(0, (removedAt ?? lastEventTime) - createdAt);

    return {
      targetNodeId: targetId,
      tagName,
      selectorHint,
      initialAttributes: initialAttrs,
      createdAt,
      createdSequence,
      createdEventId,
      removedAt,
      removedSequence,
      removedEventId,
      isCurrentlyAlive,
      lifespanMs: Math.round(lifespanMs * 100) / 100,
      mutationCount,
      entries,
      correlatedDiagnostics,
      correlatedNetwork,
    };
  }
}
