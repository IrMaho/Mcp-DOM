import { BaseEvent, ConsoleEvent, RuntimeErrorEvent } from '../types/events';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';

export type DiagnosticCallback = (event: BaseEvent) => void;

export class RuntimeDiagnostics {
  private privacy: PrivacyEngine;
  private sequenceCounter: SequenceCounter;
  private callback: DiagnosticCallback;
  private sessionId: string;
  private isInstrumented: boolean = false;
  private originalConsole: Record<string, Function> = {};
  private originalOnError: OnErrorEventHandler | null = null;
  private cleanups: Array<() => void> = [];

  constructor(
    privacy: PrivacyEngine,
    sequenceCounter: SequenceCounter,
    callback: DiagnosticCallback,
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

    // 1. Console Interception
    this.instrumentConsole();

    // 2. Global Error Interception
    this.instrumentGlobalErrors();

    // 3. Unhandled Promise Rejection Interception
    this.instrumentUnhandledRejections();
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

  private instrumentConsole(): void {
    if (typeof console === 'undefined') return;

    const levels: Array<'log' | 'warn' | 'error' | 'info' | 'debug'> = [
      'log',
      'warn',
      'error',
      'info',
      'debug',
    ];

    levels.forEach((level) => {
      const original = console[level];
      if (!original) return;
      this.originalConsole[level] = original;

      console[level] = (...args: any[]) => {
        try {
          this.recordConsole(level, args);
        } catch {
          // Never break original console output
        }
        return original.apply(console, args);
      };

      this.cleanups.push(() => {
        console[level] = original;
      });
    });
  }

  private recordConsole(level: 'log' | 'warn' | 'error' | 'info' | 'debug', rawArgs: any[]): void {
    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const wallClockTime = this.sequenceCounter.getWallClock();
    const sequence = this.sequenceCounter.nextSequence();

    const formattedArgs = rawArgs.map((arg) => {
      const type = typeof arg;
      let valString = '';
      try {
        if (arg instanceof Error) {
          valString = `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
        } else if (type === 'object' && arg !== null) {
          valString = JSON.stringify(arg, (k, v) => (typeof v === 'function' ? '[Function]' : v));
        } else {
          valString = String(arg);
        }
      } catch {
        valString = '[Unserializable Object]';
      }
      return {
        type,
        value: this.privacy.sanitizeText(valString),
      };
    });

    const formattedMessage = formattedArgs.map((a) => a.value).join(' ');

    let stackTrace: string | undefined;
    try {
      const stack = new Error().stack;
      if (stack) {
        // Remove internal recorder frames from stack
        const lines = stack.split('\n');
        stackTrace = lines.slice(2, 8).join('\n');
      }
    } catch {
      // Ignored
    }

    const event: ConsoleEvent = {
      id: this.sequenceCounter.generateEventId('con'),
      sessionId: this.sessionId,
      timestamp,
      sequence,
      wallClockTime,
      type: `RUNTIME_CONSOLE_${level.toUpperCase()}` as any,
      category: level === 'error' ? 'ERROR' : 'CONSOLE',
      source: 'PAGE',
      payload: {
        level,
        args: formattedArgs,
        formattedMessage,
        stackTrace,
      },
    };

    this.callback(event);
  }

  private instrumentGlobalErrors(): void {
    if (typeof window === 'undefined') return;

    const errorHandler = (event: ErrorEvent) => {
      const timestamp = this.sequenceCounter.getRelativeTimestamp();
      const wallClockTime = this.sequenceCounter.getWallClock();
      const sequence = this.sequenceCounter.nextSequence();

      const runtimeEvent: RuntimeErrorEvent = {
        id: this.sequenceCounter.generateEventId('err'),
        sessionId: this.sessionId,
        timestamp,
        sequence,
        wallClockTime,
        type: 'RUNTIME_ERROR',
        category: 'ERROR',
        source: 'PAGE',
        payload: {
          message: event.message || 'Unknown runtime error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack || undefined,
          name: event.error?.name || 'Error',
        },
      };

      this.callback(runtimeEvent);
    };

    window.addEventListener('error', errorHandler);
    this.cleanups.push(() => window.removeEventListener('error', errorHandler));
  }

  private instrumentUnhandledRejections(): void {
    if (typeof window === 'undefined') return;

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const timestamp = this.sequenceCounter.getRelativeTimestamp();
      const wallClockTime = this.sequenceCounter.getWallClock();
      const sequence = this.sequenceCounter.nextSequence();

      let message = 'Unhandled Promise Rejection';
      let stack: string | undefined;

      if (event.reason instanceof Error) {
        message = event.reason.message;
        stack = event.reason.stack;
      } else if (typeof event.reason === 'string') {
        message = event.reason;
      } else if (event.reason) {
        try {
          message = JSON.stringify(event.reason);
        } catch {
          message = String(event.reason);
        }
      }

      const runtimeEvent: RuntimeErrorEvent = {
        id: this.sequenceCounter.generateEventId('rej'),
        sessionId: this.sessionId,
        timestamp,
        sequence,
        wallClockTime,
        type: 'RUNTIME_UNHANDLED_REJECTION',
        category: 'ERROR',
        source: 'PAGE',
        payload: {
          message,
          stack,
          isUnhandledRejection: true,
        },
      };

      this.callback(runtimeEvent);
    };

    window.addEventListener('unhandledrejection', rejectionHandler);
    this.cleanups.push(() => window.removeEventListener('unhandledrejection', rejectionHandler));
  }
}
