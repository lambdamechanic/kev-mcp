import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKevData } from "../utils.js";

export function registerSearchByCweTool(server: McpServer) {
  server.tool(
    "search_by_cwe",
    "Search for vulnerabilities in the CISA KEV catalog that are associated with a specific Common Weakness Enumeration (CWE) identifier",
    {
      cwe: z.string().describe("CWE identifier to search for (e.g., 'CWE-79')"),
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
    async (params: { cwe: string; fields?: string[] }) => {
      try {
        const requestedFields = params.fields || ['cveID', 'vendorProject', 'product', 'vulnerabilityName', 'dateAdded'];
        const kevData = await getKevData();
        
        // Normalize CWE format (some may have 'CWE-' prefix, some may not)
        const normalizedCwe = params.cwe.toUpperCase().startsWith('CWE-') 
          ? params.cwe.toUpperCase() 
          : `CWE-${params.cwe}`;
        
        const matchingVulnerabilities = kevData.vulnerabilities.filter((v: any) => 
          v.cwes.some((cwe: any) => cwe === normalizedCwe)
        );

        // Filter fields in results
        const filteredResults = matchingVulnerabilities.map((vuln: any) => {
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
              cwe: normalizedCwe,
              vulnerabilities: filteredResults
            }) 
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error searching by CWE: ${error}` }],
          isError: true,
        };
      }
    },
  );
}