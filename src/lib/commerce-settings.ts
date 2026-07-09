export type PaymentMethodRule = {
  key: string;
  label: string;
  enabled: boolean;
  allowDeposits: boolean;
  allowBalances: boolean;
  allowRefunds: boolean;
  requiresNote: boolean;
};

export type FeeRule = {
  id: string;
  label: string;
  type: "flat" | "percent";
  amount: number;
  taxable: boolean;
  visibleToCustomer: boolean;
  enabled: boolean;
};

export type TaxProfileRule = {
  key: string;
  label: string;
  taxable: boolean;
  rate: number;
};

export type CommerceSettingsPayload = {
  paymentMethods: PaymentMethodRule[];
  depositRules: {
    enabled: boolean;
    requiredByDefault: boolean;
    defaultType: "flat" | "percent";
    flatAmount: number;
    percentAmount: number;
    captureMode: "authorize_only" | "capture_immediately" | "on_confirmation" | "days_before_event";
    captureDaysBeforeEvent: number;
    refundable: boolean;
    refundWindowHours: number;
    applyDepositToBalance: boolean;
  };
  taxRules: {
    enabled: boolean;
    defaultRate: number;
    pricesIncludeTax: boolean;
    profiles: TaxProfileRule[];
  };
  feeRules: {
    enabled: boolean;
    fees: FeeRule[];
  };
  tipRules: {
    enabled: boolean;
    allowCustomTip: boolean;
    suggestedPercentages: number[];
    suggestedAmounts: number[];
    applyBeforeTax: boolean;
    tipMode: "pooled" | "assigned";
  };
  discountRules: {
    enabled: boolean;
    requireReason: boolean;
    requireManagerApproval: boolean;
    allowPercentDiscount: boolean;
    allowFlatDiscount: boolean;
    allowComp: boolean;
  };
  refundRules: {
    enabled: boolean;
    allowFullRefund: boolean;
    allowPartialRefund: boolean;
    allowStoreCredit: boolean;
    requireReason: boolean;
    requireManagerApproval: boolean;
  };
  receiptRules: {
    showLogo: boolean;
    showPartyDetails: boolean;
    showGuestOfHonor: boolean;
    footerText: string;
    refundPolicyText: string;
    emailReceiptEnabled: boolean;
    printReceiptEnabled: boolean;
    smsReceiptEnabled: boolean;
  };
  checkoutRules: {
    requireZeroBalanceBeforeComplete: boolean;
    allowPartialPayments: boolean;
    allowSplitPayments: boolean;
    allowOverpayment: boolean;
    autoMarkPaidWhenBalanceIsZero: boolean;
    requireManagerApprovalForComp: boolean;
    requireManagerApprovalForRefund: boolean;
  };
  processorRules: {
    provider: "none" | "square" | "stripe" | "clover";
    connected: boolean;
    mode: "sandbox" | "live";
    accountLabel: string;
  };
};

