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

  // 1. Uncaught Global Errors
  window.addEventListener('error', (e) => {
    try {
      postForensicEvent('RUNTIME_ERROR', {
        message: e.message || 'Script Error',
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack,
        name: e.error?.name || 'Error',
      });
    } catch {
      // Ignored
    }
  });

  // 2. Unhandled Promise Rejections
  window.addEventListener('unhandledrejection', (e) => {
    try {
      let message = 'Unhandled Promise Rejection';
      let stack: string | undefined;
      if (e.reason instanceof Error) {
        message = e.reason.message;
        stack = e.reason.stack;
      } else if (typeof e.reason === 'string') {
        message = e.reason;
      }
      postForensicEvent('RUNTIME_UNHANDLED_REJECTION', {
        message,
        stack,
        isUnhandledRejection: true,
      });
    } catch {
      // Ignored
    }
  });
})();
