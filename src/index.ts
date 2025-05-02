import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

// Constants
const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Define types for the KEV data structure
interface Vulnerability {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: "Known" | "Unknown";
  notes: string;
  cwes: string[];
}

interface KevData {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: Vulnerability[];
}

// Cache management
interface CachedData {
  data: KevData;
  timestamp: number;
}

let cachedData: CachedData | null = null;

// Function to fetch and cache KEV data
async function getKevData(): Promise<KevData> {
  const currentTime = Date.now();

  // Return cached data if it's still valid
  if (cachedData && currentTime - cachedData.timestamp < CACHE_DURATION_MS) {
    return cachedData.data;
  }

  // Fetch new data
  try {
    const response = await fetch(KEV_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch KEV data: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as KevData;

    // Update cache
    cachedData = {
      data,
      timestamp: currentTime,
    };

    return data;
  } catch (error) {
    // If we have cached data but failed to fetch new data, return cached data
    if (cachedData) {
      console.error("Failed to fetch fresh KEV data, using cached data:", error);
      return cachedData.data;
    }

    // If no cached data, throw the error
    throw new Error(`Failed to fetch KEV data: ${error}`);
  }
}

// Date helper functions
function isValidDateFormat(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  if (!isValidDateFormat(date) || !isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
    return false;
  }

  const dateObj = new Date(date);
  const startObj = new Date(startDate);
  const endObj = new Date(endDate);

  return dateObj >= startObj && dateObj <= endObj;
}

// Initialize MCP server
const server = new McpServer({
  name: "kev-server",
  version: "1.0.0",
});

// Register the get_kev_count tool
server.tool(
  "get_kev_count",
  {}, // No parameters needed
  async () => {
    try {
      const kevData = await getKevData();
      return {
        content: [{ type: "text", text: String(kevData.count) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error retrieving KEV count: ${error}` }],
        isError: true,
      };
    }
  },
);

// Register the get_kev_release_date tool
server.tool(
  "get_kev_release_date",
  {}, // No parameters needed
  async () => {
    try {
      const kevData = await getKevData();
      // Extract just the date part (YYYY-MM-DD)
      const dateReleased = kevData.dateReleased.split("T")[0];
      return {
        content: [{ type: "text", text: dateReleased }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error retrieving KEV release date: ${error}` }],
        isError: true,
      };
    }
  },
);

// Register the get_kev_vendors tool
server.tool(
  "get_kev_vendors",
  {}, // No parameters needed
  async () => {
    try {
      const kevData = await getKevData();
      // Get unique vendors and sort them
      const vendors = [...new Set(kevData.vulnerabilities.map((v) => v.vendorProject))].sort();
      return {
        content: [{ type: "text", text: JSON.stringify(vendors) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error retrieving KEV vendors: ${error}` }],
        isError: true,
      };
    }
  },
);

// Register the get_kev_products tool
server.tool(
  "get_kev_products",
  {}, // No parameters needed
  async () => {
    try {
      const kevData = await getKevData();
      // Get unique products and sort them
      const products = [...new Set(kevData.vulnerabilities.map((v) => v.product))].sort();
      return {
        content: [{ type: "text", text: JSON.stringify(products) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error retrieving KEV products: ${error}` }],
        isError: true,
      };
    }
  },
);

// Register the get_kev_cves tool
server.tool(
  "get_kev_cves",
  {}, // No parameters needed
  async () => {
    try {
      const kevData = await getKevData();
      const cves = kevData.vulnerabilities.map((v) => v.cveID);
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

// Define the schema for search_kev parameters
interface SearchKevParams {
  searchText?: string;
  ransomwareUse?: ("Known" | "Unknown")[];
  cwes?: string[];
  vendors?: string[];
  products?: string[];
  dateAddedStart?: string;
  dateAddedEnd?: string;
  dateAdded?: string[];
  dueDateStart?: string;
  dueDateEnd?: string;
  dueDate?: string[];
}

// Register the search_kev tool
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
      const results = kevData.vulnerabilities.filter((vuln) => {
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

// Start the server
async function main() {
  try {
    // Pre-fetch the KEV data on startup
    await getKevData();
    console.error("KEV data loaded successfully");

    // Start the server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("KEV MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start KEV MCP Server:", error);
    process.exit(1);
  }
}

main().catch(console.error);
