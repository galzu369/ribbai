import { readFile } from "node:fs/promises";

export function parseCliArgs(): {
  file: string | null;
  force: boolean;
  forceNewSku: boolean;
} {
  const args = process.argv.slice(2);
  const fileArg = args.find((arg) => arg.startsWith("--file="));

  return {
    file: fileArg ? fileArg.slice("--file=".length) : null,
    force: args.includes("--force"),
    forceNewSku: args.includes("--force-new-sku"),
  };
}

export async function loadJsonFile(filePath: string): Promise<unknown> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export const monthDirectoryNames = [
  "01-january",
  "02-february",
  "03-march",
  "04-april",
  "05-may",
  "06-june",
  "07-july",
  "08-august",
  "09-september",
  "10-october",
  "11-november",
  "12-december",
];

export function monthDirFor(date: Date): { year: number; monthDir: string } {
  const year = date.getUTCFullYear();
  const monthDir = monthDirectoryNames[date.getUTCMonth()];
  return { year, monthDir };
}

export function dateStamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}
