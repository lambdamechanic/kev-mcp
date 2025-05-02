#!/usr/bin/env node

// This file enables npx execution of the MCP server
import { main } from './index.js';

// Execute the main function
main().catch(console.error);