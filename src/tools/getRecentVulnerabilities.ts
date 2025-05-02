import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKevData } from "../utils.js";

export function registerGetRecentVulnerabilitiesTool(server: McpServer) {
  server.tool(
    "get_recent_vulnerabilities",
    {
      days: z.number().optional().describe("Number of days to look back (default: 30)")
    },
    async (params: { days?: number }) => {
      try {
        const lookbackDays = params.days || 30;
        const kevData = await getKevData();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
        
        const recentVulnerabilities = kevData.vulnerabilities.filter((v: any) => {
          const addedDate = new Date(v.dateAdded);
          return addedDate >= cutoffDate;
        });
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              count: recentVulnerabilities.length,
              vulnerabilities: recentVulnerabilities
            }) 
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving recent vulnerabilities: ${error}` }],
          isError: true,
        };
      }
    },
  );
}