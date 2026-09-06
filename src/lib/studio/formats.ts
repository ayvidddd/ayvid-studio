export interface CampaignFormat {
  platform: "META" | "TIKTOK" | "LINKEDIN" | "GOOGLE_DISPLAY";
  label: string;
  width: number;
  height: number;
}

/** The standard static-format set a launch campaign brief maps to, per the product spec. */
export const CAMPAIGN_FORMATS: readonly CampaignFormat[] = [
  { platform: "META", label: "Meta Square 1080x1080", width: 1080, height: 1080 },
  { platform: "TIKTOK", label: "TikTok / Story 1080x1920", width: 1080, height: 1920 },
  { platform: "LINKEDIN", label: "LinkedIn 1200x628", width: 1200, height: 628 },
  { platform: "GOOGLE_DISPLAY", label: "Google Display 300x250", width: 300, height: 250 },
];
