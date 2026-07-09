import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildMonthlyOvertimeReports,
  extractOvertimeEntriesFromMarkdown,
  formatHours,
  parseDurationToMinutes,
} from "../../scripts/lib/overtime-report-parser.mjs";

const sampleReportPath = path.join(
  process.cwd(),
  "docs",
  "operational-records",
  "2026",
  "06-june",
  "daily",
  "2026-06-03-registo-diario-operacional.md"
);

describe("overtime report parser", () => {
  it("parses Portuguese overtime durations into minutes", () => {
    expect(parseDurationToMinutes("1h45m de trabalho extra")).toBe(105);
    expect(parseDurationToMinutes("30 minutos de trabalho extra")).toBe(30);
    expect(parseDurationToMinutes("1 hora e 30 minutos extra")).toBe(90);
    expect(parseDurationToMinutes("1,5 horas extra")).toBe(90);
  });

  it("formats calculated totals as hours", () => {
    expect(formatHours(105)).toBe("1,75 h");
    expect(formatHours(30)).toBe("0,50 h");
  });

  it("extracts overtime entries from the sample daily report", async () => {
    const content = await readFile(sampleReportPath, "utf8");
    const entries = extractOvertimeEntriesFromMarkdown(content, sampleReportPath);

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          staffMember: "Carolina",
          date: "2026-06-03",
          minutes: 105,
          formattedHours: "1,75 h",
        }),
        expect.objectContaining({
          staffMember: "Marta",
          date: "2026-06-03",
          minutes: 30,
          formattedHours: "0,50 h",
        }),
      ])
    );
    expect(entries).toHaveLength(2);
  });

  it("ignores overtime summary sections when extracting staff entries", () => {
    const content = [
      "| Data | 04-06-2026 |",
      "",
      "### Matilde",
      "",
      "- Totalizou 2h15m extra, considerando a entrada uma hora mais cedo e a saída 1h15m mais tarde.",
      "",
      "### Registo De Horas Extra",
      "",
      "| Colaborador | Registo |",
      "| --- | --- |",
      "| Matilde | Entrou 1 hora mais cedo e saiu 1 hora e 15 minutos mais tarde, totalizando 2 horas e 15 minutos extra |",
      "",
      "### Overtime Input",
      "",
      "| Colaborador | Horas Extra / Observação |",
      "| --- | --- |",
      "| Matilde | 2h15m extra |",
    ].join("\n");

    const entries = extractOvertimeEntriesFromMarkdown(content, "2026-06-04-registo-diario-operacional.md");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        staffMember: "Matilde",
        date: "2026-06-04",
        minutes: 135,
        formattedHours: "2,25 h",
      })
    );
  });

  it("aggregates extracted entries into weekly and monthly staff totals", async () => {
    const content = await readFile(sampleReportPath, "utf8");
    const entries = extractOvertimeEntriesFromMarkdown(content, sampleReportPath);
    const [report] = buildMonthlyOvertimeReports(entries, 1);

    expect(report.monthKey).toBe("2026-06");
    expect(report.totalHours).toBe("2,25 h");
    expect(report.staffRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          staffMember: "Carolina",
          totalMinutes: 105,
          totalHours: "1,75 h",
        }),
        expect.objectContaining({
          staffMember: "Marta",
          totalMinutes: 30,
          totalHours: "0,50 h",
        }),
      ])
    );

    const weekOne = report.weeks[0];
    const carolina = report.staffRows.find((row) => row.staffMember === "Carolina");
    const marta = report.staffRows.find((row) => row.staffMember === "Marta");

    expect(carolina?.weeklyHours[weekOne.key]).toBe("1,75 h");
    expect(marta?.weeklyHours[weekOne.key]).toBe("0,50 h");
  });
});
