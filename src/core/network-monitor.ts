import {
  BaseEvent,
  NetworkRequestEvent,
  NetworkResponseEvent,
} from '../types/events';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';

export type NetworkEventCallback = (event: BaseEvent) => void;

export class NetworkMonitor {
  private privacy: PrivacyEngine;
  private sequenceCounter: SequenceCounter;
  private callback: NetworkEventCallback;
  private sessionId: string;
  private isInstrumented: boolean = false;
  private originalFetch: typeof window.fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private cleanups: Array<() => void> = [];

  constructor(
    privacy: PrivacyEngine,
    sequenceCounter: SequenceCounter,
    callback: NetworkEventCallback,
    sessionId: string = ''
  ) {
    this.privacy = privacy;
    this.sequenceCounter = sequenceCounter;
    this.callback = callback;
    this.sessionId = sessionId;
  }

  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  public start(): void {
    if (this.isInstrumented) return;
    if (typeof window === 'undefined') return;

    this.isInstrumented = true;
    this.cleanups = [];

    this.instrumentFetch();
    this.instrumentXHR();
  }

  public stop(): void {
    this.cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {
        // Ignored
      }
    });
    this.cleanups = [];
    this.isInstrumented = false;
  }

  private instrumentFetch(): void {
    if (typeof window.fetch !== 'function') return;

    this.originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
      const requestId = self.sequenceCounter.generateEventId('req_f');
      const input = args[0];
      const init = args[1];

      let rawUrl = '';
      if (typeof input === 'string') {
        rawUrl = input;
      } else if (input instanceof URL) {
        rawUrl = input.toString();
      } else if (input && typeof input === 'object' && 'url' in input) {
        rawUrl = input.url;
      }

      const method = (init?.method || (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET')).toUpperCase();
      const sanitizedUrl = self.privacy.sanitizeUrl(rawUrl);

      const startTime = self.sequenceCounter.getRelativeTimestamp();
      const startWallClock = self.sequenceCounter.getWallClock();
      const startSeq = self.sequenceCounter.nextSequence();

      // Emit Request Start
      const startEvent: NetworkRequestEvent = {
        id: requestId,
        sessionId: self.sessionId,
        timestamp: startTime,
        sequence: startSeq,
        wallClockTime: startWallClock,
        type: 'NETWORK_REQUEST_START',
        category: 'NETWORK',
        source: 'PAGE',
        payload: {
          requestId,
          url: sanitizedUrl,
          method,
          resourceType: 'fetch',
          hasBody: !!init?.body,
        },
      };
      self.callback(startEvent);

      try {
        const response = await self.originalFetch!.apply(this, args);
        const endTime = self.sequenceCounter.getRelativeTimestamp();
        const endWallClock = self.sequenceCounter.getWallClock();
        const endSeq = self.sequenceCounter.nextSequence();
        const durationMs = Math.max(0, Math.round((endTime - startTime) * 100) / 100);

        const responseEvent: NetworkResponseEvent = {
          id: self.sequenceCounter.generateEventId('res_f'),
          sessionId: self.sessionId,
          timestamp: endTime,
          sequence: endSeq,
          wallClockTime: endWallClock,
          type: 'NETWORK_RESPONSE_COMPLETE',
          category: 'NETWORK',
          source: 'PAGE',
          causality: {
            triggeredBy: requestId,
            precededBy: requestId,
          },
          payload: {
            requestId,
            url: sanitizedUrl,
            method,
            status: response.status,
            statusText: response.statusText,
            durationMs,
          },
        };
        self.callback(responseEvent);

        return response;
      } catch (err: any) {
        const endTime = self.sequenceCounter.getRelativeTimestamp();
        const endWallClock = self.sequenceCounter.getWallClock();
        const endSeq = self.sequenceCounter.nextSequence();
        const durationMs = Math.max(0, Math.round((endTime - startTime) * 100) / 100);

        const failEvent: NetworkResponseEvent = {
          id: self.sequenceCounter.generateEventId('res_err'),
          sessionId: self.sessionId,
          timestamp: endTime,
          sequence: endSeq,
          wallClockTime: endWallClock,
          type: 'NETWORK_REQUEST_FAILED',
          category: 'NETWORK',
          source: 'PAGE',
          causality: {
            triggeredBy: requestId,
            precededBy: requestId,
          },
          payload: {
            requestId,
            url: sanitizedUrl,
            method,
            status: 0,
            statusText: 'Failed',
            durationMs,
            error: err?.message || 'Network request failed',
          },
        };
        self.callback(failEvent);

        throw err;
      }
    };

    this.cleanups.push(() => {
      if (this.originalFetch) {
        window.fetch = this.originalFetch;
      }
    });
  }

  private instrumentXHR(): void {
    if (typeof XMLHttpRequest === 'undefined') return;

    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    const self = this;

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest & { _forensicRequestId?: string; _forensicMethod?: string; _forensicUrl?: string },
      method: string,
      url: string | URL,
      ...rest: any[]
    ) {
      this._forensicRequestId = self.sequenceCounter.generateEventId('req_x');
      this._forensicMethod = (method || 'GET').toUpperCase();
      this._forensicUrl = typeof url === 'string' ? url : url.toString();
      return self.originalXHROpen!.apply(this, [method, url, ...(rest as [boolean, string | null | undefined, string | null | undefined])]);
    };

    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest & {
        _forensicRequestId?: string;
        _forensicMethod?: string;
        _forensicUrl?: string;
        _forensicStartTime?: number;
      },
      body?: any
    ) {
      const requestId = this._forensicRequestId || self.sequenceCounter.generateEventId('req_x');
      const method = this._forensicMethod || 'GET';
      const sanitizedUrl = self.privacy.sanitizeUrl(this._forensicUrl || '');

      const startTime = self.sequenceCounter.getRelativeTimestamp();
      const startWallClock = self.sequenceCounter.getWallClock();
      const startSeq = self.sequenceCounter.nextSequence();
      this._forensicStartTime = startTime;

      const startEvent: NetworkRequestEvent = {
        id: requestId,
        sessionId: self.sessionId,
        timestamp: startTime,
        sequence: startSeq,
        wallClockTime: startWallClock,
        type: 'NETWORK_REQUEST_START',
        category: 'NETWORK',
        source: 'PAGE',
        payload: {
          requestId,
          url: sanitizedUrl,
          method,
          resourceType: 'xhr',
          hasBody: !!body,
        },
      };
      self.callback(startEvent);

      const onComplete = () => {
        const endTime = self.sequenceCounter.getRelativeTimestamp();
        const endWallClock = self.sequenceCounter.getWallClock();
        const endSeq = self.sequenceCounter.nextSequence();
        const durationMs = Math.max(0, Math.round((endTime - (this._forensicStartTime || startTime)) * 100) / 100);

        const responseEvent: NetworkResponseEvent = {
          id: self.sequenceCounter.generateEventId('res_x'),
          sessionId: self.sessionId,
          timestamp: endTime,
          sequence: endSeq,
          wallClockTime: endWallClock,
          type: this.status >= 200 && this.status < 400 ? 'NETWORK_RESPONSE_COMPLETE' : 'NETWORK_REQUEST_FAILED',
          category: 'NETWORK',
          source: 'PAGE',
          causality: {
            triggeredBy: requestId,
            precededBy: requestId,
          },
          payload: {
            requestId,
            url: sanitizedUrl,
            method,
            status: this.status,
            statusText: this.statusText,
            durationMs,
            error: this.status === 0 ? 'XHR Network Error or Aborted' : undefined,
          },
        };
        self.callback(responseEvent);
      };

      this.addEventListener('load', onComplete);
      this.addEventListener('error', onComplete);
      this.addEventListener('abort', onComplete);

      return self.originalXHRSend!.apply(this, [body]);
    };

    this.cleanups.push(() => {
      if (this.originalXHROpen) XMLHttpRequest.prototype.open = this.originalXHROpen;
      if (this.originalXHRSend) XMLHttpRequest.prototype.send = this.originalXHRSend;
    });
  }
}
