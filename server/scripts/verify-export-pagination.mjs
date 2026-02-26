import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { generateDocxBuffer, generatePdfBuffer } from '../src/services/exportService.js';
import { renderCvHtml } from '../src/templates/renderHtml.js';

const OUT_DIR = path.resolve(process.cwd(), 'tmp', 'export-check');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildSampleVariant(templateId = 'modern') {
  return {
    templateId,
    templateName: templateId === 'modern' ? 'Modern' : templateId === 'ats' ? 'ATS-Friendly' : 'Classic',
    variantId: 'verify-1',
    rationale: 'Verification fixture for pagination-safe export behavior.',
    tailoredCvSections: {
      header: {
        name: 'Alex Candidate',
        contact: 'alex@example.com | +1 555-010-1234 | Seattle, WA'
      },
      summary:
        'Senior software engineer with deep experience in cloud infrastructure, distributed systems, and large scale product delivery. Built resilient services and developer platforms for enterprise environments.',
      skills: [
        'TypeScript',
        'Node.js',
        'React',
        'PostgreSQL',
        'Redis',
        'Docker',
        'Kubernetes',
        'Terraform',
        'CI/CD pipelines',
        'Observability and incident response'
      ],
      experience: [
        {
          role: 'Senior Software Engineer',
          company: 'Acme Cloud',
          dates: '2021 - Present',
          bullets: [
            'Led modernization of deployment orchestration platform to improve reliability and release velocity across multiple teams.',
            'Implemented robust service-level objectives and observability dashboards that reduced mean time to recovery in production incidents.',
            'Partnered with product and design stakeholders to deliver roadmap-critical capabilities while maintaining strict quality standards.'
          ]
        },
        {
          role: 'Software Engineer',
          company: 'FinServe',
          dates: '2018 - 2021',
          bullets: [
            'Developed backend APIs and asynchronous processing pipelines for high-volume financial workloads and reporting tools.',
            'Improved query performance and data modeling strategies for operational data stores supporting analytics and reporting.'
          ]
        }
      ],
      projects: [
        {
          name: 'Developer Platform Revamp',
          context: 'Internal Platform',
          bullets: [
            'Created reusable service templates and continuous integration standards to improve consistency across teams.',
            'Drove adoption with documentation, migration guides, and direct enablement sessions for engineering groups.'
          ]
        }
      ],
      education: ['B.S. Computer Science, Example University'],
      certifications: ['AWS Certified Solutions Architect - Associate']
    },
    plainTextCv: ''
  };
}

function buildLongSkillsStressVariant(templateId = 'classic') {
  return {
    templateId,
    templateName: templateId === 'modern' ? 'Modern' : templateId === 'ats' ? 'ATS-Friendly' : 'Classic',
    variantId: 'verify-long-skills-1',
    rationale: 'Stress fixture with intentionally long SKILLS bullets for pagination boundaries.',
    tailoredCvSections: {
      header: {
        name: 'Jordan StressTest',
        contact: 'jordan@example.com | +1 555-222-9988 | Boston, MA'
      },
      summary:
        'Platform engineer focused on resilient backend architecture, technical leadership, and production reliability in high-change environments.',
      skills: [
        'Designing and operating distributed microservices with strict latency budgets, end-to-end tracing, and production guardrails for safe iterative delivery across multiple dependent teams and environments.',
        'Building CI/CD pipelines with policy-as-code controls, progressive delivery gates, automated rollback criteria, and structured release observability to reduce deployment risk under heavy release cadence.',
        'Owning cloud infrastructure lifecycle with Terraform modules, cross-account security baselines, workload isolation boundaries, and repeatable disaster recovery validation for mission-critical services.',
        'Performance optimization of complex data access patterns across PostgreSQL and Redis, including indexing strategy, query-plan diagnostics, and throughput tuning under mixed transactional workloads.',
        'Driving incident response maturity with runbook quality standards, service-level objective governance, and post-incident learning loops that convert recurring operational pain into durable engineering improvements.',
        'Establishing scalable developer enablement systems through internal platform tooling, reusable service templates, and architecture review practices aligned with long-term maintainability and product delivery speed.'
      ],
      experience: [
        {
          role: 'Staff Platform Engineer',
          company: 'ScaleOps',
          dates: '2020 - Present',
          bullets: [
            'Led cross-functional platform roadmap to improve reliability and release throughput for critical systems supporting enterprise customers.',
            'Built reusable service baseline templates and observability conventions adopted by multiple engineering groups.'
          ]
        }
      ],
      projects: [
        {
          name: 'Reliability Uplift Program',
          context: 'Core Platform',
          bullets: [
            'Defined reliability scorecards and instrumentation standards for teams adopting shared platform capabilities.'
          ]
        }
      ],
      education: ['M.S. Software Engineering, Example Tech Institute'],
      certifications: ['Certified Kubernetes Administrator (CKA)']
    },
    plainTextCv: ''
  };
}

