import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData, setCachedData } from "../utils.js";

export function registerForceRefreshKevDataTool(server: McpServer) {
  server.tool(
    "force_refresh_kev_data",
    "Force refresh of the CISA KEV catalog data by clearing the cache and fetching the latest version from CISA",
    {},
    {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
      idempotentHint: false
    },
    async () => {
      try {
        // Set cachedData to null to force a refresh
        setCachedData(null);
        
        // Fetch fresh data
        const kevData = await getKevData();
        
        return {
          content: [{ 
            type: "text", 
            text: `KEV data successfully refreshed. Current catalog version: ${kevData.catalogVersion}, with ${kevData.count} vulnerabilities.` 
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error refreshing KEV data: ${error}` }],
          isError: true,
        };
      }
    },
  );
}