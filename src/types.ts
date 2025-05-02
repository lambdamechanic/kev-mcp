// Define types for the KEV data structure
export interface Vulnerability {
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

export interface KevData {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: Vulnerability[];
}

// Cache management
export interface CachedData {
  data: KevData;
  timestamp: number;
}

// Search parameters interface
export interface SearchKevParams {
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