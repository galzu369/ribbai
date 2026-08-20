import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { Ficha } from "./ficha-parser";
import type { MatchResult } from "./matching";
import { normalizeName } from "./matching";
import { fromRoot, KITCHEN_CONFIG } from "./project-root";

/**
 * Alergénios (14 alergénios obrigatórios UE) com propagação hierárquica:
 * ingrediente → guarnição → item final. Perfis vêm de
 * docs/kitchen/costing/mappings/ingredient-allergens.json.
 * Regra de segurança: ingrediente sem perfil, ou com status "review",
 * torna o perfil da ficha INCOMPLETO — nunca se assume ausência de alergénio.
 */

export const ALLERGEN_CODES = [
  "GL", "CR", "EG", "FI", "PN", "SO", "MK",
  "NT", "CE", "MU", "SE", "SU", "LU", "MO",
] as const;

export type AllergenCode = (typeof ALLERGEN_CODES)[number];

export const ALLERGEN_NAMES: Record<AllergenCode, string> = {
  GL: "Cereais contendo glúten",
  CR: "Crustáceos",
  EG: "Ovos",
  FI: "Peixe",
  PN: "Amendoins",
  SO: "Soja",
  MK: "Leite",
  NT: "Frutos de casca rija",
  CE: "Aipo",
  MU: "Mostarda",
  SE: "Sésamo",
  SU: "Dióxido de enxofre e sulfitos",
  LU: "Tremoço",
  MO: "Moluscos",
};

const allergenEntrySchema = z.object({
  ingredient: z.string().min(1),
  allergens: z.array(z.enum(ALLERGEN_CODES)),
  status: z.enum(["confirmed", "review"]),
  note: z.string().optional(),
});

const allergenFileSchema = z.object({
  version: z.number(),
  description: z.string().optional(),
  codes: z.record(z.string()).optional(),
  entries: z.array(allergenEntrySchema),
});

export type AllergenEntry = z.infer<typeof allergenEntrySchema>;

export const ALLERGENS_JSON_PATH = join(
  fromRoot(KITCHEN_CONFIG.paths.mappingsDir),
  "ingredient-allergens.json",
);

export function loadAllergenMap(
  path: string = ALLERGENS_JSON_PATH,
): Map<string, AllergenEntry> {
  const raw: unknown = JSON.parse(readFileSync(path, "utf-8"));
  const parsed = allergenFileSchema.parse(raw);
  const map = new Map<string, AllergenEntry>();
  for (const entry of parsed.entries) {
    const key = normalizeName(entry.ingredient);
    if (map.has(key)) {
      throw new Error(`ingredient-allergens.json: entrada duplicada "${entry.ingredient}"`);
    }
    map.set(key, entry);
  }
  return map;
}

export interface IngredientAllergenInfo {
  name: string;
  allergens: AllergenCode[];
  status: "confirmed" | "review" | "unknown" | "subrecipe";
  note?: string;
  targetNode?: string;
}

export interface GarnishAllergenProfile {
  nodeId: string;
  /** União de alergénios declarados (ordem canónica UE, sem duplicados). */
  allergens: AllergenCode[];
  /** Linhas cuja informação está por confirmar (review/unknown/subreceita incompleta). */
  pending: { name: string; reason: string }[];
  complete: boolean;
  perIngredient: IngredientAllergenInfo[];
}

export type GlutenStatus = "CONTAINS_GLUTEN" | "GF_CANDIDATE" | "INDETERMINATE";

export function glutenStatus(profile: GarnishAllergenProfile): GlutenStatus {
  if (profile.allergens.includes("GL")) return "CONTAINS_GLUTEN";
  if (!profile.complete) return "INDETERMINATE";
  return "GF_CANDIDATE";
}

function sortCodes(codes: Iterable<AllergenCode>): AllergenCode[] {
  const set = new Set(codes);
  return ALLERGEN_CODES.filter((c) => set.has(c));
}

/**
 * Calcula perfis de alergénios por bloco, em ordem topológica, propagando
 * subreceitas (o prato herda os alergénios da subreceita, sem duplicados).
 */
export function computeAllergenProfiles(
  blocks: Ficha[],
  matches: Map<string, MatchResult[]>,
  order: string[],
  allergenMap: Map<string, AllergenEntry>,
): Map<string, GarnishAllergenProfile> {
  const byNode = new Map(blocks.map((b) => [b.nodeId, b]));
  const result = new Map<string, GarnishAllergenProfile>();

  for (const nodeId of order) {
    const block = byNode.get(nodeId);
    if (!block) throw new Error(`Nó desconhecido na ordem topológica: ${nodeId}`);
    const rowMatches = matches.get(nodeId) ?? [];
    const allergens = new Set<AllergenCode>();
    const pending: { name: string; reason: string }[] = [];
    const perIngredient: IngredientAllergenInfo[] = [];

    for (let i = 0; i < block.rows.length; i++) {
      const row = block.rows[i];
      const match = rowMatches[i];

      if (match.status === "SUBRECIPE" && match.targetNode) {
        const source = result.get(match.targetNode);
        if (!source) {
          throw new Error(
            `Alergénios: subreceita "${match.targetNode}" ainda não calculada ao processar "${nodeId}"`,
          );
        }
        for (const code of source.allergens) allergens.add(code);
        if (!source.complete) {
          pending.push({
            name: row.name,
            reason: `subreceita "${match.targetNode}" com perfil incompleto`,
          });
        }
        perIngredient.push({
          name: row.name,
          allergens: source.allergens,
          status: "subrecipe",
          targetNode: match.targetNode,
        });
        continue;
      }

      // Nome canónico: artigo do Preçário quando ligado; senão o nome da ficha.
      const canonical = match.article?.name ?? row.name;
      const entry = allergenMap.get(normalizeName(canonical));
      if (!entry) {
        pending.push({ name: row.name, reason: "ALLERGEN DATA REQUIRED" });
        perIngredient.push({ name: row.name, allergens: [], status: "unknown" });
        continue;
      }
      for (const code of entry.allergens) allergens.add(code);
      if (entry.status === "review") {
        pending.push({
          name: row.name,
          reason: entry.note ?? "por validar com rótulo/fornecedor",
        });
      }
      perIngredient.push({
        name: row.name,
        allergens: sortCodes(entry.allergens),
        status: entry.status,
        note: entry.note,
      });
    }

    result.set(nodeId, {
      nodeId,
      allergens: sortCodes(allergens),
      pending,
      complete: pending.length === 0,
      perIngredient,
    });
  }

  return result;
}

/** Mapa subreceita (nodeId) -> nós que a utilizam. */
export function buildUsedInMap(
  blocks: Ficha[],
  matches: Map<string, MatchResult[]>,
): Map<string, string[]> {
  const usedIn = new Map<string, string[]>();
  for (const block of blocks) {
    for (const m of matches.get(block.nodeId) ?? []) {
      if (m.status === "SUBRECIPE" && m.targetNode) {
        const list = usedIn.get(m.targetNode);
        if (list) list.push(block.nodeId);
        else usedIn.set(m.targetNode, [block.nodeId]);
      }
    }
  }
  return usedIn;
}
