import { TEMPLATE_META } from './templateConfig.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderList(items = [], className = '') {
  if (!items.length) return '';
  const classAttr = className ? ` class="${className}"` : '';
  return `<ul${classAttr}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
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

function renderSkillsPills(skills = []) {
  if (!skills.length) return '';
  return `<div class="pill-list">${skills.map((skill) => `<span class="pill">${escapeHtml(skill)}</span>`).join('')}</div>`;
}

function section(title, body) {
  if (!body) return '';
  return `<section><h2>${title}</h2>${body}</section>`;
}

function renderSection(key, data, templateId) {
  switch (key) {
    case 'summary':
      return section('Summary', `<p>${escapeHtml(data.summary || '')}</p>`);
    case 'skills': {
      const body = templateId === 'modern' ? renderSkillsPills(data.skills || []) : renderList(data.skills || []);
      return section('Skills', body);
    }
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
      @page { margin: 0; }
      body {
        margin: 0;
        padding: 34px;
        font-family: Inter, 'Segoe UI', Arial, sans-serif;
        color: #17324d;
        background: linear-gradient(180deg, #eef4ff 0%, #ffffff 20%);
      }
      .page {
        max-width: 800px;
        margin: 0 auto;
      }
      .hero {
        margin-bottom: 18px;
        background: linear-gradient(120deg, #234f93, #2c7dc6);
        color: #f7fbff;
        border-radius: 12px;
        padding: 18px 20px;
      }
      h1 {
        margin: 0;
        font-size: 29px;
        letter-spacing: 0.5px;
      }
      .contact {
        margin-top: 8px;
        font-size: 12px;
        opacity: 0.95;
      }
      h2 {
        color: #234f93;
        margin: 16px 0 8px;
        padding-bottom: 4px;
        border-bottom: 2px solid #cfe0f7;
        font-size: 12px;
        letter-spacing: 1.2px;
        text-transform: uppercase;
      }
      section {
        background: #ffffff;
        border: 1px solid #e2eaf5;
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 10px;
        box-shadow: 0 3px 8px rgba(23, 50, 77, 0.06);
      }
      p {
        margin: 0;
        line-height: 1.45;
      }
      ul {
        margin: 6px 0 0 18px;
        padding: 0;
      }
      li {
        margin-bottom: 3px;
      }
      .entry {
        margin-bottom: 10px;
      }
      .entry:last-child {
        margin-bottom: 0;
      }
      .entry-title {
        font-weight: 700;
      }
      .entry-sub {
        margin-top: 1px;
        font-size: 11px;
        color: #4d6380;
        margin-bottom: 4px;
      }
      .pill-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .pill {
        border: 1px solid #b9d0f0;
        background: #eff5ff;
        color: #1d4677;
        border-radius: 999px;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 600;
      }
      footer {
        margin-top: 10px;
        font-size: 10px;
        color: #4f6788;
      }
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

  const orderedSections = template.order
    .map((key) => renderSection(key, tailoredCvSections, templateId))
    .join('');

  const hero =
    templateId === 'modern'
      ? `<header class="hero"><h1>${escapeHtml(tailoredCvSections.header?.name || 'Candidate')}</h1><div class="contact">${escapeHtml(tailoredCvSections.header?.contact || '')}</div></header>`
      : `<h1>${escapeHtml(tailoredCvSections.header?.name || 'Candidate')}</h1><div class="contact">${escapeHtml(tailoredCvSections.header?.contact || '')}</div>`;

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
        <div class="page">
          ${hero}
          ${orderedSections}
          <footer>Template: ${escapeHtml(templateName)}</footer>
        </div>
      </body>
    </html>
  `;
}
