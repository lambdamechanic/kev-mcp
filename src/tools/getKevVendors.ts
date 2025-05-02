import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils";

export function registerGetKevVendorsTool(server: McpServer) {
  server.tool(
    "get_kev_vendors",
    {}, // No parameters needed
    async () => {
      try {
        const kevData = await getKevData();
        // Get unique vendors and sort them
        const vendors = [...new Set(kevData.vulnerabilities.map((v) => v.vendorProject))].sort();
        return {
          content: [{ type: "text", text: JSON.stringify(vendors) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving KEV vendors: ${error}` }],
          isError: true,
        };
      }
    },
  );
}