import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKevData } from "../utils.js";

export function registerGetRelatedCvesTool(server: McpServer) {
  const relatedCvesInputSchema = z.object({
    vendor: z.string().optional().describe("Vendor name to find related CVEs"),
    product: z.string().optional().describe("Product name to find related CVEs"),
    limit: z.number().optional().describe("Maximum number of results to return (default: 20)"),
    fields: z.array(z.enum([
      "cveID", "vendorProject", "product", "vulnerabilityName", "dateAdded",
      "shortDescription", "requiredAction", "dueDate", "knownRansomwareCampaignUse",
      "cwes", "notes"
    ]))
      .optional()
      .describe("Array of fields to include in response (default: ['cveID', 'vendorProject', 'product', 'vulnerabilityName', 'dateAdded']). Available fields: cveID, vendorProject, product, vulnerabilityName, dateAdded, shortDescription, requiredAction, dueDate, knownRansomwareCampaignUse, cwes, notes")
  });

  const registeredTool = server.tool(
    "get_related_cves",
    "Find CVEs related to a specific vendor or product in the CISA KEV catalog",
    {
      vendor: z.string().optional().describe("Vendor name to find related CVEs"),
      product: z.string().optional().describe("Product name to find related CVEs"),
      limit: z.number().optional().describe("Maximum number of results to return (default: 20)"),
      fields: z.array(z.enum([
        "cveID", "vendorProject", "product", "vulnerabilityName", "dateAdded",
        "shortDescription", "requiredAction", "dueDate", "knownRansomwareCampaignUse",
        "cwes", "notes"
      ]))
        .optional()
        .describe("Array of fields to include in response (default: ['cveID', 'vendorProject', 'product', 'vulnerabilityName', 'dateAdded']). Available fields: cveID, vendorProject, product, vulnerabilityName, dateAdded, shortDescription, requiredAction, dueDate, knownRansomwareCampaignUse, cwes, notes")
    },
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async (params: { vendor?: string; product?: string; limit?: number; fields?: string[] }) => {
      try {
        const kevData = await getKevData();
        const limit = params.limit || 20;
        const requestedFields = params.fields || ['cveID', 'vendorProject', 'product', 'vulnerabilityName', 'dateAdded'];
        
        let relatedVulnerabilities = kevData.vulnerabilities;
        
        if (params.vendor) {
          const vendorLower = params.vendor.toLowerCase();
          relatedVulnerabilities = relatedVulnerabilities.filter(
            (v: any) => v.vendorProject.toLowerCase().includes(vendorLower)
          );
        }
        
        if (params.product) {
          const productLower = params.product.toLowerCase();
          relatedVulnerabilities = relatedVulnerabilities.filter(
            (v: any) => v.product.toLowerCase().includes(productLower)
          );
        }
        
        // Limit the number of results
        const limitedResults = relatedVulnerabilities.slice(0, limit);

        // Filter fields in results
        const filteredResults = limitedResults.map((vuln: any) => {
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
              totalMatches: relatedVulnerabilities.length,
              vulnerabilities: filteredResults
            }) 
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving related CVEs: ${error}` }],
          isError: true,
        };
      }
    },
  );

  (registeredTool as { inputSchema?: unknown }).inputSchema = relatedCvesInputSchema;
}
