import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKevData } from "../utils.js";

export function registerSearchByCweTool(server: McpServer) {
  server.tool(
    "search_by_cwe",
    "Search for vulnerabilities in the CISA KEV catalog that are associated with a specific Common Weakness Enumeration (CWE) identifier",
    {
      cwe: z.string().describe("CWE identifier to search for (e.g., 'CWE-79')")
    },
    {
      readOnlyHint: true,
      openWorldHint: false,
      idempotentHint: true
    },
    async (params: { cwe: string }) => {
      try {
        const kevData = await getKevData();
        
        // Normalize CWE format (some may have 'CWE-' prefix, some may not)
        const normalizedCwe = params.cwe.toUpperCase().startsWith('CWE-') 
          ? params.cwe.toUpperCase() 
          : `CWE-${params.cwe}`;
        
        const matchingVulnerabilities = kevData.vulnerabilities.filter((v: any) => 
          v.cwes.some((cwe: any) => cwe === normalizedCwe)
        );
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              count: matchingVulnerabilities.length,
              cwe: normalizedCwe,
              vulnerabilities: matchingVulnerabilities
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