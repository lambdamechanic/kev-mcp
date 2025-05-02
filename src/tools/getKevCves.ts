import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKevData } from "../utils.js";

export function registerGetKevCvesTool(server: McpServer) {
  server.tool(
    "get_kev_cves",
    {}, // No parameters needed
    async () => {
      try {
        const kevData = await getKevData();
        const cves = kevData.vulnerabilities.map((v: any) => v.cveID);
        return {
          content: [{ type: "text", text: JSON.stringify(cves) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving KEV CVEs: ${error}` }],
          isError: true,
        };
      }
    },
  );
}