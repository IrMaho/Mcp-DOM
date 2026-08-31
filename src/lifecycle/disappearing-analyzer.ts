import { DOMSnapshot, LogicalNodeId } from '../types/dom-node';
import { BaseEvent, DOMAttrChangePayload, DOMRemoveNodePayload } from '../types/events';
import {
  AlternativeHypothesis,
  DisappearanceMechanism,
  DisappearingElementReport,
  EvidenceItem,
} from '../types/lifecycle';
import { LifecycleTracer } from './lifecycle-tracer';

export class DisappearingElementAnalyzer {
  public static analyze(
    targetQuery: string | number,
    events: BaseEvent[],
    initialSnapshot?: DOMSnapshot
  ): DisappearingElementReport {
    const targetObj = typeof targetQuery === 'number' ? { nodeId: targetQuery } : { selector: targetQuery };
    const trace = LifecycleTracer.traceElement(targetObj, events, initialSnapshot);

    if (!trace) {
      return {
        targetQuery,
        found: false,
        disappearanceMechanism: 'UNKNOWN',
        likelyRootCause: 'Target element could not be found in recording baseline or event stream',
        confidenceScore: 0,
        detailedExplanation: `No element matching "${targetQuery}" was ever created, recorded in the initial DOM snapshot, or observed in mutation events.`,
        evidentiaryTrail: [],
        precedingEvents: [],
        followingEvents: [],
        correlatedErrors: [],
        correlatedNetworkCalls: [],
        alternativeHypotheses: [
          {
            hypothesis: 'Element was injected into an unmonitored isolated iframe or ShadowRoot closed mode',
            likelihood: 40,
            evidenceFor: ['Element query yielded zero matches in monitored document'],
            evidenceAgainst: ['Iframes/ShadowRoots were accessible in this session'],
          },
          {
            hypothesis: 'Selector typo or timing mismatch',
            likelihood: 60,
            evidenceFor: ['Target selector did not match any recorded tag or class'],
            evidenceAgainst: [],
          },
        ],
      };
    }

    const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);
    const evidentiaryTrail: EvidenceItem[] = [];
    const alternativeHypotheses: AlternativeHypothesis[] = [];

    let mechanism: DisappearanceMechanism = 'UNKNOWN';
    let likelyRootCause = 'Unknown disappearance mechanism';
    let confidenceScore = 50;
    let detailedExplanation = '';
    let disappearedAt: number | undefined = trace.removedAt ?? undefined;

    // 1. Check if the element was actually removed or hidden
    const removalEntry = trace.entries.find((e) => e.stage === 'REMOVED_FROM_DOM');
    const parentSubtreeEntry = trace.entries.find((e) => e.stage === 'PARENT_SUBTREE_REPLACED');
    const classHiddenEntry = trace.entries.find(
      (e) =>
        e.stage === 'CLASS_MODIFIED' &&
        /\b(hidden|hide|d-none|invisible|collapsed)\b/i.test(String(e.details.newValue || ''))
    );
    const styleHiddenEntry = trace.entries.find(
      (e) =>
        e.stage === 'STYLE_MODIFIED' &&
        /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(String(e.details.newValue || ''))
    );

