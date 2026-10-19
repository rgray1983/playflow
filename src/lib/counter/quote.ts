import { type CommerceSettingsPayload } from "@/lib/commerce-settings";
import { FormError } from "@/lib/waivers/signing";
export type QuoteLine = {
    id: string;
    label: string;
    priceCents: number;
};
export type CounterQuote = {
    currency: "USD";
    lines: QuoteLine[];
    subtotalCents: number;
    taxCents: number;
    feeCents: number;
    totalCents: number;
    includedTaxCents: number;
    fees: {
        label: string;
        amountCents: number;
        taxCents: number;
    }[];
    taxRate: number;
    pricesIncludeTax: boolean;
    profile: string;
};
const MAX = 100000000;
export function cents(value: unknown) { const n = Number(value); if (!Number.isFinite(n) || n < 0 || n * 100 > MAX)
    throw new FormError("Price is outside the supported range."); return Math.round(n * 100); }
export function quoteCounter(lines: QuoteLine[], profile: string, settings: CommerceSettingsPayload): CounterQuote {
    if (!lines.length || lines.length > 100 || lines.some(l => !Number.isSafeInteger(l.priceCents) || l.priceCents < 0 || l.priceCents > MAX))
        throw new FormError("Choose valid sale items.");
    const taxProfile = settings.taxRules.profiles.find(p => p.key === profile);
    const rate = settings.taxRules.enabled ? (taxProfile ? (taxProfile.taxable ? taxProfile.rate : 0) : settings.taxRules.defaultRate) : 0;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100)
        throw new FormError("Review the tax rate in Commerce Settings.");
    const subtotal = lines.reduce((sum, l) => sum + l.priceCents, 0), included = settings.taxRules.pricesIncludeTax;
    const itemTax = Math.round(included ? subtotal - subtotal / (1 + rate / 100) : subtotal * rate / 100);
    const fees = settings.feeRules.enabled ? settings.feeRules.fees.filter(f => f.enabled).map(f => {
        if (!Number.isFinite(f.amount) || f.amount < 0 || f.type === "percent" && f.amount > 100)
            throw new FormError("Review the fee amounts in Commerce Settings.");
        const amountCents = f.type === "flat" ? cents(f.amount) : Math.round(subtotal * f.amount / 100);
        // Fees are added once per bill, not once per child. Fee tax uses the configured default rate.
        const feeRate = settings.taxRules.enabled && f.taxable ? settings.taxRules.defaultRate : 0;
        if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 100)
            throw new FormError("Review the default tax rate in Commerce Settings.");
        return { label: f.label, amountCents, taxCents: Math.round(included ? amountCents - amountCents / (1 + feeRate / 100) : amountCents * feeRate / 100) };
    }) : [];
    const feeCents = fees.reduce((s, f) => s + f.amountCents, 0), taxCents = included ? 0 : itemTax + fees.reduce((s, f) => s + f.taxCents, 0), totalCents = subtotal + feeCents + taxCents;
    if (!Number.isSafeInteger(totalCents) || totalCents > MAX)
        throw new FormError("Sale total is outside the supported range.");
    return { currency: "USD", lines, subtotalCents: subtotal, taxCents, feeCents, totalCents, includedTaxCents: included ? itemTax + fees.reduce((s, f) => s + f.taxCents, 0) : 0, fees, taxRate: rate, pricesIncludeTax: included, profile };
}
