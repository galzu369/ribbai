import { unzipSync, zipSync } from "fflate";
import { decodeXml } from "./xml-utils";

/**
 * Um .xlsx aberto como mapa de partes (path dentro do zip -> bytes).
 * As partes não tocadas mantêm exatamente os mesmos bytes descomprimidos.
 */
export type Archive = Map<string, Uint8Array>;

export function openArchive(bytes: Uint8Array): Archive {
  const files = unzipSync(bytes);
  return new Map(Object.entries(files));
}

export function partText(archive: Archive, name: string): string {
  const part = archive.get(name);
  if (!part) throw new Error(`Parte não encontrada no xlsx: ${name}`);
  return new TextDecoder("utf-8").decode(part);
}

export function setPartText(archive: Archive, name: string, text: string): void {
  archive.set(name, new TextEncoder().encode(text));
}

export function archiveToBytes(archive: Archive): Uint8Array {
  const obj: Record<string, Uint8Array> = {};
  for (const [k, v] of archive) obj[k] = v;
  return zipSync(obj, { level: 6 });
}

export interface SheetRef {
  /** Nome visível da folha (entidades XML já descodificadas). */
  name: string;
  /** Path da parte dentro do zip, ex.: xl/worksheets/sheet1.xml */
  target: string;
}

function extractAttr(tag: string, attr: string): string | null {
  const m = new RegExp(`\\b${attr}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

/** Lista as folhas pela ordem do workbook.xml, resolvendo r:id -> parte. */
export function listSheets(archive: Archive): SheetRef[] {
  const wb = partText(archive, "xl/workbook.xml");
  const rels = partText(archive, "xl/_rels/workbook.xml.rels");
  const relMap = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = extractAttr(m[0], "Id");
    const target = extractAttr(m[0], "Target");
    if (id && target) relMap.set(id, target);
  }
  const sheets: SheetRef[] = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = extractAttr(m[0], "name");
    const rid = extractAttr(m[0], "r:id");
    if (name === null || !rid) continue;
    const target = relMap.get(rid);
    if (!target) throw new Error(`Folha "${name}" com r:id sem relationship: ${rid}`);
    sheets.push({
      name: decodeXml(name),
      target: target.startsWith("/") ? target.slice(1) : `xl/${target}`,
    });
  }
  return sheets;
}
