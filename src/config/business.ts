/**
 * Centralized business configuration for the Savory backend.
 * BUG 21: All business rules (tax rate, currency, etc.) live here — not hardcoded in services.
 * 
 * In the future this can be loaded from restaurant settings in the DB,
 * but for now it's a single source of truth that replaces all hardcoded values.
 */

// Default tax rate (fraction, not percentage) — 5% GST
export const DEFAULT_TAX_RATE = 0.05;

// Currency
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_CURRENCY_SYMBOL = '₹';

// Refund window (hours)
export const REFUND_WINDOW_HOURS = 24;

// Auto-clean fallback timeout (ms)
export const TABLE_AUTO_CLEAN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
