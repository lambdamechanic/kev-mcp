import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils.js";

export function registerGetKevReleaseDateTool(server: McpServer) {
  server.tool(
    "get_kev_release_date",
    "Get the release date of the current CISA KEV (Known Exploited Vulnerabilities) catalog data",
    {},
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async () => {
      try {
        const kevData = await getKevData();
        return {
          content: [{ type: "text", text: kevData.dateReleased }],
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