import { KevData, CachedData } from "./types.js";
import fetch from "node-fetch";

// Constants
export const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
export const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cache storage
let cachedData: CachedData | null = null;

// Function to explicitly set the cached data (useful for forced refreshes)
export function setCachedData(data: CachedData | null) {
  cachedData = data;
}

// Function to fetch and cache KEV data
export async function getKevData(): Promise<KevData> {
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
export function isValidDateFormat(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  if (!isValidDateFormat(date) || !isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
    return false;
  }

  const dateObj = new Date(date);
  const startObj = new Date(startDate);
  const endObj = new Date(endDate);

  return dateObj >= startObj && dateObj <= endObj;
}