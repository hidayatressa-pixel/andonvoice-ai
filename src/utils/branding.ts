import { BrandConfig } from "../types";
import { sanitizeBrandConfig, safeLocalStorageSet, safeLocalStorageGet } from "./sanitizer";

const BRANDING_STORAGE_KEY = "andon_smart_factory_branding_v1";

export const DEFAULT_BRANDING: BrandConfig = {
  mode: "demo",
  customLogoUrl: "",
  customLogoText: "assy",
  customAppName: import.meta.env.VITE_APP_NAME || "ANDON SMART FACTORY",
  customAppSubtitle: "Live Shop Floor & Andon Monitor",
  logoHeight: 34,
};

/** Decode legacy HTML entities that older sanitizer versions stored repeatedly. */
function decodeLegacyEntities(value: unknown): string {
  let text = typeof value === "string" ? value : "";
  for (let i = 0; i < 10; i += 1) {
    const decoded = text
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;|&#39;/gi, "'")
      .replace(/&#x60;/gi, "`");
    if (decoded === text) break;
    text = decoded;
  }
  return text;
}

/**
 * Load current branding configuration.
 * Checks localStorage first, then environment variables, then falls back to default demo.
 */
export function loadSavedBranding(): BrandConfig {
  if (typeof window === "undefined") return DEFAULT_BRANDING;
  try {
    const saved = safeLocalStorageGet(BRANDING_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const sanitized = sanitizeBrandConfig({
        ...DEFAULT_BRANDING,
        ...parsed,
        customLogoText: decodeLegacyEntities(parsed.customLogoText),
        customAppName: decodeLegacyEntities(parsed.customAppName) || import.meta.env.VITE_APP_NAME || DEFAULT_BRANDING.customAppName,
        customAppSubtitle: decodeLegacyEntities(parsed.customAppSubtitle) || DEFAULT_BRANDING.customAppSubtitle,
      });

      // Persist the migrated value so old &amp;amp; data is repaired once.
      safeLocalStorageSet(BRANDING_STORAGE_KEY, JSON.stringify(sanitized));
      return sanitized;
    }
  } catch (e) {
    console.error("Failed to load branding from storage:", e);
  }

  // Check if .env defines an initial logo URL
  const envLogoUrl = import.meta.env.VITE_APP_LOGO_URL;
  if (envLogoUrl && envLogoUrl.trim() !== "") {
    return sanitizeBrandConfig({
      ...DEFAULT_BRANDING,
      mode: "custom_image",
      customLogoUrl: envLogoUrl.trim(),
    });
  }

  return DEFAULT_BRANDING;
}

/**
 * Persist branding configuration to localStorage and notify all components.
 */
export function saveBrandingToStorage(config: BrandConfig): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = sanitizeBrandConfig({
      ...config,
      customLogoText: decodeLegacyEntities(config.customLogoText),
      customAppName: decodeLegacyEntities(config.customAppName),
      customAppSubtitle: decodeLegacyEntities(config.customAppSubtitle),
    });
    safeLocalStorageSet(BRANDING_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent("andon_brand_change", { detail: sanitized }));
  } catch (e) {
    console.error("Failed to save branding to storage:", e);
  }
}

/**
 * Reset branding to standard default demo ASSY logo.
 */
export function resetBrandingToDefault(): BrandConfig {
  const resetConfig: BrandConfig = {
    ...DEFAULT_BRANDING,
    mode: "demo",
    customLogoUrl: "",
  };
  saveBrandingToStorage(resetConfig);
  return resetConfig;
}
