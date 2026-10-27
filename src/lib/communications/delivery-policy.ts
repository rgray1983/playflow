// Preview deployments always use test delivery. Missing configuration blocks all recipients.
export function deliveryPolicy() {
  const testMode = process.env.VERCEL_ENV === "preview" || process.env.PLAYFLOW_EMAIL_DELIVERY_MODE !== "live";
  const entries = (process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  const valid = entries.every(value => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value));
  return {testMode, recipients: valid ? [...new Set(entries)] : []};
}
export function recipientAllowed(recipient: string) {
  const policy = deliveryPolicy();
  return !policy.testMode || policy.recipients.includes(recipient.trim().toLowerCase());
}