    // Analyze Primary Disappearance Mechanism
    if (removalEntry) {
      mechanism = 'DIRECT_NODE_REMOVAL';
      disappearedAt = removalEntry.timestamp;
      likelyRootCause = `Element [ID: ${trace.targetNodeId}] <${trace.tagName}> was directly removed from its parent [ID: ${removalEntry.details.parentId}] via DOM removeChild/replaceChild`;
      confidenceScore = 95;

      evidentiaryTrail.push({
        timestamp: removalEntry.timestamp,
        sequence: removalEntry.sequence,
        eventId: removalEntry.eventId,
        eventType: removalEntry.eventType,
        evidenceType: 'DIRECT',
        description: `Direct DOM removal mutation: element detached from parent ID ${removalEntry.details.parentId}`,
        confidenceContribution: 50,
      });
    } else if (parentSubtreeEntry) {
      mechanism = 'PARENT_SUBTREE_REPLACED';
      disappearedAt = parentSubtreeEntry.timestamp;
      likelyRootCause = `Host framework (e.g. React/Vue re-render) destroyed and replaced Ancestor container [ID: ${parentSubtreeEntry.details.removedAncestorId}], causing injected element to be unmounted`;
      confidenceScore = 92;

      evidentiaryTrail.push({
        timestamp: parentSubtreeEntry.timestamp,
        sequence: parentSubtreeEntry.sequence,
        eventId: parentSubtreeEntry.eventId,
        eventType: parentSubtreeEntry.eventType,
        evidenceType: 'DIRECT',
        description: `Ancestor container [ID: ${parentSubtreeEntry.details.removedAncestorId}] was removed, wiping out all child subtrees`,
        confidenceContribution: 50,
      });
    } else if (styleHiddenEntry) {
      mechanism = 'STYLE_DISPLAY_NONE';
      disappearedAt = styleHiddenEntry.timestamp;
      likelyRootCause = `Element was visually hidden by an inline style modification: "${styleHiddenEntry.details.newValue}"`;
      confidenceScore = 88;

      evidentiaryTrail.push({
        timestamp: styleHiddenEntry.timestamp,
        sequence: styleHiddenEntry.sequence,
        eventId: styleHiddenEntry.eventId,
        eventType: styleHiddenEntry.eventType,
        evidenceType: 'DIRECT',
        description: `Inline style changed to "${styleHiddenEntry.details.newValue}"`,
        confidenceContribution: 45,
      });
    } else if (classHiddenEntry) {
      mechanism = 'CLASS_TRIGGERED_HIDDEN';
      disappearedAt = classHiddenEntry.timestamp;
      likelyRootCause = `Element was visually hidden because its CSS class list was modified to include "${classHiddenEntry.details.newValue}"`;
      confidenceScore = 85;

      evidentiaryTrail.push({
        timestamp: classHiddenEntry.timestamp,
        sequence: classHiddenEntry.sequence,
        eventId: classHiddenEntry.eventId,
        eventType: classHiddenEntry.eventType,
        evidenceType: 'DIRECT',
        description: `Class list changed from "${classHiddenEntry.details.oldValue ?? ''}" to "${classHiddenEntry.details.newValue ?? ''}"`,
        confidenceContribution: 45,
      });
    } else if (trace.isCurrentlyAlive) {
      mechanism = 'UNKNOWN';
      likelyRootCause = `Element [ID: ${trace.targetNodeId}] is currently alive and attached to the DOM tree (no unmount mutation detected)`;
      confidenceScore = 70;
      detailedExplanation = `The element exists in the current DOM state. If it is not visible on screen, it may be clipped by viewport boundaries, z-index stacking context, or 0x0 pixel dimensions.`;
    }

    // 2. Preceding Events Analysis Window (e.g. 500ms before disappearance)
    const criticalTime = disappearedAt ?? trace.createdAt;
    const windowMs = 500;

    const precedingEvents = sortedEvents.filter(
      (e) => e.timestamp >= criticalTime - windowMs && e.timestamp < criticalTime
    );

    const followingEvents = sortedEvents.filter(
      (e) => e.timestamp > criticalTime && e.timestamp <= criticalTime + windowMs
    );

    // Correlated runtime errors
    const correlatedErrors = precedingEvents.filter((e) => e.category === 'ERROR');
    if (correlatedErrors.length > 0) {
      const err = correlatedErrors[0];
      const errMsg = (err.payload as any)?.message || 'Unknown runtime error';
      evidentiaryTrail.push({
        timestamp: err.timestamp,
        sequence: err.sequence,
        eventId: err.id,
        eventType: err.type,
        evidenceType: 'PRECEDING',
        description: `Runtime error occurred ${(criticalTime - err.timestamp).toFixed(1)}ms before disappearance: "${errMsg}"`,
        confidenceContribution: 20,
        rawEvent: err,
      });

      likelyRootCause += ` (preceded by runtime error: "${errMsg}")`;
    }

