import { Annotation, SessionMetadata } from '../types/session';
import { BaseEvent } from '../types/events';
import { SnapshotCheckpoint } from '../types/checkpoint';
import { DOMSnapshot } from '../types/dom-node';
import { EventFilter, ForensicStorageProvider } from './storage-interface';

export class IndexedDBStorageProvider implements ForensicStorageProvider {
  private dbName: string;
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = 'ForensicRecorderDB') {
    this.dbName = dbName;
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available in current runtime environment');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('events')) {
          const evtStore = db.createObjectStore('events', { keyPath: 'id' });
          evtStore.createIndex('sessionId', 'sessionId', { unique: false });
          evtStore.createIndex('sequence', 'sequence', { unique: false });
        }
        if (!db.objectStoreNames.contains('checkpoints')) {
          const chkStore = db.createObjectStore('checkpoints', { keyPath: 'checkpointId' });
          chkStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'sessionId' });
        }
        if (!db.objectStoreNames.contains('annotations')) {
          const annStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  public async saveSession(metadata: SessionMetadata): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      store.put(metadata);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getSession(sessionId: string): Promise<SessionMetadata | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.get(sessionId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async listSessions(): Promise<SessionMetadata[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as SessionMetadata[]) || [];
        results.sort((a, b) => b.startTime - a.startTime);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['sessions', 'events', 'checkpoints', 'snapshots', 'annotations'], 'readwrite');
      tx.objectStore('sessions').delete(sessionId);
      tx.objectStore('snapshots').delete(sessionId);

      // Delete correlated events
      const evtStore = tx.objectStore('events');
      const evtIdx = evtStore.index('sessionId');
      const req = evtIdx.openCursor(IDBKeyRange.only(sessionId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  public async appendEvents(sessionId: string, events: BaseEvent[]): Promise<void> {
    if (events.length === 0) return;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      for (const evt of events) {
        store.put(evt);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getEvents(sessionId: string, filter?: EventFilter): Promise<BaseEvent[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const index = store.index('sessionId');
      const request = index.getAll(IDBKeyRange.only(sessionId));

      request.onsuccess = () => {
        let events = (request.result as BaseEvent[]) || [];
        events.sort((a, b) => a.sequence - b.sequence);

        if (filter) {
          events = events.filter((e) => {
            if (filter.category && e.category !== filter.category) return false;
            if (filter.type && e.type !== filter.type) return false;
            if (typeof filter.fromTimestamp === 'number' && e.timestamp < filter.fromTimestamp) return false;
            if (typeof filter.toTimestamp === 'number' && e.timestamp > filter.toTimestamp) return false;
            if (typeof filter.targetNodeId === 'number' && e.targetNodeId !== filter.targetNodeId) return false;
            return true;
          });

          if (typeof filter.offset === 'number') events = events.slice(filter.offset);
          if (typeof filter.limit === 'number') events = events.slice(0, filter.limit);
        }

        resolve(events);
      };

      request.onerror = () => reject(request.error);
    });
  }

  public async getEventCount(sessionId: string): Promise<number> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const index = store.index('sessionId');
      const request = index.count(IDBKeyRange.only(sessionId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveCheckpoint(checkpoint: SnapshotCheckpoint): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkpoints', 'readwrite');
      tx.objectStore('checkpoints').put(checkpoint);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getCheckpoints(sessionId: string): Promise<SnapshotCheckpoint[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkpoints', 'readonly');
      const index = tx.objectStore('checkpoints').index('sessionId');
      const request = index.getAll(IDBKeyRange.only(sessionId));
      request.onsuccess = () => {
        const list = (request.result as SnapshotCheckpoint[]) || [];
        list.sort((a, b) => a.sequence - b.sequence);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async saveInitialSnapshot(sessionId: string, snapshot: DOMSnapshot): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put({ sessionId, snapshot });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getInitialSnapshot(sessionId: string): Promise<DOMSnapshot | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readonly');
      const request = tx.objectStore('snapshots').get(sessionId);
      request.onsuccess = () => resolve(request.result ? request.result.snapshot : null);
      request.onerror = () => reject(request.error);
    });
  }

  public async addAnnotation(annotation: Annotation): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('annotations', 'readwrite');
      tx.objectStore('annotations').put(annotation);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAnnotations(sessionId: string): Promise<Annotation[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('annotations', 'readonly');
      const index = tx.objectStore('annotations').index('sessionId');
      const request = index.getAll(IDBKeyRange.only(sessionId));
      request.onsuccess = () => resolve((request.result as Annotation[]) || []);
      request.onerror = () => reject(request.error);
    });
  }
}
