import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKevData } from "../utils.js";

export function registerGetUpcomingDueDatesTool(server: McpServer) {
  server.tool(
    "get_upcoming_due_dates",
    "Get vulnerabilities from the CISA KEV catalog that have due dates approaching within a specified time period",
    {
      days: z.number().optional().describe("Number of days to look ahead (default: 30)"),
      fields: z.array(z.enum([
        "cveID", "vendorProject", "product", "vulnerabilityName", "dateAdded",
        "shortDescription", "requiredAction", "dueDate", "knownRansomwareCampaignUse",
        "cwes", "notes"
      ]))
        .optional()
        .describe("Array of fields to include in response (default: ['cveID', 'vendorProject', 'product', 'vulnerabilityName', 'dueDate']). Available fields: cveID, vendorProject, product, vulnerabilityName, dateAdded, shortDescription, requiredAction, dueDate, knownRansomwareCampaignUse, cwes, notes")
    },
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async (params: { days?: number; fields?: string[] }) => {
      try {
        const lookAheadDays = params.days || 30;
        const requestedFields = params.fields || ['cveID', 'vendorProject', 'product', 'vulnerabilityName', 'dueDate'];
        const kevData = await getKevData();
        
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + lookAheadDays);
        
        const upcomingVulnerabilities = kevData.vulnerabilities.filter((v: any) => {
          const dueDate = new Date(v.dueDate);
          return dueDate >= today && dueDate <= futureDate;
        });
        
        // Sort by due date (ascending)
        upcomingVulnerabilities.sort((a: any, b: any) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );

        // Filter fields in results
        const filteredResults = upcomingVulnerabilities.map((vuln: any) => {
          const filteredVuln: any = {};
          requestedFields.forEach(field => {
            if (vuln[field] !== undefined) {
              filteredVuln[field] = vuln[field];
            }
          });
          return filteredVuln;
        });
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              count: filteredResults.length,
              vulnerabilities: filteredResults
            }) 
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving upcoming due dates: ${error}` }],
          isError: true,
        };
      }
    },
  );
}