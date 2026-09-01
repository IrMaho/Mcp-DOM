# Operational Test: `get_session`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `historical`
**Duration**: 4ms

## Test Objective
Returns full metadata and health metrics for session

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_002_get_session",
  "method": "tools/call",
  "params": {
    "name": "get_session",
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
  "id": "op_req_002_get_session",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"id\": \"operational_acceptance_session_001\",\n  \"name\": \"Operational Acceptance Test Session\",\n  \"url\": \"https://app.internal/dashboard\",\n  \"origin\": \"https://app.internal\",\n  \"title\": \"Cloud Management Dashboard\",\n  \"userAgent\": \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36\",\n  \"schemaVersion\": \"2.0.0\",\n  \"recorderVersion\": \"2.0.0\",\n  \"extensionVersion\": \"2.0.0\",\n  \"startTime\": 1725000000000,\n  \"endTime\": 1725000002000,\n  \"durationMs\": 2000,\n  \"status\": \"stopped\",\n  \"health\": {\n    \"domRecording\": \"HEALTHY\",\n    \"userEvents\": \"HEALTHY\",\n    \"console\": \"HEALTHY\",\n    \"network\": \"HEALTHY\",\n    \"screenshots\": \"HEALTHY\",\n    \"shadowDom\": \"HEALTHY\",\n    \"iframes\": \"HEALTHY\"\n  },\n  \"stats\": {\n    \"eventCount\": 8,\n    \"mutationCount\": 4,\n    \"errorCount\": 1,\n    \"consoleCount\": 1,\n    \"networkCount\": 2,\n    \"checkpointCount\": 2,\n    \"screenshotCount\": 1,\n    \"nodeCount\": 12\n  }\n}"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Returns full metadata and health metrics for session**: id, name, url, origin, title, userAgent, schemaVersion, recorderVersion, extensionVersion, startTime, endTime, durationMs, status, health, stats
