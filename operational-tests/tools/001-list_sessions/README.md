# Operational Test: `list_sessions`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `historical`
**Duration**: 7ms

## Test Objective
Returns array of sessions containing seeded sessionId

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_001_list_sessions",
  "method": "tools/call",
  "params": {
    "name": "list_sessions",
    "arguments": {
      "limit": 10
    }
  }
}
```

## Raw Received JSON-RPC Response
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_001_list_sessions",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"totalSessions\": 1,\n  \"sessions\": [\n    {\n      \"id\": \"operational_acceptance_session_001\",\n      \"name\": \"Operational Acceptance Test Session\",\n      \"url\": \"https://app.internal/dashboard\",\n      \"startTime\": 1725000000000,\n      \"durationMs\": 2000,\n      \"status\": \"stopped\",\n      \"stats\": {\n        \"eventCount\": 8,\n        \"mutationCount\": 4,\n        \"errorCount\": 1,\n        \"consoleCount\": 1,\n        \"networkCount\": 2,\n        \"checkpointCount\": 2,\n        \"screenshotCount\": 1,\n        \"nodeCount\": 12\n      }\n    }\n  ]\n}"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Returns array of sessions containing seeded sessionId**: totalSessions, sessions
