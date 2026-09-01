# Operational Test: `get_dom_subtree`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `historical`
**Duration**: 33ms

## Test Objective
Reconstructs HTML subtree for #host-sidebar

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_011_get_dom_subtree",
  "method": "tools/call",
  "params": {
    "name": "get_dom_subtree",
    "arguments": {
      "sessionId": "operational_acceptance_session_001",
      "selector": "#host-sidebar",
      "timestamp": 100
    }
  }
}
```

## Raw Received JSON-RPC Response
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_011_get_dom_subtree",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "<div id=\"host-sidebar\" class=\"sidebar\">\n  <button class=\"btn btn-primary\" id=\"injected-action-btn\">⚡ Run Analysis</button>\n</div>"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Reconstructs HTML subtree for #host-sidebar**: Received valid payload content
