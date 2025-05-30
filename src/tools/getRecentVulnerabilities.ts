import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKevData } from "../utils.js";

/**
 * Registers the get_recent_vulnerabilities tool
 * 
 * Examples:
 * - get_recent_vulnerabilities() -> last 30 days
 * - get_recent_vulnerabilities({days: 7}) -> last week
 * - get_recent_vulnerabilities({days: 90}) -> last quarter
 */
export function registerGetRecentVulnerabilitiesTool(server: McpServer) {
  server.tool(
    "get_recent_vulnerabilities",
    `Get vulnerabilities recently added to CISA KEV catalog within specified timeframe.
    
Returns JSON with:
- count: number of vulnerabilities found
- vulnerabilities: array of vulnerability objects containing:
  * cveID: CVE identifier
  * vendorProject: affected vendor/project
  * product: affected product name
  * vulnerabilityName: descriptive name
  * dateAdded: when added to KEV catalog
  * shortDescription: brief vulnerability description
  * requiredAction: recommended remediation
  * dueDate: remediation deadline
  * knownRansomwareCampaignUse: boolean indicator`,
    {
      days: z.number()
        .min(1, "Must be at least 1 day")
        .max(365, "Cannot exceed 365 days")
        .optional()
        .describe("Number of days to look back from today (default: 30). Common values: 7 (week), 14 (two weeks), 30 (month), 90 (quarter)"),
      fields: z.array(z.enum([
        "cveID", "vendorProject", "product", "vulnerabilityName", "dateAdded",
        "shortDescription", "requiredAction", "dueDate", "knownRansomwareCampaignUse"
      ]))
        .optional()
        .describe("Array of fields to include in response (default: ['cveID', 'vendorProject', 'product', 'vulnerabilityName', 'dateAdded']). Available fields: cveID, vendorProject, product, vulnerabilityName, dateAdded, shortDescription, requiredAction, dueDate, knownRansomwareCampaignUse")
    },
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async (params: { days?: number; fields?: string[] }) => {
      try {
        const lookbackDays = params.days || 30;
        const requestedFields = params.fields || ['cveID', 'vendorProject', 'product', 'vulnerabilityName', 'dateAdded'];
        const kevData = await getKevData();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
        
        const recentVulnerabilities = kevData.vulnerabilities
          .filter((v: any) => {
            const addedDate = new Date(v.dateAdded);
            return addedDate >= cutoffDate;
          })
          .map((v: any) => {
            const filteredVuln: any = {};
            requestedFields.forEach(field => {
              if (v[field] !== undefined) {
                filteredVuln[field] = v[field];
              }
            });
            return filteredVuln;
          });
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              summary: `Found ${recentVulnerabilities.length} vulnerabilities added in the last ${lookbackDays} days`,
              period: {
                days: lookbackDays,
                from: cutoffDate.toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
              },
              count: recentVulnerabilities.length,
              vulnerabilities: recentVulnerabilities
            }, null, 2) 
          }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ 
            type: "text", 
            text: `Failed to retrieve recent vulnerabilities from CISA KEV catalog. Error: ${errorMessage}. Please try again or contact support if the issue persists.` 
          }],
          isError: true,
        };
      }
    },
  );
}