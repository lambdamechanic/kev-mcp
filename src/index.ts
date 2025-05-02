import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getKevData } from "./utils";
import { registerAllTools } from "./tools";

// Initialize MCP server
const server = new McpServer({
  name: "kev-server",
  version: "1.0.0",
});

// Register all the tools
registerAllTools(server);

// Start the server
async function main() {
  try {
    // Pre-fetch the KEV data on startup
    await getKevData();
    console.error("KEV data loaded successfully");

    // Start the server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("KEV MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start KEV MCP Server:", error);
    process.exit(1);
  }
}

main().catch(console.error);