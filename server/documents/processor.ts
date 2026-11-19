import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { PDFParse } from 'pdf-parse';
import { dbStore, getSupabaseAdmin, UPLOADS_DIR } from '../db/store.ts';
import type { DocumentChunkRecord, DocumentRecord } from '../types.ts';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.txt', '.md']);

export function validateUploadedFile(file: Express.Multer.File, maxMb: number): string | null {
  if (!file) return 'No file provided.';
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `Unsupported file type "${ext}". Supported formats: PDF, DOCX, PPTX, TXT, MD.`;
  }
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size <= 0) return 'Uploaded file is empty.';
  if (file.size > maxBytes) {
    return `File exceeds the maximum limit of ${maxMb} MB.`;
  }
  return null;
}

export function sanitizeDocumentText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractPptxText(buffer: Buffer): Promise<{ pages: { page: number; label: string; text: string }[] }> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
      return na - nb;
    });

  const pages: { page: number; label: string; text: string }[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const slideName = slideFiles[i];
    const slideNum = parseInt(slideName.match(/slide(\d+)\.xml/)?.[1] || `${i + 1}`, 10);
    const xml = await zip.files[slideName].async('text');
    const textMatches = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) =>
      decodeXmlEntities(m[1])
    );

    let notesText = '';
    const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    if (zip.files[notesPath]) {
      const notesXml = await zip.files[notesPath].async('text');
      const notesMatches = Array.from(notesXml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) =>
        decodeXmlEntities(m[1])
      );
      notesText = notesMatches.join(' ').trim();
    }

    const combined = [textMatches.join(' ').trim(), notesText ? `Speaker Notes: ${notesText}` : '']
      .filter(Boolean)
      .join('\n');

    if (combined) {
      pages.push({
        page: slideNum,
        label: `Slide ${slideNum}`,
        text: combined,
      });
    }
  }
  return { pages };
}

export interface ExtractionResult {
  pages: { page: number; label: string; text: string }[];
  fullText: string;
  pageCount: number;
  wordCount: number;
  needsOcr: boolean;
}

export async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<ExtractionResult> {
  const ext = path.extname(fileName).toLowerCase();
  let pages: { page: number; label: string; text: string }[] = [];
  let pageCount = 1;
  let needsOcr = false;

  if (ext === '.txt' || ext === '.md') {
    const text = sanitizeDocumentText(buffer.toString('utf-8'));
    pages = [{ page: 1, label: 'Document', text }];
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    const text = sanitizeDocumentText(result.value || '');
    // Split DOCX into logical ~700-word sections for page/section referencing
    const words = text.split(/\s+/);
    const sectionSize = 700;
    const totalSections = Math.max(1, Math.ceil(words.length / sectionSize));
    pageCount = totalSections;
    for (let i = 0; i < totalSections; i++) {
      const slice = words.slice(i * sectionSize, (i + 1) * sectionSize).join(' ');
      if (slice.trim()) {
        pages.push({ page: i + 1, label: `Section ${i + 1}`, text: slice });
      }
    }
  } else if (ext === '.pptx') {
    const pptx = await extractPptxText(buffer);
    pages = pptx.pages;
    pageCount = Math.max(1, pages.length);
  } else if (ext === '.pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      pageCount = Math.max(1, textResult.total || textResult.pages?.length || 1);
      if (textResult.pages && textResult.pages.length > 0) {
        for (const p of textResult.pages) {
          const clean = sanitizeDocumentText(p.text || '');
          if (clean) {
            pages.push({ page: p.num, label: `Page ${p.num}`, text: clean });
          }
        }
      } else if (textResult.text?.trim()) {
        pages = [{ page: 1, label: 'Page 1', text: sanitizeDocumentText(textResult.text) }];
      }
    } finally {
      await parser.destroy().catch(() => {});
    }

    const totalWords = pages.reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0);
    if (totalWords < 15 && buffer.length > 5000) {
      needsOcr = true;
    }
  }

  const fullText = pages.map((p) => `[${p.label}]\n${p.text}`).join('\n\n').trim();
  const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;

  return {
    pages,
    fullText,
    pageCount,
    wordCount,
    needsOcr,
  };
}

