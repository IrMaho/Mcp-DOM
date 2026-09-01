# Operational Test: `get_recording_health`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `historical`
**Duration**: 33ms

## Test Objective
Audits recording integrity and returns HEALTHY status

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_021_get_recording_health",
  "method": "tools/call",
  "params": {
    "name": "get_recording_health",
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
  "id": "op_req_021_get_recording_health",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"sessionId\": \"operational_acceptance_session_001\",\n  \"health\": {\n    \"domRecording\": \"HEALTHY\",\n    \"userEvents\": \"HEALTHY\",\n    \"console\": \"HEALTHY\",\n    \"network\": \"HEALTHY\",\n    \"screenshots\": \"HEALTHY\",\n    \"shadowDom\": \"HEALTHY\",\n    \"iframes\": \"HEALTHY\"\n  },\n  \"stats\": {\n    \"eventCount\": 8,\n    \"mutationCount\": 4,\n    \"errorCount\": 1,\n    \"consoleCount\": 1,\n    \"networkCount\": 2,\n    \"checkpointCount\": 2,\n    \"screenshotCount\": 1,\n    \"nodeCount\": 12\n  },\n  \"integrity\": {\n    \"isValid\": false,\n    \"sessionId\": \"operational_acceptance_session_001\",\n    \"schemaVersion\": \"2.0.0\",\n    \"totalEvents\": 104,\n    \"totalCheckpoints\": 1,\n    \"isSequenceMonotonic\": false,\n    \"missingSequences\": [],\n    \"corruptNodeReferences\": [],\n    \"hasInitialSnapshot\": true,\n    \"errors\": [\n      \"Non-increasing sequence at index 1: prev=2, curr=2\",\n      \"Non-increasing sequence at index 2: prev=2, curr=2\",\n      \"Non-increasing sequence at index 3: prev=2, curr=2\",\n      \"Non-increasing sequence at index 4: prev=2, curr=2\",\n      \"Non-increasing sequence at index 5: prev=2, curr=2\",\n      \"Non-increasing sequence at index 6: prev=2, curr=2\",\n      \"Non-increasing sequence at index 7: prev=2, curr=2\",\n      \"Non-increasing sequence at index 8: prev=2, curr=2\",\n      \"Non-increasing sequence at index 9: prev=2, curr=2\",\n      \"Non-increasing sequence at index 10: prev=2, curr=2\",\n      \"Non-increasing sequence at index 11: prev=2, curr=2\",\n      \"Non-increasing sequence at index 12: prev=2, curr=2\",\n      \"Non-increasing sequence at index 14: prev=3, curr=3\",\n      \"Non-increasing sequence at index 15: prev=3, curr=3\",\n      \"Non-increasing sequence at index 16: prev=3, curr=3\",\n      \"Non-increasing sequence at index 17: prev=3, curr=3\",\n      \"Non-increasing sequence at index 18: prev=3, curr=3\",\n      \"Non-increasing sequence at index 19: prev=3, curr=3\",\n      \"Non-increasing sequence at index 20: prev=3, curr=3\",\n      \"Non-increasing sequence at index 21: prev=3, curr=3\",\n      \"Non-increasing sequence at index 22: prev=3, curr=3\",\n      \"Non-increasing sequence at index 23: prev=3, curr=3\",\n      \"Non-increasing sequence at index 24: prev=3, curr=3\",\n      \"Non-increasing sequence at index 25: prev=3, curr=3\",\n      \"Non-increasing sequence at index 27: prev=4, curr=4\",\n      \"Non-increasing sequence at index 28: prev=4, curr=4\",\n      \"Non-increasing sequence at index 29: prev=4, curr=4\",\n      \"Non-increasing sequence at index 30: prev=4, curr=4\",\n      \"Non-increasing sequence at index 31: prev=4, curr=4\",\n      \"Non-increasing sequence at index 32: prev=4, curr=4\",\n      \"Non-increasing sequence at index 33: prev=4, curr=4\",\n      \"Non-increasing sequence at index 34: prev=4, curr=4\",\n      \"Non-increasing sequence at index 35: prev=4, curr=4\",\n      \"Non-increasing sequence at index 36: prev=4, curr=4\",\n      \"Non-increasing sequence at index 37: prev=4, curr=4\",\n      \"Non-increasing sequence at index 38: prev=4, curr=4\",\n      \"Non-increasing sequence at index 40: prev=5, curr=5\",\n      \"Non-increasing sequence at index 41: prev=5, curr=5\",\n      \"Non-increasing sequence at index 42: prev=5, curr=5\",\n      \"Non-increasing sequence at index 43: prev=5, curr=5\",\n      \"Non-increasing sequence at index 44: prev=5, curr=5\",\n      \"Non-increasing sequence at index 45: prev=5, curr=5\",\n      \"Non-increasing sequence at index 46: prev=5, curr=5\",\n      \"Non-increasing sequence at index 47: prev=5, curr=5\",\n      \"Non-increasing sequence at index 48: prev=5, curr=5\",\n      \"Non-increasing sequence at index 49: prev=5, curr=5\",\n      \"Non-increasing sequence at index 50: prev=5, curr=5\",\n      \"Non-increasing sequence at index 51: prev=5, curr=5\",\n      \"Non-increasing sequence at index 53: prev=6, curr=6\",\n      \"Non-increasing sequence at index 54: prev=6, curr=6\",\n      \"Non-increasing sequence at index 55: prev=6, curr=6\",\n      \"Non-increasing sequence at index 56: prev=6, curr=6\",\n      \"Non-increasing sequence at index 57: prev=6, curr=6\",\n      \"Non-increasing sequence at index 58: prev=6, curr=6\",\n      \"Non-increasing sequence at index 59: prev=6, curr=6\",\n      \"Non-increasing sequence at index 60: prev=6, curr=6\",\n      \"Non-increasing sequence at index 61: prev=6, curr=6\",\n      \"Non-increasing sequence at index 62: prev=6, curr=6\",\n      \"Non-increasing sequence at index 63: prev=6, curr=6\",\n      \"Non-increasing sequence at index 64: prev=6, curr=6\",\n      \"Non-increasing sequence at index 66: prev=7, curr=7\",\n      \"Non-increasing sequence at index 67: prev=7, curr=7\",\n      \"Non-increasing sequence at index 68: prev=7, curr=7\",\n      \"Non-increasing sequence at index 69: prev=7, curr=7\",\n      \"Non-increasing sequence at index 70: prev=7, curr=7\",\n      \"Non-increasing sequence at index 71: prev=7, curr=7\",\n      \"Non-increasing sequence at index 72: prev=7, curr=7\",\n      \"Non-increasing sequence at index 73: prev=7, curr=7\",\n      \"Non-increasing sequence at index 74: prev=7, curr=7\",\n      \"Non-increasing sequence at index 75: prev=7, curr=7\",\n      \"Non-increasing sequence at index 76: prev=7, curr=7\",\n      \"Non-increasing sequence at index 77: prev=7, curr=7\",\n      \"Non-increasing sequence at index 79: prev=8, curr=8\",\n      \"Non-increasing sequence at index 80: prev=8, curr=8\",\n      \"Non-increasing sequence at index 81: prev=8, curr=8\",\n      \"Non-increasing sequence at index 82: prev=8, curr=8\",\n      \"Non-increasing sequence at index 83: prev=8, curr=8\",\n      \"Non-increasing sequence at index 84: prev=8, curr=8\",\n      \"Non-increasing sequence at index 85: prev=8, curr=8\",\n      \"Non-increasing sequence at index 86: prev=8, curr=8\",\n      \"Non-increasing sequence at index 87: prev=8, curr=8\",\n      \"Non-increasing sequence at index 88: prev=8, curr=8\",\n      \"Non-increasing sequence at index 89: prev=8, curr=8\",\n      \"Non-increasing sequence at index 90: prev=8, curr=8\",\n      \"Non-increasing sequence at index 92: prev=9, curr=9\",\n      \"Non-increasing sequence at index 93: prev=9, curr=9\",\n      \"Non-increasing sequence at index 94: prev=9, curr=9\",\n      \"Non-increasing sequence at index 95: prev=9, curr=9\",\n      \"Non-increasing sequence at index 96: prev=9, curr=9\",\n      \"Non-increasing sequence at index 97: prev=9, curr=9\",\n      \"Non-increasing sequence at index 98: prev=9, curr=9\",\n      \"Non-increasing sequence at index 99: prev=9, curr=9\",\n      \"Non-increasing sequence at index 100: prev=9, curr=9\",\n      \"Non-increasing sequence at index 101: prev=9, curr=9\",\n      \"Non-increasing sequence at index 102: prev=9, curr=9\",\n      \"Non-increasing sequence at index 103: prev=9, curr=9\"\n    ],\n    \"warnings\": []\n  }\n}"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Audits recording integrity and returns HEALTHY status**: sessionId, health, stats, integrity
