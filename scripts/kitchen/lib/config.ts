import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { fromRoot, KITCHEN_CONFIG } from "./project-root";

const CFG = KITCHEN_CONFIG.paths;

export const PATHS = {
  garnishesXlsx: fromRoot(CFG.garnishesWorkbook),
  pricebookXlsx: fromRoot(CFG.priceList),
  aliasesJson: join(fromRoot(CFG.mappingsDir), "ingredient-aliases.json"),
  reportsDir: fromRoot(CFG.reportsDir),
  backupsDir: fromRoot(CFG.backupsDir),
  logsDir: fromRoot(CFG.logsDir),
  archiveDir: fromRoot(CFG.archiveDir),
  kitchenReadme: fromRoot("docs/kitchen/README.md"),
  workflowDoc: fromRoot("docs/workflows/kitchen-costing-workflow.md"),
} as const;

export const MENU_ITEMS_DIR = fromRoot(CFG.menuItemsDir);
export const MENU_JSON_PATH = join(fromRoot(CFG.menuDir), "menu-2026-07.json");
export const MENU_ALIASES_PATH = join(
  fromRoot(CFG.mappingsDir),
  "menu-item-aliases.json",
);

/** Taxa de IVA de venda usada nas fichas (fórmulas =Preço/1.13 do próprio template). */
export const SALES_VAT_RATE = 0.13;

/** Workbook curto = nome do ficheiro sem o prefixo "Fichas Técnicas " e sem .xlsx. */
export const GARNISHES_WORKBOOK_SHORT = "Guarnições";

/**
 * Workbooks de folha dupla: bloco 0 (colunas B–G) é a dose vendável,
 * blocos seguintes (I–N, …) são receitas batch internas (subreceitas).
 * Nos restantes workbooks todos os blocos são itens de menu (ex.: Açaí 3×3).
 */
export const DUAL_BLOCK_BATCH_WORKBOOKS = new Set([
  "Acompanhamentos",
  "Sobremesas Caseiras",
]);

/**
 * Correções de receita decididas pelo utilizador — aplicadas ao texto da célula
 * do ingrediente (rename), de forma idempotente, antes do matching.
 */
export interface RecipeCorrection {
  workbook: string;
  sheet: string;
  ref: string;
  from: string;
  to: string;
  note: string;
}

/**
 * Vazio desde 2026-08-20 (modelo "chefe edita as fichas").
 * As fichas em technical-sheets/ são a fonte de verdade para nomes (B) e
 * quantidades (C). Este array fica disponível se alguma correção pontual
 * tiver de ser forçada de forma auditável sem editar o xlsx.
 */
export const RECIPE_CORRECTIONS: RecipeCorrection[] = [];

/**
 * Correções de QUANTIDADE — aplicadas à coluna C antes do parse.
 * Vazio desde 2026-08-20: o Chefe edita as quantidades diretamente nas fichas.
 */
export interface QuantityCorrection {
  workbook: string;
  sheet: string;
  ref: string;
  ingredient: string;
  from: number;
  to: number;
  note: string;
}

export const QUANTITY_CORRECTIONS: QuantityCorrection[] = [];

export const menuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  priceCIva: z.number().positive(),
  note: z.string().optional(),
});

export const menuFileSchema = z.object({
  version: z.number(),
  description: z.string().optional(),
  salesVatRate: z.number(),
  salesVatSource: z.string().optional(),
  items: z.array(menuItemSchema),
});

export type MenuItem = z.infer<typeof menuItemSchema>;

export function loadMenu(path: string = MENU_JSON_PATH): {
  salesVatRate: number;
  items: MenuItem[];
} {
  const raw: unknown = JSON.parse(readFileSync(path, "utf-8"));
  const parsed = menuFileSchema.parse(raw);
  return { salesVatRate: parsed.salesVatRate, items: parsed.items };
}

export const menuAliasSchema = z.object({
  menu: z.string().min(1),
  node: z.string().min(1),
  note: z.string().optional(),
});

export const menuAliasesFileSchema = z.object({
  version: z.number(),
  description: z.string().optional(),
  entries: z.array(menuAliasSchema),
});

export type MenuAlias = z.infer<typeof menuAliasSchema>;

export function loadMenuAliases(path: string = MENU_ALIASES_PATH): MenuAlias[] {
  const raw: unknown = JSON.parse(readFileSync(path, "utf-8"));
  return menuAliasesFileSchema.parse(raw).entries;
}

export const RECIPE_YIELDS_PATH = join(
  fromRoot(CFG.mappingsDir),
  "recipe-yields.json",
);

/**
 * Rendimento de uma ficha de lote: quantas doses/unidades vendáveis produz.
 * Custo por dose = Custo Mercadoria s/Iva da ficha ÷ yieldQuantity.
 */
export const recipeYieldSchema = z.object({
  node: z.string().min(1),
  yieldQuantity: z.number().positive(),
  yieldUnit: z.string().min(1),
  /** Células onde materializar o rendimento na própria folha (opcional). */
  sheetCells: z
    .object({
      yieldLabel: z.string(),
      yieldValue: z.string(),
      unitCostLabel: z.string(),
      unitCostValue: z.string(),
    })
    .optional(),
  note: z.string().optional(),
});

export const recipeYieldsFileSchema = z.object({
  version: z.number(),
  description: z.string().optional(),
  entries: z.array(recipeYieldSchema),
});

export type RecipeYield = z.infer<typeof recipeYieldSchema>;

export function loadRecipeYields(
  path: string = RECIPE_YIELDS_PATH,
): Map<string, RecipeYield> {
  const raw: unknown = JSON.parse(readFileSync(path, "utf-8"));
  const parsed = recipeYieldsFileSchema.parse(raw);
  const map = new Map<string, RecipeYield>();
  for (const entry of parsed.entries) {
    if (map.has(entry.node)) {
      throw new Error(`recipe-yields.json: rendimento duplicado para "${entry.node}"`);
    }
    map.set(entry.node, entry);
  }
  return map;
}

export const PRICEBOOK_SHEET_NAME = "Preçário";
export const PRICEBOOK_FIRST_ROW = 3;
export const FICHA_FIRST_INGREDIENT_ROW = 5;
export const SUM_ROW_LABEL_PREFIX = "custo mercadoria";
/** Tolerância para |célula − recomputação| em validação financeira (arredondamento). */
export const CELL_TOLERANCE = 0.005;
export const SUM_TOLERANCE = 0.01;
/** Unidades do Preçário consideradas compatíveis com quantidades em kg/L das fichas. */
export const WEIGHT_VOLUME_UNITS = new Set(["kg", "l", "lt"]);

export const aliasEntrySchema = z.object({
  ingredient: z.string().min(1),
  ficha: z.string().min(1).nullable(),
  article: z.string().min(1).nullable(),
  confirmed: z.boolean(),
  note: z.string().optional(),
});

export const aliasesFileSchema = z.object({
  version: z.number(),
  description: z.string().optional(),
  entries: z.array(aliasEntrySchema),
});

export type AliasEntry = z.infer<typeof aliasEntrySchema>;

export function loadAliases(path: string = PATHS.aliasesJson): AliasEntry[] {
  const raw: unknown = JSON.parse(readFileSync(path, "utf-8"));
  return aliasesFileSchema.parse(raw).entries;
}
