# ⚡ Browser Forensic Recorder, Live DOM Intelligence & Universal MCP Server

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%2B-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-red.svg?logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-34_Tools_(JSON--RPC_2.0)-purple.svg)](https://modelcontextprotocol.io/)
[![Operational Certification](https://img.shields.io/badge/MCP_Certification-34%2F34_Certified_(Stdio_JSON--RPC)-brightgreen.svg)](./operational-tests/)
[![Tests](https://img.shields.io/badge/Unit_%26_E2E_Tests-53%2F53_Passed_(20_Suites)-brightgreen.svg)]()
[![CLI](https://img.shields.io/badge/CLI-dom--antigravity-orange.svg)](#-dedicated-universal-cli-dom-antigravity)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**A high-fidelity browser forensic recorder, sub-millisecond DOM time-travel state reconstruction engine, element lifecycle tracer, live DOM intelligence controller, zero-config on-demand auto-bridge, and 34-tool Model Context Protocol (MCP) server for autonomous AI coding agents and frontend engineers.**

[Overview](#-overview--why-this-project-exists) •
[Key Features](#-key-features) •
[Universal CLI](#-dedicated-universal-cli-dom-antigravity) •
[Architecture](#-system-architecture) •
[MCP Tools (34)](#-model-context-protocol-mcp-tools-reference) •
[Auto-Bridge Engine](#-zero-config-on-demand-auto-bridge) •
[Visual Forensics & Screenshots](#-clean-screenshot--visual-forensics-pipeline) •
[Installation & Quick Start](#-installation--quick-start) •
[Testing & Certification](#-testing--quality-verification)

</div>

---

## 📖 Table of Contents

- [⚡ Overview & Why This Project Exists](#-overview--why-this-project-exists)
- [✨ Key Features](#-key-features)
- [💻 Dedicated Universal CLI (`dom-antigravity`)](#-dedicated-universal-cli-dom-antigravity)
- [🏗️ System Architecture](#-system-architecture)
  - [Dual-Environment Execution Model](#dual-environment-execution-model)
  - [High-Level Architecture Diagram](#high-level-architecture-diagram)
  - [Zero-Config On-Demand Auto-Bridge](#-zero-config-on-demand-auto-bridge)
  - [Clean Screenshot & Visual Forensics Pipeline](#-clean-screenshot--visual-forensics-pipeline)
  - [Time-Travel Reconstruction Engine](#time-travel-reconstruction-engine)
  - [Disappearing UI Diagnostic Flow](#disappearing-ui-diagnostic-flow)
- [📁 Repository Structure](#-repository-structure)
- [🧩 Core Subsystems & Module Breakdown](#-core-subsystems--module-breakdown)
  - [1. Core Recording & Live Control Engine (`src/core/`)](#1-core-recording--live-control-engine-srccore)
  - [2. Time-Travel & Query Engine (`src/reconstruction/`)](#2-time-travel--query-engine-srcreconstruction)
  - [3. Structural Diff Engine (`src/diff/`)](#3-structural-diff-engine-srcdiff)
  - [4. Lifecycle & Forensics Engine (`src/lifecycle/`)](#4-lifecycle--forensics-engine-srclifecycle)
  - [5. Storage & Indexing (`src/storage/`)](#5-storage--indexing-srcstorage)
  - [6. Chrome Extension MV3 (`src/extension/`)](#6-chrome-extension-mv3-srcextension)
  - [7. MCP Server & Auto-Bridge Dispatcher (`src/mcp/`)](#7-mcp-server--auto-bridge-dispatcher-srcmcp)
- [🤖 Model Context Protocol (MCP) Tools Reference](#-model-context-protocol-mcp-tools-reference)
  - [Complete 34-Tool Catalog](#complete-34-tool-catalog)
  - [Representative MCP Tool Invocations](#representative-mcp-tool-invocations)
- [🚀 Installation & Quick Start](#-installation--quick-start)
  - [1. Global System Installation (One-Click)](#1-global-system-installation-one-click)
  - [2. Workspace Installation for Any Project](#2-workspace-installation-for-any-project)
  - [3. Load Chrome Extension in Browser](#3-load-chrome-extension-in-browser)
  - [4. Configure External AI Clients (Claude / Cursor / Cline)](#4-configure-external-ai-clients-claude--cursor--cline)
- [🧪 Testing & Quality Verification](#-testing--quality-verification)
- [🔐 Security, Privacy & Performance](#-security-privacy--performance)
- [❓ Troubleshooting & FAQ](#-troubleshooting--faq)
- [📜 License](#-license)

---

## ⚡ Overview & Why This Project Exists

Modern web applications are dynamic ecosystems composed of virtual DOM reconciliation engines (React, Vue, Svelte), micro-frontends, injected extensions, floating assistant widgets, analytics tags, and complex asynchronous state machines.

When an injected component or UI widget **unexpectedly disappears, re-renders incorrectly, or breaks during user interaction**, traditional debugging tools fall short:
- **Standard Chrome DevTools** only inspects the *current* state of the DOM; once an element is unmounted, its history, styles, attributes, and parentage are lost.
- **Video Screen Recorders** only capture raw pixel arrays with no underlying semantic DOM tree, network timings, or selector relationships.
- **Console Logs** lack temporal alignment with granular DOM mutation records.

### The Solution
**Browser Forensic Recorder & DOM Time-Travel Debugger** bridges this gap. It operates as an unobtrusive, high-performance forensic recorder, live browser controller, and universal MCP server that continuously correlates:
1. **Granular DOM Mutations**: `childList` additions, removals, moves, attribute changes, and text edits.
2. **Deterministic Stable Node Identities (`LogicalNodeId`)**: Preserving element identities across reparenting and class mutations using `WeakMap` bindings.
3. **Live Browser Control & Visual Intelligence**: Inspecting live DOM hierarchy, picking elements visually via `Ctrl + Shift + Mouse Click`, capturing clean full/element screenshots, executing synthetic actions, and running focused observation around target components.
4. **Zero-Config Auto-Bridge**: On-demand automatic WebSocket bridge initialization on port 3847 so AI agents and users never need to start separate manual terminal processes.
5. **Sub-Millisecond Temporal Ordering**: Checkpoint + delta interpolation engine for instant historical time-travel.
6. **Contextual Diagnostic Signals**: Correlating console outputs, unhandled errors, XHR/fetch network requests, and SPA route changes.
7. **Autonomous AI Forensics via Model Context Protocol (MCP)**: Providing 34 structured JSON-RPC 2.0 tools allowing AI coding assistants to autonomously inspect live DOM, interact with elements, calculate structural diffs, trace lifecycles, and diagnose root causes with evidentiary confidence scoring.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **Dedicated Universal CLI (`dom-antigravity`)** | Install MCP configs globally or into any workspace with `dom-antigravity install --workspace` or `dom-antigravity install --global`. |
| **Zero-Config On-Demand Auto-Bridge** | `ForensicMCPServer` automatically starts background WebSocket bridge on port `3847` on demand or connects conflict-free to active instances. |
| **Clean Screenshot Pipeline** | Automatically hides in-page floating host overlays and highlighters during capture (`display: none !important`) with compositor paint delay, restoring them seamlessly. |
| **Pure TypeScript Zero-Dependency PNG Builder** | Built-in `PNGBuilder` generating standard, fully compliant PNG binary images (IHDR, IDAT, IEND, CRC32, Adler32, Deflate) for offline/standalone execution. |
| **Canvas Element-Bounded Screenshots** | `capture_element_screenshot` crops full-page captures to exact target bounding boxes and `devicePixelRatio` scaling via HTML5 canvas. |
| **`Ctrl + Shift + Click` Visual Element Picker** | Hold `Ctrl + Shift` and click any element on the live browser page to immediately select and transmit its rich structured metadata to connected AI agents. |
| **Live Browser Control & Live DOM Intelligence** | Deeply inspect live page state, query element geometry, styles, roles, and state with deterministic targeting (`selectedElementRef` → `nodeId` → `selector` → `coordinates`). |
| **Synthetic Live Interactions & Effects Measurement** | Dispatch user actions (`click`, `hover`, `focus`, `type`, `press_key`, `select_option`, `scroll`) and measure before/after state and mutation effects. |
| **Element-Focused Observation & Forensics** | Continuous observation engine around target components that captures mutations, errors, and network calls, and explains why an element vanished or changed layout. |
| **Sub-Millisecond DOM Time-Travel** | `StateReconstructor.getStateAt(T \| eventId)` seeks the closest preceding snapshot checkpoint and replays mutation deltas with LRU snapshot caching. |
| **Structural DOM Diff Engine** | Calculates added, removed, moved, attribute, class, style, and text deltas between any two timestamps ($T_1 \leftrightarrow T_2$) or events ($E_1 \leftrightarrow E_2$). |
| **Automated Root-Cause Forensics** | `DisappearingElementAnalyzer` diagnoses whether an element vanished due to direct removal, ancestor container destruction (e.g. React/Vue re-render), style hiding (`display: none`), class changes, or preceding runtime errors/network updates. |
| **Declarative Shadow DOM Support** | Preserves Shadow DOM boundaries across capture, serialization, virtual tree reconstruction, and sandboxed replay using `<template shadowrootmode="...">`. |
| **Privacy & Masking by Default** | `PrivacyEngine` automatically redacts passwords, credit card numbers, SSNs, authorization headers, API tokens, and user-specified CSS selectors in both recording and live inspection. |

---

## 💻 Dedicated Universal CLI (`dom-antigravity`)

The package exposes a global CLI binary registered as `dom-antigravity` (with aliases `mcp-dom` and `browser-antigravity`):

```bash
# 1. Install MCP configuration & skills into current workspace (.agents)
dom-antigravity install --workspace
# Short alias:
dom-antigravity install -w

# 2. Install globally for ALL projects in Antigravity IDE
dom-antigravity install --global
# Short alias:
dom-antigravity install -g

# 3. Install into a specific target directory
dom-antigravity install --target "C:/path/to/project"

# 4. Check bridge server health & connected Chrome tabs
dom-antigravity status

# 5. Capture clean live Chrome screenshot (Full Page + Cropped Element)
dom-antigravity screenshot

# 6. Start WebSocket Bridge manually (Optional — Auto-Bridge handles this on demand)
dom-antigravity bridge

# 7. Print ready-to-use JSON configuration for Claude Desktop or Cursor
dom-antigravity config cursor
dom-antigravity config claude
```

---

## 🏗️ System Architecture

### Dual-Environment Execution Model

A complete browser forensic and live control system operates across two distinct runtime environments:

1. **Browser Runtime (Chrome Extension / Page Script / Content Script)**:
   - Captures DOM mutations via `MutationObserver`.
   - Assigns unique stable `LogicalNodeId`s using `WeakMap` bindings.
   - Listens to `Ctrl + Shift + Mouse Click` for visual element picking.
   - Dispatches live interactions (`click`, `type`, `hover`, `focus`, `scroll`).
   - Crops element bounding boxes on HTML5 Canvas.
   - Hides floating overlays during screenshot captures.

2. **Node.js / MCP Server Runtime (`ForensicMCPServer`)**:
   - Implements JSON-RPC 2.0 protocol over `stdio` and HTTP.
   - Automatically initializes and manages the WebSocket bridge on port `3847`.
   - Reconstructs virtual DOM snapshots at sub-millisecond timestamps.
   - Computes structural DOM diffs and element lifecycle traces.
   - Executes automated root-cause heuristics with confidence scores.

---

### High-Level Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          AI AGENT / MCP CLIENT                         │
│             (Antigravity IDE / Cursor / Claude Desktop / CLI)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (JSON-RPC 2.0 over stdio)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FORENSIC MCP SERVER (34 TOOLS)                       │
│  ├── 13 Live Browser Control & Visual Intelligence Tools               │
│  ├── 21 Historical Forensics, State Reconstruction & Diff Tools        │
│  └── Zero-Config On-Demand Auto-Bridge Dispatcher                      │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │ (WebSocket / HTTP :3847)
                    ▼                                ▼
┌───────────────────────────────┐  ┌────────────────────────────────────┐
│   LOCAL TIME-TRAVEL ENGINE    │  │    LIVE WEBSOCKET BRIDGE SERVER    │
│  ├── FileStorageProvider      │  │    (Port 3847 - Auto-Managed)      │
│  ├── StateReconstructor       │  └─────────────────┬──────────────────┘
│  ├── DOMDiffEngine            │                    │
│  └── DisappearingAnalyzer     │                    ▼
└───────────────────────────────┘  ┌────────────────────────────────────┐
                                   │     CHROME EXTENSION (MV3)         │
                                   │  ├── service-worker.ts (Background)│
                                   │  ├── content-script.ts (In-Page)   │
                                   │  ├── floating-controller.ts (UI)   │
                                   │  └── page-script.ts (XHR/Fetch)    │
                                   └─────────────────┬──────────────────┘
                                                     │ (DOM / Events / Canvas)
                                                     ▼
                                   ┌────────────────────────────────────┐
                                   │    LIVE BROWSER TAB (REAL DOM)     │
                                   │  ├── Native DOM MutationObserver   │
                                   │  ├── Ctrl+Shift+Click Picker       │
                                   │  ├── chrome.tabs.captureVisibleTab │
                                   │  └── Canvas Element Crop Engine    │
                                   └────────────────────────────────────┘
```

---

### ⚡ Zero-Config On-Demand Auto-Bridge

The system eliminates the need to run manual background processes in separate terminals:
- When `ForensicMCPServer` is instantiated or invoked over stdio, it **automatically checks port `3847`**.
- If port `3847` is free, it **spawns `MCPBridgeServer` in the background**.
- If port `3847` is already running (e.g. from an existing instance), it **transparently connects as a client without `EADDRINUSE` conflicts**.
- When the Chrome extension is active, it connects to `ws://127.0.0.1:3847` automatically, enabling instantaneous bidirectional communication for all 13 live tools.

---

### 📸 Clean Screenshot & Visual Forensics Pipeline

```text
AI Agent calls capture_page_screenshot or capture_element_screenshot
   ↓
MCP Server forwards command to Chrome Extension Service Worker
   ↓
Service Worker sends HIDE_FORENSIC_OVERLAYS to Content Script
   ↓
Content Script sets display: none !important & visibility: hidden on #forensic-recorder-floating-host
   ↓
Compositor Wait Delay (150ms) ensures GPU frame committed without UI overlay
   ↓
chrome.tabs.captureVisibleTab captures pristine hardware pixels
   ↓
Service Worker sends RESTORE_FORENSIC_OVERLAYS to restore floating widget instantly
   ↓
[For capture_element_screenshot]:
Content Script loads image into Canvas, crops to targetBounds * devicePixelRatio, and encodes PNG
   ↓
Zero-Dependency PNGBuilder decodes/validates binary stream
   ↓
Pristine, viewable, pixel-perfect PNG returned to AI Agent
```

---

## 📁 Repository Structure

```text
mcp_dom/
├── .agents/                                # Local & Plugin Customizations
│   ├── mcp_config.json                     # 34-Tool Local MCP Server Declaration
│   ├── plugins/browser-forensics/          # Local Plugin Definition
│   └── skills/browser-forensics/SKILL.md   # Comprehensive 34-Tool Agent Skill
├── bin/                                    # Universal CLI & Server Entrypoints
│   ├── cli.js                              # dom-antigravity Multi-Command CLI
│   ├── mcp-server.js                       # Stdio JSON-RPC MCP Server Executable
│   └── bridge-server.js                    # Standalone Bridge Server Executable
├── operational-tests/                      # Acceptance Testing & Evidence Suite
│   ├── _inventory/                         # Discovered Tools Schema & Capability Matrix
│   ├── _fixtures/                          # DOM & Visual Geometry Fixtures
│   ├── _reports/                           # Final Certification & Capability Reports
│   └── tools/ (001-034)                    # Dedicated Evidence Dirs with raw requests/responses
├── scripts/                                # Build, Test & Automation Utilities
│   ├── build-extension.js                  # Standalone IIFE Extension Bundler
│   ├── run-operational-suite.js            # Stdio JSON-RPC Operational Test Runner
│   ├── test-mcp-e2e.js                     # Real Subprocess E2E Test Suite
│   └── capture-real-chrome.js              # Live Browser Screenshot Verification
├── src/                                    # TypeScript Source Code
│   ├── core/                               # Recording Engine & Live Browser Controller
│   │   ├── recorder.ts                     # Ingestion Coordinator
│   │   ├── live-browser-controller.ts      # Live DOM Inspection & Action Dispatcher
│   │   ├── element-picker.ts               # Ctrl+Shift+Click Interactive Picker
│   │   ├── element-observer.ts             # Continuous Targeted Mutation Observer
│   │   ├── element-interaction-engine.ts   # Synthetic Click, Type, Focus, Hover Engine
│   │   ├── live-dom-inspector.ts           # Deep DOM & Accessibility Inspector
│   │   ├── png-builder.ts                  # Pure TS Zero-Dependency PNG Encoder
│   │   ├── mutation-observer.ts            # DOM Mutation Ingestion
│   │   └── node-registry.ts                # LogicalNodeId WeakMap Mapper
│   ├── diff/                               # Structural DOM Diff Engine
│   ├── extension/                          # Chrome Extension Manifest V3
│   │   ├── background/service-worker.ts    # Background Worker & Bridge Client
│   │   ├── content/content-script.ts       # In-Page Injection & Live Command Router
│   │   └── content/floating-controller.ts  # In-Page Floating Debugger Overlay
│   ├── lifecycle/                          # Disappearing UI & Lifecycle Forensics
│   ├── mcp/                                # Model Context Protocol Server
│   │   ├── server.ts                       # ForensicMCPServer with Auto-Bridge
│   │   ├── bridge-server.ts                # WebSocket / HTTP Ingestion Bridge
│   │   ├── live-tools-handler.ts           # 13 Live Browser Control Tools
│   │   └── tools-handler.ts                # 21 Historical Forensics Tools
│   ├── reconstruction/                     # Time-Travel Virtual DOM Reconstructor
│   ├── storage/                            # File, IndexedDB & Memory Storage
│   ├── types/                              # Strict TypeScript Interfaces
│   └── ui/                                 # Glassmorphic Developer Dashboard
├── package.json                            # Scripts, Dependencies & Binaries
├── tsconfig.json                           # TypeScript Compiler Config
└── vite.config.ts                          # Multi-Target Build Configuration
```

---

## 🧩 Core Subsystems & Module Breakdown

### 1. Core Recording & Live Control Engine (`src/core/`)
- **`ForensicRecorder`**: Coordinates session lifecycle, batching events and emitting structured records (`DOM_MUTATION_ADD`, `USER_EVENT_CLICK`, `CONSOLE_LOG`, `NETWORK_REQUEST_START`).
- **`LiveBrowserController`**: Central dispatcher routing live inspection, visual picking, synthetic interactions, observation, and screenshot capture.
- **`LiveDOMInspector`**: Calculates unique CSS selectors, bounding boxes, visibility states, computed styles, accessibility roles, and parent hierarchy.
- **`ElementPicker`**: Attaches interactive highlight overlay and captures `Ctrl + Shift + Mouse Click` selections.
- **`ElementInteractionEngine`**: Synthesizes standard browser interaction sequences (`focus` → `pointerdown` → `mousedown` → `click` or `input` → `change`).
- **`PNGBuilder`**: Pure TypeScript uncompressed Deflate and PNG chunk encoder with CRC32 and Adler32 checksums.

### 2. Time-Travel & Query Engine (`src/reconstruction/`)
- **`StateReconstructor`**: Seeks the closest preceding full checkpoint snapshot and applies sequential mutation deltas up to target timestamp $T$.
- **`LRUSnapshotCache`**: In-memory cache holding up to 50 historical snapshots for sub-10ms scrub operations.
- **`VirtualQueryEngine`**: Evaluates CSS selectors against virtual DOM trees without requiring live browser DOM.

### 3. Structural Diff Engine (`src/diff/`)
- **`DOMDiffEngine`**: Reconstructs states at $T_1$ and $T_2$ and produces categorized deltas (added, removed, moved, attributes, classes, styles, text) in Markdown or JSON format.

### 4. Lifecycle & Forensics Engine (`src/lifecycle/`)
- **`DisappearingElementAnalyzer`**: Evaluates 5 primary disappearance mechanisms:
  1. `PARENT_SUBTREE_REPLACED`: Ancestor container unmounted (e.g. React/Vue re-render).
  2. `DIRECT_NODE_REMOVAL`: Direct `removeChild` / `remove()`.
  3. `STYLE_DISPLAY_NONE`: CSS visibility toggling.
  4. `CLASS_TRIGGERED_HIDDEN`: Class additions triggering layout collapse.
  5. `REMOVED_DURING_NAVIGATION`: Unmounted during SPA page navigation.
- **`ElementLifecycleTracer`**: Reconstructs the full chronological lifecycle of an element from initial attachment to destruction.

### 5. Storage & Indexing (`src/storage/`)
- **`FileStorageProvider`**: Persistent storage using `session.json`, `events.jsonl` (line-delimited streaming), and `checkpoints/`.
- **`IndexedDBStorageProvider`**: Browser-side storage for the Chrome Extension.
- **`SessionSerializer`**: Portable session bundle export and import with CRC verification.

### 6. Chrome Extension MV3 (`src/extension/`)
- **`service-worker.ts`**: Background script maintaining WebSocket bridge connection, coordinating tab-specific recordings and hardware screenshot captures.
- **`content-script.ts`**: Injected script managing on-page DOM observers, floating UI overlay, visual element picker, and canvas image cropping.
- **`floating-controller.ts`**: Draggable glassmorphic floating widget allowing on-page recording control, event counter monitoring, and manual checkpoint capture.

### 7. MCP Server & Auto-Bridge Dispatcher (`src/mcp/`)
- **`ForensicMCPServer`**: Universal JSON-RPC 2.0 server with on-demand auto-bridge.
- **`MCPBridgeServer`**: High-performance HTTP/WebSocket server listening on port `3847`.
- **`LiveToolsHandler`**: Dispatches live commands over WebSocket bridge or local JSDOM fallback.

---

## 🤖 Model Context Protocol (MCP) Tools Reference

### Complete 34-Tool Catalog

#### 🌟 Live Browser Control & Visual Intelligence (13 Tools)
| Tool | Description | Key Arguments |
| :--- | :--- | :--- |
| `inspect_live_page` | Inspect active page URL, title, viewport, dimensions, and readyState | `{}` |
| `inspect_live_element` | Deeply inspect live element bounds, styles, visibility, attributes, state, role, aria | `selector`, `nodeId`, `selectedElementRef` |
| `get_selected_element` | Retrieve element picked visually via `Ctrl + Shift + Click` | `{}` |
| `start_element_picker` | Activate interactive visual element picker mode with hover highlight | `highlightColor` |
| `stop_element_picker` | Deactivate visual element picker mode | `{}` |
| `capture_page_screenshot` | Capture full visible viewport screenshot with clean overlay hiding | `format` (`png` / `jpeg`) |
| `capture_element_screenshot` | Capture element-bounded screenshot cropped to target bounds and DPR | `selector`, `nodeId`, `selectedElementRef` |
| `interact_with_element` | Perform action (`click`, `hover`, `type`, `focus`, `clear`, `press_key`, `select_option`, `scroll`) | `action`, `selector`, `text`, `key`, `optionValue`, `scrollDelta`, `waitForStabilization` |
| `start_element_observation` | Start focused continuous observation around target element | `selector`, `nodeId` |
| `stop_element_observation` | Stop observation and receive complete mutation & root-cause correlation bundle | `{}` |
| `get_live_dom_snapshot` | Capture current live virtual DOM state snapshot in HTML or JSON | `format` (`html` / `json`) |
| `get_live_dom_subtree` | Reconstruct and extract live HTML structure of a subtree | `selector`, `nodeId` |
| `get_element_visual_state` | Inspect layout, occlusion, clipping, opacity, z-index, and viewport visibility | `selector`, `nodeId` |

#### 🕰️ Historical Forensics & Time-Travel (21 Tools)
| Tool | Description | Key Arguments |
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
| `get_dom_node` | Query exact properties of a node at timestamp $T$ | `sessionId`, `nodeId`, `selector`, `timestamp` |
| `get_dom_subtree` | Reconstruct HTML structure of a subtree at timestamp $T$ | `sessionId`, `selector`, `nodeId`, `timestamp` |
| `diff_dom` | Calculate structural diff between two timestamps or events | `sessionId`, `t1`, `t2`, `e1`, `e2`, `format` |
| `trace_element` | Reconstruct complete lifecycle history of an element | `sessionId`, `nodeId`, `selector` |
| `find_disappearing_elements` | Scan session for elements with short lifespans | `sessionId`, `maxLifespanMs` |
| `why_did_element_disappear` | Automated diagnostic engine pinpointing disappearance root cause | `sessionId`, `target` |
| `get_diagnostics` | Retrieve console logs, uncaught errors, and promise rejections | `sessionId`, `level`, `category` |
| `get_network_events` | Retrieve fetch/XHR network requests and responses | `sessionId`, `status`, `method`, `query` |
| `get_screenshots` | Retrieve visual screenshot checkpoints | `sessionId` |
| `annotate_session` | Add developer hypothesis or diagnostic note | `sessionId`, `text`, `timestamp`, `tags` |
| `get_annotations` | Retrieve all notes and annotations for a session | `sessionId` |
| `get_recording_health` | Verify data integrity, sequence continuity, and dropped frames | `sessionId` |

---

### Representative MCP Tool Invocations

#### 1. Automated Root-Cause Diagnosis (`why_did_element_disappear`)
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "why_did_element_disappear",
    "arguments": {
      "sessionId": "live_session_001",
      "target": ".ai-action-btn"
    }
  }
}
```

**Response Preview:**
```json
{
  "targetNodeId": 10,
  "targetSelector": ".ai-action-btn",
  "disappearanceMechanism": "PARENT_SUBTREE_REPLACED",
  "confidenceScore": 92,
  "likelyRootCause": "Host framework (e.g. React/Vue re-render) destroyed and replaced Ancestor container [ID: 4], causing injected element to be unmounted",
  "evidentiaryTrail": [
    "At T=250.0ms, Network response completed for /api/refresh (Status: 200)",
    "At T=280.0ms, Ancestor container #host-sidebar [ID: 4] was removed from DOM",
    "At T=280.0ms, Injected element .ai-action-btn [ID: 10] unmounted as part of ancestor subtree removal"
  ],
  "actionableRecommendation": "Avoid injecting directly into volatile component tree #host-sidebar. Mount inside a stable portal container or attach MutationObserver re-mount guard."
}
```

---

#### 2. Live Element Inspection (`inspect_live_element`)
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "inspect_live_element",
    "arguments": {
      "selector": "#prompt-textarea"
    }
  }
}
```

---

#### 3. Live Clean Cropped Element Screenshot (`capture_element_screenshot`)
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "capture_element_screenshot",
    "arguments": {
      "selector": "#prompt-textarea"
    }
  }
}
```

---

## 🚀 Installation & Quick Start

### 1. Global System Installation (One-Click)

To make all 34 MCP capabilities globally available across **ALL projects** in Antigravity IDE:

```bash
git clone https://github.com/IrMaho/Mcp-DOM.git
cd Mcp-DOM
npm install
npm run build
npm link

# Install globally into ~/.gemini/config/plugins/browser-forensics
dom-antigravity install --global
```

---

### 2. Workspace Installation for Any Project

To install the MCP server configuration into any specific project directory:

```bash
# Inside any project directory:
dom-antigravity install --workspace

# Or specify a target directory:
dom-antigravity install --target "C:/Users/ASUS/Desktop/flutter_project/my_project"
```

This creates `.agents/mcp_config.json` with all 34 tools authorized and registers `.agents/skills/browser-forensics/SKILL.md`.

---

### 3. Load Chrome Extension in Browser

1. Open **Google Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory (or root `mcp_dom/`).
4. The **Forensic Debugger** extension will connect automatically to `ws://127.0.0.1:3847`.

---

### 4. Configure External AI Clients (Claude / Cursor / Cline)

To print ready-to-copy JSON configuration files:

```bash
# For Cursor (.cursor/mcp.json)
dom-antigravity config cursor

# For Claude Desktop (claude_desktop_config.json)
dom-antigravity config claude
```

---

## 🧪 Testing & Quality Verification

The repository includes a comprehensive testing hierarchy combining unit tests, integration channels, end-to-end multi-agent scenarios, and an automated operational acceptance suite:

```bash
# 1. Run full Vitest unit & E2E suite (20 suites, 53 tests)
npm test

# 2. Run real Stdio JSON-RPC Operational Acceptance Suite (34/34 CERTIFIED)
npm run test:operational

# 3. Run real Subprocess IPC E2E Test
npm run test:e2e:mcp
```

### Verification Results

```text
================================================================
⚡ MCP-DOM REAL STDIO JSON-RPC OPERATIONAL ACCEPTANCE TEST SUITE
================================================================
[Phase 1] Executing Dynamic MCP Capability Discovery...
✔ Discovered 34 exposed MCP tools from runtime definition.

[Phase 2] Seeding Deterministic Historical Forensic Session...
✔ Historical session 'operational_acceptance_session_001' seeded.

[Phase 3] Launching Real MCP Server Subprocess over stdio JSON-RPC...
✔ MCP Stdio Server connected: browser-forensic-mcp (Protocol 2024-11-05)

[Phase 4] Executing Operational Tests Across All 34 Tools over stdio JSON-RPC...
✔ 001/034 list_sessions ................ PASS
✔ 002/034 get_session .................. PASS
✔ 015/034 why_did_element_disappear .... PASS
✔ 022/034 inspect_live_page ............ PASS
✔ 023/034 inspect_live_element ......... PASS
✔ 027/034 capture_page_screenshot ...... PASS
✔ 028/034 capture_element_screenshot ... PASS
✔ 029/034 interact_with_element ........ PASS
✔ 034/034 get_element_visual_state ..... PASS

================================================================
🎉 OPERATIONAL SUITE EXECUTION COMPLETE: 34/34 PASSED
Certification Status: CERTIFIED
================================================================
```

---

## 🔐 Security, Privacy & Performance

1. **Privacy Masking by Default**: `PrivacyEngine` automatically masks password fields, credit card patterns (Luhn-compliant), Social Security numbers, bearer tokens, API keys, and custom user-specified CSS selectors.
2. **Sandboxed Replay Security**: Replay viewport strips all inline `on*` event handlers and disables script execution, preventing arbitrary code execution.
3. **Low-Overhead Streaming**: Observers use requestAnimationFrame and requestIdleCallback throttling to ensure zero dropped frames on recorded pages.
4. **Clean Compositor Framing**: Hiding extension UI overlays during screenshots ensures zero visual contamination.

---

## ❓ Troubleshooting & FAQ

#### Q: Do I need to run `npm run bridge` in a separate terminal?
> **A**: No! `ForensicMCPServer` includes zero-config auto-bridge. Whenever an AI agent or client connects via MCP, the server automatically initializes the WebSocket bridge on port `3847` in the background.

#### Q: How do I test capturing a real Chrome screenshot?
> **A**: Run `dom-antigravity screenshot` in your terminal. It connects to your active Chrome tab, captures a pristine full-page screenshot and cropped element screenshot, and saves them to disk.

#### Q: Why are my element screenshots corrupted in some viewers?
> **A**: The built-in `PNGBuilder` generates 100% standard PNG binaries with complete IHDR, IDAT, IEND chunks, Adler-32 and CRC-32 checksums, compatible with all image viewers.

---

## 📜 License

Licensed under the **Apache License, Version 2.0** (the "License"). You may obtain a copy of the License in the [LICENSE](LICENSE) file or at:

```text
http://www.apache.org/licenses/LICENSE-2.0
```
