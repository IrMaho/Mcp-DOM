import { LogicalNodeId, VirtualDOMNode } from './dom-node';
import { BaseEvent, EventType } from './events';
export type LifecycleStage = 'CREATED' | 'ATTACHED_TO_DOM' | 'ATTRIBUTE_MODIFIED' | 'CLASS_MODIFIED' | 'STYLE_MODIFIED' | 'TEXT_MODIFIED' | 'REPARENTED' | 'CHILDREN_MUTATED' | 'HIDDEN_BY_STYLE' | 'DETACHED_FROM_DOM' | 'PARENT_REMOVED' | 'PARENT_SUBTREE_REPLACED' | 'REMOVED_FROM_DOM' | 'RECREATED';
export interface LifecycleEntry {
    timestamp: number;
    sequence: number;
    wallClockTime: number;
    stage: LifecycleStage;
    eventId: string;
    eventType: EventType;
    description: string;
    details: {
        attributeName?: string;
        oldValue?: string | null;
        newValue?: string | null;
        oldParentId?: LogicalNodeId | null;
        newParentId?: LogicalNodeId | null;
        removedParentId?: LogicalNodeId | null;
        parentTagName?: string;
        affectedSubtreeSize?: number;
        correlatedError?: string;
        correlatedNetworkUrl?: string;
        [key: string]: unknown;
    };
    nodeSnapshot?: VirtualDOMNode;
}
export interface ElementLifecycleTrace {
    targetNodeId: LogicalNodeId;
    tagName: string;
    selectorHint: string;
    initialAttributes: Record<string, string>;
    createdAt: number;
    createdSequence: number;
    createdEventId: string;
    removedAt: number | null;
    removedSequence: number | null;
    removedEventId?: string;
    isCurrentlyAlive: boolean;
    lifespanMs: number;
    mutationCount: number;
    entries: LifecycleEntry[];
    correlatedDiagnostics: BaseEvent[];
    correlatedNetwork: BaseEvent[];
}
export type DisappearanceMechanism = 'DIRECT_NODE_REMOVAL' | 'PARENT_SUBTREE_REPLACED' | 'PARENT_NODE_REMOVED' | 'STYLE_DISPLAY_NONE' | 'STYLE_VISIBILITY_HIDDEN' | 'STYLE_OPACITY_ZERO' | 'CLASS_TRIGGERED_HIDDEN' | 'DIMENSIONS_COLLAPSED' | 'UNKNOWN';
export interface EvidenceItem {
    timestamp: number;
    sequence: number;
    eventId: string;
    eventType: EventType;
    evidenceType: 'DIRECT' | 'PRECEDING' | 'FOLLOWING' | 'CORRELATED';
    description: string;
    confidenceContribution: number;
    rawEvent?: BaseEvent;
}
export interface AlternativeHypothesis {
    hypothesis: string;
    likelihood: number;
    evidenceFor: string[];
    evidenceAgainst: string[];
}
export interface DisappearingElementReport {
    targetQuery: string | number;
    targetNodeId?: LogicalNodeId;
    found: boolean;
    tagName?: string;
    selectorHint?: string;
    createdAt?: number;
    firstVisibleAt?: number;
    lastKnownGoodStateAt?: number;
    disappearedAt?: number;
    lifespanMs?: number;
    disappearanceMechanism: DisappearanceMechanism;
    likelyRootCause: string;
    confidenceScore: number;
    detailedExplanation: string;
    evidentiaryTrail: EvidenceItem[];
    precedingEvents: BaseEvent[];
    followingEvents: BaseEvent[];
    correlatedErrors: BaseEvent[];
    correlatedNetworkCalls: BaseEvent[];
    alternativeHypotheses: AlternativeHypothesis[];
}
//# sourceMappingURL=lifecycle.d.ts.map