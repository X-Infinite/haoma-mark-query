const MOBILE_REGEX = /^1[3-9]\d{9}$/;

export function normalizePhone(input: string): string {
  return input.replace(/\s|-/g, "").trim();
}

export function isValidChinaMobile(phone: string): boolean {
  return MOBILE_REGEX.test(normalizePhone(phone));
}

export function maskPhone(phone: string): string {
  const p = normalizePhone(phone);
  if (p.length !== 11) return p;
  return `${p.slice(0, 3)}****${p.slice(7)}`;
}
