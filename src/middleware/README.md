# HTTP Request Logging Middleware

This directory contains middleware for structured HTTP request logging in the KEV MCP server.

## Features

- **Structured JSON Logging**: All logs are output as structured JSON to stderr
- **Request Tracking**: Each request gets a unique ID for correlation
- **MCP-Aware**: Extracts MCP method, ID, and error information from requests/responses
- **Performance Monitoring**: Tracks request duration and response sizes
- **Error Handling**: Captures and logs errors with context
- **Health Check Optimization**: Optional lighter logging for health check endpoints

## Usage

The logging middleware is automatically applied to all HTTP routes in the main server:

```typescript
import { requestLogger, healthCheckLogger } from "./middleware/logging.js";

const app = new Hono();

// Add logging middleware
app.use("*", healthCheckLogger());
app.use("*", requestLogger());
```

## Log Format

All logs are structured JSON objects with the following format:

### Basic Request Log
```json
{
  "level": "info",
  "component": "http-transport",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "method": "POST",
  "path": "/mcp",
  "userAgent": "Mozilla/5.0...",
  "contentType": "application/json",
  "contentLength": 256,
  "remoteAddr": "192.168.1.100",
  "requestId": "abc123def456",
  "duration": 125,
  "status": 200,
  "responseSize": 512
}
```

### MCP-Enhanced Log
```json
{
  "level": "info",
  "component": "http-transport",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "method": "POST",
  "path": "/mcp",
  "requestId": "abc123def456",
  "duration": 125,
  "status": 200,
  "mcpMethod": "tools/call",
  "mcpId": 1,
  "mcpParams": ["query", "limit"]
}
```

### Error Log
```json
{
  "level": "error",
  "component": "http-transport",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "method": "POST",
  "path": "/mcp",
  "requestId": "abc123def456",
  "duration": 250,
  "status": 500,
  "error": "Internal server error",
  "mcpError": {
    "code": -32603,
    "message": "Internal server error"
  }
}
```

## Configuration

### Environment Variables

- `LOG_HEALTH_CHECKS`: Set to `'true'` to enable logging of successful health check requests (default: only errors are logged)

### Log Levels

- `info`: Normal request processing
- `error`: Request errors, server errors, or MCP errors

## Components

- `http-transport`: HTTP server and request handling
- `stdio-transport`: STDIO transport (when used)
- `server`: General server lifecycle events

## Request ID

Each request gets a unique `requestId` that can be used to correlate logs. The request ID is also stored in the Hono context as `requestId` and can be accessed by route handlers:

```typescript
app.post("/mcp", async (c) => {
  const requestId = c.get('requestId');
  // Use requestId for additional logging or error tracking
});
```

## Log Analysis

Since all logs are structured JSON, they can be easily parsed and analyzed:

```bash
# Filter error logs
node build/kev-mcp-http-bundle.cjs 2>&1 | jq 'select(.level == "error")'

# Extract request durations
node build/kev-mcp-http-bundle.cjs 2>&1 | jq 'select(.duration) | {requestId, duration, mcpMethod}'

# Monitor specific MCP methods
node build/kev-mcp-http-bundle.cjs 2>&1 | jq 'select(.mcpMethod == "tools/call")'
```

## Performance Considerations

- The middleware clones request/response objects to extract information without interfering with normal processing
- Health check logging is optimized to reduce noise (only logs failures by default)
- Error parsing is gracefully handled - logging continues even if request/response bodies can't be parsed
- All logging is asynchronous and non-blocking