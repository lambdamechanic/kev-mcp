import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils.js";

export function registerGetKevVendorsTool(server: McpServer) {
  server.tool(
    "get_kev_vendors",
    "Get a list of all vendors/projects that have vulnerabilities in the CISA KEV catalog",
    {},
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async () => {
      try {
        const kevData = await getKevData();
        // Get unique vendors and sort them
        const vendors = [...new Set(kevData.vulnerabilities.map((v: any) => v.vendorProject))].sort();
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