    // Correlated network requests
    const correlatedNetworkCalls = precedingEvents.filter(
      (e) => e.type === 'NETWORK_RESPONSE_COMPLETE' || e.type === 'NETWORK_REQUEST_FAILED'
    );
    if (correlatedNetworkCalls.length > 0) {
      const net = correlatedNetworkCalls[0];
      const netUrl = (net.payload as any)?.url || 'network request';
      evidentiaryTrail.push({
        timestamp: net.timestamp,
        sequence: net.sequence,
        eventId: net.id,
        eventType: net.type,
        evidenceType: 'PRECEDING',
        description: `Network response completed ${(criticalTime - net.timestamp).toFixed(1)}ms before disappearance: ${netUrl}`,
        confidenceContribution: 15,
        rawEvent: net,
      });
    }

    // Correlated navigation / SPA state changes
    const navEvents = precedingEvents.filter((e) => e.category === 'NAVIGATION');
    if (navEvents.length > 0) {
      const nav = navEvents[0];
      evidentiaryTrail.push({
        timestamp: nav.timestamp,
        sequence: nav.sequence,
        eventId: nav.id,
        eventType: nav.type,
        evidenceType: 'PRECEDING',
        description: `Navigation event (${(nav.payload as any)?.navigationType}) occurred ${(criticalTime - nav.timestamp).toFixed(1)}ms before disappearance`,
        confidenceContribution: 25,
        rawEvent: nav,
      });
      likelyRootCause += ` following SPA navigation to "${(nav.payload as any)?.url}"`;
    }

    // Detailed explanation assembly
    if (!detailedExplanation) {
      detailedExplanation = [
        `Element <${trace.tagName}> (Logical ID: ${trace.targetNodeId}, selector: "${trace.selectorHint}") was created at ${trace.createdAt.toFixed(1)}ms.`,
        `It remained alive in the DOM for ${trace.lifespanMs.toFixed(1)}ms and experienced ${trace.mutationCount} mutations.`,
        `At timestamp ${criticalTime.toFixed(1)}ms, it disappeared via [${mechanism}].`,
        `Diagnosis: ${likelyRootCause}.`,
      ].join(' ');
    }

    // Alternative Hypotheses Generation
    if (mechanism === 'PARENT_SUBTREE_REPLACED') {
      alternativeHypotheses.push({
        hypothesis: 'Direct cleanup called by extension code',
        likelihood: 25,
        evidenceFor: ['Element was unmounted shortly after creation'],
        evidenceAgainst: ['Ancestor container mutation was recorded from host page context'],
      });
      alternativeHypotheses.push({
        hypothesis: 'Host single-page app route change destroyed component tree',
        likelihood: 35,
        evidenceFor: navEvents.length > 0 ? ['Preceding navigation event recorded'] : [],
        evidenceAgainst: navEvents.length === 0 ? ['No navigation events occurred in temporal window'] : [],
      });
    } else if (mechanism === 'DIRECT_NODE_REMOVAL') {
      alternativeHypotheses.push({
        hypothesis: 'Third-party script or ad-blocker removed the injected node',
        likelihood: 30,
        evidenceFor: ['Direct node removal occurred without ancestor replacement'],
        evidenceAgainst: ['No ad-blocker signatures or extension error logs observed'],
      });
    }

    return {
      targetQuery,
      targetNodeId: trace.targetNodeId,
      found: true,
      tagName: trace.tagName,
      selectorHint: trace.selectorHint,
      createdAt: trace.createdAt,
      firstVisibleAt: trace.createdAt,
      lastKnownGoodStateAt: Math.max(0, criticalTime - 1),
      disappearedAt,
      lifespanMs: trace.lifespanMs,
      disappearanceMechanism: mechanism,
      likelyRootCause,
      confidenceScore: Math.min(99, confidenceScore),
      detailedExplanation,
      evidentiaryTrail,
      precedingEvents,
      followingEvents,
      correlatedErrors,
      correlatedNetworkCalls,
      alternativeHypotheses,
    };
  }
}
