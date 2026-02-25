import OpenAI from 'openai';
import { TEMPLATE_IDS } from '../templates/templateConfig.js';

const schema = {
  name: 'cv_variants_response',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      variants: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
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
      }
    },
    required: ['variants']
  }
};

function createPrompt(jobPosting, originalCv) {
  return [
    'You are an expert resume editor.',
    'Generate exactly 3 variants for templates classic, modern, and ats.',
    'Return one and only one variant for each template id.',
    'Rank the templates against the job posting and explain fit in rationale per variant.',
    'STRICT RULES: Do not invent employers, dates, degrees, or certifications. Rephrase and reorder only from provided CV.',
    'Only use the job posting to prioritize language; never copy job posting sentences into any CV section.',
    'Do not include page numbers, labels like "About the job", or posting boilerplate in output.',
    'Each variant should have distinct emphasis and keyword alignment while staying truthful.',
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
    lines.push(`${project.name} — ${project.context}`);
    (project.bullets || []).forEach((bullet) => lines.push(`- ${bullet}`));
  });

  lines.push('', 'EDUCATION');
  (sections.education || []).forEach((item) => lines.push(`- ${item}`));

  lines.push('', 'CERTIFICATIONS');
  (sections.certifications || []).forEach((item) => lines.push(`- ${item}`));

  return lines.join('\n');
}

function cleanVariant(variant, context) {
  const sections = variant.tailoredCvSections;

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

function normalizeVariants(parsedVariants, context) {
  const byTemplate = new Map();
  parsedVariants.forEach((variant) => {
    if (!byTemplate.has(variant.templateId)) {
      byTemplate.set(variant.templateId, cleanVariant(variant, context));
    }
  });

  const fallback = parsedVariants[0];
  return TEMPLATE_IDS.map((templateId, index) => {
    const variant = byTemplate.get(templateId) || cleanVariant({ ...fallback, templateId }, context);
    return {
      ...variant,
      variantId: variant.variantId || `variant-${index + 1}`,
      templateId
    };
  });
}

export class CvGeneratorService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async generateVariants({ jobPosting, originalCv }) {
    const response = await this.client.responses.create({
      model: 'gpt-4.1-mini',
      input: createPrompt(jobPosting, originalCv),
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

    const templateNames = {
      classic: 'Classic',
      modern: 'Modern',
      ats: 'ATS-Friendly'
    };

    const context = {
      normalizedJobPosting: normalizeText(jobPosting),
      normalizedCv: normalizeText(originalCv)
    };

    const variants = normalizeVariants(parsed.variants, context);

    return {
      variants: variants.map((variant) => ({
        ...variant,
        templateName: templateNames[variant.templateId]
      }))
    };
  }
}
