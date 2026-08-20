import { decodeXml } from "./xml-utils";

/**
 * Parse de xl/sharedStrings.xml para a tabela de strings.
 * Suporta rich-text runs (<r><t>..</t></r>), entidades XML e <t/> vazios.
 */
export function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const si of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) {
    let text = "";
    for (const t of si[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) {
      text += decodeXml(t[1]);
    }
    out.push(text);
  }
  return out;
}

/**
 * Resolve o texto de uma célula a partir do atributo t e do conteúdo <v>.
 * Devolve null para células sem valor. Números são devolvidos como string crua.
 */
export function resolveCellText(
  t: string | null,
  v: string | null,
  strings: string[],
): string | null {
  if (v === null) return null;
  if (t === "s") {
    const idx = Number(v);
    const s = strings[idx];
    if (s === undefined) {
      throw new Error(`Índice de shared string inexistente: ${v}`);
    }
    return s;
  }
  if (t === "str") return decodeXml(v);
  return decodeXml(v);
}
