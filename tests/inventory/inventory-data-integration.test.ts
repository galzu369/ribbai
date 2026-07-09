import { PrismaClient } from "@prisma/client";
import { vi } from "vitest";

import { InventoryDataIntegrationService } from "@/features/business-intelligence/services/inventory-data-integration";

vi.mock("fs", () => {
  return {
    readFileSync: vi.fn().mockReturnValue(`
| Estado | Artigo | SKU | Stock atual | Limite critico | Acao recomendada |
| --- | --- | --- | --- | --- | --- |
| Critico | Guardanapos | CONS-SERVICE-NAPKINS | 0 caixa | 1 caixa | Encomendar com urgencia |
`),
  };
});

vi.mock("@/lib/db", () => {
  const createMock = vi.fn().mockResolvedValue({});
  return {
    prisma: {
      operationalNote: {
        create: createMock,
      },
    },
  };
});

describe("inventory-data-integration", () => {
  it("parses alert markdown into alert items", async () => {
    const alerts = await (InventoryDataIntegrationService as any).parseAlerts(
      "docs/operational-records/2026/06-june/inventory-updates/2026-06-16-alert-summary.md",
    );

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toHaveProperty("sku", "CONS-SERVICE-NAPKINS");
  });
});

