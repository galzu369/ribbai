export type NormalizedInventoryUnit =
  | "caixa"
  | "pack"
  | "unidade"
  | "saco"
  | "litro"
  | string;

const UNIT_NORMALIZATION_MAP: Record<string, NormalizedInventoryUnit> = {
  caixas: "caixa",
  caixa: "caixa",
  packs: "pack",
  pack: "pack",
  unidades: "unidade",
  unidade: "unidade",
  sacos: "saco",
  saco: "saco",
  litros: "litro",
  litro: "litro",
};

/**
 * Normalize a free-form unit label to a canonical form.
 * This keeps existing behaviour used in inventory scripts while centralizing the mapping.
 */
export function normalizeInventoryUnit(value: string): NormalizedInventoryUnit {
  const raw = String(value ?? "").trim().toLowerCase();
  return UNIT_NORMALIZATION_MAP[raw] ?? raw;
}

/**
 * Check if two units are compatible after normalization.
 */
export function areInventoryUnitsCompatible(a: string, b: string): boolean {
  return normalizeInventoryUnit(a) === normalizeInventoryUnit(b);
}

