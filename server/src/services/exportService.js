import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import puppeteer from 'puppeteer';
import { renderCvHtml } from '../templates/renderHtml.js';
import { TEMPLATE_META } from '../templates/templateConfig.js';

function sectionHeading(text, keepNext = true) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    keepNext,
    keepLines: true
  });
}

function bullet(text, keepNext = false) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 80 },
    keepLines: true,
    keepNext
  });
}

function bodyParagraph(text, keepNext = false) {
  return new Paragraph({
    text,
    spacing: { after: 80 },
    keepLines: true,
    keepNext
  });
}

function entryHeading(text, keepNext = true) {
  return new Paragraph({
    text,
    bold: true,
    keepNext,
    keepLines: true,
    spacing: { after: 60 }
  });
}

export async function generateDocxBuffer(variant) {
  const { tailoredCvSections, templateId } = variant;
  const order = TEMPLATE_META[templateId]?.order || TEMPLATE_META.classic.order;

  const children = [
    new Paragraph({
      children: [new TextRun({ text: tailoredCvSections.header?.name || 'Candidate', bold: true, size: 32 })],
      spacing: { after: 120 },
      keepNext: true,
      keepLines: true
    }),
    new Paragraph({ text: tailoredCvSections.header?.contact || '', spacing: { after: 200 }, keepLines: true })
  ];

  for (const key of order) {
    if (key === 'summary') {
      children.push(sectionHeading('Summary'), bodyParagraph(tailoredCvSections.summary || ''));
    }

    if (key === 'skills') {
      children.push(sectionHeading('Skills'));
      const skills = tailoredCvSections.skills || [];
      skills.forEach((skill, index) => {
        const keepNext = index < skills.length - 1;
        children.push(bullet(skill, keepNext));
      });
    }

    if (key === 'experience') {
      children.push(sectionHeading('Experience'));
      (tailoredCvSections.experience || []).forEach((entry) => {
        const bullets = entry.bullets || [];
        const headingText = `${entry.role} | ${entry.company} (${entry.dates})`;
        children.push(entryHeading(headingText, bullets.length > 0));
        bullets.forEach((item, index) => {
          const keepNext = index < bullets.length - 1;
          children.push(bullet(item, keepNext));
        });
      });
    }

    if (key === 'projects') {
      children.push(sectionHeading('Projects'));
      (tailoredCvSections.projects || []).forEach((project) => {
        const bullets = project.bullets || [];
        children.push(entryHeading(`${project.name} - ${project.context}`, bullets.length > 0));
        bullets.forEach((item, index) => {
          const keepNext = index < bullets.length - 1;
          children.push(bullet(item, keepNext));
        });
      });
    }

    if (key === 'education') {
      children.push(sectionHeading('Education'));
      const education = tailoredCvSections.education || [];
      education.forEach((item, index) => {
        const keepNext = index < education.length - 1;
        children.push(bullet(item, keepNext));
      });
    }

    if (key === 'certifications') {
      children.push(sectionHeading('Certifications'));
      const certs = tailoredCvSections.certifications || [];
      certs.forEach((item, index) => {
        const keepNext = index < certs.length - 1;
        children.push(bullet(item, keepNext));
      });
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
