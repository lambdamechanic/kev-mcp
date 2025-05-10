# CISA KEV MCP Server

This MCP (Model Context Protocol) server provides access to CISA's Catalog of Known Exploited Vulnerabilities (KEV). It allows AI assistants and other clients to query and analyze vulnerability data using the Model Context Protocol.

## Features

- Loads and caches the KEV data with daily refresh
- Exposes comprehensive tools to query and search the KEV database
- Provides statistical analysis of vulnerability data
- Implements filtering by multiple criteria
- Follows the Model Context Protocol for standardized AI assistant integration
- Delivers type-safe responses

## Installation

```bash
npm install
npm run build
```

## Usage

Start the server:

Run right from NPM:

```bash
npx @hrbrmstr/kev-mcp@latest
```

```bash
node build/index.js
```

The server runs on standard input/output, making it compatible with any MCP client. Example Claude Desktop configs:

Running it in Claude from NPM:

```json
{
  "mcpServers": {
    "cisa-kev": {
      "command": "npx",
      "args": ["@hrbrmstr/kev-mcp@latest"]
    }
}
```

or (if you cloned/built it locally)

```json
{
  "mcpServers": {
    "cisa-kev": {
      "command": "npx",
      "args": ["/path/to/build/index.js"]
    }
}
```

## Tools Reference

The server provides the following tools for interacting with the KEV catalog:

### Basic Data Retrieval

#### `get_kev_count`
Returns the total number of vulnerabilities in the KEV catalog.

**Parameters:** None

**Example Response:**
```json
"1366"
```

#### `get_kev_release_date`
Returns the release date of the current KEV catalog.

**Parameters:** None

**Example Response:**
```json
"2023-11-15"
```

#### `get_vulnerability_details`
Retrieves detailed information about a specific vulnerability by CVE ID.

**Parameters:**
- `cveId` (string): The CVE ID to lookup (e.g., "CVE-2021-34527")

**Example Response:**
```json
{
  "cveID": "CVE-2021-34527",
  "vendorProject": "Microsoft",
  "product": "Windows Print Spooler",
  "vulnerabilityName": "Microsoft Windows Print Spooler Remote Code Execution Vulnerability",
  "dateAdded": "2021-07-02",
  "shortDescription": "Microsoft Windows Print Spooler contains a remote code execution vulnerability...",
  "requiredAction": "Apply updates per vendor instructions.",
  "dueDate": "2021-07-16",
  "knownRansomwareCampaignUse": "Known",
  "notes": "This vulnerability has been exploited in the wild as part of ransomware attacks.",
  "cwes": ["CWE-269"]
}
```

### Lists and Collections

#### `get_kev_vendors`
Returns a list of all unique vendors in the KEV catalog.

**Parameters:** None

**Example Response:**
```json
["Adobe", "Apache", "Apple", "Atlassian", ...]
```

#### `get_kev_products`
Returns a list of all unique products in the KEV catalog.

**Parameters:** None

**Example Response:**
```json
["Access", "Acrobat Reader", "ActiveMQ", "Adaptive Security Appliance", ...]
```

#### `get_kev_cves`
Returns a list of all CVE IDs in the KEV catalog.

**Parameters:** None

**Example Response:**
```json
["CVE-2017-11882", "CVE-2018-13379", "CVE-2018-7600", ...]
```

#### `get_recent_vulnerabilities`
Returns vulnerabilities added to the KEV catalog within a specified time period.

**Parameters:**
- `days` (number, optional): Number of days to look back (default: 30)

**Example Response:**
```json
{
  "count": 15,
  "vulnerabilities": [
    {
      "cveID": "CVE-2023-12345",
      "vendorProject": "Example Vendor",
      ...
    },
    ...
  ]
}
```

#### `get_upcoming_due_dates`
Identifies vulnerabilities with upcoming remediation due dates.

**Parameters:**
- `days` (number, optional): Number of days to look ahead (default: 30)

