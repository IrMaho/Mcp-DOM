# MCP Capability Discovery Report

**Total Discovered Tools**: 34
**Discovery Timestamp**: 2026-09-01T14:11:38.731Z

| # | Tool Name | Mode | Category | Visual Evidence | Required Arguments |
|---|---|---|---|---|---|
| 1 | `list_sessions` | historical | historical | NO | None |
| 2 | `get_session` | historical | historical | NO | sessionId |
| 3 | `export_session` | historical | historical | NO | sessionId |
| 4 | `import_session` | historical | historical | NO | bundleJson |
| 5 | `delete_session` | historical | historical | NO | sessionId |
| 6 | `get_timeline` | historical | historical | NO | sessionId |
| 7 | `get_events` | historical | historical | NO | sessionId |
| 8 | `get_events_around` | historical | historical | NO | sessionId |
| 9 | `get_dom_state` | historical | historical | NO | sessionId |
| 10 | `get_dom_node` | historical | historical | NO | sessionId |
| 11 | `get_dom_subtree` | historical | historical | NO | sessionId |
| 12 | `diff_dom` | historical | historical | NO | sessionId |
| 13 | `trace_element` | historical | historical | NO | sessionId |
| 14 | `find_disappearing_elements` | historical | historical | NO | sessionId |
| 15 | `why_did_element_disappear` | historical | historical | NO | sessionId, target |
| 16 | `get_diagnostics` | historical | historical | NO | sessionId |
| 17 | `get_network_events` | historical | historical | NO | sessionId |
| 18 | `get_screenshots` | historical | historical | YES | sessionId |
| 19 | `annotate_session` | historical | historical | NO | sessionId, label, comment |
| 20 | `get_annotations` | historical | historical | NO | sessionId |
| 21 | `get_recording_health` | historical | historical | NO | sessionId |
| 22 | `inspect_live_page` | live | live_browser_control | NO | None |
| 23 | `inspect_live_element` | live | live_browser_control | NO | None |
| 24 | `get_selected_element` | live | live_browser_control | NO | None |
| 25 | `start_element_picker` | live | live_browser_control | NO | None |
| 26 | `stop_element_picker` | live | live_browser_control | NO | None |
| 27 | `capture_page_screenshot` | live | live_browser_control | YES | None |
| 28 | `capture_element_screenshot` | live | live_browser_control | YES | None |
| 29 | `interact_with_element` | live | live_browser_control | NO | action |
| 30 | `start_element_observation` | live | live_browser_control | NO | None |
| 31 | `stop_element_observation` | live | live_browser_control | NO | None |
| 32 | `get_live_dom_snapshot` | live | live_browser_control | NO | None |
| 33 | `get_live_dom_subtree` | live | live_browser_control | NO | None |
| 34 | `get_element_visual_state` | live | live_browser_control | YES | None |
