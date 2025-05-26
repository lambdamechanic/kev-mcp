import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { getKevData } from "./utils.js";
import { registerAllTools } from "./tools/index.js";

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

// Register all the tools
registerAllTools(server);

// Start the server with stdio transport
async function startStdioServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KEV MCP Server running on stdio");
}

// Start the server with HTTP transport
async function startHttpServer() {
  const app = new Hono();
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
        console.log("Request closed");
        transport.close();
        server.close();
      });

      // Convert back to fetch Response
      return toFetchResponse(res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
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
  console.log(`MCP Server listening on port ${port}`);
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
    console.error("KEV data loaded successfully");

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