export const defaultCommerceSettings: CommerceSettingsPayload = {
  paymentMethods: [
    { key: "cash", label: "Cash", enabled: true, allowDeposits: true, allowBalances: true, allowRefunds: true, requiresNote: false },
    { key: "card", label: "Card", enabled: true, allowDeposits: true, allowBalances: true, allowRefunds: true, requiresNote: false },
    { key: "other", label: "Other", enabled: true, allowDeposits: false, allowBalances: true, allowRefunds: false, requiresNote: true },
  ],
  depositRules: {
    enabled: true,
    requiredByDefault: true,
    defaultType: "flat",
    flatAmount: 100,
    percentAmount: 0,
    captureMode: "on_confirmation",
    captureDaysBeforeEvent: 0,
    refundable: true,
    refundWindowHours: 48,
    applyDepositToBalance: true,
  },
  taxRules: {
    enabled: false,
    defaultRate: 0,
    pricesIncludeTax: false,
    profiles: [
      { key: "services", label: "Services", taxable: false, rate: 0 },
      { key: "party_packages", label: "Party Packages", taxable: false, rate: 0 },
      { key: "add_ons", label: "Add-ons", taxable: false, rate: 0 },
      { key: "retail", label: "Retail", taxable: true, rate: 0 },
      { key: "memberships", label: "Memberships", taxable: false, rate: 0 },
      { key: "admissions", label: "Admissions", taxable: false, rate: 0 },
    ],
  },
  feeRules: {
    enabled: false,
    fees: [],
  },
  tipRules: {
    enabled: false,
    allowCustomTip: true,
    suggestedPercentages: [10, 15, 20],
    suggestedAmounts: [],
    applyBeforeTax: true,
    tipMode: "pooled",
  },
  discountRules: {
    enabled: true,
    requireReason: true,
    requireManagerApproval: false,
    allowPercentDiscount: true,
    allowFlatDiscount: true,
    allowComp: true,
  },
  refundRules: {
    enabled: true,
    allowFullRefund: true,
    allowPartialRefund: true,
    allowStoreCredit: true,
    requireReason: true,
    requireManagerApproval: true,
  },
  receiptRules: {
    showLogo: true,
    showPartyDetails: true,
    showGuestOfHonor: true,
    footerText: "Thank you for visiting!",
    refundPolicyText: "Refunds and credits are subject to company policy.",
    emailReceiptEnabled: true,
    printReceiptEnabled: false,
    smsReceiptEnabled: false,
  },
  checkoutRules: {
    requireZeroBalanceBeforeComplete: false,
    allowPartialPayments: true,
    allowSplitPayments: true,
    allowOverpayment: false,
    autoMarkPaidWhenBalanceIsZero: true,
    requireManagerApprovalForComp: true,
    requireManagerApprovalForRefund: true,
  },
  processorRules: {
    provider: "none",
    connected: false,
    mode: "sandbox",
    accountLabel: "",
  },
};

const captureModes = ["authorize_only", "capture_immediately", "on_confirmation", "days_before_event"] as const;
const discountTypes = ["flat", "percent"] as const;
const processorProviders = ["none", "square", "stripe", "clover"] as const;
const processorModes = ["sandbox", "live"] as const;
const tipModes = ["pooled", "assigned"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function arrayOfNumbers(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is number => typeof item === "number" && Number.isFinite(item)).map((item) => Math.max(0, item));
}

function pickValue<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === "string" && values.includes(value) ? value : fallback;
}

