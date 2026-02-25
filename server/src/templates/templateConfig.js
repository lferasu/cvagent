export const TEMPLATE_META = {
  classic: {
    templateId: 'classic',
    templateName: 'Classic',
    order: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications']
  },
  modern: {
    templateId: 'modern',
    templateName: 'Modern',
    order: ['summary', 'experience', 'projects', 'skills', 'education', 'certifications']
  },
  ats: {
    templateId: 'ats',
    templateName: 'ATS-Friendly',
    order: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications']
  }
};

export const TEMPLATE_IDS = Object.keys(TEMPLATE_META);
