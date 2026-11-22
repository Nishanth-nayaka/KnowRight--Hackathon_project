// PDF.js initializes rendering globals at import time, but this server only uses getText().
class TextOnlyDOMMatrix {
  constructor() {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
  }
}

class TextOnlyImageData {}
class TextOnlyPath2D {}

let PDFParse;

async function getPDFParse() {
  if (!PDFParse) {
    globalThis.DOMMatrix ??= TextOnlyDOMMatrix;
    globalThis.ImageData ??= TextOnlyImageData;
    globalThis.Path2D ??= TextOnlyPath2D;
    ({ PDFParse } = await import('pdf-parse'));
  }
  return PDFParse;
}

export async function extractPdfText(data) {
  const Parser = await getPDFParse();
  const parser = new Parser({ data });
  try {
    const extracted = await parser.getText();
    return typeof extracted.text === 'string' ? extracted.text.trim() : '';
  } finally {
    await parser.destroy();
  }
}
