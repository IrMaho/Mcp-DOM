# Operational Test: `get_dom_node`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `historical`
**Duration**: 34ms

## Test Objective
Inspects properties of Node 4 (host-sidebar)

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_010_get_dom_node",
  "method": "tools/call",
  "params": {
    "name": "get_dom_node",
    "arguments": {
      "sessionId": "operational_acceptance_session_001",
      "nodeId": 4,
      "timestamp": 50
    }
  }
}
```

## Raw Received JSON-RPC Response
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_010_get_dom_node",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"id\": 4,\n  \"tagName\": \"div\",\n  \"nodeType\": 1,\n  \"selector\": \"#host-sidebar\",\n  \"attributes\": {\n    \"id\": \"host-sidebar\",\n    \"class\": \"sidebar\"\n  },\n  \"parentId\": 3,\n  \"parentSelector\": \"body\",\n  \"childrenIds\": [\n    10\n  ],\n  \"isDetached\": false,\n  \"isHidden\": false\n}"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Inspects properties of Node 4 (host-sidebar)**: id, tagName, nodeType, selector, attributes, parentId, parentSelector, childrenIds, isDetached, isHidden
