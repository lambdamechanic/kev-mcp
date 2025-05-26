// This file enables npx execution of the MCP server with HTTP transport
import { main } from "./index.js";

// Execute with HTTP transport
main("http").catch(console.error);