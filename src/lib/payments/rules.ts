export class PaymentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function paymentCents(value: unknown) {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d{1,8}(\.\d{1,2})?$/.test(String(value))) throw new PaymentError("Enter a positive payment amount with no more than two decimal places.");
  const cents = Math.round(Number(value) * 100);
  if (cents <= 0 || cents > 9999999999) throw new PaymentError("Payment amount is outside the supported range.");
  return cents;
}
