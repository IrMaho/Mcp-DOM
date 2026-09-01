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

export class SessionIndex {
  private events: BaseEvent[] = [];
  private nodeEventMap = new Map<LogicalNodeId, BaseEvent[]>();
  private typeEventMap = new Map<string, BaseEvent[]>();
  private categoryEventMap = new Map<EventCategory, BaseEvent[]>();

  constructor(events: BaseEvent[] = []) {
    this.buildIndex(events);
  }

  public buildIndex(events: BaseEvent[]): void {
    this.events = [...events].sort((a, b) => a.sequence - b.sequence);
    this.nodeEventMap.clear();
    this.typeEventMap.clear();
    this.categoryEventMap.clear();

    for (const evt of this.events) {
      // Map by targetNodeId
      if (typeof evt.targetNodeId === 'number') {
        const list = this.nodeEventMap.get(evt.targetNodeId) || [];
        list.push(evt);
        this.nodeEventMap.set(evt.targetNodeId, list);
      }

      // Map by type
      const typeList = this.typeEventMap.get(evt.type) || [];
      typeList.push(evt);
      this.typeEventMap.set(evt.type, typeList);

      // Map by category
      const catList = this.categoryEventMap.get(evt.category) || [];
      catList.push(evt);
      this.categoryEventMap.set(evt.category, catList);
    }
  }

  public search(query: {
    text?: string;
    nodeId?: LogicalNodeId;
    selector?: string;
    category?: EventCategory;
    type?: string;
    fromTimestamp?: number;
    toTimestamp?: number;
    limit?: number;
  }): SearchResult[] {
    const results: SearchResult[] = [];
    const limit = query.limit || 100;

    let candidateEvents = this.events;

    if (typeof query.nodeId === 'number') {
      candidateEvents = this.nodeEventMap.get(query.nodeId) || [];
    } else if (query.category) {
      candidateEvents = this.categoryEventMap.get(query.category) || [];
    } else if (query.type) {
      candidateEvents = this.typeEventMap.get(query.type) || [];
    }

    const lowerText = query.text ? query.text.toLowerCase() : undefined;
    const lowerSelector = query.selector ? query.selector.toLowerCase() : undefined;

    for (const evt of candidateEvents) {
      if (results.length >= limit) break;

      if (typeof query.fromTimestamp === 'number' && evt.timestamp < query.fromTimestamp) continue;
      if (typeof query.toTimestamp === 'number' && evt.timestamp > query.toTimestamp) continue;
      if (query.category && evt.category !== query.category) continue;
      if (query.type && evt.type !== query.type) continue;

      let matchedField = '';
      let matchedSnippet = '';

      if (lowerSelector) {
        if (evt.targetSelector && evt.targetSelector.toLowerCase().includes(lowerSelector)) {
          matchedField = 'targetSelector';
          matchedSnippet = evt.targetSelector;
        } else {
          continue;
        }
      }

      if (lowerText) {
        let payloadStr = '';
        if (evt.type === 'DOM_SNAPSHOT' || evt.type === 'CHECKPOINT') {
          payloadStr = String((evt.payload as any)?.title || (evt.payload as any)?.url || '');
        } else {
          try {
            payloadStr = JSON.stringify(evt.payload || {});
          } catch {
            payloadStr = '';
          }
        }
        const lowerPayload = payloadStr.toLowerCase();

        if (lowerPayload.includes(lowerText)) {
          matchedField = 'payload';
          const matchIdx = lowerPayload.indexOf(lowerText);
          const start = Math.max(0, matchIdx - 30);
          const end = Math.min(payloadStr.length, matchIdx + lowerText.length + 30);
          matchedSnippet = `...${payloadStr.substring(start, end)}...`;
        } else if (evt.type.toLowerCase().includes(lowerText)) {
          matchedField = 'type';
          matchedSnippet = evt.type;
        } else if (evt.targetSelector && evt.targetSelector.toLowerCase().includes(lowerText)) {
          matchedField = 'targetSelector';
          matchedSnippet = evt.targetSelector;
        } else {
          continue;
        }
      }

      results.push({
        eventId: evt.id,
        sequence: evt.sequence,
        timestamp: evt.timestamp,
        type: evt.type,
        category: evt.category,
        targetNodeId: evt.targetNodeId,
        targetSelector: evt.targetSelector,
        matchedField: matchedField || 'type',
        matchedSnippet: matchedSnippet || evt.type,
        event: evt,
      });
    }

    return results;
  }
}
