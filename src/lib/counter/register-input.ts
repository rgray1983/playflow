// Dollar entry for the touch register. The first digit replaces the prefilled balance.
export function registerKey(amount: string, key: string, replace = false) {
  if (key === "Clear") return "";
  if (key === "Backspace") return amount.slice(0, -1);
  if (!/^[0-9.]$/.test(key)) return amount;
  const next = `${replace ? "" : amount}${key}`;
  const normalized = next.startsWith(".") ? `0${next}` : next;
  return /^\d{0,7}(\.\d{0,2})?$/.test(normalized) ? normalized : amount;
}
