import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetKevCountTool } from "./getKevCount.js";
import { registerGetKevReleaseDateTool } from "./getKevReleaseDate.js";
import { registerGetKevVendorsTool } from "./getKevVendors.js";
import { registerGetKevProductsTool } from "./getKevProducts.js";
import { registerGetKevCvesTool } from "./getKevCves.js";
import { registerSearchKevTool } from "./searchKev.js";
import { registerGetVulnerabilityDetailsTool } from "./getVulnerabilityDetails.js";
import { registerGetRecentVulnerabilitiesTool } from "./getRecentVulnerabilities.js";
import { registerGetKevStatisticsTool } from "./getKevStatistics.js";
import { registerGetRelatedCvesTool } from "./getRelatedCves.js";
import { registerGetUpcomingDueDatesTool } from "./getUpcomingDueDates.js";
import { registerSearchByCweTool } from "./searchByCwe.js";
import { registerGetCweStatisticsTool } from "./getCweStatistics.js";
import { registerForceRefreshKevDataTool } from "./forceRefreshKevData.js";

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