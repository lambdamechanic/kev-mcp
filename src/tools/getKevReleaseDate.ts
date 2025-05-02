import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils.js";

export function registerGetKevReleaseDateTool(server: McpServer) {
  server.tool(
    "get_kev_release_date",
    {}, // No parameters needed
    async () => {
      try {
        const kevData = await getKevData();
        // Extract just the date part (YYYY-MM-DD)
        const dateReleased = kevData.dateReleased.split("T")[0];
        return {
          content: [{ type: "text", text: dateReleased }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving KEV release date: ${error}` }],
          isError: true,
        };
      }
    },
  );
}