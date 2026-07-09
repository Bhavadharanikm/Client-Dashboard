import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

export const GOOGLE_SHEETS_PERFORMANCE_ID = process.env.GOOGLE_SHEETS_PERFORMANCE_ID!;
export const GOOGLE_SHEETS_ADS_ROI_ID = process.env.GOOGLE_SHEETS_ADS_ROI_ID!;

/**
 * Server-only, read-only Google Sheets client authenticated as the service
 * account (same credentials/scope the old Python pipeline used). Never
 * import this from a "use client" file or anything reachable from one —
 * GOOGLE_PRIVATE_KEY must never reach the browser bundle.
 */
export function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY are not configured.");
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  return google.sheets({ version: "v4", auth });
}