**Example Response:**
```json
{
  "count": 8,
  "vulnerabilities": [
    {
      "cveID": "CVE-2023-67890",
      "vendorProject": "Example Vendor",
      "dueDate": "2023-12-15",
      ...
    },
    ...
  ]
}
```

### Search and Filtering

#### `search_kev`
Comprehensive search tool with multiple filtering options.

**Parameters:**
- `searchText` (string, optional): Text to search in vulnerability names, descriptions, and notes
- `ransomwareUse` (array of strings, optional): Filter by ransomware usage ("Known" or "Unknown")
- `cwes` (array of strings, optional): Filter by CWE identifiers
- `vendors` (array of strings, optional): Filter by vendor/project names
- `products` (array of strings, optional): Filter by product names
- `dateAddedStart` (string, optional): Start date for dateAdded range (YYYY-MM-DD)
- `dateAddedEnd` (string, optional): End date for dateAdded range (YYYY-MM-DD)
- `dateAdded` (array of strings, optional): Specific dateAdded values to match
- `dueDateStart` (string, optional): Start date for dueDate range (YYYY-MM-DD)
- `dueDateEnd` (string, optional): End date for dueDate range (YYYY-MM-DD)
- `dueDate` (array of strings, optional): Specific dueDate values to match

**Example Response:**
```json
{
  "count": 5,
  "vulnerabilities": [
    ...
  ]
}
```

#### `get_related_cves`
Finds vulnerabilities related to a specific vendor or product.

**Parameters:**
- `vendor` (string, optional): Vendor name to find related CVEs
- `product` (string, optional): Product name to find related CVEs
- `limit` (number, optional): Maximum number of results to return (default: 20)

**Note:** At least one of `vendor` or `product` must be provided.

**Example Response:**
```json
{
  "count": 12,
  "totalMatches": 24,
  "vulnerabilities": [
    ...
  ]
}
```

#### `search_by_cwe`
Locates vulnerabilities associated with a specific Common Weakness Enumeration (CWE).

**Parameters:**
- `cwe` (string): CWE identifier to search for (e.g., "CWE-79" or "79")

**Example Response:**
```json
{
  "count": 17,
  "cwe": "CWE-79",
  "vulnerabilities": [
    ...
  ]
}
```

### Statistical Analysis

#### `get_kev_statistics`
Provides statistical analysis of the KEV catalog.

**Parameters:** None

**Example Response:**
```json
{
  "totalVulnerabilities": 436,
  "topVendors": [
    {"vendor": "Microsoft", "count": 89},
    {"vendor": "Adobe", "count": 45},
    ...
  ],
  "ransomwareUsage": {
    "Known": 128,
    "Unknown": 308
  },
  "countByYear": {
    "2021": 168,
    "2022": 175,
    "2023": 93
  }
}
```

#### `get_cwe_statistics`
Provides statistical analysis of CWEs in the KEV catalog.

**Parameters:** None

**Example Response:**
```json
{
  "uniqueCweCount": 42,
  "topCwes": [
    {"cwe": "CWE-79", "count": 48},
    {"cwe": "CWE-787", "count": 37},
    ...
  ]
}
```

### Data Management

#### `force_refresh_kev_data`
Forces a refresh of the KEV data cache to ensure the latest information is available.

**Parameters:** None

**Example Response:**
```
KEV data successfully refreshed. Current catalog version: 2023.11.15, with 436 vulnerabilities.
```

## Project Structure

```
├── src/
│   ├── index.ts           # Main server entry point
│   ├── types.ts           # TypeScript interfaces
│   ├── utils.ts           # Utility functions and constants
│   └── tools/             # Individual tools implementation
│       ├── index.ts       # Tool registration
│       ├── getKevCount.ts # Count tool
│       ├── ...
├── build/                 # Compiled JavaScript files
├── package.json
└── README.md
```

## License

MIT
