import { TEMPLATE_IDS } from '../templates/templateConfig.js';

export function validateGenerateBody(body, maxLength) {
  if (!body || typeof body !== 'object') {
    return 'Request body must be a JSON object.';
  }

  const { jobPosting, originalCv, preferredTemplate, mustIncludeKeywords } = body;

  if (typeof jobPosting !== 'string' || typeof originalCv !== 'string') {
    return 'jobPosting and originalCv must both be strings.';
  }

  if (!jobPosting.trim() || !originalCv.trim()) {
    return 'jobPosting and originalCv cannot be empty.';
  }

  if (jobPosting.length > maxLength || originalCv.length > maxLength) {
    return `Each input must be at most ${maxLength} characters.`;
  }

  if (preferredTemplate !== undefined && !TEMPLATE_IDS.includes(preferredTemplate)) {
    return `preferredTemplate must be one of: ${TEMPLATE_IDS.join(', ')}.`;
  }

  if (mustIncludeKeywords !== undefined) {
    if (!Array.isArray(mustIncludeKeywords)) {
      return 'mustIncludeKeywords must be an array of strings.';
    }

    if (mustIncludeKeywords.length > 25) {
      return 'mustIncludeKeywords can include at most 25 items.';
    }

    const invalid = mustIncludeKeywords.find(
      (item) => typeof item !== 'string' || !item.trim() || item.length > 60
    );
    if (invalid !== undefined) {
      return 'Each mustIncludeKeywords item must be a non-empty string up to 60 characters.';
    }
  }

  return null;
}

export function validateVariantBody(body) {
  if (!body || typeof body !== 'object' || typeof body.variant !== 'object') {
    return 'Body must include a variant object.';
  }

  const { variant } = body;
  if (!variant.templateId || !variant.templateName || !variant.tailoredCvSections || !variant.plainTextCv) {
    return 'variant is missing required fields.';
  }

  return null;
}
