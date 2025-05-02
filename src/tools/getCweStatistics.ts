import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils";

export function registerGetCweStatisticsTool(server: McpServer) {
  server.tool(
    "get_cwe_statistics",
    {},
    async () => {
      try {
        const kevData = await getKevData();
        
        // Count occurrences of each CWE
        const cweCounts: Record<string, number> = {};
        
        kevData.vulnerabilities.forEach(vuln => {
          vuln.cwes.forEach(cwe => {
            cweCounts[cwe] = (cweCounts[cwe] || 0) + 1;
          });
        });
        
        // Sort CWEs by frequency
        const topCwes = Object.entries(cweCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([cwe, count]) => ({ cwe, count }));
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              uniqueCweCount: Object.keys(cweCounts).length,
              topCwes
            }) 
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving CWE statistics: ${error}` }],
          isError: true,
        };
      }
    },
  );
}