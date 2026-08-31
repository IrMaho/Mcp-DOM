---
name: browser-forensics
description: Inspect browser forensic recordings, perform DOM time-travel debugging, trace element lifecycles, and diagnose disappearing UI, parent subtree replacements, runtime errors, and CSS mutations via the browser-forensics MCP server.
---

# Browser Forensic Debugging & DOM Time-Travel Skill

This skill provides step-by-step guidance for investigating browser forensic recordings, DOM lifecycle anomalies, disappearing injected components, CSS mutations, runtime exceptions, and race conditions using the `browser-forensics` MCP server.

---

## 🎯 When to Use This Skill

Activate this skill whenever the user asks to:
1. Debug a disappearing UI element or injected browser extension component.
2. Investigate why an element rendered, changed style, or was replaced in the DOM.
3. Perform DOM time-travel debugging (e.g. "show me the DOM state at $T=350$ms").
4. Compare DOM differences (`diff_dom`) between two arbitrary timestamps or events.
5. Diagnose frontend race conditions, React/Vue/Angular unmounting, or uncaught runtime exceptions.
6. Inspect recorded network requests, console messages, or visual checkpoints.

---

## 🛠️ MCP Tool Reference (`browser-forensics`)

### 1. Discovery & Metadata
- **`list_sessions`**: List all recorded browser forensic debugging sessions.
  - Optional arguments: `limit` (number).
- **`get_session`**: Retrieve complete metadata, health status, and statistics for a session.
  - Required arguments: `sessionId` (string).
- **`get_timeline`**: Retrieve an event count breakdown and chronological bounds.
  - Required arguments: `sessionId` (string).

### 2. Time-Travel & State Reconstruction
- **`get_dom_state`**: Reconstruct the entire DOM tree at a specific timestamp or event sequence.
  - Arguments: `sessionId` (string), `timestamp` (number, optional), `sequence` (number, optional), `format` (`"html"` | `"tree"` | `"json"`, default `"html"`).
- **`get_dom_node`**: Query the exact properties, attributes, and styles of a single DOM node at time $T$.
  - Arguments: `sessionId` (string), `nodeId` (number, optional), `selector` (string, optional), `timestamp` (number, optional).
- **`get_dom_subtree`**: Reconstruct and return the HTML of a specific container or subtree.
  - Arguments: `sessionId` (string), `selector` (string, optional), `nodeId` (number, optional), `timestamp` (number, optional).

### 3. DOM Structural Diffing
- **`diff_dom`**: Compute exact structural, attribute, class, style, and text deltas between two states.
  - Arguments: `sessionId` (string), `t1` (number, optional), `t2` (number, optional), `e1` (string, optional), `e2` (string, optional), `format` (`"markdown"` | `"json"`, default `"markdown"`).

### 4. Lifecycle & Root-Cause Forensics
- **`trace_element`**: Reconstruct the chronological lifecycle history of an element (Created → Attached → Mutated → Reparented → Detached/Removed).
  - Arguments: `sessionId` (string), `nodeId` (number, optional), `selector` (string, optional).
- **`why_did_element_disappear`**: Automated forensic diagnostic engine that pinpoints the root cause of component disappearance.
  - Arguments: `sessionId` (string), `target` (string | number, selector or node ID).
  - Returns: `disappearanceMechanism` (`PARENT_SUBTREE_REPLACED`, `DIRECT_NODE_REMOVAL`, `STYLE_DISPLAY_NONE`, `CLASS_TRIGGERED_HIDDEN`, `REMOVED_DURING_NAVIGATION`), `likelyRootCause`, `confidenceScore` ($0-100\%$), `evidentiaryTrail`, `precedingEvents`, and `alternativeHypotheses`.
- **`find_disappearing_elements`**: Scan the entire recording for elements with short lifespans.
  - Arguments: `sessionId` (string), `maxLifespanMs` (number, default 5000).

### 5. Corroborative Diagnostics & Network
- **`get_events`**: Retrieve filtered events (`category`, `type`, `startTs`, `endTs`, `nodeId`, `query`, `limit`).
- **`get_events_around`**: Retrieve a contextual event slice around a specific event or timestamp (e.g. $\pm 300$ms).
- **`get_diagnostics`**: Retrieve console logs (`log`, `warn`, `error`), uncaught errors, and promise rejections.
- **`get_network_events`**: Retrieve fetch/XHR network requests and responses with status codes and duration.
- **`get_recording_health`**: Verify recording data integrity and sequence monotonicity.

---

## 🔬 Recommended Agent Diagnostic Workflow

When tasked with investigating an issue:

```text
Step 1: Session Discovery
  └── call_mcp_tool('browser-forensics', 'list_sessions', {})
  └── Identify relevant sessionId

Step 2: Automated Forensic Diagnosis (Fast Path)
  └── call_mcp_tool('browser-forensics', 'why_did_element_disappear', { sessionId, target: '<selector>' })
  └── If high confidence (>85%), review evidentiaryTrail and root cause

Step 3: Verification & Deep Inspection
  └── call_mcp_tool('browser-forensics', 'trace_element', { sessionId, selector: '<selector>' })
  └── call_mcp_tool('browser-forensics', 'diff_dom', { sessionId, t1: <beforeDisappearTs>, t2: <afterDisappearTs> })

Step 4: Check Trigger Events & Race Conditions
  └── call_mcp_tool('browser-forensics', 'get_events_around', { sessionId, timestamp: <disappearedAt>, windowMs: 400 })
  └── Correlate any preceding network responses or runtime errors

Step 5: Present Evidence-Backed Report
  └── State the exact timestamp, mechanism, parent replacement, and actionable recommendation
```
