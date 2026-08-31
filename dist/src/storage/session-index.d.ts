import { BaseEvent, EventCategory } from '../types/events';
import { LogicalNodeId } from '../types/dom-node';
export interface SearchResult {
    eventId: string;
    sequence: number;
    timestamp: number;
    type: string;
    category: EventCategory;
    targetNodeId?: LogicalNodeId;
    targetSelector?: string;
    matchedField: string;
    matchedSnippet: string;
    event: BaseEvent;
}
export declare class SessionIndex {
    private events;
    private nodeEventMap;
    private typeEventMap;
    private categoryEventMap;
    constructor(events?: BaseEvent[]);
    buildIndex(events: BaseEvent[]): void;
    search(query: {
        text?: string;
        nodeId?: LogicalNodeId;
        selector?: string;
        category?: EventCategory;
        type?: string;
        fromTimestamp?: number;
        toTimestamp?: number;
        limit?: number;
    }): SearchResult[];
}
//# sourceMappingURL=session-index.d.ts.map