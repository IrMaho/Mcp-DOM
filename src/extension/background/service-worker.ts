import { IndexedDBStorageProvider } from '../../storage/indexeddb-storage';
import { BaseEvent } from '../../types/events';

const storage = new IndexedDBStorageProvider('ForensicExtensionDB');
let wsBridge: WebSocket | null = null;
let reconnectTimer: any = null;

// Tab-specific active recording state
interface ActiveRecording {
  sessionId: string;
  sessionName: string;
  startTime: number;
  initialUrl: string;
  isRecording: boolean;
}

const activeTabRecordings = new Map<number, ActiveRecording>();

// Connect & maintain WebSocket bridge for live commands and streaming
function connectBridge() {
  if (typeof WebSocket === 'undefined') return;
  try {
    const ws = new WebSocket('ws://127.0.0.1:3847');
    ws.onopen = () => {
      wsBridge = ws;
      console.log('[Forensic Extension] Connected to MCP Bridge on ws://127.0.0.1:3847');
      if (reconnectTimer) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onclose = () => {
      wsBridge = null;
      ensureReconnect();
    };

    ws.onerror = () => {
      wsBridge = null;
      ensureReconnect();
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data.toString());

        // Dispatch live browser command to active tab content script
        if (message.type === 'BROWSER_COMMAND_REQUEST') {
          const { id, command, payload } = message;

          if (typeof chrome === 'undefined' || !chrome.tabs) {
            ws.send(
              JSON.stringify({
                type: 'BROWSER_COMMAND_RESPONSE',
                id,
                command,
                success: false,
                error: { code: 'NO_CHROME_TABS_API', message: 'chrome.tabs API not available in this context' },
              })
            );
            return;
          }

          chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
            const activeTab = tabs && tabs[0] ? tabs[0] : null;
            const tabId = activeTab?.id;

            if (!tabId) {
              ws.send(
                JSON.stringify({
                  type: 'BROWSER_COMMAND_RESPONSE',
                  id,
                  command,
                  success: false,
                  error: { code: 'NO_ACTIVE_TAB', message: 'No active browser tab found' },
                })
              );
              return;
            }

            // If command is screenshot, capture pixel buffer using chrome.tabs.captureVisibleTab
            if (command === 'LIVE_PAGE_SCREENSHOT' || command === 'LIVE_ELEMENT_SCREENSHOT') {
              // 1. Temporarily hide floating debugger & overlays
              chrome.tabs.sendMessage(tabId, { type: 'HIDE_FORENSIC_OVERLAYS' }, () => {
                setTimeout(() => {
                  chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
                    // 2. Restore floating debugger & overlays immediately
                    chrome.tabs.sendMessage(tabId, { type: 'RESTORE_FORENSIC_OVERLAYS' });

                    if (chrome.runtime.lastError || !dataUrl) {
                      ws.send(
                        JSON.stringify({
                          type: 'BROWSER_COMMAND_RESPONSE',
                          id,
                          command,
                          success: false,
                          error: {
                            code: 'SCREENSHOT_FAILED',
                            message: chrome.runtime.lastError?.message || 'captureVisibleTab failed',
                          },
                        })
                      );
                      return;
                    }

                    // Pass screenshot pixel dataUrl to content script for coordinate framing, element crop and metadata
                    chrome.tabs.sendMessage(
                      tabId,
                      {
                        type: 'BROWSER_COMMAND_REQUEST',
                        id,
                        command,
                        payload: { ...payload, dataUrl },
                      },
                      (res) => {
                        const response = res || {
                          id,
                          command,
                          success: true,
                          data: { dataUrl, captureType: command === 'LIVE_ELEMENT_SCREENSHOT' ? 'ELEMENT' : 'FULL_PAGE' },
                        };
                        ws.send(JSON.stringify({ type: 'BROWSER_COMMAND_RESPONSE', ...response }));
                      }
                    );
                  });
                }, 150);
              });
              return;
            }

            // Forward general live command to tab content script
            chrome.tabs.sendMessage(tabId, message, (res) => {
              if (chrome.runtime.lastError) {
                ws.send(
                  JSON.stringify({
                    type: 'BROWSER_COMMAND_RESPONSE',
                    id,
                    command,
                    success: false,
                    error: {
                      code: 'CONTENT_SCRIPT_UNREACHABLE',
                      message: chrome.runtime.lastError.message || 'Content script unreachable on active tab',
                    },
                  })
                );
                return;
              }
              ws.send(JSON.stringify({ type: 'BROWSER_COMMAND_RESPONSE', ...(res || { id, command, success: true }) }));
            });
          });
        }
      } catch (err: any) {
        console.error('[ServiceWorker] Bridge message handling error:', err);
      }
    };
  } catch {
    wsBridge = null;
    ensureReconnect();
  }
}

