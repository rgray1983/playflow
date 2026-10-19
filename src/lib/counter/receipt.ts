import type { CounterQuote } from "./quote";
export type CounterReceipt = {
    billReferences?: string[];
    id: string;
    kind: string;
    status: string;
    totalCents: number;
    quoteSnapshot: CounterQuote;
    businessSnapshot: {
        name: string;
        phone?: string | null;
        email?: string | null;
        address1?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
        timezone: string;
        footer?: string;
        policy?: string;
    };
    createdAt: string;
    voidReason?: string | null;
    payments: {
        id: string;
        amountCents: number;
        methodLabel: string;
        collectedAt: string;
        staffName: string;
    }[];
};
export const dollars = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const paidCents = (sale: CounterReceipt) => sale.payments.reduce((sum, p) => sum + p.amountCents, 0);
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function receiptHTML(sale: CounterReceipt) {
    const q = sale.quoteSnapshot, b = sale.businessSnapshot, date = (value: string) => new Date(value).toLocaleString("en-US", { timeZone: b.timezone, dateStyle: "medium", timeStyle: "short" });
    const row = (label: unknown, value: unknown) => `<tr><td>${escape(label)}</td><td>${escape(value)}</td></tr>`;
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receipt ${escape(sale.id)}</title><style>body{font:16px system-ui;color:#17212b;max-width:720px;margin:40px auto;padding:24px}table{width:100%;border-collapse:collapse}td{padding:10px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}p{white-space:pre-wrap;overflow-wrap:anywhere}@media print{body{margin:0}}</style><h1>${escape(b.name)}</h1><p>${escape([b.address1, [b.city, b.state, b.zip].filter(Boolean).join(" "), b.phone, b.email].filter(Boolean).join("\n"))}</p><h2>${sale.status === "VOID" ? "Voided bill" : sale.status === "PAID" ? "Receipt" : "Bill / payment record"}</h2><p>Reference: ${escape(sale.id)}\nCreated: ${escape(date(sale.createdAt))}\nStatus: ${escape(sale.status)}</p>${sale.billReferences?.length?`<p>Bills: ${sale.billReferences.map(escape).join(", ")}</p>`:""}<table>${q.lines.map(l => row(l.label, dollars(l.priceCents))).join("")}${row("Items", dollars(q.subtotalCents))}${q.fees.map(f => row(f.label, dollars(f.amountCents))).join("")}${row("Added tax", dollars(q.taxCents))}${q.includedTaxCents ? row("Tax included in prices", dollars(q.includedTaxCents)) : ""}${row("Total", dollars(q.totalCents))}${row("Recorded paid", dollars(paidCents(sale)))}${row("Remaining due", sale.status === "VOID" ? "Voided" : dollars(Math.max(0, sale.totalCents - paidCents(sale))))}</table><h3>Recorded payments</h3>${sale.payments.length ? sale.payments.map(p => `<p>${escape(date(p.collectedAt))} · ${escape(p.methodLabel)} · ${escape(dollars(p.amountCents))}\nReference: ${escape(p.id)}\nRecorded by ${escape(p.staffName)}</p>`).join("") : "<p>No money has been recorded as collected.</p>"}${sale.status === "VOID" ? `<p>Void reason: ${escape(sale.voidReason)}</p>` : ""}<p>Payments shown were recorded by venue staff as collected separately. This receipt does not process a card or verify an external processor transaction.</p><p>${escape(b.footer)}</p><p>${escape(b.policy)}</p></html>`;
}
export function downloadReceipt(sale: CounterReceipt) { const blob = new Blob([receiptHTML(sale)], { type: "text/html;charset=utf-8" }), url = URL.createObjectURL(blob), anchor = document.createElement("a"); anchor.href = url; anchor.download = `receipt-${sale.id.replace(/[^A-Za-z0-9-]/g, "")}.html`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
