import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils.js";

export function registerGetKevProductsTool(server: McpServer) {
  server.tool(
    "get_kev_products",
    {}, // No parameters needed
    async () => {
      try {
        const kevData = await getKevData();
        // Get unique products and sort them
        const products = [...new Set(kevData.vulnerabilities.map((v: any) => v.product))].sort();
        return {
          content: [{ type: "text", text: JSON.stringify(products) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving KEV products: ${error}` }],
          isError: true,
        };
      }
    },
  );
}