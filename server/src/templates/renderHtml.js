import { TEMPLATE_META } from './templateConfig.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderList(items = []) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderExperience(entries = []) {
  return entries
    .map((item) => `
      <div class="entry">
        <div class="entry-title">${escapeHtml(item.role || '')} ${item.company ? `| ${escapeHtml(item.company)}` : ''}</div>
        <div class="entry-sub">${escapeHtml(item.dates || '')}</div>
        ${renderList(item.bullets || [])}
      </div>
    `)
    .join('');
}

function section(title, body) {
  if (!body) return '';
  return `<section><h2>${title}</h2>${body}</section>`;
}

function renderSection(key, data) {
  switch (key) {
    case 'summary':
      return section('Summary', `<p>${escapeHtml(data.summary || '')}</p>`);
    case 'skills':
      return section('Skills', renderList(data.skills || []));
    case 'experience':
      return section('Experience', renderExperience(data.experience || []));
    case 'projects': {
      const projectHtml = (data.projects || [])
        .map((item) => `
          <div class="entry">
            <div class="entry-title">${escapeHtml(item.name || '')}</div>
            ${item.context ? `<div class="entry-sub">${escapeHtml(item.context)}</div>` : ''}
            ${renderList(item.bullets || [])}
          </div>
        `)
        .join('');
      return section('Projects', projectHtml);
    }
    case 'education':
      return section('Education', renderList(data.education || []));
    case 'certifications':
      return section('Certifications', renderList(data.certifications || []));
    default:
      return '';
  }
}

function templateStyles(templateId) {
  if (templateId === 'modern') {
    return `
      body { font-family: Inter, Arial, sans-serif; color:#152238; }
      h1 { color:#004f8c; letter-spacing:0.5px; }
      h2 { color:#004f8c; border-bottom:2px solid #d8e9f7; }
    `;
  }

  if (templateId === 'ats') {
    return `
      body { font-family: Arial, Helvetica, sans-serif; color:#111; }
      h1, h2 { color:#111; }
      section { margin-bottom:12px; }
      li { margin-bottom:2px; }
    `;
  }

  return `
    body { font-family: 'Times New Roman', Times, serif; color:#1f1f1f; }
    h1 { color:#2b2b2b; }
    h2 { color:#2b2b2b; border-bottom:1px solid #cfcfcf; }
  `;
}

export function renderCvHtml(variant) {
  const { templateId, templateName, tailoredCvSections } = variant;
  const template = TEMPLATE_META[templateId] || TEMPLATE_META.classic;

  const orderedSections = template.order.map((key) => renderSection(key, tailoredCvSections)).join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 30px; line-height: 1.35; font-size: 12px; }
          h1 { margin: 0 0 4px; font-size: 24px; }
          .contact { margin-bottom: 12px; font-size: 11px; }
          h2 { margin: 14px 0 6px; font-size: 14px; text-transform: uppercase; padding-bottom:3px; }
          p { margin: 0; }
          ul { margin: 6px 0 0 18px; padding: 0; }
          .entry { margin-bottom: 8px; }
          .entry-title { font-weight: 700; }
          .entry-sub { font-size: 11px; color: #444; margin-bottom: 3px; }
          ${templateStyles(templateId)}
        </style>
      </head>
      <body>
        <h1>${escapeHtml(tailoredCvSections.header?.name || 'Candidate')}</h1>
        <div class="contact">${escapeHtml(tailoredCvSections.header?.contact || '')}</div>
        ${orderedSections}
        <footer style="margin-top:14px;font-size:10px;color:#666;">Template: ${escapeHtml(templateName)}</footer>
      </body>
    </html>
  `;
}
