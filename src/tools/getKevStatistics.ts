import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils.js";

/**
 * Registers the get_kev_statistics tool
 * 
 * Provides comprehensive statistical analysis of the CISA KEV catalog including:
 * - Overall vulnerability counts and trends
 * - Top vendors by vulnerability count
 * - Ransomware campaign usage breakdown
 * - Vulnerability addition trends by year
 * 
 * Examples:
 * - get_kev_statistics() -> complete statistical overview
 * - Useful for security dashboards, trend analysis, and threat intelligence
 */
export function registerGetKevStatisticsTool(server: McpServer) {
  server.tool(
    "get_kev_statistics",
    `Get comprehensive statistical analysis of the CISA KEV catalog.
    
Returns JSON with:
- totalVulnerabilities: total count of vulnerabilities in KEV catalog
- summary: high-level statistics and insights
- topVendors: array of top 10 vendors by vulnerability count with:
  * vendor: vendor/project name
  * count: number of vulnerabilities
  * percentage: percentage of total vulnerabilities
- ransomwareUsage: breakdown of known ransomware campaign usage:
  * Known: vulnerabilities used in ransomware campaigns
  * Unknown: vulnerabilities with unknown ransomware usage
- countByYear: vulnerabilities added to KEV by year with trends
- insights: key findings and notable patterns`,
    {},
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async () => {
      try {
        const kevData = await getKevData();
        
        // Get counts by vendor
        const vendorCounts = kevData.vulnerabilities.reduce((acc: any, vuln: any) => {
          acc[vuln.vendorProject] = (acc[vuln.vendorProject] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Get top vendors (by vulnerability count)
        const topVendors = Object.entries(vendorCounts)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 10)
          .map(([vendor, count]) => ({ 
            vendor, 
            count, 
            percentage: ((count as number / kevData.count) * 100).toFixed(1) + '%'
          }));
        
        // Count vulnerabilities by ransomware usage
        const ransomwareUsage = kevData.vulnerabilities.reduce((acc: any, vuln: any) => {
          acc[vuln.knownRansomwareCampaignUse] = (acc[vuln.knownRansomwareCampaignUse] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Count vulnerabilities by year added
        const countByYear = kevData.vulnerabilities.reduce((acc: any, vuln: any) => {
          const year = vuln.dateAdded.substring(0, 4);
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Generate insights
        const topVendor = topVendors[0];
        const knownRansomware = ransomwareUsage['Known'] || 0;
        const unknownRansomware = ransomwareUsage['Unknown'] || 0;
        const ransomwarePercentage = ((knownRansomware / kevData.count) * 100).toFixed(1);
        
        const currentYear = new Date().getFullYear().toString();
        const lastYear = (new Date().getFullYear() - 1).toString();
        const currentYearCount = countByYear[currentYear] || 0;
        const lastYearCount = countByYear[lastYear] || 0;
        
        const insights = [
          `${topVendor.vendor} leads with ${topVendor.count} vulnerabilities (${topVendor.percentage})`,
          `${ransomwarePercentage}% of vulnerabilities have known ransomware campaign usage`,
          `${currentYearCount} vulnerabilities added in ${currentYear} vs ${lastYearCount} in ${lastYear}`
        ];
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              summary: `Statistical analysis of ${kevData.count} vulnerabilities in CISA KEV catalog`,
              generatedAt: new Date().toISOString(),
              totalVulnerabilities: kevData.count,
              topVendors,
              ransomwareUsage: {
                Known: knownRansomware,
                Unknown: unknownRansomware,
                knownPercentage: ransomwarePercentage + '%'
              },
              countByYear,
              insights
            }, null, 2) 
          }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ 
            type: "text", 
            text: `Failed to generate KEV statistics from CISA catalog. Error: ${errorMessage}. Please try again or contact support if the issue persists.` 
          }],
          isError: true,
        };
      }
    },
  );
}