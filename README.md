# ⚡ Browser Forensic Recorder & DOM Time-Travel Debugger

> **Production-grade browser forensic recorder, DOM time-travel debugger, lifecycle tracer, and Agent MCP interface embedded in a Chromium/Chrome Extension environment (Manifest V3).**

Built for deep, evidence-driven root cause analysis of dynamically injected web experiences, injected extensions, re-renders, race conditions, disappearing elements, unexpected node replacements, and runtime failures.

---

## 🚀 Key Capabilities

1. **Initial Baseline DOM Snapshotting**: Captures complete virtual DOM structure, node identities, inline styles, computed visibility metrics, and input values with privacy masking.
2. **Incremental Forensic Event Stream**:
   - DOM Mutations (`childList` additions, removals, moves, attribute changes, text modifications)
   - User Interactions (`click`, `dblclick`, `input`, `change`, `submit`, `keydown`, `keyup`, `focus`, `blur`, throttled `scroll`, `resize`)
   - Navigation & SPA routing (`pushState`, `replaceState`, `popstate`, `hashchange`, `DOMContentLoaded`, `load`, visibility changes)
   - Runtime Diagnostics (interception of `console.log/warn/error/info/debug`, `window.onerror`, `window.onunhandledrejection`)
   - Network Monitor (`fetch` and `XMLHttpRequest` with request/response timing, status, and sensitive header/query param redaction)
   - Viewport & Style mutations (dynamic `<style>` insertion, CSS class additions/removals)
   - Visual Checkpoints (tab screenshots correlated with exact sequence timestamps).
3. **Deterministic Stable Node Identity**: Logical Node IDs (`LogicalNodeId`) preserved across mutations, re-renders, and parent changes.
4. **DOM Time-Travel & State Reconstruction**:
   - Adaptive & periodic snapshot checkpoints
   - `getStateAt(timestamp | eventId)`: Interpolates closest preceding checkpoint + subsequent mutation deltas for sub-millisecond random-access state reconstruction.
5. **DOM Structural Diff Engine**:
   - Unified engine for Web UI and MCP Agent
   - Computes added, removed, moved, class, style, text, and attribute changes between any two arbitrary timestamps $T_1$ vs $T_2$ or events $E_1$ vs $E_2$.
6. **Disappearing UI & Forensics Engine**:
   - `traceElement(nodeId | selectorHint)`: Chronological element lifecycle timeline (Created → Attached → Mutated → Reparented → Detached/Removed → Recreated).
   - `whyDidElementDisappear(target)`: Automated root-cause analyzer that diagnoses whether an injected component was unmounted by direct removal, ancestor container destruction (e.g. React/Vue re-render), style hiding (`display: none`, `visibility: hidden`), class modification, or preceded by runtime errors and network updates.
7. **Interactive Developer Debug Dashboard UI**:
   - Sleek glassmorphic dark-themed interface
   - Sandboxed iframe replay viewport with live element hover & click inspection
   - Interactive timeline tracks (DOM, User, Errors, Network) with seek, step forward/backward, and speed multiplier
   - Collapsible virtual DOM tree inspector and live properties pane
   - DOM structural diff panel
   - Forensics & Disappearing UI diagnostic dashboard
   - Search modal (Ctrl+F) across events, selectors, errors, URLs, and node IDs
   - Portable JSON session export and import with integrity validation.
8. **21 Model Context Protocol (MCP) Tools for AI Agents**:
   - Fully compliant JSON-RPC 2.0 stdio transport + HTTP/WebSocket bridge
   - Allows AI Agents to investigate recordings programmatically, perform targeted evidence retrieval, reconstruct arbitrary states, and verify hypotheses with high confidence.

---

## 📦 Project Architecture

```text
mcp_dom/
├── manifest.json                  # Chrome Extension Manifest V3
├── package.json                   # Scripts, dependencies, and CLI bins
├── vite.config.ts                 # Multi-entry client bundling
├── vite.config.server.ts          # Standalone Node ESM server bundling
├── tsconfig.json                  # TypeScript compiler settings
├── vitest.config.ts               # Vitest test suite configuration
├── bin/
│   ├── mcp-server.js              # Executable CLI entrypoint for stdio MCP Server
│   └── bridge-server.js           # Executable CLI entrypoint for WebSocket/HTTP Bridge
├── src/
│   ├── types/                     # Domain types (Session, Events, DOMNode, Diff, Lifecycle, Privacy, MCP)
│   ├── core/                      # Engine core (SequenceCounter, NodeRegistry, PrivacyEngine, SnapshotEngine, MutationObserver, EventCollector, Diagnostics, NetworkMonitor, ForensicRecorder)
│   ├── storage/                   # Storage providers (MemoryStorage, FileStorage, IndexedDBStorage, SessionSerializer, SessionIndex)
│   ├── reconstruction/            # Time-travel reconstruction (TreeBuilder, VirtualQueryEngine, CheckpointManager, StateReconstructor)
│   ├── diff/                      # DOM Structural Diff Engine & DiffFormatter
│   ├── lifecycle/                 # LifecycleTracer & DisappearingElementAnalyzer
│   ├── replay/                    # ReplayEngine & TimeController
│   ├── extension/                 # Chrome extension (service-worker, content-script, page-script, popup, devtools)
│   ├── ui/                        # Web Dashboard UI (index.html, app.ts, styles/)
│   └── mcp/                       # MCP Server, ToolsHandler, ResourcesHandler, BridgeServer
└── tests/
    ├── unit/                      # Unit test suites (Sequence, Registry, Privacy, Tree, Diff, Lifecycle, Analyzer, MCP)
    ├── integration/               # Integration tests (Storage, Export/Import, SearchIndex)
    └── e2e/                       # E2E Acceptance scenario (Disappearing injected UI forensic investigation)
```