async function verifyDocxKeepRules(docxBuffer) {
  const zip = await JSZip.loadAsync(docxBuffer);
  const xmlFile = zip.file('word/document.xml');
  assert(xmlFile, 'DOCX document.xml missing.');
  const xml = await xmlFile.async('string');

  const keepLinesCount = (xml.match(/w:keepLines/g) || []).length;
  const keepNextCount = (xml.match(/w:keepNext/g) || []).length;

  assert(keepLinesCount > 0, 'Expected keepLines flags were not found in DOCX XML.');
  assert(keepNextCount > 0, 'Expected keepNext flags were not found in DOCX XML.');

  return { keepLinesCount, keepNextCount };
}

function verifyHtmlPaginationRules(html) {
  const mustContain = [
    '.section',
    'break-inside: avoid',
    'page-break-inside: avoid',
    'orphans: 3',
    'widows: 3',
    'job-block',
    'skills-block',
    'summary-block',
    'project-block'
  ];

  mustContain.forEach((token) => {
    assert(html.includes(token), `Expected HTML/CSS pagination token missing: ${token}`);
  });
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const variant = buildSampleVariant('modern');
  const html = renderCvHtml(variant);
  verifyHtmlPaginationRules(html);
  await fs.writeFile(path.join(OUT_DIR, 'verify-modern.html'), html, 'utf8');

  const docxBuffer = await generateDocxBuffer(variant);
  await fs.writeFile(path.join(OUT_DIR, 'verify-modern.docx'), docxBuffer);
  const docxStats = await verifyDocxKeepRules(docxBuffer);

  const pdfBuffer = await generatePdfBuffer(variant);
  await fs.writeFile(path.join(OUT_DIR, 'verify-modern.pdf'), pdfBuffer);

  const longSkillsVariant = buildLongSkillsStressVariant('classic');
  const longHtml = renderCvHtml(longSkillsVariant);
  verifyHtmlPaginationRules(longHtml);
  await fs.writeFile(path.join(OUT_DIR, 'verify-long-skills-classic.html'), longHtml, 'utf8');

  const longDocxBuffer = await generateDocxBuffer(longSkillsVariant);
  await fs.writeFile(path.join(OUT_DIR, 'verify-long-skills-classic.docx'), longDocxBuffer);
  const longDocxStats = await verifyDocxKeepRules(longDocxBuffer);

  const longPdfBuffer = await generatePdfBuffer(longSkillsVariant);
  await fs.writeFile(path.join(OUT_DIR, 'verify-long-skills-classic.pdf'), longPdfBuffer);

  console.log('Export verification completed.');
  console.log(`DOCX keepLines count: ${docxStats.keepLinesCount}`);
  console.log(`DOCX keepNext count: ${docxStats.keepNextCount}`);
  console.log(`Long-skills DOCX keepLines count: ${longDocxStats.keepLinesCount}`);
  console.log(`Long-skills DOCX keepNext count: ${longDocxStats.keepNextCount}`);
  console.log(`Artifacts: ${OUT_DIR}`);
}

main().catch((error) => {
  console.error('verify-export-pagination failed:', error.message);
  process.exit(1);
});