export function normalizeCommerceSettings(input: unknown): CommerceSettingsPayload {
  if (!isRecord(input)) {
    throw new Error("Commerce settings payload is required.");
  }

  const defaults = defaultCommerceSettings;
  const depositRules = isRecord(input.depositRules) ? input.depositRules : {};
  const taxRules = isRecord(input.taxRules) ? input.taxRules : {};
  const feeRules = isRecord(input.feeRules) ? input.feeRules : {};
  const tipRules = isRecord(input.tipRules) ? input.tipRules : {};
  const discountRules = isRecord(input.discountRules) ? input.discountRules : {};
  const refundRules = isRecord(input.refundRules) ? input.refundRules : {};
  const receiptRules = isRecord(input.receiptRules) ? input.receiptRules : {};
  const checkoutRules = isRecord(input.checkoutRules) ? input.checkoutRules : {};
  const processorRules = isRecord(input.processorRules) ? input.processorRules : {};

  const paymentMethods = Array.isArray(input.paymentMethods) ? input.paymentMethods : defaults.paymentMethods;
  const profiles = Array.isArray(taxRules.profiles) ? taxRules.profiles : defaults.taxRules.profiles;
  const fees = Array.isArray(feeRules.fees) ? feeRules.fees : defaults.feeRules.fees;

  return {
    paymentMethods: paymentMethods.map((method, index) => {
      const fallback = defaults.paymentMethods[index] ?? defaults.paymentMethods[0];
      const item = isRecord(method) ? method : {};
      return {
        key: stringValue(item.key, fallback.key).trim() || fallback.key,
        label: stringValue(item.label, fallback.label).trim() || fallback.label,
        enabled: booleanValue(item.enabled, fallback.enabled),
        allowDeposits: booleanValue(item.allowDeposits, fallback.allowDeposits),
        allowBalances: booleanValue(item.allowBalances, fallback.allowBalances),
        allowRefunds: booleanValue(item.allowRefunds, fallback.allowRefunds),
        requiresNote: booleanValue(item.requiresNote, fallback.requiresNote),
      };
    }),
    depositRules: {
      enabled: booleanValue(depositRules.enabled, defaults.depositRules.enabled),
      requiredByDefault: booleanValue(depositRules.requiredByDefault, defaults.depositRules.requiredByDefault),
      defaultType: pickValue(depositRules.defaultType, discountTypes, defaults.depositRules.defaultType),
      flatAmount: numberValue(depositRules.flatAmount, defaults.depositRules.flatAmount),
      percentAmount: numberValue(depositRules.percentAmount, defaults.depositRules.percentAmount),
      captureMode: pickValue(depositRules.captureMode, captureModes, defaults.depositRules.captureMode),
      captureDaysBeforeEvent: numberValue(depositRules.captureDaysBeforeEvent, defaults.depositRules.captureDaysBeforeEvent),
      refundable: booleanValue(depositRules.refundable, defaults.depositRules.refundable),
      refundWindowHours: numberValue(depositRules.refundWindowHours, defaults.depositRules.refundWindowHours),
      applyDepositToBalance: booleanValue(depositRules.applyDepositToBalance, defaults.depositRules.applyDepositToBalance),
    },
    taxRules: {
      enabled: booleanValue(taxRules.enabled, defaults.taxRules.enabled),
      defaultRate: numberValue(taxRules.defaultRate, defaults.taxRules.defaultRate),
      pricesIncludeTax: booleanValue(taxRules.pricesIncludeTax, defaults.taxRules.pricesIncludeTax),
      profiles: profiles.map((profile, index) => {
        const fallback = defaults.taxRules.profiles[index] ?? defaults.taxRules.profiles[0];
        const item = isRecord(profile) ? profile : {};
        return {
          key: stringValue(item.key, fallback.key).trim() || fallback.key,
          label: stringValue(item.label, fallback.label).trim() || fallback.label,
          taxable: booleanValue(item.taxable, fallback.taxable),
          rate: numberValue(item.rate, fallback.rate),
        };
      }),
    },
    feeRules: {
      enabled: booleanValue(feeRules.enabled, defaults.feeRules.enabled),
      fees: fees.map((fee, index) => {
        const item = isRecord(fee) ? fee : {};
        return {
          id: stringValue(item.id, `fee-${index + 1}`).trim() || `fee-${index + 1}`,
          label: stringValue(item.label, "Fee").trim() || "Fee",
          type: pickValue(item.type, discountTypes, "flat"),
          amount: numberValue(item.amount, 0),
          taxable: booleanValue(item.taxable, false),
          visibleToCustomer: booleanValue(item.visibleToCustomer, true),
          enabled: booleanValue(item.enabled, true),
        };
      }),
    },
    tipRules: {
      enabled: booleanValue(tipRules.enabled, defaults.tipRules.enabled),
      allowCustomTip: booleanValue(tipRules.allowCustomTip, defaults.tipRules.allowCustomTip),
      suggestedPercentages: arrayOfNumbers(tipRules.suggestedPercentages, defaults.tipRules.suggestedPercentages),
      suggestedAmounts: arrayOfNumbers(tipRules.suggestedAmounts, defaults.tipRules.suggestedAmounts),
      applyBeforeTax: booleanValue(tipRules.applyBeforeTax, defaults.tipRules.applyBeforeTax),
      tipMode: pickValue(tipRules.tipMode, tipModes, defaults.tipRules.tipMode),
    },
    discountRules: {
      enabled: booleanValue(discountRules.enabled, defaults.discountRules.enabled),
      requireReason: booleanValue(discountRules.requireReason, defaults.discountRules.requireReason),
      requireManagerApproval: booleanValue(discountRules.requireManagerApproval, defaults.discountRules.requireManagerApproval),
      allowPercentDiscount: booleanValue(discountRules.allowPercentDiscount, defaults.discountRules.allowPercentDiscount),
      allowFlatDiscount: booleanValue(discountRules.allowFlatDiscount, defaults.discountRules.allowFlatDiscount),
      allowComp: booleanValue(discountRules.allowComp, defaults.discountRules.allowComp),
    },
    refundRules: {
      enabled: booleanValue(refundRules.enabled, defaults.refundRules.enabled),
      allowFullRefund: booleanValue(refundRules.allowFullRefund, defaults.refundRules.allowFullRefund),
      allowPartialRefund: booleanValue(refundRules.allowPartialRefund, defaults.refundRules.allowPartialRefund),
      allowStoreCredit: booleanValue(refundRules.allowStoreCredit, defaults.refundRules.allowStoreCredit),
      requireReason: booleanValue(refundRules.requireReason, defaults.refundRules.requireReason),
      requireManagerApproval: booleanValue(refundRules.requireManagerApproval, defaults.refundRules.requireManagerApproval),
    },
    receiptRules: {
      showLogo: booleanValue(receiptRules.showLogo, defaults.receiptRules.showLogo),
      showPartyDetails: booleanValue(receiptRules.showPartyDetails, defaults.receiptRules.showPartyDetails),
      showGuestOfHonor: booleanValue(receiptRules.showGuestOfHonor, defaults.receiptRules.showGuestOfHonor),
      footerText: stringValue(receiptRules.footerText, defaults.receiptRules.footerText),
      refundPolicyText: stringValue(receiptRules.refundPolicyText, defaults.receiptRules.refundPolicyText),
      emailReceiptEnabled: booleanValue(receiptRules.emailReceiptEnabled, defaults.receiptRules.emailReceiptEnabled),
      printReceiptEnabled: booleanValue(receiptRules.printReceiptEnabled, defaults.receiptRules.printReceiptEnabled),
      smsReceiptEnabled: booleanValue(receiptRules.smsReceiptEnabled, defaults.receiptRules.smsReceiptEnabled),
    },
    checkoutRules: {
      requireZeroBalanceBeforeComplete: booleanValue(checkoutRules.requireZeroBalanceBeforeComplete, defaults.checkoutRules.requireZeroBalanceBeforeComplete),
      allowPartialPayments: booleanValue(checkoutRules.allowPartialPayments, defaults.checkoutRules.allowPartialPayments),
      allowSplitPayments: booleanValue(checkoutRules.allowSplitPayments, defaults.checkoutRules.allowSplitPayments),
      allowOverpayment: booleanValue(checkoutRules.allowOverpayment, defaults.checkoutRules.allowOverpayment),
      autoMarkPaidWhenBalanceIsZero: booleanValue(checkoutRules.autoMarkPaidWhenBalanceIsZero, defaults.checkoutRules.autoMarkPaidWhenBalanceIsZero),
      requireManagerApprovalForComp: booleanValue(checkoutRules.requireManagerApprovalForComp, defaults.checkoutRules.requireManagerApprovalForComp),
      requireManagerApprovalForRefund: booleanValue(checkoutRules.requireManagerApprovalForRefund, defaults.checkoutRules.requireManagerApprovalForRefund),
    },
    processorRules: {
      provider: pickValue(processorRules.provider, processorProviders, defaults.processorRules.provider),
      connected: false,
      mode: pickValue(processorRules.mode, processorModes, defaults.processorRules.mode),
      accountLabel: stringValue(processorRules.accountLabel, defaults.processorRules.accountLabel),
    },
  };
}
