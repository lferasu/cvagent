import express from 'express';
import { config } from '../config.js';
import { validateGenerateBody, validateVariantBody } from '../utils/validation.js';
import { createInMemoryRateLimiter } from '../utils/rateLimit.js';
import { CvGeneratorService } from '../services/openaiService.js';
import { MockCvGeneratorService } from '../services/mockGeneratorService.js';
import { generateDocxBuffer, generatePdfBuffer } from '../services/exportService.js';

const router = express.Router();
const limiter = createInMemoryRateLimiter({
  windowMs: config.rateLimitWindowMs,
  maxRequests: config.rateLimitMaxRequests
});

const openAiGenerator = config.openAiApiKey ? new CvGeneratorService(config.openAiApiKey) : null;
const mockGenerator = new MockCvGeneratorService();


router.post('/generate-cvs', limiter, async (req, res) => {
  const validationError = validateGenerateBody(req.body, config.maxInputLength);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }


  try {
    if (!openAiGenerator) {
      const fallbackResult = await mockGenerator.generateVariants(req.body);
      return res.json({
        ...fallbackResult,
        meta: {
          mode: 'mock',
          reason: 'OPENAI_API_KEY is not configured. Using mock generator.'
        }
      });
    }

    try {
      const result = await openAiGenerator.generateVariants(req.body);
      return res.json({
        ...result,
        meta: {
          mode: 'openai'
        }
      });
    } catch (error) {
      const fallbackResult = await mockGenerator.generateVariants(req.body);
      return res.json({
        ...fallbackResult,
        meta: {
          mode: 'mock',
          reason: 'OpenAI generation is currently unavailable. Using mock generator instead.'
        }
      });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate CV variants.', details: error.message });
  }
});

router.post('/export/docx', async (req, res) => {
  const validationError = validateVariantBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const buffer = await generateDocxBuffer(req.body.variant);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${req.body.variant.templateId}-cv.docx"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to export DOCX.', details: error.message });
  }
});

router.post('/export/pdf', async (req, res) => {
  const validationError = validateVariantBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const buffer = await generatePdfBuffer(req.body.variant);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.body.variant.templateId}-cv.pdf"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to export PDF.', details: error.message });
  }
});

export default router;
