(function () {
  // Prevent double instrumentation
  if ((window as any).__FORENSIC_PAGE_INSTRUMENTED__) return;
  (window as any).__FORENSIC_PAGE_INSTRUMENTED__ = true;

  function postForensicEvent(type: string, payload: any) {
    try {
      window.postMessage(
        {
          _forensicOrigin: 'PAGE_MAIN',
          type,
          payload,
          timestamp: performance.now(),
          wallClockTime: Date.now(),
        },
        '*'
      );
    } catch {
      // Ignored
    }
  }

  // 1. Console Interception
  const levels = ['log', 'warn', 'error', 'info', 'debug'] as const;
  levels.forEach((level) => {
    const original = (console as any)[level];
    if (original) {
      (console as any)[level] = function (...args: any[]) {
        try {
          const formatted = args.map((arg) => {
            if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
            if (typeof arg === 'object' && arg !== null) {
              try {
                return JSON.stringify(arg);
              } catch {
                return '[Unserializable]';
              }
            }
            return String(arg);
          });
          postForensicEvent(`RUNTIME_CONSOLE_${level.toUpperCase()}`, {
            level,
            formattedMessage: formatted.join(' '),
          });
        } catch {
          // Never break page execution
        }
        return original.apply(console, args);
      };
    }
  });

  // 2. Uncaught Errors & Rejections
  window.addEventListener('error', (e) => {
    postForensicEvent('RUNTIME_ERROR', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    let msg = 'Unhandled Promise Rejection';
    let stack: string | undefined;
    if (e.reason instanceof Error) {
      msg = e.reason.message;
      stack = e.reason.stack;
    } else {
      msg = String(e.reason);
    }
    postForensicEvent('RUNTIME_UNHANDLED_REJECTION', {
      message: msg,
      stack,
      isUnhandledRejection: true,
    });
  });
})();