function ensureReconnect() {
  if (!reconnectTimer) {
    reconnectTimer = setInterval(() => {
      if (!wsBridge || wsBridge.readyState !== WebSocket.OPEN) {
        connectBridge();
      }
    }, 5000);
  }
}

// Start bridge connection
connectBridge();

// WebNavigation listener to capture reload, back, forward, and link navigations
if (typeof chrome !== 'undefined' && chrome.webNavigation?.onCommitted) {
  chrome.webNavigation.onCommitted.addListener(async (details) => {
    // Only care about top-level frames for active recording tabs
    if (details.frameId !== 0) return;

    const tabId = details.tabId;
    const active = activeTabRecordings.get(tabId);
    if (!active || !active.isRecording) return;

    let navType: 'NAV_RELOAD' | 'NAV_FORWARD_BACK' | 'NAV_LINK' | 'NAV_OTHER' = 'NAV_OTHER';
    if (details.transitionType === 'reload') navType = 'NAV_RELOAD';
    else if (details.transitionQualifiers?.includes('forward_back')) navType = 'NAV_FORWARD_BACK';
    else if (details.transitionType === 'link') navType = 'NAV_LINK';

    const navEvent: BaseEvent = {
      id: `nav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId: active.sessionId,
      timestamp: Date.now() - active.startTime,
      sequence: 999999, // Will be ordered by timestamp
      wallClockTime: Date.now(),
      type: navType as any,
      category: 'NAVIGATION',
      source: 'USER_INTERACTION',
      payload: {
        url: details.url,
        transitionType: details.transitionType,
        transitionQualifiers: details.transitionQualifiers,
        tabId: details.tabId,
      },
    };

    try {
      await storage.appendEvents(active.sessionId, [navEvent]);
      if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
        wsBridge.send(JSON.stringify({ type: 'FORENSIC_EVENTS_CHUNK', sessionId: active.sessionId, events: [navEvent] }));
      }
    } catch {
      // Ignored
    }
  });
}

// Handle runtime messages
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      try {
        const tabId = sender.tab?.id ?? message.tabId;

        if (message.type === 'FORENSIC_SESSION_START') {
          if (tabId) {
            activeTabRecordings.set(tabId, {
              sessionId: message.metadata.id,
              sessionName: message.metadata.name,
              startTime: message.metadata.startTime,
              initialUrl: message.metadata.url,
              isRecording: true,
            });
          }

          await storage.saveSession(message.metadata);
          if (message.initialSnapshot) {
            await storage.saveInitialSnapshot(message.metadata.id, message.initialSnapshot);
          }

          if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
            wsBridge.send(JSON.stringify(message));
          }

          sendResponse({ success: true, sessionId: message.metadata.id });
        } else if (message.type === 'GET_TAB_RECORDING_STATE') {
          const active = tabId ? activeTabRecordings.get(tabId) : null;
          sendResponse({
            isRecording: !!active?.isRecording,
            recording: active || null,
          });
        } else if (message.type === 'FORENSIC_EVENTS_CHUNK') {
          await storage.appendEvents(message.sessionId, message.events);

          if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
            wsBridge.send(JSON.stringify(message));
          }

          sendResponse({ success: true });
        } else if (message.type === 'FORENSIC_CHECKPOINT') {
          await storage.saveCheckpoint(message.checkpoint);

          if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
            wsBridge.send(JSON.stringify(message));
          }

          sendResponse({ success: true });
        } else if (message.type === 'FORENSIC_SESSION_STOP') {
          if (tabId) {
            activeTabRecordings.delete(tabId);
          }

          const session = await storage.getSession(message.sessionId);
          if (session) {
            session.status = 'stopped';
            session.endTime = Date.now();
            if (message.metadata?.durationMs) {
              session.durationMs = message.metadata.durationMs;
            }
            await storage.saveSession(session);
          }

          if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
            wsBridge.send(JSON.stringify(message));
          }

          sendResponse({ success: true });
        } else if (message.type === 'OPEN_DASHBOARD_TAB') {
          const url = chrome.runtime.getURL(`dist/src/ui/index.html${message.sessionId ? `?session=${message.sessionId}` : ''}`);
          chrome.tabs.create({ url });
          sendResponse({ success: true, url });
        } else if (message.type === 'CAPTURE_SCREENSHOT') {
          if (chrome.tabs?.captureVisibleTab) {
            chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
              sendResponse({ success: !!dataUrl, dataUrl });
            });
            return;
          }
          sendResponse({ success: false, error: 'Screenshot capture unsupported' });
        } else if (message.type === 'ELEMENT_SELECTED') {
          if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
            wsBridge.send(JSON.stringify(message));
          }
          sendResponse({ success: true });
        }
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // Keep message channel open for async response
  });
}

// Auto-connect to MCP Bridge WebSocket on startup
connectBridge();
