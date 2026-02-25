import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import puppeteer from 'puppeteer';
import { renderCvHtml } from '../templates/renderHtml.js';
import { TEMPLATE_META } from '../templates/templateConfig.js';

function sectionHeading(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
}

function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}

export async function generateDocxBuffer(variant) {
  const { tailoredCvSections, templateId } = variant;
  const order = TEMPLATE_META[templateId]?.order || TEMPLATE_META.classic.order;

  const children = [
    new Paragraph({
      children: [new TextRun({ text: tailoredCvSections.header?.name || 'Candidate', bold: true, size: 32 })],
      spacing: { after: 120 }
    }),
    new Paragraph({ text: tailoredCvSections.header?.contact || '', spacing: { after: 200 } })
  ];

  for (const key of order) {
    if (key === 'summary') {
      children.push(sectionHeading('Summary'), new Paragraph(tailoredCvSections.summary || ''));
    }

    if (key === 'skills') {
      children.push(sectionHeading('Skills'));
      (tailoredCvSections.skills || []).forEach((skill) => children.push(bullet(skill)));
    }

    if (key === 'experience') {
      children.push(sectionHeading('Experience'));
      (tailoredCvSections.experience || []).forEach((entry) => {
        children.push(new Paragraph({ text: `${entry.role} | ${entry.company} (${entry.dates})`, bold: true }));
        (entry.bullets || []).forEach((item) => children.push(bullet(item)));
      });
    }

    if (key === 'projects') {
      children.push(sectionHeading('Projects'));
      (tailoredCvSections.projects || []).forEach((project) => {
        children.push(new Paragraph({ text: `${project.name} - ${project.context}`, bold: true }));
        (project.bullets || []).forEach((item) => children.push(bullet(item)));
      });
    }

    if (key === 'education') {
      children.push(sectionHeading('Education'));
      (tailoredCvSections.education || []).forEach((item) => children.push(bullet(item)));
    }

    if (key === 'certifications') {
      children.push(sectionHeading('Certifications'));
      (tailoredCvSections.certifications || []).forEach((item) => children.push(bullet(item)));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export async function generatePdfBuffer(variant) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(renderCvHtml(variant), { waitUntil: 'networkidle0' });
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' }
    });

    // Puppeteer may return a Uint8Array depending on version/runtime.
    // Express expects a Buffer for binary downloads.
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}
