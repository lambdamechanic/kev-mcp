import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils.js";

export function registerGetKevCountTool(server: McpServer) {
  server.tool(
    "get_kev_count",
    "Get the total number of vulnerabilities in the CISA KEV (Known Exploited Vulnerabilities) catalog",
    {}, // No parameters needed
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async () => {
      try {
        const kevData = await getKevData();
        return {
          content: [{ type: "text", text: String(kevData.count) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving KEV count: ${error}` }],
          isError: true,
        };
      }
    },
  );
}