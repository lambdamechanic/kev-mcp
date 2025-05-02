import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils";

export function registerGetKevStatisticsTool(server: McpServer) {
  server.tool(
    "get_kev_statistics",
    {},
    async () => {
      try {
        const kevData = await getKevData();
        
        // Get counts by vendor
        const vendorCounts = kevData.vulnerabilities.reduce((acc, vuln) => {
          acc[vuln.vendorProject] = (acc[vuln.vendorProject] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Get top vendors (by vulnerability count)
        const topVendors = Object.entries(vendorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([vendor, count]) => ({ vendor, count }));
        
        // Count vulnerabilities by ransomware usage
        const ransomwareUsage = kevData.vulnerabilities.reduce((acc, vuln) => {
          acc[vuln.knownRansomwareCampaignUse] = (acc[vuln.knownRansomwareCampaignUse] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Count vulnerabilities by year added
        const countByYear = kevData.vulnerabilities.reduce((acc, vuln) => {
          const year = vuln.dateAdded.substring(0, 4);
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              totalVulnerabilities: kevData.count,
              topVendors,
              ransomwareUsage,
              countByYear
            }) 
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving KEV statistics: ${error}` }],
          isError: true,
        };
      }
    },
  );
}