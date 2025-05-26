import { Context, Next } from "hono";
import { BlankEnv } from "hono/types";
import { McpRequestLogData, requestLogger } from "./logging.js";

// Define environment type with requestId
type Env = BlankEnv & {
  Variables: {
    requestId: string;
  };
};

// Example: Custom logging middleware that extends the base logger
export function auditLogger() {
  return async (c: Context<Env>, next: Next) => {
    const startTime = Date.now();
    
    // Store audit-specific data
    const auditData = {
      sessionId: c.req.header('x-session-id'),
      clientVersion: c.req.header('x-client-version'),
      apiKey: c.req.header('authorization') ? '[REDACTED]' : undefined,
    };

    await next();

    // Only log audit trail for MCP requests
    if (c.req.path === '/mcp' && c.req.method === 'POST') {
      const auditLog = {
        level: 'audit',
        component: 'security-audit',
        timestamp: new Date().toISOString(),
        requestId: c.get('requestId'),
        path: c.req.path,
        method: c.req.method,
        status: c.res.status,
        duration: Date.now() - startTime,
        ...auditData,
      };

      console.error(JSON.stringify(auditLog));
    }
  };
}

// Example: Performance monitoring middleware
export function performanceLogger() {
  return async (c: Context<Env>, next: Next) => {
    const startTime = process.hrtime.bigint();
    const memStart = process.memoryUsage();

    await next();

    const endTime = process.hrtime.bigint();
    const memEnd = process.memoryUsage();
    const durationNs = Number(endTime - startTime);
    const durationMs = durationNs / 1_000_000;

    // Log performance metrics for requests over 1 second
    if (durationMs > 1000) {
      const perfLog = {
        level: 'warn',
        component: 'performance',
        timestamp: new Date().toISOString(),
        requestId: c.get('requestId'),
        path: c.req.path,
        method: c.req.method,
        durationMs,
        memoryDelta: {
          rss: memEnd.rss - memStart.rss,
          heapUsed: memEnd.heapUsed - memStart.heapUsed,
          external: memEnd.external - memStart.external,
        },
        message: 'Slow request detected',
      };

      console.error(JSON.stringify(perfLog));
    }
  };
}

// Example: Rate limiting logger
export function rateLimitLogger() {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  return async (c: Context<Env>, next: Next) => {
    const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 
                     c.req.header('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const limit = 100; // 100 requests per minute

    const clientData = requestCounts.get(clientIp) || { count: 0, resetTime: now + windowMs };
    
    // Reset counter if window has passed
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }

    clientData.count++;
    requestCounts.set(clientIp, clientData);

    // Log rate limit warnings
    if (clientData.count > limit * 0.8) { // Warn at 80% of limit
      const rateLimitLog = {
        level: clientData.count > limit ? 'error' : 'warn',
        component: 'rate-limit',
        timestamp: new Date().toISOString(),
        requestId: c.get('requestId'),
        clientIp,
        requestCount: clientData.count,
        limit,
        message: clientData.count > limit ? 'Rate limit exceeded' : 'Rate limit warning',
      };

      console.error(JSON.stringify(rateLimitLog));
    }

    await next();
  };
}

// Example: Custom MCP method logger
export function mcpMethodLogger() {
  return async (c: Context<Env>, next: Next) => {
    if (c.req.method === 'POST' && c.req.path === '/mcp') {
      try {
        const clonedRequest = c.req.raw.clone();
        const body = await clonedRequest.json() as any;
        
        if (body.method) {
          const methodLog = {
            level: 'info',
            component: 'mcp-methods',
            timestamp: new Date().toISOString(),
            requestId: c.get('requestId'),
            mcpMethod: body.method,
            hasParams: !!body.params,
            paramCount: body.params ? Object.keys(body.params).length : 0,
          };

          console.error(JSON.stringify(methodLog));
        }
      } catch (error) {
        // Silently ignore parsing errors
      }
    }

    await next();
  };
}

// Example: Error categorization logger
export function errorCategoryLogger() {
  return async (c: Context<Env>, next: Next) => {
    try {
      await next();
    } catch (error) {
      const errorCategory = categorizeError(error);
      
      const errorLog = {
        level: 'error',
        component: 'error-categorization',
        timestamp: new Date().toISOString(),
        requestId: c.get('requestId'),
        errorCategory,
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
      };

      console.error(JSON.stringify(errorLog));
      throw error; // Re-throw the error
    }
  };
}

function categorizeError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network') || message.includes('connection')) return 'network';
    if (message.includes('parse') || message.includes('json')) return 'parsing';
    if (message.includes('auth') || message.includes('permission')) return 'authentication';
    if (message.includes('not found')) return 'not-found';
    if (message.includes('validation')) return 'validation';
    
    return 'unknown';
  }
  
  return 'non-error';
}

// Example: How to use multiple custom loggers
export function setupAdvancedLogging(app: any) {
  // Apply loggers in order
  app.use("*", performanceLogger());
  app.use("*", rateLimitLogger());
  app.use("*", auditLogger());
  app.use("*", mcpMethodLogger());
  app.use("*", errorCategoryLogger());
  
  // Apply the base request logger last
  app.use("*", requestLogger());
}