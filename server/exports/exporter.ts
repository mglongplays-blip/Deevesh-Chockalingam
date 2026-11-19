import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from 'docx';
import PDFDocument from 'pdfkit';
import PptxGenJS from 'pptxgenjs';
import type { AssignmentRecord, ReferenceRecord } from '../types.ts';

interface ParsedLine {
  type: 'h1' | 'h2' | 'h3' | 'bullet' | 'paragraph';
  text: string;
}

function parseMarkdownLines(markdown: string): ParsedLine[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const parsed: ParsedLine[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('### ')) {
      parsed.push({ type: 'h3', text: line.slice(4).trim() });
    } else if (line.startsWith('## ')) {
      parsed.push({ type: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('# ')) {
      parsed.push({ type: 'h1', text: line.slice(2).trim() });
    } else if (/^[-*•]\s+/.test(line)) {
      parsed.push({ type: 'bullet', text: line.replace(/^[-*•]\s+/, '').trim() });
    } else {
      parsed.push({ type: 'paragraph', text: line.replace(/\*\*/g, '') });
    }
  }
  return parsed;
}

export async function generateAssignmentDocx(
  assignment: AssignmentRecord,
  references: ReferenceRecord[]
): Promise<Buffer> {
  const lines = parseMarkdownLines(assignment.draft_markdown || '');
  const children: Paragraph[] = [
    new Paragraph({
      text: assignment.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${assignment.assignment_type} · ${assignment.subject || 'Academic Study'} · ${assignment.academic_level} · ${assignment.referencing_style}`,
          color: '475569',
          size: 20,
        }),
      ],
      spacing: { after: 320 },
    }),
  ];

  for (const item of lines) {
    if (item.type === 'h1') {
      children.push(
        new Paragraph({
          text: item.text,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 280, after: 120 },
        })
      );
    } else if (item.type === 'h2') {
      children.push(
        new Paragraph({
          text: item.text,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
        })
      );
    } else if (item.type === 'h3') {
      children.push(
        new Paragraph({
          text: item.text,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 180, after: 80 },
        })
      );
    } else if (item.type === 'bullet') {
      children.push(
        new Paragraph({
          text: item.text,
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: item.text, size: 22 })],
          spacing: { after: 160, line: 340 },
        })
      );
    }
  }

  if (references.length > 0) {
    children.push(
      new Paragraph({
        text: 'References',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 160 },
      })
    );
    for (const ref of references) {
      children.push(
        new Paragraph({
          text: ref.formatted_reference || `${ref.author} (${ref.publication_year}). ${ref.title}.`,
          spacing: { after: 120 },
          indent: { left: 480, hanging: 480 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${assignment.title} · Page ` }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export async function generateAssignmentPdf(
  assignment: AssignmentRecord,
  references: ReferenceRecord[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 64, bottom: 64, left: 64, right: 64 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#0F172A').text(assignment.title);
    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(
        `${assignment.assignment_type} | ${assignment.subject || 'General'} | ${assignment.academic_level} | ${assignment.referencing_style}`
      );
    doc.moveDown(1.2);

    const lines = parseMarkdownLines(assignment.draft_markdown || '');
    for (const item of lines) {
      if (item.type === 'h1') {
        doc.moveDown(0.6).font('Helvetica-Bold').fontSize(15).fillColor('#1E1B4B').text(item.text);
        doc.moveDown(0.3);
      } else if (item.type === 'h2') {
        doc.moveDown(0.5).font('Helvetica-Bold').fontSize(13).fillColor('#1E293B').text(item.text);
        doc.moveDown(0.25);
      } else if (item.type === 'h3') {
        doc.moveDown(0.3).font('Helvetica-Bold').fontSize(11.5).fillColor('#334155').text(item.text);
        doc.moveDown(0.2);
      } else if (item.type === 'bullet') {
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor('#1E293B')
          .text(`• ${item.text}`, { indent: 16, lineGap: 4 });
        doc.moveDown(0.2);
      } else {
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor('#1E293B')
          .text(item.text, { align: 'left', lineGap: 5 });
        doc.moveDown(0.5);
      }
    }

    if (references.length > 0) {
      doc.moveDown(0.8).font('Helvetica-Bold').fontSize(14).fillColor('#1E1B4B').text('References');
      doc.moveDown(0.4);
      for (const ref of references) {
        doc
          .font('Helvetica')
          .fontSize(10.5)
          .fillColor('#334155')
          .text(ref.formatted_reference || `${ref.author} (${ref.publication_year}). ${ref.title}.`, {
            lineGap: 4,
          });
        doc.moveDown(0.35);
      }
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#64748B')
        .text(`Page ${i + 1} of ${range.count}`, 64, doc.page.height - 42, {
          align: 'right',
          width: doc.page.width - 128,
        });
    }

    doc.end();
  });
}

export function generateAssignmentTxt(assignment: AssignmentRecord, references: ReferenceRecord[]): string {
  const header = [
    assignment.title,
    `${assignment.assignment_type} | ${assignment.subject || 'General'} | ${assignment.academic_level} | ${assignment.referencing_style}`,
    '='.repeat(72),
    '',
  ].join('\n');

  const refsBlock =
    references.length > 0
      ? `\n\nREFERENCES\n${'-'.repeat(32)}\n${references
          .map((r) => r.formatted_reference || `${r.author} (${r.publication_year}). ${r.title}.`)
          .join('\n\n')}`
      : '';

  return `${header}${assignment.draft_markdown || ''}${refsBlock}\n`;
}

export interface PresentationSlideInput {
  title: string;
  subtitle?: string;
  bullets: string[];
  speaker_notes?: string;
  layout?: string;
}

export interface PresentationDeckInput {
  title: string;
  subtitle?: string;
  slides: PresentationSlideInput[];
}

export async function generatePresentationPptx(deck: PresentationDeckInput): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = deck.title;
  pptx.author = 'MG - Meet Genie';

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '0B1120' };
  titleSlide.addText(deck.title, {
    x: 0.8,
    y: 1.8,
    w: 8.4,
    h: 1.4,
    fontSize: 34,
    bold: true,
    color: 'FFFFFF',
    fontFace: 'Arial',
  });
  if (deck.subtitle) {
    titleSlide.addText(deck.subtitle, {
      x: 0.8,
      y: 3.3,
      w: 8.4,
      h: 0.8,
      fontSize: 16,
      color: 'C4B5FD',
      fontFace: 'Arial',
    });
  }
  titleSlide.addText('Prepared with MG – Meet Genie', {
    x: 0.8,
    y: 4.8,
    w: 6,
    h: 0.4,
    fontSize: 11,
    color: '94A3B8',
  });

  // Content Slides
  deck.slides.forEach((slideItem, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: 10,
      h: 0.14,
      fill: { color: '4F46E5' },
    });
    slide.addText(slideItem.title, {
      x: 0.7,
      y: 0.45,
      w: 8.6,
      h: 0.7,
      fontSize: 24,
      bold: true,
      color: '0F172A',
      fontFace: 'Arial',
    });

    if (slideItem.subtitle) {
      slide.addText(slideItem.subtitle, {
        x: 0.7,
        y: 1.12,
        w: 8.6,
        h: 0.4,
        fontSize: 13,
        color: '475569',
      });
    }

    const bulletLines = slideItem.bullets.map((b) => ({
      text: b,
      options: { bullet: true, breakLine: true, fontSize: 16, color: '1E293B', paraSpaceAfter: 10 },
    }));

    slide.addText(bulletLines, {
      x: 0.7,
      y: slideItem.subtitle ? 1.65 : 1.35,
      w: 8.6,
      h: 3.5,
      valign: 'top',
    });

    slide.addText(`${idx + 1}`, {
      x: 9.0,
      y: 5.2,
      w: 0.5,
      h: 0.3,
      fontSize: 10,
      color: '64748B',
      align: 'right',
    });

    if (slideItem.speaker_notes) {
      slide.addNotes(slideItem.speaker_notes);
    }
  });

  const out = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(out) ? out : Buffer.from(out as Uint8Array);
}
