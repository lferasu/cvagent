import { TEMPLATE_META, TEMPLATE_IDS } from '../templates/templateConfig.js';

function toLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildSections(originalCv, emphasis) {
  const cvLines = toLines(originalCv);
  const name = cvLines[0] || 'Candidate Name';
  const contact = cvLines[1] || 'email@example.com | +1 555-000-0000';
  const summarySource = cvLines.slice(2, 5).join(' ');
  const summary = summarySource || `Candidate profile tailored for ${emphasis.toLowerCase()} roles.`;

  return {
    header: { name, contact },
    summary,
    skills: [...new Set(cvLines.slice(5, 12))].slice(0, 8),
    experience: [
      {
        role: 'Relevant Experience',
        company: 'From original CV',
        dates: 'As provided',
        bullets: cvLines.slice(8, 12).length
          ? cvLines.slice(8, 12)
          : [
              `Highlighted achievements with ${emphasis.toLowerCase()} focus.`,
              'Kept details truthful and limited to supplied CV content.'
            ]
      }
    ],
    projects: [
      {
        name: 'Key Project Highlights',
        context: emphasis,
        bullets: cvLines.slice(12, 15).length
          ? cvLines.slice(12, 15)
          : ['Aligned project outcomes with the target job posting.', 'Prioritized measurable impact and relevant keywords.']
      }
    ],
    education: cvLines.slice(15, 17).length ? cvLines.slice(15, 17) : ['Education details preserved from original CV.'],
    certifications: cvLines.slice(17, 19).length ? cvLines.slice(17, 19) : ['Certifications preserved from original CV (if provided).']
  };
}

function toPlainText(sections) {
  const out = [];
  out.push(sections.header.name, sections.header.contact, '', 'SUMMARY', sections.summary, '', 'SKILLS');
  sections.skills.forEach((skill) => out.push(`- ${skill}`));

  out.push('', 'EXPERIENCE');
  sections.experience.forEach((entry) => {
    out.push(`${entry.role} | ${entry.company} (${entry.dates})`);
    entry.bullets.forEach((bullet) => out.push(`- ${bullet}`));
  });

  out.push('', 'PROJECTS');
  sections.projects.forEach((project) => {
    out.push(`${project.name} — ${project.context}`);
    project.bullets.forEach((bullet) => out.push(`- ${bullet}`));
  });

  out.push('', 'EDUCATION');
  sections.education.forEach((item) => out.push(`- ${item}`));

  out.push('', 'CERTIFICATIONS');
  sections.certifications.forEach((item) => out.push(`- ${item}`));

  return out.join('\n');
}

export class MockCvGeneratorService {
  async generateVariants({ originalCv }) {
    return {
      variants: TEMPLATE_IDS.map((templateId, index) => {
        const templateName = TEMPLATE_META[templateId].templateName;
        const emphasis = `${templateName} resume strategy`;
        const tailoredCvSections = buildSections(originalCv, emphasis);

        return {
          variantId: `variant-${index + 1}`,
          templateId,
          templateName,
          rationale: `Generated using built-in mock mode because OPENAI_API_KEY is not configured. ${templateName} emphasizes keywords and structure for the provided posting.`,
          tailoredCvSections,
          plainTextCv: toPlainText(tailoredCvSections)
        };
      })
    };
  }
}
