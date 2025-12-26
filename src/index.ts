import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { getKevData } from "./utils.js";
import { registerAllTools } from "./tools/index.js";
import { requestLogger, healthCheckLogger } from "./middleware/logging.js";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define environment type with requestId
type Env = {
  Variables: {
    requestId: string;
  };
};

// Initialize MCP server with system prompts
const server = new McpServer({
  name: "kev-server",
  version: "0.2.0",
  systemPrompt: `
You are an expert cybersecurity analyst with deep knowledge of CISA's Known Exploited Vulnerabilities (KEV) catalog.

ABOUT THE KEV CATALOG:
- The KEV catalog contains vulnerabilities that are known to be actively exploited in the wild
- Each vulnerability has details like CVE ID, vendor, product, date added, remediation due date, and ransomware usage
- Vulnerabilities in this catalog require immediate attention from organizations

TOOL USAGE GUIDANCE:
- Use get_kev_statistics and get_cwe_statistics to understand the overall vulnerability landscape
- Use search_kev for complex queries with multiple filtering criteria
- Use get_vulnerability_details when you need complete information about a specific CVE
- Use get_recent_vulnerabilities to identify newly added threats
- Use get_upcoming_due_dates to prioritize remediation efforts
- Use get_related_cves to find patterns in vulnerabilities affecting specific vendors or products

RESPONSE BEST PRACTICES:
- Always contextualize vulnerabilities by explaining their significance and impact
- Prioritize vulnerabilities with known ransomware use or recent addition dates
- When providing vulnerability details, include relevant remediation advice
- Format vulnerability data in a clear, readable manner
- Highlight important metadata like due dates and ransomware status
- Connect findings to practical cybersecurity recommendations when possible
  `,
});

const EMPTY_OBJECT_JSON_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

function installToolSchemaOverrides(target: McpServer) {
  const toolRegistry = (target as any)._registeredTools as Record<
    string,
    { enabled: boolean; description?: string; annotations?: unknown; inputSchema?: any; outputSchema?: any }
  >;

  target.server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: Object.entries(toolRegistry)
      .filter(([, tool]) => tool.enabled)
      .map(([name, tool]) => {
        let inputSchema = tool.inputSchema
          ? zodToJsonSchema(tool.inputSchema, { strictUnions: true })
          : EMPTY_OBJECT_JSON_SCHEMA;

        const toolDefinition: Record<string, unknown> = {
          name,
          description: tool.description,
          inputSchema,
          annotations: tool.annotations,
        };

        if (tool.outputSchema) {
          toolDefinition.outputSchema = zodToJsonSchema(tool.outputSchema, {
            strictUnions: true,
          });
        }

        return toolDefinition;
      }),
  }));
}

// Register all the tools
registerAllTools(server);
installToolSchemaOverrides(server);

// Start the server with stdio transport
async function startStdioServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(JSON.stringify({
    level: 'info',
    component: 'stdio-transport',
    message: 'KEV MCP Server running on stdio',
    timestamp: new Date().toISOString()
  }));
}

// Start the server with HTTP transport
async function startHttpServer() {
  const app = new Hono<Env>();

  // Add structured request logging middleware
  app.use("*", healthCheckLogger());
  app.use("*", requestLogger());

  app.post("/mcp", async (c) => {
    // Convert Hono's request/response to Node.js equivalents
    const { req, res } = toReqRes(c.req.raw);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, await c.req.json());

      // Clean up on close
      res.on("close", () => {
        const requestId = c.get('requestId') || 'unknown';
        console.error(JSON.stringify({
          level: 'info',
          component: 'http-transport',
          message: 'Request closed',
          requestId,
          timestamp: new Date().toISOString()
        }));
        transport.close();
        server.close();
      });

      // Convert back to fetch Response
      return toFetchResponse(res);
    } catch (error) {
      const requestId = c.get('requestId') || 'unknown';
      console.error(JSON.stringify({
        level: 'error',
        component: 'http-transport',
        message: 'Error handling MCP request',
        error: error instanceof Error ? error.message : String(error),
        requestId,
        timestamp: new Date().toISOString()
      }));
      return c.json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      }, 500);
    }
  });

  // Handle GET requests (not allowed in stateless mode)
  app.get("/mcp", async (c) => {
    return c.json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed in stateless mode",
      },
      id: null,
    }, 405);
  });

  // Handle DELETE requests (not allowed in stateless mode)
  app.delete("/mcp", async (c) => {
    return c.json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed in stateless mode",
      },
      id: null,
    }, 405);
  });

  // Health check endpoint
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Start the server
  const port = process.env.PORT ? parseInt(process.env.PORT) : 9191;
  console.error(JSON.stringify({
    level: 'info',
    component: 'http-transport',
    message: 'MCP Server started',
    port,
    timestamp: new Date().toISOString()
  }));
  serve({
    fetch: app.fetch,
    port,
  });
}

// Start the server
export async function main(transport: string = "stdio") {
  try {
    // Pre-fetch the KEV data on startup
    await getKevData();
    console.error(JSON.stringify({
      level: 'info',
      component: 'server',
      message: 'KEV data loaded successfully',
      timestamp: new Date().toISOString()
    }));

    // Start the server with the specified transport
    if (transport === "stdio") {
      await startStdioServer();
    } else if (transport === "http") {
      await startHttpServer();
    } else {
      throw new Error(`Unknown transport: ${transport}`);
    }
  } catch (error) {
    console.error("Failed to start KEV MCP Server:", error);
    process.exit(1);
  }
}
