import { Context, Next } from "hono";
import { BlankEnv } from "hono/types";

// Define environment type with requestId
type Env = BlankEnv & {
  Variables: {
    requestId: string;
  };
};

export interface RequestLogData {
  timestamp: string;
  method: string;
  path: string;
  userAgent?: string;
  contentType?: string;
  contentLength?: number;
  remoteAddr?: string;
  requestId: string;
  duration?: number;
  status?: number;
  responseSize?: number;
  error?: string;
}

export interface McpRequestLogData extends RequestLogData {
  mcpMethod?: string;
  mcpId?: string | number;
  mcpParams?: any;
  mcpError?: {
    code: number;
    message: string;
  };
}

// Generate a simple request ID
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Extract MCP-specific information from request body
function extractMcpInfo(body: any): Partial<McpRequestLogData> {
  if (!body || typeof body !== 'object') {
    return {};
  }

  return {
    mcpMethod: body.method,
    mcpId: body.id,
    mcpParams: body.params ? Object.keys(body.params) : undefined,
  };
}

// Extract MCP error information from response
function extractMcpError(response: any): Partial<McpRequestLogData> {
  if (!response || typeof response !== 'object' || !response.error) {
    return {};
  }

  return {
    mcpError: {
      code: response.error.code,
      message: response.error.message,
    },
  };
}

// Log structured data to stderr (following the existing pattern)
function logRequest(data: McpRequestLogData): void {
  const logEntry = {
    level: data.error ? 'error' : 'info',
    component: 'http-transport',
    ...data,
  };

  console.error(JSON.stringify(logEntry));
}

export function requestLogger() {
  return async (c: Context<Env>, next: Next) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // Extract basic request info
    const logData: Partial<McpRequestLogData> = {
      timestamp: new Date().toISOString(),
      method: c.req.method,
      path: c.req.path,
      userAgent: c.req.header('user-agent'),
      contentType: c.req.header('content-type'),
      requestId,
    };

    // Try to get content length
    const contentLength = c.req.header('content-length');
    if (contentLength) {
      logData.contentLength = parseInt(contentLength, 10);
    }

    // Try to get remote address (this might not be available in all environments)
    const forwardedFor = c.req.header('x-forwarded-for');
    const realIp = c.req.header('x-real-ip');
    logData.remoteAddr = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    // Store request ID in context for potential use by handlers
    c.set('requestId', requestId);

    let requestBody: any = null;
    
    // Extract MCP info from request body if it's a POST request
    if (c.req.method === 'POST') {
      try {
        // Clone the request to read the body without consuming it
        const clonedRequest = c.req.raw.clone();
        requestBody = await clonedRequest.json();
        Object.assign(logData, extractMcpInfo(requestBody));
      } catch (error) {
        // If we can't parse the body, that's fine, just continue
        logData.error = 'Failed to parse request body for logging';
      }
    }

    let responseBody: any = null;
    let hasError = false;

    try {
      await next();
      
      // Try to extract response information
      const response = c.res;
      logData.status = response.status;
      
      // Try to get response size
      const responseContentLength = response.headers.get('content-length');
      if (responseContentLength) {
        logData.responseSize = parseInt(responseContentLength, 10);
      }

      // If this is an MCP response, try to extract error info
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const responseClone = response.clone();
          responseBody = await responseClone.json();
          Object.assign(logData, extractMcpError(responseBody));
          
          if (responseBody?.error) {
            hasError = true;
          }
        } catch (error) {
          // If we can't parse the response, that's fine
        }
      }
      
    } catch (error) {
      hasError = true;
      logData.error = error instanceof Error ? error.message : 'Unknown error';
      logData.status = 500;
    }

    // Calculate duration
    logData.duration = Date.now() - startTime;

    // Log the request
    logRequest(logData as McpRequestLogData);
  };
}

// Health check logger (lighter logging for health checks)
export function healthCheckLogger() {
  return async (c: Context<Env>, next: Next) => {
    if (c.req.path === '/health') {
      // Only log health check failures or if explicitly requested
      const logHealthChecks = process.env.LOG_HEALTH_CHECKS === 'true';
      
      if (logHealthChecks) {
        const startTime = Date.now();
        await next();
        
        const logData: RequestLogData = {
          timestamp: new Date().toISOString(),
          method: c.req.method,
          path: c.req.path,
          requestId: generateRequestId(),
          duration: Date.now() - startTime,
          status: c.res.status,
        };

        if (c.res.status !== 200) {
          logRequest(logData as McpRequestLogData);
        }
      } else {
        await next();
      }
    } else {
      await next();
    }
  };
}