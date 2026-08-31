import { ForensicRecorder } from '../../core/recorder';
(function () {
    let recorder = null;
    let eventBatch = [];
    let flushTimer = null;
    function injectPageScript() {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('dist/extension/page-script.js');
                script.onload = () => script.remove();
                (document.head || document.documentElement).appendChild(script);
            }
        }
        catch {
            // Ignored in non-extension environments
        }
    }
    function flushEvents() {
        if (eventBatch.length === 0 || !recorder)
            return;
        const eventsToSend = [...eventBatch];
        eventBatch = [];
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    type: 'FORENSIC_EVENTS_CHUNK',
                    sessionId: recorder.getSessionId(),
                    events: eventsToSend,
                });
            }
        }
        catch {
            // Background worker might be idle or unavailable
        }
    }
    function startRecording(sessionName) {
        if (recorder)
            return recorder.getMetadata();
        recorder = new ForensicRecorder({ sessionName });
        recorder.onEvent((event) => {
            eventBatch.push(event);
            if (eventBatch.length >= 25) {
                flushEvents();
            }
        });
        recorder.onCheckpoint((checkpoint) => {
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                    chrome.runtime.sendMessage({
                        type: 'FORENSIC_CHECKPOINT',
                        sessionId: checkpoint.sessionId,
                        checkpoint,
                    });
                }
            }
            catch {
                // Ignored
            }
        });
        const initialSnapshot = recorder.start(document);
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    type: 'FORENSIC_SESSION_START',
                    metadata: recorder.getMetadata(),
                    initialSnapshot,
                });
            }
        }
        catch {
            // Ignored
        }
        if (!flushTimer) {
            flushTimer = setInterval(flushEvents, 1000);
        }
        return recorder.getMetadata();
    }
    function stopRecording() {
        if (!recorder)
            return null;
        flushEvents();
        if (flushTimer) {
            clearInterval(flushTimer);
            flushTimer = null;
        }
        const metadata = recorder.stop();
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    type: 'FORENSIC_SESSION_STOP',
                    sessionId: metadata.id,
                    metadata,
                });
            }
        }
        catch {
            // Ignored
        }
        const finishedRecorder = recorder;
        recorder = null;
        return metadata;
    }
    // Listen for messages from extension popup or background worker
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'START_RECORDING') {
                const meta = startRecording(message.sessionName);
                sendResponse({ success: true, metadata: meta });
            }
            else if (message.type === 'STOP_RECORDING') {
                const meta = stopRecording();
                sendResponse({ success: true, metadata: meta });
            }
            else if (message.type === 'GET_RECORDER_STATUS') {
                sendResponse({
                    isRecording: !!recorder,
                    metadata: recorder ? recorder.getMetadata() : null,
                });
            }
            else if (message.type === 'CAPTURE_CHECKPOINT') {
                if (recorder) {
                    const chk = recorder.captureCheckpoint('MANUAL', document);
                    sendResponse({ success: true, checkpoint: chk });
                }
                else {
                    sendResponse({ success: false, error: 'Not recording' });
                }
            }
            return true;
        });
    }
    // Listen for page-world forwarded diagnostics
    window.addEventListener('message', (e) => {
        if (e.data && e.data._forensicOrigin === 'PAGE_MAIN' && recorder) {
            // Forward as diagnostic event
            if (e.data.type.startsWith('RUNTIME_CONSOLE_')) {
                // Recorded directly by in-page console proxy
            }
        }
    });
    // Inject page script into host page
    injectPageScript();
    // Expose global for testing and direct browser console inspection
    window.__FORENSIC_RECORDER__ = {
        start: startRecording,
        stop: stopRecording,
        getRecorder: () => recorder,
    };
})();
//# sourceMappingURL=content-script.js.map