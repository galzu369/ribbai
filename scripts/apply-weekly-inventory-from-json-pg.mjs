import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import crypto from "node:crypto";
import { updateMonthlyPreview } from "./update-monthly-preview.mjs";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";

const SUPPLIER_CODE = "CONSUMABLES-PENDING";
const COUNTED_BY = "Filipe Catalao";
const CREATED_BY = "OPS-AUTOMATION-JSON";
const REFERENCE_TYPE = "WEEKLY_COUNT";

function decimal(value) {
  return Number(value);
}

function sanitizeReasonDelta(delta) {
  if (delta === 0) {
    return "Ajuste de inventario semanal (sem diferenca).";
  }
  return delta > 0
    ? "Ajuste de inventario semanal (entrada por contagem)."
    : "Ajuste de inventario semanal (saida por contagem).";
}

async function ensureSupplier(client) {
  const id = crypto.randomUUID();
  const result = await client.query(
    `
      INSERT INTO "suppliers" ("id", "code", "name", "status", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
      ON CONFLICT ("code")
      DO UPDATE SET "name" = EXCLUDED."name", "status" = 'ACTIVE'
      RETURNING "id"
    `,
    [id, SUPPLIER_CODE, "Fornecedor de Consumiveis a Definir"]
  );
  return result.rows[0].id;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const args = Object.fromEntries(
    rawArgs
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, ...rest] = arg.slice(2).split("=");
        return [key, rest.join("=")];
      })
  );
  const force = rawArgs.includes("--force");

  const jsonPathArg = args.json;
  if (!jsonPathArg) {
    throw new Error("Missing --json=path/to/weekly-count.json");
  }
  const jsonPath = path.resolve(jsonPathArg);
  const raw = await readFile(jsonPath, "utf8");
  const payload = JSON.parse(raw);

  const dateStr = args.date ?? payload.date;
  if (!dateStr) {
    throw new Error(
      'Missing date (provide --date=YYYY-MM-DD or include "date" in JSON).'
    );
  }

  const weekNumber = Number(args.weekNumber ?? payload.weekNumber);
  const year = Number(args.year ?? payload.year);
  if (!Number.isInteger(weekNumber) || !Number.isInteger(year)) {
    throw new Error(
      "Invalid weekNumber/year. Provide --weekNumber and --year or in JSON."
    );
  }

  const countedAt = new Date(`${dateStr}T12:00:00.000Z`);
  const referenceId = `WEEKLY-COUNT-${dateStr}`;

  const rawLines = Array.isArray(payload.lines) ? payload.lines : [];
  if (rawLines.length === 0) {
    throw new Error("JSON lines array is empty.");
  }

  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const supplierId = await ensureSupplier(client);

    // Verificar transações anteriores desta referência
    const { rows: existingTxRows } = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM "inventory_transactions"
        WHERE "referenceType" = $1 AND "referenceId" = $2
      `,
      [REFERENCE_TYPE, referenceId]
    );
    const existingTxCount = existingTxRows[0].count;

    if (existingTxCount > 0 && !force) {
      throw new Error(
        `Weekly inventory already recorded for ${referenceId}. Re-run with --force to regenerate.`
      );
    }

    if (existingTxCount > 0 && force) {
      await client.query(
        `
          DELETE FROM "inventory_transactions"
          WHERE "referenceType" = $1 AND "referenceId" = $2
        `,
        [REFERENCE_TYPE, referenceId]
      );
    }

    const skus = rawLines.map((line) => line.sku);
    const { rows: items } = await client.query(
      `
        SELECT "id", "sku", "name", "unit", "currentStock", "costPrice"
        FROM "inventory_items"
        WHERE "sku" = ANY($1::text[])
      `,
      [skus]
    );
    const itemsBySku = new Map(items.map((item) => [item.sku, item]));

    const missingSkus = skus.filter((sku) => !itemsBySku.has(sku));
    if (missingSkus.length > 0) {
      throw new Error(
        `Missing InventoryItem records for SKUs: ${missingSkus.join(", ")}`
      );
    }

    const results = [];

    for (const line of rawLines) {
      const item = itemsBySku.get(line.sku);
      const systemQuantity = decimal(item.currentStock);
      const actualQuantity = decimal(line.quantity);
      const variance = actualQuantity - systemQuantity;
      const varianceAbs = Math.abs(variance);
      const unitCost = item.costPrice != null ? decimal(item.costPrice) : 0;

      // Atualizar stock atual
      await client.query(
        `
          UPDATE "inventory_items"
          SET "currentStock" = $1, "status" = 'ACTIVE', "updatedBy" = $2, "updatedAt" = NOW()
          WHERE "id" = $3
        `,
        [actualQuantity, CREATED_BY, item.id]
      );

      // Criar transação de ajuste apenas se houver diferença
      if (varianceAbs > 0) {
        const id = crypto.randomUUID();
        const totalCost =
          unitCost != null ? unitCost * varianceAbs : null;

        await client.query(
          `
            INSERT INTO "inventory_transactions" (
              "id", "itemId", "type", "quantity", "unit", "unitCost", "totalCost",
              "referenceType", "referenceId", "supplierId", "balanceAfter",
              "reason", "notes", "createdBy", "transactionDate", "createdAt"
            )
            VALUES (
              $1, $2, 'ADJUSTMENT', $3, $4, $5, $6,
              $7, $8, $9, $10,
              $11, $12, $13, $14, $14
            )
          `,
          [
            id,
            item.id,
            varianceAbs,
            item.unit,
            unitCost || null,
            totalCost,
            REFERENCE_TYPE,
            referenceId,
            supplierId,
            actualQuantity,
            sanitizeReasonDelta(variance),
            `Contagem fisica oficial registada em ${dateStr} por ${COUNTED_BY}.`,
            CREATED_BY,
            countedAt,
          ]
        );
      }

      results.push({
        sku: line.sku,
        name: item.name,
        unit: item.unit,
        systemQuantity,
        actualQuantity,
        variance,
      });
    }

    await client.query("COMMIT");

    console.warn(
      JSON.stringify(
        {
          message: "Weekly inventory from JSON applied via pg.",
          referenceId,
          date: dateStr,
          weekNumber,
          year,
          items: results.length,
        },
        null,
        2
      )
    );

    // Atualizar automaticamente o preview do relatório mensal
    // para o mês da contagem aplicada (mantém KPIs sempre alinhados).
    try {
      const countedDate = new Date(`${dateStr}T12:00:00.000Z`);
      const previewYear = countedDate.getUTCFullYear();
      const previewMonth = countedDate.getUTCMonth() + 1;
      await updateMonthlyPreview({ year: previewYear, month: previewMonth });
    } catch (previewError) {
      console.error(
        "Falha ao atualizar preview mensal apos aplicar weekly inventory (pg).",
        previewError
      );
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    "Failed to apply weekly inventory from JSON using pg",
    error
  );
  process.exitCode = 1;
});

