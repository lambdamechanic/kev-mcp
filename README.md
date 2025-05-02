# CISA KEV MCP Server

This MCP (Model Context Protocol) server provides access to CISA's Catalog of Known Exploited Vulnerabilities (KEV).

## Features

- Loads and caches the KEV data with daily refresh
- Exposes tools to query and search the KEV database
- Provides type-safe responses

## Installation

```bash
npm install
npm run build