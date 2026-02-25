export function validateGenerateBody(body, maxLength) {
  if (!body || typeof body !== 'object') {
    return 'Request body must be a JSON object.';
  }

  const { jobPosting, originalCv } = body;

  if (typeof jobPosting !== 'string' || typeof originalCv !== 'string') {
    return 'jobPosting and originalCv must both be strings.';
  }

  if (!jobPosting.trim() || !originalCv.trim()) {
    return 'jobPosting and originalCv cannot be empty.';
  }

  if (jobPosting.length > maxLength || originalCv.length > maxLength) {
    return `Each input must be at most ${maxLength} characters.`;
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
