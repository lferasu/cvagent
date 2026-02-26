import OpenAI from 'openai';
import { TEMPLATE_IDS, TEMPLATE_META } from '../templates/templateConfig.js';

const schema = {
  name: 'single_cv_variant_response',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      variant: {
        type: 'object',
        additionalProperties: false,
        properties: {
          variantId: { type: 'string' },
          templateId: { type: 'string', enum: TEMPLATE_IDS },
          rationale: { type: 'string' },
          tailoredCvSections: {
            type: 'object',
            additionalProperties: false,
            properties: {
              header: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  name: { type: 'string' },
                  contact: { type: 'string' }
                },
                required: ['name', 'contact']
              },
              summary: { type: 'string' },
              skills: { type: 'array', items: { type: 'string' } },
              experience: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    role: { type: 'string' },
                    company: { type: 'string' },
                    dates: { type: 'string' },
                    bullets: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['role', 'company', 'dates', 'bullets']
                }
              },
              projects: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    context: { type: 'string' },
                    bullets: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['name', 'context', 'bullets']
                }
              },
              education: { type: 'array', items: { type: 'string' } },
              certifications: { type: 'array', items: { type: 'string' } }
            },
            required: ['header', 'summary', 'skills', 'experience', 'projects', 'education', 'certifications']
          },
          plainTextCv: { type: 'string' }
        },
        required: ['variantId', 'templateId', 'rationale', 'tailoredCvSections', 'plainTextCv']
      }
    },
    required: ['variant']
  }
};

function createPrompt(jobPosting, originalCv, preferredTemplate, mustIncludeKeywords = []) {
  const keywordLine = mustIncludeKeywords.length
    ? `Must-include keywords (use naturally and truthfully where relevant): ${mustIncludeKeywords.join(', ')}.`
    : 'Must-include keywords: none provided.';

  return [
    'You are an expert resume editor.',
    `Generate exactly 1 CV variant for template id: ${preferredTemplate}.`,
    `Set templateId to exactly "${preferredTemplate}" in the JSON output.`,
    keywordLine,
    'Try to maximize coverage of the must-include keywords in summary, skills, and experience bullets where truthful.',
    'STRICT RULES: Do not invent employers, dates, degrees, or certifications. Rephrase and reorder only from provided CV.',
    'Only use the job posting to prioritize language; never copy job posting sentences into any CV section.',
    'Do not include page numbers, labels like "About the job", or posting boilerplate in output.',
    'Keep content truthful and concise.',
    `Job Posting:\n${jobPosting}`,
    `Original CV:\n${originalCv}`
  ].join('\n\n');
}

function normalizeText(text = '') {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

function cleanLine(value = '') {
  return String(value)
    .replace(/\bpage\s+\d+(\s*of\s*\d+)?\b/gi, '')
    .replace(/^\d+\s*[\).:-]?\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldDropLine(line, normalizedJobPosting, normalizedCv) {
  if (!line) return true;
  const normalizedLine = normalizeText(line);
  if (!normalizedLine) return true;
  if (normalizedLine === 'about the job' || normalizedLine.startsWith('your journey at')) return true;

  if (normalizedLine.length >= 28 && normalizedJobPosting.includes(normalizedLine) && !normalizedCv.includes(normalizedLine)) {
    return true;
  }

  return false;
}

function cleanList(values = [], context) {
  return values
    .map((item) => cleanLine(item))
    .filter((item) => !shouldDropLine(item, context.normalizedJobPosting, context.normalizedCv));
}

function toPlainText(sections) {
  const lines = [sections.header?.name || 'Candidate', sections.header?.contact || '', '', 'SUMMARY', sections.summary || '', '', 'SKILLS'];
  (sections.skills || []).forEach((skill) => lines.push(`- ${skill}`));

  lines.push('', 'EXPERIENCE');
  (sections.experience || []).forEach((entry) => {
    lines.push(`${entry.role} | ${entry.company} (${entry.dates})`);
    (entry.bullets || []).forEach((bullet) => lines.push(`- ${bullet}`));
  });

  lines.push('', 'PROJECTS');
  (sections.projects || []).forEach((project) => {
    lines.push(`${project.name} - ${project.context}`);
    (project.bullets || []).forEach((bullet) => lines.push(`- ${bullet}`));
  });

  lines.push('', 'EDUCATION');
  (sections.education || []).forEach((item) => lines.push(`- ${item}`));

  lines.push('', 'CERTIFICATIONS');
  (sections.certifications || []).forEach((item) => lines.push(`- ${item}`));

  return lines.join('\n');
}

function cleanVariant(variant, context) {
  const sections = variant.tailoredCvSections || {};

  const experience = (sections.experience || []).map((entry) => ({
    ...entry,
    role: cleanLine(entry.role || ''),
    company: cleanLine(entry.company || ''),
    dates: cleanLine(entry.dates || ''),
    bullets: cleanList(entry.bullets || [], context)
  }));

  const projects = (sections.projects || []).map((entry) => ({
    ...entry,
    name: cleanLine(entry.name || ''),
    context: cleanLine(entry.context || ''),
    bullets: cleanList(entry.bullets || [], context)
  }));

  const tailoredCvSections = {
    ...sections,
    header: {
      name: cleanLine(sections.header?.name || 'Candidate'),
      contact: cleanLine(sections.header?.contact || '')
    },
    summary: cleanLine(sections.summary || ''),
    skills: cleanList(sections.skills || [], context),
    experience,
    projects,
    education: cleanList(sections.education || [], context),
    certifications: cleanList(sections.certifications || [], context)
  };

  return {
    ...variant,
    tailoredCvSections,
    plainTextCv: toPlainText(tailoredCvSections)
  };
}

export class CvGeneratorService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async generateVariants({ jobPosting, originalCv, preferredTemplate = 'modern', mustIncludeKeywords = [] }) {
    const requestedTemplate = TEMPLATE_IDS.includes(preferredTemplate) ? preferredTemplate : 'modern';
    const sanitizedKeywords = [...new Set((mustIncludeKeywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean))].slice(0, 25);

    const response = await this.client.responses.create({
      model: 'gpt-4.1-mini',
      input: createPrompt(jobPosting, originalCv, requestedTemplate, sanitizedKeywords),
      text: {
        format: {
          type: 'json_schema',
          name: schema.name,
          schema: schema.schema,
          strict: true
        }
      }
    });

    const parsed = JSON.parse(response.output_text);

    const context = {
      normalizedJobPosting: normalizeText(jobPosting),
      normalizedCv: normalizeText(originalCv)
    };

    const cleaned = cleanVariant(parsed.variant, context);

    const variant = {
      ...cleaned,
      variantId: cleaned.variantId || 'variant-1',
      templateId: requestedTemplate,
      templateName: TEMPLATE_META[requestedTemplate].templateName
    };

    return {
      variants: [variant]
    };
  }
}
