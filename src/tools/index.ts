import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetKevCountTool } from "./getKevCount";
import { registerGetKevReleaseDateTool } from "./getKevReleaseDate";
import { registerGetKevVendorsTool } from "./getKevVendors";
import { registerGetKevProductsTool } from "./getKevProducts";
import { registerGetKevCvesTool } from "./getKevCves";
import { registerSearchKevTool } from "./searchKev";
import { registerGetVulnerabilityDetailsTool } from "./getVulnerabilityDetails";
import { registerGetRecentVulnerabilitiesTool } from "./getRecentVulnerabilities";
import { registerGetKevStatisticsTool } from "./getKevStatistics";
import { registerGetRelatedCvesTool } from "./getRelatedCves";
import { registerGetUpcomingDueDatesTool } from "./getUpcomingDueDates";
import { registerSearchByCweTool } from "./searchByCwe";
import { registerGetCweStatisticsTool } from "./getCweStatistics";
import { registerForceRefreshKevDataTool } from "./forceRefreshKevData";

export function registerAllTools(server: McpServer) {
  // Original tools
  registerGetKevCountTool(server);
  registerGetKevReleaseDateTool(server);
  registerGetKevVendorsTool(server);
  registerGetKevProductsTool(server);
  registerGetKevCvesTool(server);
  registerSearchKevTool(server);
  
  // New tools
  registerGetVulnerabilityDetailsTool(server);
  registerGetRecentVulnerabilitiesTool(server);
  registerGetKevStatisticsTool(server);
  registerGetRelatedCvesTool(server);
  registerGetUpcomingDueDatesTool(server);
  registerSearchByCweTool(server);
  registerGetCweStatisticsTool(server);
  registerForceRefreshKevDataTool(server);
}