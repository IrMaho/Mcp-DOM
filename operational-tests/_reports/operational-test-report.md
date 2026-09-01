# MCP-DOM Operational Acceptance Test Report

**Execution Date**: 2026-09-01T14:11:46.950Z
**Transport**: Real Subprocess Stdio JSON-RPC 2.0 Protocol
**Total Capabilities Discovered**: 34
**Total Capabilities Executed**: 34
**Passed**: 34
**Failed**: 0
**Certification Status**: **CERTIFIED**

## Discovered & Tested Capabilities

| Index | Tool | Mode | Assertions | Latency | Status |
|---|---|---|---|---|---|
| 1 | `list_sessions` | historical | 2/2 | 7ms | **PASS** |
| 2 | `get_session` | historical | 2/2 | 4ms | **PASS** |
| 3 | `export_session` | historical | 2/2 | 136ms | **PASS** |
| 4 | `import_session` | historical | 2/2 | 4594ms | **PASS** |
| 5 | `delete_session` | historical | 2/2 | 5ms | **PASS** |
| 6 | `get_timeline` | historical | 2/2 | 32ms | **PASS** |
| 7 | `get_events` | historical | 2/2 | 5ms | **PASS** |
| 8 | `get_events_around` | historical | 2/2 | 34ms | **PASS** |
| 9 | `get_dom_state` | historical | 2/2 | 33ms | **PASS** |
| 10 | `get_dom_node` | historical | 2/2 | 34ms | **PASS** |
| 11 | `get_dom_subtree` | historical | 2/2 | 33ms | **PASS** |
| 12 | `diff_dom` | historical | 2/2 | 37ms | **PASS** |
| 13 | `trace_element` | historical | 2/2 | 32ms | **PASS** |
| 14 | `find_disappearing_elements` | historical | 2/2 | 37ms | **PASS** |
| 15 | `why_did_element_disappear` | historical | 3/3 | 137ms | **PASS** |
| 16 | `get_diagnostics` | historical | 2/2 | 34ms | **PASS** |
| 17 | `get_network_events` | historical | 2/2 | 36ms | **PASS** |
| 18 | `get_screenshots` | historical | 3/3 | 32ms | **PASS** |
| 19 | `annotate_session` | historical | 2/2 | 12ms | **PASS** |
| 20 | `get_annotations` | historical | 2/2 | 25ms | **PASS** |
| 21 | `get_recording_health` | historical | 2/2 | 33ms | **PASS** |
| 22 | `inspect_live_page` | live | 2/2 | 12ms | **PASS** |
| 23 | `inspect_live_element` | live | 2/2 | 100ms | **PASS** |
| 24 | `get_selected_element` | live | 2/2 | 3ms | **PASS** |
| 25 | `start_element_picker` | live | 2/2 | 19ms | **PASS** |
| 26 | `stop_element_picker` | live | 2/2 | 6ms | **PASS** |
| 27 | `capture_page_screenshot` | live | 4/4 | 384ms | **PASS** |
| 28 | `capture_element_screenshot` | live | 4/4 | 28ms | **PASS** |
| 29 | `interact_with_element` | live | 2/2 | 333ms | **PASS** |
| 30 | `start_element_observation` | live | 2/2 | 20ms | **PASS** |
| 31 | `stop_element_observation` | live | 2/2 | 7ms | **PASS** |
| 32 | `get_live_dom_snapshot` | live | 2/2 | 4ms | **PASS** |
| 33 | `get_live_dom_subtree` | live | 2/2 | 10ms | **PASS** |
| 34 | `get_element_visual_state` | live | 2/2 | 8ms | **PASS** |
