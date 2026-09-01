# Operational Test: `get_timeline`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `historical`
**Duration**: 32ms

## Test Objective
Returns event count breakdown across categories

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_006_get_timeline",
  "method": "tools/call",
  "params": {
    "name": "get_timeline",
    "arguments": {
      "sessionId": "operational_acceptance_session_001"
    }
  }
}
```

## Raw Received JSON-RPC Response
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_006_get_timeline",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"sessionId\": \"operational_acceptance_session_001\",\n  \"durationMs\": 400,\n  \"firstTimestamp\": 50,\n  \"lastTimestamp\": 450,\n  \"totalEvents\": 104,\n  \"categoryBreakdown\": {\n    \"DOM\": 26,\n    \"USER\": 13,\n    \"CONSOLE\": 13,\n    \"NETWORK\": 26,\n    \"ERROR\": 13,\n    \"VISUAL\": 13\n  },\n  \"sessionStatus\": \"stopped\"\n}"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Returns event count breakdown across categories**: sessionId, durationMs, firstTimestamp, lastTimestamp, totalEvents, categoryBreakdown, sessionStatus
