// As-you-type US phone formatting: "3474001471" renders as "+1 (347) 400-1471".
// US-only on purpose — most participants are local. International input
// (a "+" followed by any country code other than 1) passes through untouched,
// since validation already accepts it and reformatting would mangle it.

export function formatUsPhone(raw: string): string {
  if (/^\+(?!1)/.test(raw.trimStart())) return raw;

  let digits = raw.replace(/\D/g, "");
  // A leading 1 can only be the country code: US area codes start with 2–9.
  if (digits.startsWith("1")) digits = digits.slice(1);

  // More digits than a US number holds — leave whatever they typed alone
  // rather than truncating it; validation will flag it if it's wrong.
  if (digits.length > 10) return raw;

  // No national digits yet. Keep a bare "+1"-style prefix as typed so
  // backspacing through it removes one character at a time instead of
  // fighting the formatter.
  if (digits.length === 0) return raw.startsWith("+") ? raw : "";

  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);

  // The ")" only appears once digits exist beyond the area code; closing it
  // eagerly would re-insert the very character a backspace just deleted.
  let out = `+1 (${area}`;
  if (prefix) out += `) ${prefix}`;
  if (line) out += `-${line}`;
  return out;
}
