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
    'Rank the templates against the job posting and explain fit in rationale per variant.',
    'STRICT RULES: Do not invent employers, dates, degrees, or certifications. Rephrase and reorder only from provided CV.',
    'Each variant should have distinct emphasis and keyword alignment while staying truthful.',
    `Job Posting:\n${jobPosting}`,
    `Original CV:\n${originalCv}`
  ].join('\n\n');
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

    return {
      variants: parsed.variants.map((variant, index) => ({
        ...variant,
        variantId: variant.variantId || `variant-${index + 1}`,
        templateName: templateNames[variant.templateId]
      }))
    };
  }
}
