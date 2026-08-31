import { Annotation, SessionMetadata } from '../types/session';
import { BaseEvent } from '../types/events';
import { SnapshotCheckpoint } from '../types/checkpoint';
import { DOMSnapshot } from '../types/dom-node';
import { EventFilter, ForensicStorageProvider } from './storage-interface';

export class MemoryStorageProvider implements ForensicStorageProvider {
  private sessions = new Map<string, SessionMetadata>();
  private events = new Map<string, BaseEvent[]>();
  private checkpoints = new Map<string, SnapshotCheckpoint[]>();
  private initialSnapshots = new Map<string, DOMSnapshot>();
  private annotations = new Map<string, Annotation[]>();

  public async saveSession(metadata: SessionMetadata): Promise<void> {
    this.sessions.set(metadata.id, { ...metadata });
    if (!this.events.has(metadata.id)) this.events.set(metadata.id, []);
    if (!this.checkpoints.has(metadata.id)) this.checkpoints.set(metadata.id, []);
    if (!this.annotations.has(metadata.id)) this.annotations.set(metadata.id, []);
  }

  public async getSession(sessionId: string): Promise<SessionMetadata | null> {
    return this.sessions.get(sessionId) || null;
  }

  public async listSessions(): Promise<SessionMetadata[]> {
    return Array.from(this.sessions.values()).sort((a, b) => b.startTime - a.startTime);
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    this.sessions.delete(sessionId);
    this.events.delete(sessionId);
    this.checkpoints.delete(sessionId);
    this.initialSnapshots.delete(sessionId);
    this.annotations.delete(sessionId);
    return true;
  }

  public async appendEvents(sessionId: string, newEvents: BaseEvent[]): Promise<void> {
    const list = this.events.get(sessionId) || [];
    list.push(...newEvents);
    this.events.set(sessionId, list);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.stats.eventCount = list.length;
    }
  }

  public async getEvents(sessionId: string, filter?: EventFilter): Promise<BaseEvent[]> {
    const all = this.events.get(sessionId) || [];
    if (!filter) return [...all];

    let filtered = all.filter((e) => {
      if (filter.category && e.category !== filter.category) return false;
      if (filter.type && e.type !== filter.type) return false;
      if (typeof filter.fromTimestamp === 'number' && e.timestamp < filter.fromTimestamp) return false;
      if (typeof filter.toTimestamp === 'number' && e.timestamp > filter.toTimestamp) return false;
      if (typeof filter.fromSequence === 'number' && e.sequence < filter.fromSequence) return false;
      if (typeof filter.toSequence === 'number' && e.sequence > filter.toSequence) return false;
      if (typeof filter.targetNodeId === 'number' && e.targetNodeId !== filter.targetNodeId) return false;
      if (filter.targetSelector && e.targetSelector && !e.targetSelector.includes(filter.targetSelector)) return false;

      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const strPayload = JSON.stringify(e.payload).toLowerCase();
        if (!strPayload.includes(query) && !e.type.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });

    if (typeof filter.offset === 'number') {
      filtered = filtered.slice(filter.offset);
    }
    if (typeof filter.limit === 'number') {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  public async getEventCount(sessionId: string): Promise<number> {
    return (this.events.get(sessionId) || []).length;
  }

  public async saveCheckpoint(checkpoint: SnapshotCheckpoint): Promise<void> {
    const list = this.checkpoints.get(checkpoint.sessionId) || [];
    list.push(checkpoint);
    list.sort((a, b) => a.sequence - b.sequence);
    this.checkpoints.set(checkpoint.sessionId, list);
  }

  public async getCheckpoints(sessionId: string): Promise<SnapshotCheckpoint[]> {
    return this.checkpoints.get(sessionId) || [];
  }

  public async saveInitialSnapshot(sessionId: string, snapshot: DOMSnapshot): Promise<void> {
    this.initialSnapshots.set(sessionId, snapshot);
  }

  public async getInitialSnapshot(sessionId: string): Promise<DOMSnapshot | null> {
    return this.initialSnapshots.get(sessionId) || null;
  }

  public async addAnnotation(annotation: Annotation): Promise<void> {
    const list = this.annotations.get(annotation.sessionId) || [];
    list.push(annotation);
    this.annotations.set(annotation.sessionId, list);
  }

  public async getAnnotations(sessionId: string): Promise<Annotation[]> {
    return this.annotations.get(sessionId) || [];
  }

  public clearAll(): void {
    this.sessions.clear();
    this.events.clear();
    this.checkpoints.clear();
    this.initialSnapshots.clear();
    this.annotations.clear();
  }
}
