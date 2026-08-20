import { partText, setPartText, type Archive } from "./xlsx-zip";

/**
 * Limpeza estrutural do workbook das Guarnições:
 * - remove os external links (fonte dos preços passa a ser gerida por script);
 * - apaga calcChain.xml e força fullCalcOnLoad para o Excel recalcular ao abrir.
 * Cada mutação só é planeada se ainda for necessária (idempotente).
 */

export interface PartMutation {
  part: string;
  detail: string;
  apply: (archive: Archive) => void;
}

export function planWorkbookCleanup(archive: Archive): PartMutation[] {
  const muts: PartMutation[] = [];

  const wb = partText(archive, "xl/workbook.xml");
  if (/<externalReferences>[\s\S]*?<\/externalReferences>/.test(wb)) {
    muts.push({
      part: "xl/workbook.xml",
      detail: "remover <externalReferences> (links externos ao Preçário)",
      apply: (a) =>
        setPartText(
          a,
          "xl/workbook.xml",
          partText(a, "xl/workbook.xml").replace(
            /<externalReferences>[\s\S]*?<\/externalReferences>/,
            "",
          ),
        ),
    });
  }
  if (/<calcPr\b(?![^>]*fullCalcOnLoad)[^>]*\/>/.test(wb)) {
    muts.push({
      part: "xl/workbook.xml",
      detail: 'calcPr fullCalcOnLoad="1" (recalcular ao abrir)',
      apply: (a) =>
        setPartText(
          a,
          "xl/workbook.xml",
          partText(a, "xl/workbook.xml").replace(
            /<calcPr\b((?:(?!fullCalcOnLoad)[^>])*)\/>/,
            '<calcPr$1 fullCalcOnLoad="1"/>',
          ),
        ),
    });
  }

  const rels = partText(archive, "xl/_rels/workbook.xml.rels");
  if (/externalLink/.test(rels)) {
    muts.push({
      part: "xl/_rels/workbook.xml.rels",
      detail: "remover relationship do externalLink",
      apply: (a) =>
        setPartText(
          a,
          "xl/_rels/workbook.xml.rels",
          partText(a, "xl/_rels/workbook.xml.rels").replace(
            /<Relationship\b[^>]*externalLink[^>]*\/>/g,
            "",
          ),
        ),
    });
  }

  const contentTypes = partText(archive, "[Content_Types].xml");
  if (/calcChain|externalLink/.test(contentTypes)) {
    muts.push({
      part: "[Content_Types].xml",
      detail: "remover Overrides de calcChain e externalLink",
      apply: (a) =>
        setPartText(
          a,
          "[Content_Types].xml",
          partText(a, "[Content_Types].xml").replace(
            /<Override\b[^>]*(?:calcChain|externalLink)[^>]*\/>/g,
            "",
          ),
        ),
    });
  }

  const partsToDelete = [...archive.keys()].filter(
    (name) => name === "xl/calcChain.xml" || name.startsWith("xl/externalLinks/"),
  );
  for (const name of partsToDelete) {
    muts.push({
      part: name,
      detail: "apagar parte",
      apply: (a) => {
        a.delete(name);
      },
    });
  }

  return muts;
}
