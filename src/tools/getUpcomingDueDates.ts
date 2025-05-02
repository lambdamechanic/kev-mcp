import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getKevData } from "../utils";

export function registerGetUpcomingDueDatesTool(server: McpServer) {
  server.tool(
    "get_upcoming_due_dates",
    {
      days: z.number().optional().describe("Number of days to look ahead (default: 30)")
    },
    async (params: { days?: number }) => {
      try {
        const lookAheadDays = params.days || 30;
        const kevData = await getKevData();
        
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + lookAheadDays);
        
        const upcomingVulnerabilities = kevData.vulnerabilities.filter(v => {
          const dueDate = new Date(v.dueDate);
          return dueDate >= today && dueDate <= futureDate;
        });
        
        // Sort by due date (ascending)
        upcomingVulnerabilities.sort((a, b) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              count: upcomingVulnerabilities.length,
              vulnerabilities: upcomingVulnerabilities
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