---
name: browser-forensics
description: Inspect browser forensic recordings, control live browser DOM, pick elements with Ctrl+Shift+Click, capture element/page screenshots, observe live mutations and interactions, perform DOM time-travel debugging, trace element lifecycles, and diagnose disappearing UI, parent subtree replacements, runtime errors, and CSS mutations via the browser-forensics MCP server.
---

# Browser Forensic Debugging, Live DOM Intelligence & Browser Control Skill

This skill provides comprehensive workflows and reference for both **Historical Forensic Debugging** and **Live Browser Control & Visual Intelligence** using the `browser-forensics` MCP server (34 tools).

---

## 🎯 When to Use This Skill

Activate this skill whenever the user or agent needs to:
1. **Live Browser Control & Inspection**:
   - Inspect active browser page state, viewport, and DOM (`inspect_live_page`, `get_live_dom_snapshot`, `get_live_dom_subtree`).
   - Deeply inspect live DOM elements with layout, bounding boxes, computed styles, roles, ARIA, and parent context (`inspect_live_element`, `get_element_visual_state`).
   - Retrieve elements picked visually by the user holding `Ctrl + Shift + Mouse Click` (`get_selected_element`, `start_element_picker`, `stop_element_picker`).
   - Capture full viewport or cropped element screenshots with DPR and geometry metadata (`capture_page_screenshot`, `capture_element_screenshot`).
   - Interact with live DOM elements (`click`, `hover`, `type`, `focus`, `scroll`, `select_option`) and measure immediate before/after effects (`interact_with_element`).
   - Start focused continuous observation around a target component to catch unmounting or layout destruction (`start_element_observation`, `stop_element_observation`).
2. **Historical Forensics & Time-Travel**:
   - Debug a recorded disappearing UI element or unmounted component (`why_did_element_disappear`, `trace_element`, `find_disappearing_elements`).
   - Reconstruct virtual DOM at sub-millisecond timestamps (`get_dom_state`, `get_dom_node`, `get_dom_subtree`).
   - Calculate structural DOM diffs ($T_1 \leftrightarrow T_2$) (`diff_dom`).
   - Correlate runtime errors, network responses, and console logs (`get_diagnostics`, `get_network_events`, `get_events_around`).

---

## 🛠️ Complete MCP Tool Reference (34 Tools)

### 🌟 Live Browser Control & Visual Intelligence (13 Tools)
| Tool | Purpose | Key Arguments |
| :--- | :--- | :--- |
| `inspect_live_page` | Inspect active page URL, title, viewport, dimensions, and readyState | `{}` |
| `inspect_live_element` | Deeply inspect live element bounds, styles, visibility, attributes, state, role, aria | `selector`, `nodeId`, `selectedElementRef` |
| `get_selected_element` | Retrieve the element picked visually via `Ctrl + Shift + Click` | `{}` |
| `start_element_picker` | Activate interactive visual element picker mode with hover highlight in browser | `highlightColor` |
| `stop_element_picker` | Deactivate visual element picker mode | `{}` |
| `capture_page_screenshot` | Capture full visible viewport screenshot with temporal & scroll metadata | `format` (`png` / `jpeg`) |
| `capture_element_screenshot` | Capture element-bounded screenshot cropped to target bounds and DPR | `selector`, `nodeId`, `selectedElementRef` |
| `interact_with_element` | Perform action (`click`, `hover`, `type`, `focus`, `blur`, `clear`, `press_key`, `select_option`, `scroll`) | `action`, `selector`, `text`, `key`, `optionValue`, `scrollDelta`, `waitForStabilization` |
| `start_element_observation` | Start focused continuous observation around target element | `selector`, `nodeId` |
| `stop_element_observation` | Stop observation and receive complete mutation & root-cause correlation bundle | `{}` |
| `get_live_dom_snapshot` | Capture current live virtual DOM state snapshot in HTML or JSON | `format` (`html` / `json`) |
| `get_live_dom_subtree` | Reconstruct and extract live HTML structure of a subtree | `selector`, `nodeId` |
| `get_element_visual_state` | Inspect layout, occlusion, clipping, opacity, z-index, and viewport visibility | `selector`, `nodeId` |

