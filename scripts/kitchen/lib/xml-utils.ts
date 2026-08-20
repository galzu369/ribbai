export function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function encodeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function refCol(ref: string): string {
  return ref.replace(/\d+$/, "");
}

export function refRow(ref: string): number {
  return Number(ref.replace(/^[A-Z]+/, ""));
}

export function colIndex(col: string): number {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/** Serializa um número para XML sem notação exponencial e sem perder precisão. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`Número inválido para célula: ${n}`);
  const s = String(n);
  if (!/[eE]/.test(s)) return s;
  return n
    .toFixed(17)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

/** Nome de folha para uso em fórmula: 'Molho Ponzu'!G11 (apóstrofos duplicados). */
export function quoteSheetName(name: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}
