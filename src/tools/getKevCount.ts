import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils";

export function registerGetKevCountTool(server: McpServer) {
  server.tool(
    "get_kev_count",
    {}, // No parameters needed
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