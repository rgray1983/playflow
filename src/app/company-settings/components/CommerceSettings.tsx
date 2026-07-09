"use client";

import { useEffect, useState } from "react";
import type { CommerceSettingsPayload, FeeRule, PaymentMethodRule, TaxProfileRule } from "@/lib/commerce-settings";
import { defaultCommerceSettings } from "@/lib/commerce-settings";
import { Message, SelectField, SettingsSection, TextAreaField, TextField } from "./SettingsPrimitives";

const commerceTabs = [
  "Payment Methods",
  "Deposits",
  "Taxes",
  "Fees",
  "Tips",
  "Discounts",
  "Refunds",
  "Receipts",
  "Checkout Rules",
  "Processor",
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[10px] bg-white px-4 py-3 text-sm font-semibold text-[#1E293B]">
      <span>{label}</span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <TextField
      label={label}
      value={String(value)}
      onChange={(nextValue) => onChange(Number(nextValue) || 0)}
      type="number"
    />
  );
}

function updateListItem<T>(items: T[], index: number, changes: Partial<T>) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item));
}

function parseNumberList(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0);
}

export default function CommerceSettings() {
  const [settings, setSettings] = useState<CommerceSettingsPayload>(defaultCommerceSettings);
  const [activeTab, setActiveTab] = useState(commerceTabs[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCommerceSettings() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/company-settings/commerce");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load commerce settings.");
      setSettings({ ...defaultCommerceSettings, ...data.commerceSettings });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load commerce settings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCommerceSettings();
  }, []);

  async function saveCommerceSettings() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/company-settings/commerce", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save commerce settings.");
      setSettings({ ...defaultCommerceSettings, ...data.commerceSettings });
      setMessage("Commerce settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save commerce settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function setPaymentMethod(index: number, changes: Partial<PaymentMethodRule>) {
    setSettings((current) => ({
      ...current,
      paymentMethods: updateListItem(current.paymentMethods, index, changes),
    }));
  }

  function setTaxProfile(index: number, changes: Partial<TaxProfileRule>) {
    setSettings((current) => ({
      ...current,
      taxRules: {
        ...current.taxRules,
        profiles: updateListItem(current.taxRules.profiles, index, changes),
      },
    }));
  }

  function setFee(index: number, changes: Partial<FeeRule>) {
    setSettings((current) => ({
      ...current,
      feeRules: {
        ...current.feeRules,
        fees: updateListItem(current.feeRules.fees, index, changes),
      },
    }));
  }

  function addFee() {
    setSettings((current) => ({
      ...current,
      feeRules: {
        ...current.feeRules,
        fees: [
          ...current.feeRules.fees,
          {
            id: `fee-${Date.now()}`,
            label: "New Fee",
            type: "flat",
            amount: 0,
            taxable: false,
            visibleToCustomer: true,
            enabled: true,
          },
        ],
      },
    }));
  }

  function removeFee(index: number) {
    setSettings((current) => ({
      ...current,
      feeRules: {
        ...current.feeRules,
        fees: current.feeRules.fees.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }

  function renderActiveTab() {
    if (activeTab === "Payment Methods") {
      return (
        <SettingsSection title="Payment Methods" description="Choose which tender types can be used for deposits, balances, and refunds.">
          <div className="space-y-3">
            {settings.paymentMethods.map((method, index) => (
              <div key={method.key} className="rounded-[10px] bg-white p-4">
                <div className="grid grid-cols-[1fr_180px] gap-3">
                  <TextField label="Display Name" value={method.label} onChange={(label) => setPaymentMethod(index, { label })} />
                  <Toggle label="Enabled" checked={method.enabled} onChange={(enabled) => setPaymentMethod(index, { enabled })} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Toggle label="Allow Deposits" checked={method.allowDeposits} onChange={(allowDeposits) => setPaymentMethod(index, { allowDeposits })} />
                  <Toggle label="Allow Balance Payments" checked={method.allowBalances} onChange={(allowBalances) => setPaymentMethod(index, { allowBalances })} />
                  <Toggle label="Allow Refunds" checked={method.allowRefunds} onChange={(allowRefunds) => setPaymentMethod(index, { allowRefunds })} />
                  <Toggle label="Requires Note" checked={method.requiresNote} onChange={(requiresNote) => setPaymentMethod(index, { requiresNote })} />
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>
      );
    }

    if (activeTab === "Deposits") {
      return (
        <SettingsSection title="Deposits" description="Control how deposits are required, captured, refunded, and applied to balances.">
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Deposits Enabled" checked={settings.depositRules.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, enabled } }))} />
            <Toggle label="Required by Default" checked={settings.depositRules.requiredByDefault} onChange={(requiredByDefault) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, requiredByDefault } }))} />
            <SelectField label="Default Type" value={settings.depositRules.defaultType} onChange={(defaultType) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, defaultType: defaultType as "flat" | "percent" } }))} options={[{ label: "Flat amount", value: "flat" }, { label: "Percentage", value: "percent" }]} />
            <SelectField label="Capture Mode" value={settings.depositRules.captureMode} onChange={(captureMode) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, captureMode: captureMode as CommerceSettingsPayload["depositRules"]["captureMode"] } }))} options={[{ label: "Authorize only", value: "authorize_only" }, { label: "Capture immediately", value: "capture_immediately" }, { label: "Capture on confirmation", value: "on_confirmation" }, { label: "Capture days before event", value: "days_before_event" }]} />
            <NumberField label="Flat Amount" value={settings.depositRules.flatAmount} onChange={(flatAmount) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, flatAmount } }))} />
            <NumberField label="Percent Amount" value={settings.depositRules.percentAmount} onChange={(percentAmount) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, percentAmount } }))} />
            <NumberField label="Days Before Event" value={settings.depositRules.captureDaysBeforeEvent} onChange={(captureDaysBeforeEvent) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, captureDaysBeforeEvent } }))} />
            <NumberField label="Refund Window Hours" value={settings.depositRules.refundWindowHours} onChange={(refundWindowHours) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, refundWindowHours } }))} />
            <Toggle label="Refundable" checked={settings.depositRules.refundable} onChange={(refundable) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, refundable } }))} />
            <Toggle label="Apply Deposit to Balance" checked={settings.depositRules.applyDepositToBalance} onChange={(applyDepositToBalance) => setSettings((current) => ({ ...current, depositRules: { ...current.depositRules, applyDepositToBalance } }))} />
          </div>
        </SettingsSection>
      );
    }

    if (activeTab === "Taxes") {
      return (
        <SettingsSection title="Taxes" description="Set default tax behavior and profiles for services, packages, add-ons, retail, memberships, and admissions.">
          <div className="mb-3 grid grid-cols-3 gap-3">
            <Toggle label="Tax Enabled" checked={settings.taxRules.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, taxRules: { ...current.taxRules, enabled } }))} />
            <NumberField label="Default Rate" value={settings.taxRules.defaultRate} onChange={(defaultRate) => setSettings((current) => ({ ...current, taxRules: { ...current.taxRules, defaultRate } }))} />
            <Toggle label="Prices Include Tax" checked={settings.taxRules.pricesIncludeTax} onChange={(pricesIncludeTax) => setSettings((current) => ({ ...current, taxRules: { ...current.taxRules, pricesIncludeTax } }))} />
          </div>
          <div className="space-y-2">
            {settings.taxRules.profiles.map((profile, index) => (
              <div key={profile.key} className="grid grid-cols-[1fr_160px_160px] gap-3 rounded-[10px] bg-white p-3">
                <TextField label="Profile" value={profile.label} onChange={(label) => setTaxProfile(index, { label })} />
                <NumberField label="Rate" value={profile.rate} onChange={(rate) => setTaxProfile(index, { rate })} />
                <Toggle label="Taxable" checked={profile.taxable} onChange={(taxable) => setTaxProfile(index, { taxable })} />
              </div>
            ))}
          </div>
        </SettingsSection>
      );
    }

    if (activeTab === "Fees") {
      return (
        <SettingsSection title="Fees" description="Configure service fees, convenience fees, cleaning fees, late fees, or other checkout charges." action={<button onClick={addFee} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">+ Add Fee</button>}>
          <div className="mb-3">
            <Toggle label="Fees Enabled" checked={settings.feeRules.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, feeRules: { ...current.feeRules, enabled } }))} />
          </div>
          {settings.feeRules.fees.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center">
              <p className="font-semibold text-[#1E293B]">No fees configured.</p>
              <p className="mt-2 text-sm text-[#6B7280]">Add fees only when the business needs them at checkout.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.feeRules.fees.map((fee, index) => (
                <div key={fee.id} className="rounded-[10px] bg-white p-4">
                  <div className="grid grid-cols-[1fr_150px_140px_auto] gap-3">
                    <TextField label="Label" value={fee.label} onChange={(label) => setFee(index, { label })} />
                    <SelectField label="Type" value={fee.type} onChange={(type) => setFee(index, { type: type as FeeRule["type"] })} options={[{ label: "Flat", value: "flat" }, { label: "Percent", value: "percent" }]} />
                    <NumberField label="Amount" value={fee.amount} onChange={(amount) => setFee(index, { amount })} />
                    <button onClick={() => removeFee(index)} className="self-end rounded-[8px] bg-[#FFE0E9] px-3 py-3 text-xs font-semibold text-[#9F1239]">Delete</button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <Toggle label="Enabled" checked={fee.enabled} onChange={(enabled) => setFee(index, { enabled })} />
                    <Toggle label="Taxable" checked={fee.taxable} onChange={(taxable) => setFee(index, { taxable })} />
                    <Toggle label="Visible to Customer" checked={fee.visibleToCustomer} onChange={(visibleToCustomer) => setFee(index, { visibleToCustomer })} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SettingsSection>
      );
    }

    if (activeTab === "Tips") {
      return (
        <SettingsSection title="Tips" description="Control whether tips appear at checkout and which suggested amounts are offered.">
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Tips Enabled" checked={settings.tipRules.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, tipRules: { ...current.tipRules, enabled } }))} />
            <Toggle label="Allow Custom Tip" checked={settings.tipRules.allowCustomTip} onChange={(allowCustomTip) => setSettings((current) => ({ ...current, tipRules: { ...current.tipRules, allowCustomTip } }))} />
            <TextField label="Suggested Percentages" value={settings.tipRules.suggestedPercentages.join(", ")} onChange={(value) => setSettings((current) => ({ ...current, tipRules: { ...current.tipRules, suggestedPercentages: parseNumberList(value) } }))} placeholder="10, 15, 20" />
            <TextField label="Suggested Flat Amounts" value={settings.tipRules.suggestedAmounts.join(", ")} onChange={(value) => setSettings((current) => ({ ...current, tipRules: { ...current.tipRules, suggestedAmounts: parseNumberList(value) } }))} placeholder="5, 10, 20" />
            <Toggle label="Apply Before Tax" checked={settings.tipRules.applyBeforeTax} onChange={(applyBeforeTax) => setSettings((current) => ({ ...current, tipRules: { ...current.tipRules, applyBeforeTax } }))} />
            <SelectField label="Tip Mode" value={settings.tipRules.tipMode} onChange={(tipMode) => setSettings((current) => ({ ...current, tipRules: { ...current.tipRules, tipMode: tipMode as "pooled" | "assigned" } }))} options={[{ label: "Pooled", value: "pooled" }, { label: "Assigned", value: "assigned" }]} />
          </div>
        </SettingsSection>
      );
    }

    if (activeTab === "Discounts") {
      return (
        <SettingsSection title="Discounts" description="Define which discount types staff can apply and when approval is needed.">
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Discounts Enabled" checked={settings.discountRules.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, discountRules: { ...current.discountRules, enabled } }))} />
            <Toggle label="Require Reason" checked={settings.discountRules.requireReason} onChange={(requireReason) => setSettings((current) => ({ ...current, discountRules: { ...current.discountRules, requireReason } }))} />
            <Toggle label="Manager Approval Required" checked={settings.discountRules.requireManagerApproval} onChange={(requireManagerApproval) => setSettings((current) => ({ ...current, discountRules: { ...current.discountRules, requireManagerApproval } }))} />
            <Toggle label="Allow Percent Discount" checked={settings.discountRules.allowPercentDiscount} onChange={(allowPercentDiscount) => setSettings((current) => ({ ...current, discountRules: { ...current.discountRules, allowPercentDiscount } }))} />
            <Toggle label="Allow Flat Discount" checked={settings.discountRules.allowFlatDiscount} onChange={(allowFlatDiscount) => setSettings((current) => ({ ...current, discountRules: { ...current.discountRules, allowFlatDiscount } }))} />
            <Toggle label="Allow Comp" checked={settings.discountRules.allowComp} onChange={(allowComp) => setSettings((current) => ({ ...current, discountRules: { ...current.discountRules, allowComp } }))} />
          </div>
        </SettingsSection>
      );
    }

    if (activeTab === "Refunds") {
      return (
        <SettingsSection title="Refunds" description="Control full refunds, partial refunds, store credit, and approval requirements.">
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Refunds Enabled" checked={settings.refundRules.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, refundRules: { ...current.refundRules, enabled } }))} />
            <Toggle label="Allow Full Refund" checked={settings.refundRules.allowFullRefund} onChange={(allowFullRefund) => setSettings((current) => ({ ...current, refundRules: { ...current.refundRules, allowFullRefund } }))} />
            <Toggle label="Allow Partial Refund" checked={settings.refundRules.allowPartialRefund} onChange={(allowPartialRefund) => setSettings((current) => ({ ...current, refundRules: { ...current.refundRules, allowPartialRefund } }))} />
            <Toggle label="Allow Store Credit" checked={settings.refundRules.allowStoreCredit} onChange={(allowStoreCredit) => setSettings((current) => ({ ...current, refundRules: { ...current.refundRules, allowStoreCredit } }))} />
            <Toggle label="Require Reason" checked={settings.refundRules.requireReason} onChange={(requireReason) => setSettings((current) => ({ ...current, refundRules: { ...current.refundRules, requireReason } }))} />
            <Toggle label="Manager Approval Required" checked={settings.refundRules.requireManagerApproval} onChange={(requireManagerApproval) => setSettings((current) => ({ ...current, refundRules: { ...current.refundRules, requireManagerApproval } }))} />
          </div>
        </SettingsSection>
      );
    }

    if (activeTab === "Receipts") {
      return (
        <SettingsSection title="Receipts" description="Set what appears on receipts and which delivery options are enabled.">
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Show Logo" checked={settings.receiptRules.showLogo} onChange={(showLogo) => setSettings((current) => ({ ...current, receiptRules: { ...current.receiptRules, showLogo } }))} />
            <Toggle label="Show Party Details" checked={settings.receiptRules.showPartyDetails} onChange={(showPartyDetails) => setSettings((current) => ({ ...current, receiptRules: { ...current.receiptRules, showPartyDetails } }))} />
            <Toggle label="Show Guest of Honor" checked={settings.receiptRules.showGuestOfHonor} onChange={(showGuestOfHonor) => setSettings((current) => ({ ...current, receiptRules: { ...current.receiptRules, showGuestOfHonor } }))} />
            <Toggle label="Email Receipt Enabled" checked={settings.receiptRules.emailReceiptEnabled} onChange={(emailReceiptEnabled) => setSettings((current) => ({ ...current, receiptRules: { ...current.receiptRules, emailReceiptEnabled } }))} />
            <Toggle label="Print Receipt Enabled" checked={settings.receiptRules.printReceiptEnabled} onChange={(printReceiptEnabled) => setSettings((current) => ({ ...current, receiptRules: { ...current.receiptRules, printReceiptEnabled } }))} />
            <Toggle label="SMS Receipt Enabled" checked={settings.receiptRules.smsReceiptEnabled} onChange={(smsReceiptEnabled) => setSettings((current) => ({ ...current, receiptRules: { ...current.receiptRules, smsReceiptEnabled } }))} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <TextAreaField label="Footer Text" value={settings.receiptRules.footerText} onChange={(footerText) => setSettings((current) => ({ ...current, receiptRules: { ...current.receiptRules, footerText } }))} />
            <TextAreaField label="Refund Policy Text" value={settings.receiptRules.refundPolicyText} onChange={(refundPolicyText) => setSettings((current) => ({ ...current, receiptRules: { ...current.receiptRules, refundPolicyText } }))} />
          </div>
        </SettingsSection>
      );
    }

    if (activeTab === "Checkout Rules") {
      return (
        <SettingsSection title="Checkout Rules" description="Set payment completion, split payment, overpayment, and approval rules for checkout.">
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Require Zero Balance Before Complete" checked={settings.checkoutRules.requireZeroBalanceBeforeComplete} onChange={(requireZeroBalanceBeforeComplete) => setSettings((current) => ({ ...current, checkoutRules: { ...current.checkoutRules, requireZeroBalanceBeforeComplete } }))} />
            <Toggle label="Allow Partial Payments" checked={settings.checkoutRules.allowPartialPayments} onChange={(allowPartialPayments) => setSettings((current) => ({ ...current, checkoutRules: { ...current.checkoutRules, allowPartialPayments } }))} />
            <Toggle label="Allow Split Payments" checked={settings.checkoutRules.allowSplitPayments} onChange={(allowSplitPayments) => setSettings((current) => ({ ...current, checkoutRules: { ...current.checkoutRules, allowSplitPayments } }))} />
            <Toggle label="Allow Overpayment" checked={settings.checkoutRules.allowOverpayment} onChange={(allowOverpayment) => setSettings((current) => ({ ...current, checkoutRules: { ...current.checkoutRules, allowOverpayment } }))} />
            <Toggle label="Auto-Mark Paid When Balance Is Zero" checked={settings.checkoutRules.autoMarkPaidWhenBalanceIsZero} onChange={(autoMarkPaidWhenBalanceIsZero) => setSettings((current) => ({ ...current, checkoutRules: { ...current.checkoutRules, autoMarkPaidWhenBalanceIsZero } }))} />
            <Toggle label="Manager Approval for Comps" checked={settings.checkoutRules.requireManagerApprovalForComp} onChange={(requireManagerApprovalForComp) => setSettings((current) => ({ ...current, checkoutRules: { ...current.checkoutRules, requireManagerApprovalForComp } }))} />
            <Toggle label="Manager Approval for Refunds" checked={settings.checkoutRules.requireManagerApprovalForRefund} onChange={(requireManagerApprovalForRefund) => setSettings((current) => ({ ...current, checkoutRules: { ...current.checkoutRules, requireManagerApprovalForRefund } }))} />
          </div>
        </SettingsSection>
      );
    }

    return (
      <SettingsSection title="Processor" description="Choose the future payment processor target. No external processor connection is wired in V1.">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Provider" value={settings.processorRules.provider} onChange={(provider) => setSettings((current) => ({ ...current, processorRules: { ...current.processorRules, provider: provider as CommerceSettingsPayload["processorRules"]["provider"], connected: false } }))} options={[{ label: "None", value: "none" }, { label: "Square", value: "square" }, { label: "Stripe", value: "stripe" }, { label: "Clover", value: "clover" }]} />
          <SelectField label="Mode" value={settings.processorRules.mode} onChange={(mode) => setSettings((current) => ({ ...current, processorRules: { ...current.processorRules, mode: mode as "sandbox" | "live" } }))} options={[{ label: "Sandbox", value: "sandbox" }, { label: "Live", value: "live" }]} />
          <TextField label="Account Label" value={settings.processorRules.accountLabel} onChange={(accountLabel) => setSettings((current) => ({ ...current, processorRules: { ...current.processorRules, accountLabel } }))} placeholder="Optional internal label" />
          <div className="rounded-[10px] bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Connection</p>
            <p className="mt-2 text-sm font-semibold text-[#1E293B]">{settings.processorRules.connected ? "Connected" : "Not connected in V1"}</p>
          </div>
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Commerce"
      description="Configure how this tenant collects, records, refunds, and reports money across PlayFlow."
      action={<button onClick={saveCommerceSettings} disabled={isSaving || isLoading} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save Commerce"}</button>}
    >
      <Message message={message} />
      {isLoading ? (
        <div className="rounded-[10px] bg-white/70 p-6 text-center">
          <p className="font-semibold text-[#1E293B]">Loading commerce settings...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-[10px] bg-white p-3">
            {commerceTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-[8px] px-3 py-2 text-xs font-semibold transition ${activeTab === tab ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#5B6270] hover:text-[#111827]"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          {renderActiveTab()}
        </div>
      )}
    </SettingsSection>
  );
}
