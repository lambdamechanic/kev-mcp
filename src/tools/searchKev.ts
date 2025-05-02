import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKevData, isDateInRange } from "../utils.js";
import { SearchKevParams } from "../types.js";

export function registerSearchKevTool(server: McpServer) {
  server.tool(
    "search_kev",
    {
      searchText: z.string().optional().describe("Text to search in vulnerabilityName, shortDescription, and notes"),
      ransomwareUse: z
        .array(z.enum(["Known", "Unknown"]))
        .optional()
        .describe("Filter by knownRansomwareCampaignUse"),
      cwes: z.array(z.string()).optional().describe("Filter by CWE identifiers"),
      vendors: z.array(z.string()).optional().describe("Filter by vendor/project names"),
      products: z.array(z.string()).optional().describe("Filter by product names"),
      dateAddedStart: z.string().optional().describe("Start date for dateAdded range (YYYY-MM-DD)"),
      dateAddedEnd: z.string().optional().describe("End date for dateAdded range (YYYY-MM-DD)"),
      dateAdded: z.array(z.string()).optional().describe("Specific dateAdded values to match"),
      dueDateStart: z.string().optional().describe("Start date for dueDate range (YYYY-MM-DD)"),
      dueDateEnd: z.string().optional().describe("End date for dueDate range (YYYY-MM-DD)"),
      dueDate: z.array(z.string()).optional().describe("Specific dueDate values to match"),
    },
    async (params: SearchKevParams) => {
      try {
        const kevData = await getKevData();

        // Filter vulnerabilities based on search criteria
        const results = kevData.vulnerabilities.filter((vuln: any) => {
          // Full-text search
          if (params.searchText) {
            const searchText = params.searchText.toLowerCase();
            const searchableText = [vuln.vulnerabilityName, vuln.shortDescription, vuln.notes].join(" ").toLowerCase();

            if (!searchableText.includes(searchText)) {
              return false;
            }
          }

          // Filter by ransomware use
          if (params.ransomwareUse && params.ransomwareUse.length > 0) {
            if (!params.ransomwareUse.includes(vuln.knownRansomwareCampaignUse)) {
              return false;
            }
          }

          // Filter by CWEs
          if (params.cwes && params.cwes.length > 0) {
            if (!params.cwes.some((cwe) => vuln.cwes.includes(cwe))) {
              return false;
            }
          }

          // Filter by vendors
          if (params.vendors && params.vendors.length > 0) {
            if (!params.vendors.some((vendor) => vuln.vendorProject.toLowerCase() === vendor.toLowerCase())) {
              return false;
            }
          }

          // Filter by products
          if (params.products && params.products.length > 0) {
            if (!params.products.some((product) => vuln.product.toLowerCase() === product.toLowerCase())) {
              return false;
            }
          }

          // Filter by dateAdded
          if (params.dateAdded && params.dateAdded.length > 0) {
            if (!params.dateAdded.includes(vuln.dateAdded)) {
              return false;
            }
          }

          // Filter by dateAdded range
          if (params.dateAddedStart && params.dateAddedEnd) {
            if (!isDateInRange(vuln.dateAdded, params.dateAddedStart, params.dateAddedEnd)) {
              return false;
            }
          }

          // Filter by dueDate
          if (params.dueDate && params.dueDate.length > 0) {
            if (!params.dueDate.includes(vuln.dueDate)) {
              return false;
            }
          }

          // Filter by dueDate range
          if (params.dueDateStart && params.dueDateEnd) {
            if (!isDateInRange(vuln.dueDate, params.dueDateStart, params.dueDateEnd)) {
              return false;
            }
          }

          return true;
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                count: results.length,
                vulnerabilities: results,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error searching KEV data: ${error}` }],
          isError: true,
        };
      }
    },
  );
}