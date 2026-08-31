import * as fs from 'fs';
import * as path from 'path';
import { Annotation, SessionMetadata } from '../types/session';
import { BaseEvent } from '../types/events';
import { SnapshotCheckpoint } from '../types/checkpoint';
import { DOMSnapshot } from '../types/dom-node';
import { EventFilter, ForensicStorageProvider } from './storage-interface';

export class FileStorageProvider implements ForensicStorageProvider {
  private baseDir: string;

  constructor(baseDir: string = './.forensic_sessions') {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getSessionDir(sessionId: string): string {
    const dir = path.join(this.baseDir, sessionId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public async saveSession(metadata: SessionMetadata): Promise<void> {
    const dir = this.getSessionDir(metadata.id);
    const metaPath = path.join(dir, 'metadata.json');
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  public async getSession(sessionId: string): Promise<SessionMetadata | null> {
    const dir = path.join(this.baseDir, sessionId);
    const metaPath = path.join(dir, 'metadata.json');
    if (!fs.existsSync(metaPath)) return null;
    try {
      const data = fs.readFileSync(metaPath, 'utf-8');
      return JSON.parse(data) as SessionMetadata;
    } catch {
      return null;
    }
  }

  public async listSessions(): Promise<SessionMetadata[]> {
    if (!fs.existsSync(this.baseDir)) return [];
    const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
    const sessions: SessionMetadata[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metaPath = path.join(this.baseDir, entry.name, 'metadata.json');
        if (fs.existsSync(metaPath)) {
          try {
            const data = fs.readFileSync(metaPath, 'utf-8');
            sessions.push(JSON.parse(data) as SessionMetadata);
          } catch {
            // Corrupt file skipped
          }
        }
      }
    }

    return sessions.sort((a, b) => b.startTime - a.startTime);
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    const dir = path.join(this.baseDir, sessionId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  }

  public async appendEvents(sessionId: string, events: BaseEvent[]): Promise<void> {
    if (events.length === 0) return;
    const dir = this.getSessionDir(sessionId);
    const eventsPath = path.join(dir, 'events.jsonl');
    const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
    fs.appendFileSync(eventsPath, lines, 'utf-8');
  }

  public async getEvents(sessionId: string, filter?: EventFilter): Promise<BaseEvent[]> {
    const dir = path.join(this.baseDir, sessionId);
    const eventsPath = path.join(dir, 'events.jsonl');
    if (!fs.existsSync(eventsPath)) return [];

    const lines = fs.readFileSync(eventsPath, 'utf-8').split('\n');
    const all: BaseEvent[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        all.push(JSON.parse(trimmed));
      } catch {
        // Skip malformed line
      }
    }

    if (!filter) return all;

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

    if (typeof filter.offset === 'number') filtered = filtered.slice(filter.offset);
    if (typeof filter.limit === 'number') filtered = filtered.slice(0, filter.limit);

    return filtered;
  }

  public async getEventCount(sessionId: string): Promise<number> {
    const dir = path.join(this.baseDir, sessionId);
    const eventsPath = path.join(dir, 'events.jsonl');
    if (!fs.existsSync(eventsPath)) return 0;
    const lines = fs.readFileSync(eventsPath, 'utf-8').split('\n').filter(Boolean);
    return lines.length;
  }

  public async saveCheckpoint(checkpoint: SnapshotCheckpoint): Promise<void> {
    const dir = this.getSessionDir(checkpoint.sessionId);
    const chkDir = path.join(dir, 'checkpoints');
    if (!fs.existsSync(chkDir)) fs.mkdirSync(chkDir, { recursive: true });

    const file = path.join(chkDir, `${checkpoint.checkpointId}.json`);
    fs.writeFileSync(file, JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  public async getCheckpoints(sessionId: string): Promise<SnapshotCheckpoint[]> {
    const dir = path.join(this.baseDir, sessionId, 'checkpoints');
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const checkpoints: SnapshotCheckpoint[] = [];

    for (const f of files) {
      try {
        const data = fs.readFileSync(path.join(dir, f), 'utf-8');
        checkpoints.push(JSON.parse(data));
      } catch {
        // Ignored
      }
    }

    return checkpoints.sort((a, b) => a.sequence - b.sequence);
  }

  public async saveInitialSnapshot(sessionId: string, snapshot: DOMSnapshot): Promise<void> {
    const dir = this.getSessionDir(sessionId);
    const file = path.join(dir, 'initial_snapshot.json');
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf-8');
  }

  public async getInitialSnapshot(sessionId: string): Promise<DOMSnapshot | null> {
    const dir = path.join(this.baseDir, sessionId);
    const file = path.join(dir, 'initial_snapshot.json');
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as DOMSnapshot;
    } catch {
      return null;
    }
  }

  public async addAnnotation(annotation: Annotation): Promise<void> {
    const dir = this.getSessionDir(annotation.sessionId);
    const annPath = path.join(dir, 'annotations.json');
    let list: Annotation[] = [];
    if (fs.existsSync(annPath)) {
      try {
        list = JSON.parse(fs.readFileSync(annPath, 'utf-8'));
      } catch {
        list = [];
      }
    }
    list.push(annotation);
    fs.writeFileSync(annPath, JSON.stringify(list, null, 2), 'utf-8');
  }

  public async getAnnotations(sessionId: string): Promise<Annotation[]> {
    const dir = path.join(this.baseDir, sessionId);
    const annPath = path.join(dir, 'annotations.json');
    if (!fs.existsSync(annPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(annPath, 'utf-8')) as Annotation[];
    } catch {
      return [];
    }
  }
}
