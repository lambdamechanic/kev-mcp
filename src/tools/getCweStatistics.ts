import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils.js";

export function registerGetCweStatisticsTool(server: McpServer) {
  server.tool(
    "get_cwe_statistics",
    "Get statistical analysis of Common Weakness Enumerations (CWEs) found in the CISA KEV catalog",
    {},
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async () => {
      try {
        const kevData = await getKevData();
        
        // Count occurrences of each CWE
        const cweCounts: Record<string, number> = {};
        
        kevData.vulnerabilities.forEach((vuln: any) => {
          vuln.cwes.forEach((cwe: any) => {
            cweCounts[cwe] = (cweCounts[cwe] || 0) + 1;
          });
        });
        
        // Sort CWEs by frequency
        const topCwes = Object.entries(cweCounts)
          .sort((a: any, b: any) => b[1] - a[1])
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