### 🕰️ Historical Forensics & Time-Travel (21 Tools)
| Tool | Purpose | Key Arguments |
| :--- | :--- | :--- |
| `list_sessions` | List recorded forensic sessions with stats and metadata | `limit` |
| `get_session` | Get full metadata, capabilities, and stats for a session | `sessionId` |
| `export_session` | Export session as portable JSON bundle | `sessionId` |
| `import_session` | Import session from raw JSON string | `bundleJson` |
| `delete_session` | Remove session from storage | `sessionId` |
| `get_timeline` | Retrieve event category timeline breakdown | `sessionId` |
| `get_events` | Query events by category, type, timestamp, or selector | `sessionId`, `category`, `type`, `fromTimestamp`, `toTimestamp`, `limit` |
| `get_events_around` | Retrieve contextual event slice around timestamp/event | `sessionId`, `timestamp`, `eventId`, `windowMs` |
| `get_dom_state` | Reconstruct virtual DOM tree at timestamp $T$ | `sessionId`, `timestamp`, `sequence`, `format` |
| `get_dom_node` | Query properties and styles of a node at timestamp $T$ | `sessionId`, `nodeId`, `selector`, `timestamp` |
| `get_dom_subtree` | Reconstruct HTML of container subtree at timestamp $T$ | `sessionId`, `selector`, `nodeId`, `timestamp` |
| `diff_dom` | Structural DOM diff between $T_1 \leftrightarrow T_2$ or $E_1 \leftrightarrow E_2$ | `sessionId`, `t1`, `t2`, `e1`, `e2`, `format` |
| `trace_element` | Reconstruct chronological lifecycle of an element | `sessionId`, `nodeId`, `selector` |
| `why_did_element_disappear` | Automated root-cause diagnostic engine for vanished UI | `sessionId`, `target` |
| `find_disappearing_elements` | Scan session for short-lived unmounted elements | `sessionId`, `maxLifespanMs` |
| `get_diagnostics` | Retrieve console logs, errors, and unhandled rejections | `sessionId`, `level`, `fromTimestamp`, `toTimestamp` |
| `get_network_events` | Query XHR/fetch network requests and responses | `sessionId`, `statusFilter` |
| `get_screenshots` | List visual screenshot checkpoints | `sessionId` |
| `annotate_session` | Add investigative note or root-cause finding | `sessionId`, `label`, `comment`, `category` |
| `get_annotations` | Retrieve all human and AI annotations | `sessionId` |
| `get_recording_health` | Audit sequence monotonicity and data integrity | `sessionId` |

---

## 🔬 Autonomous Injected UI Debugging Workflow

When debugging an injected browser widget or disappearing UI:

```text
Step 1: Visual Target Selection
  └── Ask user to Ctrl + Shift + Click the target element, or call start_element_picker
  └── Retrieve target metadata: call_mcp_tool('browser-forensics', 'get_selected_element', {})

Step 2: Deep Live Inspection & Baseline Visual Capture
  └── call_mcp_tool('browser-forensics', 'inspect_live_element', { selector: '<selector>' })
  └── call_mcp_tool('browser-forensics', 'capture_element_screenshot', { selector: '<selector>' })

Step 3: Start Focused Observation
  └── call_mcp_tool('browser-forensics', 'start_element_observation', { selector: '<selector>' })

Step 4: Execute Live Interaction
  └── call_mcp_tool('browser-forensics', 'interact_with_element', { action: 'click', selector: '<selector>', waitForStabilization: true })

Step 5: Stop Observation & Receive Evidence Bundle
  └── call_mcp_tool('browser-forensics', 'stop_element_observation', {})
  └── Review bundle.disappeared, bundle.disappearanceReason, and bundle.mutations

Step 6: Historical Cross-Correlation (if recording active)
  └── call_mcp_tool('browser-forensics', 'why_did_element_disappear', { sessionId, target: '<selector>' })
  └── call_mcp_tool('browser-forensics', 'diff_dom', { sessionId, t1: <beforeTs>, t2: <afterTs> })

Step 7: Conclude with Verified Root Cause & Fix
  └── Report whether the host framework unmounted the parent, restyled via CSS, or failed on a network response!
```
