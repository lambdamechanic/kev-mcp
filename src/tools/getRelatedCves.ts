import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKevData } from "../utils.js";

export function registerGetRelatedCvesTool(server: McpServer) {
  server.tool(
    "get_related_cves",
    "Find CVEs related to a specific vendor or product in the CISA KEV catalog",
    {
      vendor: z.string().optional().describe("Vendor name to find related CVEs"),
      product: z.string().optional().describe("Product name to find related CVEs"),
      limit: z.number().optional().describe("Maximum number of results to return (default: 20)")
    },
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async (params: { vendor?: string; product?: string; limit?: number }) => {
      if (!params.vendor && !params.product) {
        return {
          content: [{ type: "text", text: "Either vendor or product parameter must be provided" }],
          isError: true,
        };
      }
      
      try {
        const kevData = await getKevData();
        const limit = params.limit || 20;
        
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
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              count: limitedResults.length,
              totalMatches: relatedVulnerabilities.length,
              vulnerabilities: limitedResults
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
}