---

## 🛠️ Installation & Building

```bash
# 1. Install dependencies
npm install

# 2. Build production assets (Client + Server + Extension)
npm run build

# 3. Run automated verification test suite
npm test
```

---

## 🔌 Using as a Chrome Extension (Manifest V3)

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the project root directory (`mcp_dom`).
4. Click the **Forensic Recorder** extension icon in your browser toolbar to start recording any tab.
5. Click **Open Forensic Dashboard** to inspect the live session, replay time-travel states, and run forensic root-cause analysis!

---

## 🤖 MCP Server Configuration for AI Agents

To connect an AI Agent (Antigravity IDE, Cursor, Claude Desktop, or custom agent) to the Forensic MCP Server:

### MCP Server Config (`mcp_config.json`):

```json
{
  "mcpServers": {
    "browser-forensic": {
      "command": "node",
      "args": ["C:/Users/ASUS/Desktop/flutter_project/job/gpt-git/mcp_dom/bin/mcp-server.js"],
      "env": {}
    }
  }
}
```

---

## 🧰 Available MCP Tools

| Tool Name | Purpose |
| :--- | :--- |
| `list_sessions` | List all recorded browser forensic debugging sessions with metadata and stats. |
| `get_session` | Retrieve full metadata, capabilities, health status, and statistics for a session. |
| `export_session` | Export a complete recording session as a portable, self-contained JSON bundle. |
| `import_session` | Import a recording session bundle from raw JSON. |
| `delete_session` | Delete a recording session from storage. |
| `get_timeline` | Retrieve summary breakdown of events across the session timeline. |
| `get_events` | Query recorded events with filtering by category, type, timestamp range, target node, or search query. |
| `get_events_around` | Query a contextual window of events around timestamp $T$ or event $E$ (e.g. $\pm 300$ms). |
| `get_dom_state` | Reconstruct complete DOM snapshot at arbitrary timestamp $T$ or event ID. |
| `get_dom_node` | Inspect detailed properties of a specific DOM node at a given timestamp. |
| `get_dom_subtree` | Reconstruct and extract the HTML of a specific subtree (e.g. `#app` or `.gpt-panel`). |
| `diff_dom` | Structural DOM diff between $T_1$ and $T_2$ (or $E_1$ and $E_2$) identifying added, removed, moved, class, style, and text changes. |
| `trace_element` | Chronological lifecycle history for an element by ID or selector. |
| `find_disappearing_elements` | Automatically scan and identify all elements that existed briefly and were removed or hidden. |
| `why_did_element_disappear` | Root-cause forensic diagnosis for disappearing UI elements with evidentiary trail and confidence scoring. |
| `get_diagnostics` | Query recorded console messages, runtime errors, and unhandled promise rejections. |
| `get_network_events` | Query recorded network requests and responses correlated with timing. |
| `get_screenshots` | List visual checkpoints and screenshots. |
| `annotate_session` | Add an investigative annotation or hypothesis to the session timeline. |
| `get_annotations` | Retrieve all human and AI annotations for a session. |
| `get_recording_health` | Run an automated integrity audit checking sequence monotonicity, missing nodes, and capabilities. |

---

## 🔬 Evidence-Driven Investigation Example

When an AI Agent investigates why an injected element disappeared:

1. **Agent queries `why_did_element_disappear(target: '.gpt-floating-panel')`**
2. **System performs automated forensic analysis**:
   - Detects node was created at $T = 120.5$ms under `#sidebar-container` (ID: 5)
   - Detects network response at $T = 310.2$ms on host page
   - Detects host framework (React) re-render removed ancestor container `#sidebar-container` at $T = 330.0$ms
   - Detects target node was detached as a result of ancestor replacement (`PARENT_SUBTREE_REPLACED`)
3. **Agent receives structured, evidence-backed report with $>90\%$ confidence and timestamps**:
   ```json
   {
     "targetQuery": ".gpt-floating-panel",
     "targetNodeId": 10,
     "found": true,
     "disappearanceMechanism": "PARENT_SUBTREE_REPLACED",
     "likelyRootCause": "Host framework (e.g. React/Vue re-render) destroyed and replaced Ancestor container [ID: 5], causing injected element to be unmounted",
     "confidenceScore": 92,
     "evidentiaryTrail": [
       {
         "timestamp": 330.0,
         "eventType": "DOM_MUTATION_REMOVE",
         "evidenceType": "DIRECT",
         "description": "Ancestor element [ID: 5] was removed, causing target element [ID: 10] to detach from DOM"
       }
     ]
   }
   ```

---

## 📄 License

Apache-2.0
