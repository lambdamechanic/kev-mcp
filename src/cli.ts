// This file enables npx execution of the MCP server
import { main } from "./index.js";

// Show help message
function showHelp() {
  console.error(`
KEV MCP Server - CISA Known Exploited Vulnerabilities MCP Server

Usage: kev-mcp [options]

Options:
  --transport <type>  Transport type: "stdio" or "http" (default: stdio)
  --help, -h          Show this help message

Examples:
  kev-mcp                    # Start with stdio transport (default)
  kev-mcp --transport stdio  # Start with stdio transport
  kev-mcp --transport http   # Start with HTTP transport
`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let transport = "stdio"; // default to stdio

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help" || args[i] === "-h") {
      showHelp();
      process.exit(0);
    } else if (args[i] === "--transport" && i + 1 < args.length) {
      transport = args[i + 1];
      i++; // skip the transport value
    }
  }

  if (transport !== "stdio" && transport !== "http") {
    console.error('Error: --transport must be either "stdio" or "http"');
    console.error("Use --help for usage information");
    process.exit(1);
  }

  return { transport };
}

// Execute the main function with parsed arguments
const { transport } = parseArgs();
main(transport).catch(console.error);