export function buildDocumentChunks(
  userId: string,
  documentId: string,
  pages: { page: number; label: string; text: string }[]
): DocumentChunkRecord[] {
  const chunks: DocumentChunkRecord[] = [];
  let chunkIndex = 0;
  const maxWordsPerChunk = 420;
  const overlapWords = 60;

  for (const p of pages) {
    const words = p.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    if (words.length <= maxWordsPerChunk) {
      chunks.push({
        id: dbStore.newId(),
        user_id: userId,
        document_id: documentId,
        chunk_index: chunkIndex++,
        page_number: p.page,
        section_label: p.label,
        content: words.join(' '),
        token_estimate: Math.round(words.length * 1.3),
        created_at: dbStore.now(),
      });
    } else {
      let start = 0;
      while (start < words.length) {
        const end = Math.min(words.length, start + maxWordsPerChunk);
        const slice = words.slice(start, end).join(' ');
        chunks.push({
          id: dbStore.newId(),
          user_id: userId,
          document_id: documentId,
          chunk_index: chunkIndex++,
          page_number: p.page,
          section_label: p.label,
          content: slice,
          token_estimate: Math.round((end - start) * 1.3),
          created_at: dbStore.now(),
        });
        if (end >= words.length) break;
        start = end - overlapWords;
      }
    }
  }
  return chunks;
}

export async function savePrivateFile(
  userId: string,
  docId: string,
  originalName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const safeBase = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const relPath = path.join(userId, `${docId}_${safeBase}`);

  const sb = getSupabaseAdmin();
  if (sb) {
    await sb.storage.from('mg-documents').upload(relPath, buffer, {
      contentType: mimeType,
      upsert: true,
    });
  }

  const userDir = path.join(UPLOADS_DIR, userId);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, relPath), buffer);
  return relPath;
}

export interface RetrievedChunk {
  document_id: string;
  file_name: string;
  page_number: number;
  section_label: string;
  content: string;
  score: number;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'your', 'about', 'what', 'which',
  'when', 'where', 'have', 'has', 'are', 'was', 'were', 'will', 'can', 'how', 'why',
  'into', 'onto', 'upon', 'their', 'there', 'then', 'than', 'also', 'been', 'being',
]);

export async function retrieveRelevantChunks(
  userId: string,
  query: string,
  documentIds?: string[],
  limit = 8
): Promise<RetrievedChunk[]> {
  const allDocs = await dbStore.listDocuments(userId);
  const targetDocs =
    documentIds && documentIds.length > 0
      ? allDocs.filter((d) => documentIds.includes(d.id))
      : allDocs;

  if (targetDocs.length === 0) return [];
  const docMap = new Map<string, DocumentRecord>(targetDocs.map((d) => [d.id, d]));
  const chunks = await dbStore.listChunksForDocuments(
    userId,
    targetDocs.map((d) => d.id)
  );

  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const scored: RetrievedChunk[] = chunks.map((chunk) => {
    const lower = chunk.content.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const matches = lower.split(term).length - 1;
      if (matches > 0) {
        score += 2 + Math.min(matches, 5) * 0.6;
      }
    }
    // Slight preference for early/overview chunks if query has few keywords
    if (terms.length === 0) {
      score = 1 / (chunk.chunk_index + 1);
    }
    const doc = docMap.get(chunk.document_id);
    return {
      document_id: chunk.document_id,
      file_name: doc?.file_name || 'Document',
      page_number: chunk.page_number,
      section_label: chunk.section_label,
      content: chunk.content,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  // Ensure at least top chunks are returned even if exact keyword overlap is low
  const top = scored.slice(0, limit);
  return top;
}

export function formatUntrustedContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return 'No uploaded document passages matched.';
  return chunks
    .map(
      (c, i) =>
        `<untrusted_document index="${i + 1}" file="${c.file_name}" location="${c.section_label}" page="${c.page_number}">\n${c.content}\n</untrusted_document>`
    )
    .join('\n\n');
}
