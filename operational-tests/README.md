# MCP-DOM Operational Acceptance Test Suite

This directory contains complete operational acceptance test artifacts, raw JSON-RPC requests/responses, semantic assertions, DOM state snapshots, visual screenshots, and certification reports for all 34 exposed MCP capabilities.

## Directory Structure

- `_inventory/`: Dynamic tool discovery schema and capability matrix.
- `_fixtures/`: Deterministic DOM, injection, and visual geometry fixtures.
- `tools/`: Dedicated evidence folders for each of the 34 MCP tools (`001-list_sessions` to `034-get_element_visual_state`).
- `scenarios/`: Autonomous multi-step Agent debugging scenarios.
- `_reports/`: Full certification reports, capability matrix, and test logs.

## Certification Status

**CERTIFIED** — 34/34 Capabilities Verified with 100% Passing Semantic Assertions across Real Stdio JSON-RPC Process Boundary.
