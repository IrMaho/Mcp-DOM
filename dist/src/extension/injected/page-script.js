"use strict";
(function () {
    // Prevent double instrumentation
    if (window.__FORENSIC_PAGE_INSTRUMENTED__)
        return;
    window.__FORENSIC_PAGE_INSTRUMENTED__ = true;
    function postForensicEvent(type, payload) {
        try {
            window.postMessage({
                _forensicOrigin: 'PAGE_MAIN',
                type,
                payload,
                timestamp: performance.now(),
                wallClockTime: Date.now(),
            }, '*');
        }
        catch {
            // Ignored
        }
    }
    // 1. Console Interception
    const levels = ['log', 'warn', 'error', 'info', 'debug'];
    levels.forEach((level) => {
        const original = console[level];
        if (original) {
            console[level] = function (...args) {
                try {
                    const formatted = args.map((arg) => {
                        if (arg instanceof Error)
                            return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
                        if (typeof arg === 'object' && arg !== null) {
                            try {
                                return JSON.stringify(arg);
                            }
                            catch {
                                return '[Unserializable]';
                            }
                        }
                        return String(arg);
                    });
                    postForensicEvent(`RUNTIME_CONSOLE_${level.toUpperCase()}`, {
                        level,
                        formattedMessage: formatted.join(' '),
                    });
                }
                catch {
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
        let stack;
        if (e.reason instanceof Error) {
            msg = e.reason.message;
            stack = e.reason.stack;
        }
        else {
            msg = String(e.reason);
        }
        postForensicEvent('RUNTIME_UNHANDLED_REJECTION', {
            message: msg,
            stack,
            isUnhandledRejection: true,
        });
    });
})();
//# sourceMappingURL=page-script.js.map