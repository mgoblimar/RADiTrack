// Builds docs/computations.docx from docs/computations.md (the source of truth).
//
//   npm run docs:computations
//
// Handles what the doc uses: headings, paragraphs, bullet/numbered lists,
// tables, **bold**, *italic*, `code`, horizontal rules, and $...$ / $$...$$
// formulas (rewritten as plain readable math, since Word does not read LaTeX).

import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, Packer, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";

const NAVY = "050E40";
const SRC = path.join(process.cwd(), "docs", "computations.md");
const OUT = path.join(process.cwd(), "docs", "computations.docx");

/** "\frac{a}{b} \times 100" -> "(a) ÷ (b) × 100" */
export function latexToText(tex: string): string {
  let s = tex;
  for (let i = 0; i < 5 && s.includes("\\frac"); i++) {
    s = s.replace(/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, "($1) ÷ ($2)");
  }
  return s
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\\sum/g, "Σ ")
    .replace(/\\%/g, "%").replace(/\\,|\\ /g, " ")
    .replace(/\s+/g, " ").trim();
}

/** Splits inline markdown into styled runs. */
function runs(text: string, base: { bold?: boolean; color?: string } = {}): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\$[^$]+\$)/g).filter(Boolean);
  return parts.map((part) => {
    if (part.startsWith("**")) return new TextRun({ text: part.slice(2, -2), bold: true, color: base.color });
    if (part.startsWith("`")) return new TextRun({ text: part.slice(1, -1), font: "Consolas", size: 20, color: base.color });
    if (part.startsWith("$")) return new TextRun({ text: latexToText(part.slice(1, -1)), italics: true, font: "Cambria Math", color: base.color });
    if (part.startsWith("*")) return new TextRun({ text: part.slice(1, -1), italics: true, bold: base.bold, color: base.color });
    return new TextRun({ text: part, bold: base.bold, color: base.color });
  });
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };

function table(rows: string[][]): Table {
  const [head, ...body] = rows;
  const cell = (text: string, isHead: boolean) => new TableCell({
    children: [new Paragraph({ children: runs(text, isHead ? { bold: true, color: "FFFFFF" } : {}) })],
    shading: isHead ? { type: ShadingType.CLEAR, color: "auto", fill: NAVY } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: head.map((c) => cell(c, true)) }),
      ...body.map((r) => new TableRow({ children: r.map((c) => cell(c, false)) })),
    ],
  });
}

function convert(md: string): (Paragraph | Table)[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: (Paragraph | Table)[] = [];
  let listInstance = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("$$")) {
      blocks.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.CLEAR, color: "auto", fill: "F4F7FF" },
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: latexToText(line.replace(/^\$\$|\$\$$/g, "")), font: "Cambria Math", size: 24 })],
      }));
      i++;
    } else if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const heading = [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2][level - 1];
      blocks.push(new Paragraph({ heading, children: runs(line.slice(level + 1)) }));
      i++;
    } else if (/^---+$/.test(line.trim())) {
      blocks.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "F2CB49", space: 1 } } }));
      i++;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push(table(rows), new Paragraph({ text: "" }));
    } else if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const instance = ++listInstance;
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) {
        const text = lines[i].replace(/^(- |\d+\. )/, "");
        blocks.push(new Paragraph({
          children: runs(text),
          ...(ordered ? { numbering: { reference: "numbered", level: 0, instance } } : { bullet: { level: 0 } }),
        }));
        i++;
      }
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#|\||- |\d+\. |\$\$|---)/.test(lines[i])) {
        para.push(lines[i].trim());
        i++;
      }
      blocks.push(new Paragraph({ spacing: { after: 120 }, children: runs(para.join(" ")) }));
    }
  }
  return blocks;
}

async function main() {
  const doc = new Document({
    creator: "RADiTrack",
    title: "RADiTrack: Data Computations, Formulas and Definitions",
    styles: {
      default: { document: { run: { font: "Calibri", size: 22, color: "1E293B" } } },
      paragraphStyles: [
        { id: "Title", name: "Title", run: { size: 40, bold: true, color: NAVY } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { size: 30, bold: true, color: NAVY }, paragraph: { spacing: { before: 280, after: 120 } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { size: 25, bold: true, color: "18298C" }, paragraph: { spacing: { before: 200, after: 80 } } },
      ],
    },
    numbering: {
      config: [{ reference: "numbered", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START }] }],
    },
    sections: [{ children: convert(readFileSync(SRC, "utf8")) }],
  });
  writeFileSync(OUT, await Packer.toBuffer(doc));
  console.log(`Wrote ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
