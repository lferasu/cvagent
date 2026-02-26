import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  ConfigProvider,
  Layout,
  Row,
  Space,
  Spin,
  Steps,
  Tabs,
  Tag,
  Typography,
  Upload,
  message
} from 'antd';
import { BarChartOutlined, BulbOutlined, CheckCircleFilled, CopyOutlined, FilePdfOutlined, FileTextOutlined, FileWordOutlined, InboxOutlined, UserOutlined } from '@ant-design/icons';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const { Title, Paragraph, Text } = Typography;
const { Header, Content } = Layout;
const { Dragger } = Upload;

const TEMPLATE_OPTIONS = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'ats', label: 'ATS-Friendly' }
];

const STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'among',
  'and',
  'been',
  'build',
  'built',
  'from',
  'have',
  'into',
  'job',
  'more',
  'most',
  'over',
  'role',
  'that',
  'their',
  'they',
  'this',
  'with',
  'your'
]);

const SKILLS_SECTION_HEADERS = [
  'required skills',
  'requirements',
  'required qualifications',
  'preferred qualifications',
  'technical skills',
  'must have',
  'nice to have',
  'what you will need',
  'qualifications'
];

const TECH_TERM_PATTERNS = [
  /\b(?:aws|azure|gcp|docker|kubernetes|terraform|ansible|jenkins|github actions)\b/gi,
  /\b(?:react|next\.?js|node\.?js|express|nestjs|typescript|javascript|python|java|golang|rust|php|ruby)\b/gi,
  /\b(?:c\+\+|c#|\.net|asp\.?net|spring boot|django|flask|fastapi)\b/gi,
  /\b(?:postgres(?:ql)?|mysql|mongodb|redis|elasticsearch|snowflake|bigquery)\b/gi,
  /\b(?:sql|nosql|graphql|rest(?:ful)? api|microservices|event[- ]driven)\b/gi,
  /\b(?:machine learning|deep learning|nlp|computer vision|pytorch|tensorflow|scikit[- ]learn)\b/gi,
  /\b(?:ci\/cd|devops|linux|bash|agile|scrum)\b/gi
];

async function requestExportBlob(variant, type) {
  const endpoint = type === 'pdf' ? '/api/export/pdf' : '/api/export/docx';
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Failed to download ${type.toUpperCase()}`);
  }

  return res.blob();
}

async function downloadVariant(variant, type) {
  const blob = await requestExportBlob(variant, type);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${variant.templateId}-cv.${type}`;
  a.click();
  URL.revokeObjectURL(url);
}

function countWords(value) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

async function extractTextFromPdf(file) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) pages.push(pageText);
  }

  return pages.join('\n\n');
}

async function extractTextFromDocx(file) {
  const mammoth = await import('mammoth/mammoth.browser');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return String(result.value || '').trim();
}

async function extractTextFromFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'txt' || extension === 'md') {
    return (await file.text()).trim();
  }

  if (extension === 'docx') {
    return extractTextFromDocx(file);
  }

  if (extension === 'pdf') {
    return extractTextFromPdf(file);
  }

  throw new Error(`Unsupported extension: .${extension}`);
}

function normalizeToken(token = '') {
  return token.toLowerCase().replace(/\s+/g, ' ').trim();
}

function splitPotentialTerms(source = '') {
  return source
    .split(/[\n,;/|]/g)
    .map((part) => normalizeToken(part.replace(/^[\-\*\u2022]\s*/, '')))
    .filter(Boolean);
}

function extractSkillsFocusedSection(text = '') {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  let collecting = false;
  let remaining = 0;

  for (const raw of lines) {
    const line = normalizeToken(raw);
    if (!line) continue;

    const isHeader = SKILLS_SECTION_HEADERS.some((header) => line.includes(header));
    if (isHeader) {
      collecting = true;
      remaining = 14;
      continue;
    }

    if (collecting) {
      out.push(raw);
      remaining -= 1;
      if (remaining <= 0) collecting = false;
    }
  }

  return out.join('\n');
}

function addScoredKeyword(map, rawKeyword, score) {
  const keyword = normalizeToken(rawKeyword);
  if (!keyword || keyword.length < 2) return;
  if (/^\d+$/.test(keyword)) return;
  if (STOP_WORDS.has(keyword)) return;
  map.set(keyword, (map.get(keyword) || 0) + score);
}

function extractKeywords(text, limit = 18) {
  const allText = String(text || '');
  const skillsText = extractSkillsFocusedSection(allText);
  const scored = new Map();

  TECH_TERM_PATTERNS.forEach((pattern) => {
    const fromSkills = skillsText.match(pattern) || [];
    fromSkills.forEach((term) => addScoredKeyword(scored, term, 8));

    const fromAll = allText.match(pattern) || [];
    fromAll.forEach((term) => addScoredKeyword(scored, term, 3));
  });

  splitPotentialTerms(skillsText).forEach((term) => {
    if (term.split(' ').length <= 4) {
      addScoredKeyword(scored, term, 4);
    }
  });

  const fallbackWords = allText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
  fallbackWords.forEach((word) => addScoredKeyword(scored, word, 1));

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getKeywordInsights(jobPosting, plainTextCv) {
  const keywords = extractKeywords(jobPosting, 12);
  const source = String(plainTextCv || '').toLowerCase();
  const matched = keywords.filter((keyword) => new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i').test(source));
  const matchPercentage = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
  return { keywords, matched, matchPercentage };
}

const GENERIC_LOW_VALUE_TERMS = new Set([
  'work',
  'worked',
  'team',
  'teams',
  'experience',
  'project',
  'projects',
  'communication',
  'collaboration',
  'responsible',
  'support'
]);

const HIGH_VALUE_KEYWORD_PATTERN =
  /\b(ci\/cd|machine learning|deep learning|computer vision|nlp|mlops|kubernetes|terraform|microservices|event[- ]driven|distributed systems?|sre|pytorch|tensorflow|snowflake|bigquery)\b/i;

const MEDIUM_VALUE_KEYWORD_PATTERN =
  /\b(react|node\.?js|typescript|python|java|aws|azure|gcp|docker|graphql|postgres(?:ql)?|mongodb|redis|jenkins|ansible|sql|nosql|rest(?:ful)? api)\b/i;

function countKeywordOccurrences(text = '', keyword = '') {
  if (!text || !keyword) return 0;
  const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
  return (String(text).match(pattern) || []).length;
}

function computeKeywordWeight(keyword = '', jobPosting = '', requiredSkillsText = '') {
  const normalized = normalizeToken(keyword);
  if (!normalized) return 0.4;

  let weight = 1;

  if (GENERIC_LOW_VALUE_TERMS.has(normalized)) {
    weight *= 0.45;
  }

  if (HIGH_VALUE_KEYWORD_PATTERN.test(normalized)) {
    weight += 1.25;
  } else if (MEDIUM_VALUE_KEYWORD_PATTERN.test(normalized)) {
    weight += 0.55;
  }

  if (normalized.includes(' ') || /[\/\.-]/.test(normalized)) {
    weight += 0.3;
  }

  const occurrences = countKeywordOccurrences(jobPosting.toLowerCase(), normalized);
  weight += Math.min(0.8, occurrences * 0.2);

  // Strongly prioritize terms explicitly mentioned in requirements/skills sections.
  const requiredOccurrences = countKeywordOccurrences(requiredSkillsText.toLowerCase(), normalized);
  if (requiredOccurrences > 0) {
    weight += 1.0 + Math.min(1.2, requiredOccurrences * 0.45);
  }

  return Math.max(0.35, Math.min(3.6, weight));
}

export default function App() {
  const activityIntervalRef = useRef(null);
  const activityHideRef = useRef(null);
  const previewStateRef = useRef({});
  const docxContainerRefs = useRef({});
  const initializedPreviewIdsRef = useRef(new Set());
  const [page, setPage] = useState('builder');
  const [stage, setStage] = useState('upload');
  const [jobPosting, setJobPosting] = useState('');
  const [originalCv, setOriginalCv] = useState('');
  const [jobSourceName, setJobSourceName] = useState('');
  const [cvSourceName, setCvSourceName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [keywordsCustomized, setKeywordsCustomized] = useState(false);
  const [variants, setVariants] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewStateByVariant, setPreviewStateByVariant] = useState({});
  const [activePreviewTabByVariant, setActivePreviewTabByVariant] = useState({});
  const [navElevated, setNavElevated] = useState(false);
  const [activity, setActivity] = useState({
    visible: false,
    title: '',
    steps: [],
    index: 0,
    done: false
  });

  const jobWords = useMemo(() => countWords(jobPosting), [jobPosting]);
  const cvWords = useMemo(() => countWords(originalCv), [originalCv]);
  const hasUpload = Boolean(jobPosting.trim() && originalCv.trim());
  const jobHasUploadedFile = Boolean(jobSourceName && jobSourceName !== 'Pasted text');
  const cvHasUploadedFile = Boolean(cvSourceName && cvSourceName !== 'Pasted text');

  const keywordPool = useMemo(() => extractKeywords(jobPosting, 18), [jobPosting]);
  const defaultKeywordCount = useMemo(() => {
    if (!keywordPool.length) return 0;
    return Math.min(10, Math.max(5, Math.min(8, keywordPool.length)));
  }, [keywordPool]);
  const recommendedKeywords = useMemo(() => keywordPool.slice(0, defaultKeywordCount), [keywordPool, defaultKeywordCount]);
  const extraKeywords = useMemo(() => keywordPool.slice(defaultKeywordCount), [keywordPool, defaultKeywordCount]);
  const uploadedCvInsights = useMemo(() => getKeywordInsights(jobPosting, originalCv), [jobPosting, originalCv]);
  const weightedKeywordStats = useMemo(() => {
    const keywordsToCheck = selectedKeywords.length ? selectedKeywords : uploadedCvInsights.keywords;
    const source = String(originalCv || '').toLowerCase();
    const requiredSkillsText = extractSkillsFocusedSection(jobPosting);
    const selectedCoreCount = selectedKeywords.filter((k) => recommendedKeywords.includes(k)).length;
    const selectedOptionalCount = selectedKeywords.filter((k) => extraKeywords.includes(k)).length;
    const matched = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    keywordsToCheck.forEach((keyword) => {
      const weight = computeKeywordWeight(keyword, jobPosting, requiredSkillsText);
      totalWeight += weight;
      if (new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i').test(source)) {
        matched.push(keyword);
        matchedWeight += weight;
      }
    });

    const matchPercentage = totalWeight ? Math.round((matchedWeight / totalWeight) * 100) : 0;
    const unmatchedWeight = Math.max(0, totalWeight - matchedWeight);
    const explicitSelectionBonus =
      selectedCoreCount * 1.15 +
      selectedOptionalCount * 0.55 +
      Math.max(0, selectedKeywords.length - 6) * 0.35;
    const fallbackSelectionBonus = selectedKeywords.length ? 0 : Math.max(0, Math.min(8, recommendedKeywords.length - 4)) * 0.45;
    const estimatedAtsBoost = Math.round(
      Math.min(40, unmatchedWeight * 4.1 + explicitSelectionBonus + fallbackSelectionBonus)
    );

    return {
      keywords: keywordsToCheck,
      matched,
      totalWeight,
      matchedWeight,
      matchPercentage,
      estimatedAtsBoost,
      selectedCoreCount,
      selectedOptionalCount
    };
  }, [selectedKeywords, uploadedCvInsights.keywords, originalCv, jobPosting, recommendedKeywords, extraKeywords]);
  const matchStrength = useMemo(() => {
    const pct = weightedKeywordStats.matchPercentage || 0;
    if (pct >= 70) return { label: 'Strong', tone: 'strong', dot: '🟢' };
    if (pct >= 40) return { label: 'Moderate', tone: 'moderate', dot: '🟡' };
    return { label: 'Weak', tone: 'weak', dot: '🔴' };
  }, [weightedKeywordStats.matchPercentage]);

  useEffect(() => {
    if (!keywordPool.length) {
      setSelectedKeywords([]);
      setKeywordsCustomized(false);
      return;
    }

    if (!keywordsCustomized) {
      setSelectedKeywords(recommendedKeywords);
    }
  }, [keywordPool, recommendedKeywords, keywordsCustomized]);

  const hasResult = variants.length > 0;
  const currentStep = page === 'results' ? 3 : loading ? 2 : stage === 'customize' ? 1 : 0;
  const isUploadPage = page === 'builder' && stage === 'upload';
  const stepperSize = 'small';
  const canGoBack = page === 'results' || (page === 'builder' && stage === 'customize');
  const canGoNext =
    page === 'builder'
      ? stage === 'upload'
        ? hasUpload
        : !loading && Boolean(jobPosting.trim() && originalCv.trim() && selectedKeywords.length)
      : true;
  const nextLabel = page === 'builder' ? (stage === 'upload' ? 'Continue to Customize' : loading ? 'Generating...' : 'Generate Tailored CV ->') : 'Start New CV';
  const backLabel = page === 'results' ? 'Back to Customize' : 'Back to Upload';

  useEffect(() => {
    previewStateRef.current = previewStateByVariant;
  }, [previewStateByVariant]);

  useEffect(() => {
    return () => {
      if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
      if (activityHideRef.current) clearTimeout(activityHideRef.current);
      Object.values(previewStateRef.current).forEach((state) => {
        if (state?.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
      });
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const pageRoot = document.querySelector('.cvts-page');
      const pageScroll = pageRoot ? pageRoot.scrollTop : 0;
      setNavElevated(window.scrollY > 6 || pageScroll > 6);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    const pageRoot = document.querySelector('.cvts-page');
    pageRoot?.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      pageRoot?.removeEventListener('scroll', onScroll);
    };
  }, []);

  const startActivity = (title, steps) => {
    if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
    if (activityHideRef.current) clearTimeout(activityHideRef.current);

    setActivity({
      visible: true,
      title,
      steps,
      index: 0,
      done: false
    });

    activityIntervalRef.current = setInterval(() => {
      setActivity((prev) => {
        if (!prev.visible || prev.done) return prev;
        // Keep one final step reserved for actual completion to avoid progress finishing too early.
        const cap = Math.max(0, prev.steps.length - 2);
        const nextIndex = Math.min(prev.index + 1, cap);
        return { ...prev, index: nextIndex };
      });
    }, 1300);
  };

  const finishActivity = ({ hideAfterMs = 1200 } = {}) => {
    if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
    setActivity((prev) => ({ ...prev, done: true, index: prev.steps.length ? prev.steps.length - 1 : 0 }));
    if (hideAfterMs <= 0) {
      setActivity((prev) => ({ ...prev, visible: false }));
      return;
    }
    activityHideRef.current = setTimeout(() => {
      setActivity((prev) => ({ ...prev, visible: false }));
    }, hideAfterMs);
  };

  const setJobPostingFromSource = (text, sourceName) => {
    setJobPosting(text);
    setJobSourceName(sourceName);
    setKeywordsCustomized(false);
  };

  const loadTextFile = async (file, target) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const supported = ['txt', 'md', 'docx', 'pdf'];

    if (!supported.includes(extension)) {
      setError(`Unsupported file type .${extension}. Use .txt, .md, .docx, or .pdf.`);
      return Upload.LIST_IGNORE;
    }

    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        setError(`Could not extract readable text from ${file.name}. Try another file or paste text.`);
        return Upload.LIST_IGNORE;
      }

      if (target === 'job') {
        setJobPostingFromSource(text, file.name);
      } else {
        setOriginalCv(text);
        setCvSourceName(file.name);
      }
      setError('');
      message.success(`Loaded ${file.name}`);
    } catch (_e) {
      setError('Could not read file content. Use "Paste text instead".');
    }

    return Upload.LIST_IGNORE;
  };

  const toggleKeyword = (keyword) => {
    setKeywordsCustomized(true);
    setSelectedKeywords((prev) => {
      if (prev.includes(keyword)) {
        return prev.filter((k) => k !== keyword);
      }
      return [...prev, keyword];
    });
  };

  const resetToRecommendedKeywords = () => {
    setKeywordsCustomized(false);
    setSelectedKeywords(recommendedKeywords);
  };

  const autoPickTopKeywords = () => {
    setKeywordsCustomized(true);
    setSelectedKeywords((prev) => {
      const merged = [...new Set([...prev, ...recommendedKeywords, ...extraKeywords])];
      return merged.slice(0, 10);
    });
  };

  const onGenerate = async () => {
    if (!jobPosting.trim() || !originalCv.trim()) {
      setError('Both Job Posting and Your CV content are required before generating.');
      return;
    }

    if (!selectedKeywords.length) {
      setError('Select at least one keyword in Customize step.');
      return;
    }

    setLoading(true);
    setError('');
    setVariants([]);
    initializedPreviewIdsRef.current = new Set();
    setMeta(null);
    setPreviewStateByVariant((prev) => {
      Object.values(prev).forEach((state) => {
        if (state?.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
      });
      return {};
    });
    docxContainerRefs.current = {};
    startActivity('Generating tailored CV', [
      'Validating inputs',
      'Extracting required skills and tools',
      'Fetching AI draft',
      'Optimizing selected keywords',
      'Finalizing CV output'
    ]);

    try {
      const res = await fetch(`${API_BASE}/api/generate-cvs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobPosting,
          originalCv,
          preferredTemplate: selectedTemplate,
          mustIncludeKeywords: selectedKeywords
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate variants.');
      }

      setVariants(data.variants || []);
      setMeta(data.meta || null);
      // Keep button spinner and progress in sync: completion + navigation happen together.
      setLoading(false);
      setPage('results');
      finishActivity({ hideAfterMs: 900 });
    } catch (e) {
      setError(e.message);
      setLoading(false);
      if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
      setActivity((prev) => ({ ...prev, visible: false, done: true }));
    }
  };

  const loadVariantPreview = async (variant) => {
    const key = variant.variantId;
    setPreviewStateByVariant((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), pdfLoading: true, pdfError: '' }
    }));

    try {
      const blob = await requestExportBlob(variant, 'pdf');
      const url = URL.createObjectURL(blob);
      setPreviewStateByVariant((prev) => {
        const prevUrl = prev[key]?.pdfUrl;
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return {
          ...prev,
          [key]: { ...(prev[key] || {}), pdfLoading: false, pdfError: '', pdfUrl: url }
        };
      });
    } catch (e) {
      setPreviewStateByVariant((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), pdfLoading: false, pdfError: e.message || 'Preview failed.' }
      }));
    }
  };

  const loadVariantDocxPreview = async (variant) => {
    const key = variant.variantId;
    setPreviewStateByVariant((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), docxLoading: true, docxError: '' }
    }));

    try {
      const blob = await requestExportBlob(variant, 'docx');
      const arrayBuffer = await blob.arrayBuffer();
      setPreviewStateByVariant((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          docxLoading: false,
          docxError: '',
          docxBuffer: arrayBuffer,
          docxRendered: false
        }
      }));
    } catch (e) {
      setPreviewStateByVariant((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), docxLoading: false, docxError: e.message || 'DOCX preview failed.' }
      }));
    }
  };

  const renderDocxPreview = async (key, arrayBuffer) => {
    const container = docxContainerRefs.current[key];
    if (!container || !arrayBuffer) return;

    const { renderAsync } = await import('docx-preview');
    container.innerHTML = '';
    await renderAsync(arrayBuffer, container, undefined, {
      className: 'docx-preview-render',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true
    });
  };

  useEffect(() => {
    if (page !== 'results') return;

    variants.forEach((variant) => {
      if (!initializedPreviewIdsRef.current.has(variant.variantId)) {
        initializedPreviewIdsRef.current.add(variant.variantId);
        loadVariantPreview(variant);
      }
    });
  }, [page, variants]);

  const handlePreviewTabChange = async (variant, tabKey) => {
    const key = variant.variantId;
    setActivePreviewTabByVariant((prev) => ({ ...prev, [key]: tabKey }));
    const state = previewStateByVariant[key] || {};

    if (tabKey === 'pdf' && !state.pdfUrl && !state.pdfLoading) {
      await loadVariantPreview(variant);
      return;
    }

    if (tabKey === 'docx' && !state.docxBuffer && !state.docxLoading) {
      await loadVariantDocxPreview(variant);
    }
  };

  useEffect(() => {
    variants.forEach((variant) => {
      const key = variant.variantId;
      const previewState = previewStateByVariant[key];
      const activeTab = activePreviewTabByVariant[key];
      if (activeTab !== 'docx') return;
      if (!previewState?.docxBuffer || previewState?.docxRendered || previewState?.docxLoading) return;

      renderDocxPreview(key, previewState.docxBuffer)
        .then(() => {
          setPreviewStateByVariant((prev) => ({
            ...prev,
            [key]: { ...(prev[key] || {}), docxRendered: true, docxError: '' }
          }));
        })
        .catch((error) => {
          setPreviewStateByVariant((prev) => ({
            ...prev,
            [key]: { ...(prev[key] || {}), docxError: error?.message || 'DOCX preview failed.', docxRendered: false }
          }));
        });
    });
  }, [variants, activePreviewTabByVariant, previewStateByVariant]);

  const handleDownload = async (variant, type) => {
    try {
      await downloadVariant(variant, type);
      message.success(`${type.toUpperCase()} downloaded`);
    } catch (e) {
      message.error(e.message || 'Download failed');
      throw e;
    }
  };

  const handleBackNavigation = () => {
    if (page === 'results') {
      setPage('builder');
      setStage('customize');
      return;
    }

    if (page === 'builder' && stage === 'customize') {
      setStage('upload');
    }
  };

  const handleNextNavigation = async () => {
    if (page === 'builder' && stage === 'upload') {
      setStage('customize');
      return;
    }

    if (page === 'builder' && stage === 'customize') {
      await onGenerate();
      return;
    }

    if (page === 'results') {
      setPage('builder');
      setStage('upload');
      setVariants([]);
      setMeta(null);
      setError('');
    }
  };

  const activityProgress = activity.steps.length ? Math.round(((activity.index + 1) / activity.steps.length) * 100) : 0;

  return (
    <ConfigProvider
      theme={{
        token: {
          fontSize: 16,
          lineHeight: 1.6,
          colorPrimary: '#0f766e',
          colorSuccess: '#10b981',
          colorBgLayout: '#f8fafc',
          colorBgContainer: '#ffffff',
          borderRadiusLG: 16,
          borderRadius: 12,
          fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif'
        },
        components: {
          Card: {
            bodyPadding: 24,
            headerFontSize: 18
          },
          Button: {
            borderRadius: 12,
            controlHeight: 44
          },
          Tag: {
            borderRadiusSM: 999
          }
        }
      }}
    >
      <Layout className={`app-shell saasPage cvts-page ${isUploadPage ? 'app-shell-compact cvts-viewport' : ''}`}>
        <Header className="app-header saasHero cvts-hero">
          <Title level={2} className="title saasTitle cvts-title">
            Tailor your resume to any job — instantly.
          </Title>
          <div className="cvts-title-underline" />
          <Text className="subtitle cvts-subtitle">
            Upload your CV and a job posting. Generate 3 ATS-ready versions in seconds.
          </Text>
          <Text className="trust-line cvts-trust">Private by default • No data stored • Secure processing</Text>
        </Header>

        <Content className="app-content cvts-shell cvts-content">
          {page === 'builder' ? (
            <Card className={`hero-card saasMainCard saasSpotlight cvts-maincard ${isUploadPage ? 'hero-card-compact' : ''}`}>
              <div className={isUploadPage ? 'cvts-mainScroll' : ''}>
              <div className="stepper-wrap stepper-wrap-compact cvts-stepsWrap">
                <Steps
                  current={currentStep}
                  size={stepperSize}
                  items={[{ title: 'Upload' }, { title: 'Customize' }, { title: 'Generate' }, { title: 'Download' }]}
                />
                {stage === 'upload' ? (
                  <div className="step-footnote">
                    <Text className="step-footnote-text">Step 1 of 4 - Add your documents</Text>
                    {hasUpload ? (
                      <Text className="step-ready-text" aria-live="polite">
                        <CheckCircleFilled /> Ready to customize
                      </Text>
                    ) : null}
                    {hasUpload ? (
                      <Text className={`step-match-text ${matchStrength.tone}`}>
                        <BarChartOutlined className="match-signal-icon" />
                        Current CV match: {weightedKeywordStats.matchPercentage}% · {matchStrength.label}
                      </Text>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {stage === 'upload' ? (
                <>
                  <Row gutter={isUploadPage ? [16, 16] : [24, 24]}>
                    <Col xs={24} lg={12}>
                      <Card className="input-panel upload-tile saasTile cvts-tile" bodyStyle={{ padding: isUploadPage ? 16 : 24 }}>
                        <Space direction="vertical" size={16} className="full-width">
                          <div className="upload-tile-head">
                            <span className="upload-tile-icon" aria-hidden="true">
                              <FileTextOutlined />
                            </span>
                            <div>
                              <Text strong className="upload-tile-title">
                                Job Posting
                              </Text>
                              <Text className="upload-tile-helper">Paste text or upload a file</Text>
                            </div>
                          </div>
                          <div>
                            <div className="panel-divider" />
                          </div>

                          <div className="inline-paste-group">
                            <Text className="keywords-helper">Paste text</Text>
                            <textarea
                              className="inline-paste-textarea"
                              value={jobPosting}
                              onChange={(e) => setJobPostingFromSource(e.target.value, 'Pasted text')}
                              placeholder="Paste job posting text here..."
                            />
                          </div>

                          <Text className="keywords-helper">Or upload file (.pdf / .docx / .txt / .md)</Text>
                          <Dragger
                            multiple={false}
                            showUploadList={false}
                            accept=".pdf,.docx,.txt,.md"
                            beforeUpload={(file) => loadTextFile(file, 'job')}
                            className={`small-dragger interactive-dragger saasDropzone cvts-dropzone ${jobHasUploadedFile ? 'upload-success' : ''}`}
                          >
                            <Space direction="vertical" size={4}>
                              <InboxOutlined className="dropzone-icon" />
                              <Text strong>Drop job posting here or click to upload</Text>
                              <Text className="dropzone-hint">{jobHasUploadedFile ? `✓ ${jobSourceName}` : 'PDF and DOCX recommended'}</Text>
                            </Space>
                          </Dragger>

                          <Space wrap>
                            <Tag color={jobPosting ? 'green' : 'default'}>{jobPosting ? 'Ready' : 'Missing content'}</Tag>
                            <Tag>{jobWords} words</Tag>
                          </Space>
                        </Space>
                      </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                      <Card className="input-panel upload-tile saasTile cvts-tile" bodyStyle={{ padding: isUploadPage ? 16 : 24 }}>
                        <Space direction="vertical" size={16} className="full-width">
                          <div className="upload-tile-head">
                            <span className="upload-tile-icon" aria-hidden="true">
                              <UserOutlined />
                            </span>
                            <div>
                              <Text strong className="upload-tile-title">
                                Your CV
                              </Text>
                              <Text className="upload-tile-helper">Paste text or upload a file</Text>
                            </div>
                          </div>
                          <div>
                            <div className="panel-divider" />
                          </div>

                          <div className="inline-paste-group">
                            <Text className="keywords-helper">Paste text</Text>
                            <textarea
                              className="inline-paste-textarea"
                              value={originalCv}
                              onChange={(e) => {
                                setOriginalCv(e.target.value);
                                setCvSourceName('Pasted text');
                              }}
                              placeholder="Paste your CV text here..."
                            />
                          </div>

                          <Text className="keywords-helper">Or upload file (.pdf / .docx / .txt / .md)</Text>
                          <Dragger
                            multiple={false}
                            showUploadList={false}
                            accept=".pdf,.docx,.md,.txt"
                            beforeUpload={(file) => loadTextFile(file, 'cv')}
                            className={`small-dragger interactive-dragger saasDropzone cvts-dropzone ${cvHasUploadedFile ? 'upload-success' : ''}`}
                          >
                            <Space direction="vertical" size={4}>
                              <InboxOutlined className="dropzone-icon" />
                              <Text strong>Drop your CV here or click to upload</Text>
                              <Text className="dropzone-hint">{cvHasUploadedFile ? `✓ ${cvSourceName}` : 'PDF and DOCX recommended'}</Text>
                            </Space>
                          </Dragger>

                          <Space wrap>
                            <Tag color={originalCv ? 'green' : 'default'}>{originalCv ? 'Ready' : 'Missing content'}</Tag>
                            <Tag>{cvWords} words</Tag>
                          </Space>
                        </Space>
                      </Card>
                    </Col>
                  </Row>

                </>
              ) : (
                <>
                <div className="customize-summary">
                  <Tag color="geekblue">JD: {jobSourceName || `${jobWords} words`}</Tag>
                  <Tag color="geekblue">CV: {cvSourceName || `${cvWords} words`}</Tag>
                </div>

                  <div className="customize-layout">
                    <div className="customize-main">
                      <div className="template-section">
                        <Title level={4} className="section-title">
                          Template Selection
                        </Title>
                        <div className="template-grid">
                          {TEMPLATE_OPTIONS.map((template) => {
                            const selected = selectedTemplate === template.id;
                            return (
                              <button
                                key={template.id}
                                type="button"
                                className={`template-tile ${selected ? 'selected' : ''}`}
                                onClick={() => setSelectedTemplate(template.id)}
                              >
                                <div className="template-title">{template.label}</div>
                                <div className="template-preview">
                                  <span />
                                  <span />
                                  <span />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="keywords-section">
                        <Space align="center" wrap className="keywords-header-row">
                          <Title level={4} className="section-title no-margin">
                            Keywords to Include
                          </Title>
                          <Tag color="green">
                            {selectedKeywords.length} selected · Estimated ATS boost: +{weightedKeywordStats.estimatedAtsBoost}%
                          </Tag>
                          <Button size="small" onClick={autoPickTopKeywords}>
                            Auto-pick 10
                          </Button>
                          <Button size="small" onClick={() => setSelectedKeywords([])}>
                            Clear all
                          </Button>
                          <Button size="small" onClick={resetToRecommendedKeywords}>
                            Reset to Recommended
                          </Button>
                        </Space>
                        <Text className="keywords-helper">Pick 5-10 core terms, then optional terms if needed.</Text>
                        <Text className="keyword-group-label">CORE TERMS</Text>

                        <div className="keyword-preview">
                          {recommendedKeywords.map((keyword) => {
                            const active = selectedKeywords.includes(keyword);
                            return (
                              <button
                                key={keyword}
                                type="button"
                                aria-pressed={active}
                                className={`keyword-chip-toggle recommended ${active ? 'selected' : ''}`}
                                onClick={() => toggleKeyword(keyword)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleKeyword(keyword);
                                  }
                                }}
                              >
                                {keyword}
                              </button>
                            );
                          })}
                        </div>

                        {extraKeywords.length ? (
                          <>
                            <Text className="keyword-group-label">OPTIONAL TERMS</Text>
                            <div className="keyword-preview">
                              {extraKeywords.map((keyword) => {
                                const active = selectedKeywords.includes(keyword);
                                return (
                                  <button
                                    key={keyword}
                                    type="button"
                                    aria-pressed={active}
                                    className={`keyword-chip-toggle ${active ? 'selected' : ''}`}
                                    onClick={() => toggleKeyword(keyword)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleKeyword(keyword);
                                      }
                                    }}
                                  >
                                    {keyword}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <Card className="customize-side-card">
                      {loading && activity.visible ? (
                        <div className="ready-overlay" aria-live="polite">
                          <div className="ready-overlay-card">
                            <div className="engagement-title-row">
                              <Text strong>{activity.title}</Text>
                              <Tag color="processing">{activityProgress}%</Tag>
                            </div>
                            <div className="engagement-track">
                              <div className="engagement-fill" style={{ width: `${activityProgress}%` }} />
                            </div>
                            <Text className="engagement-step">{activity.steps[activity.index] || 'Working...'}</Text>
                          </div>
                        </div>
                      ) : null}

                      <Space direction="vertical" size={14} className="full-width">
                        <Title level={4} className="section-title no-margin">
                          Ready to Generate
                        </Title>
                        <Text className="keywords-helper">
                          Template: <strong>{TEMPLATE_OPTIONS.find((t) => t.id === selectedTemplate)?.label}</strong>
                        </Text>
                        <Text className="keywords-helper">Selected keywords appear in the CV prioritization prompt.</Text>

                        <div className="selected-keywords-box">
                          {selectedKeywords.length ? (
                            selectedKeywords.map((keyword) => (
                              <span key={keyword} className="keyword-chip matched">
                                {keyword}
                              </span>
                            ))
                          ) : (
                            <Text className="keywords-helper">No keywords selected yet.</Text>
                          )}
                        </div>

                        <Text className="keywords-helper">Use navigation controls below to continue.</Text>
                        {meta ? <Tag className="model-tag">Model: {String(meta.mode || '').toUpperCase()}</Tag> : null}
                      </Space>
                    </Card>
                  </div>
                </>
              )}

              {stage === 'customize' && error ? (
                <Alert
                  className="status-alert"
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError('')}
                  message={error}
                />
              ) : null}

              {stage === 'upload' && error ? (
                <Alert
                  className="status-alert"
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError('')}
                  message={error}
                />
              ) : null}

              </div>
            </Card>
          ) : (
            <div className="results-page">
              <div className="stepper-wrap stepper-wrap-compact results-stepper-wrap">
                <Steps size={stepperSize} current={3} items={[{ title: 'Upload' }, { title: 'Customize' }, { title: 'Generate' }, { title: 'Download' }]} />
              </div>

              <div className="results-area">
                {variants.map((variant) => {
                  const insights = getKeywordInsights(jobPosting, variant.plainTextCv);
                  const previewState = previewStateByVariant[variant.variantId] || {};
                  const activeTab = activePreviewTabByVariant[variant.variantId] || 'pdf';
                  return (
                    <Card
                      key={variant.variantId}
                      className="variant-card"
                      title={
                        <Space>
                          <Text strong>{variant.templateName}</Text>
                          <Tag>{variant.templateId}</Tag>
                          <Tag color={insights.matchPercentage >= 60 ? 'green' : insights.matchPercentage >= 35 ? 'gold' : 'red'}>
                            {insights.matchPercentage}% keyword match
                          </Tag>
                          <Tag color="green" icon={<CheckCircleFilled />}>
                            Ready
                          </Tag>
                          {variant.generatedAt || meta?.generatedAt ? (
                            <Tag color="default">
                              Last generated:{' '}
                              {new Date(variant.generatedAt || meta.generatedAt).toLocaleString()}
                            </Tag>
                          ) : null}
                        </Space>
                      }
                      extra={
                        <Space wrap>
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            className="result-action-btn"
                            type="primary"
                            onClick={async () => {
                              await navigator.clipboard.writeText(variant.plainTextCv);
                              message.success('Plain text copied');
                            }}
                          >
                            Copy Text
                          </Button>
                          <Button
                            size="small"
                            icon={<FileWordOutlined />}
                            className="result-action-btn"
                            type="primary"
                            onClick={() => handleDownload(variant, 'docx')}
                          >
                            Download DOCX
                          </Button>
                          <Button
                            size="small"
                            icon={<FilePdfOutlined />}
                            className="result-action-btn"
                            type="primary"
                            onClick={() => handleDownload(variant, 'pdf')}
                          >
                            Download PDF
                          </Button>
                        </Space>
                      }
                    >
                      <Collapse
                        ghost
                        accordion
                        className="why-collapse"
                        items={[
                          {
                            key: 'why',
                            label: (
                              <div className="why-collapse-label">
                                <span className="why-collapse-icon">
                                  <BulbOutlined />
                                </span>
                                <span className="why-collapse-title">Why this version</span>
                                <span className="why-collapse-hint">Tap to view rationale</span>
                              </div>
                            ),
                            children: <Paragraph className="rationale">{variant.rationale}</Paragraph>
                          }
                        ]}
                      />
                      <div className="keyword-preview">
                        {insights.keywords.map((keyword) => {
                          const isMatched = insights.matched.includes(keyword);
                          return (
                            <span key={keyword} className={`keyword-chip ${isMatched ? 'matched' : ''}`}>
                              {keyword}
                            </span>
                          );
                        })}
                      </div>
                      <Tabs
                        className="result-preview-tabs"
                        activeKey={activeTab}
                        onChange={(key) => handlePreviewTabChange(variant, key)}
                        items={[
                          {
                            key: 'pdf',
                            label: 'PDF',
                            children: (
                              <div className="file-preview-panel pdf-tab-preview">
                                <div className="file-preview-content">
                                  {previewState.pdfLoading ? (
                                    <div className="file-preview-status">
                                      <Spin size="small" /> <Text>Loading PDF preview...</Text>
                                    </div>
                                  ) : null}
                                  {!previewState.pdfLoading && previewState.pdfError ? (
                                    <Alert type="warning" showIcon message={previewState.pdfError} />
                                  ) : null}
                                  {!previewState.pdfLoading && !previewState.pdfError && previewState.pdfUrl ? (
                                    <iframe
                                      title={`preview-${variant.variantId}`}
                                      className="file-preview-frame"
                                      src={`${previewState.pdfUrl}#view=Fit&zoom=page-fit`}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            )
                          },
                          {
                            key: 'docx',
                            label: 'DOCX',
                            children: (
                              <div className="file-preview-panel single-column-preview">
                                <div className="file-preview-content">
                                  {previewState.docxLoading ? (
                                    <div className="file-preview-status">
                                      <Spin size="small" /> <Text>Loading DOCX preview...</Text>
                                    </div>
                                  ) : null}
                                  {!previewState.docxLoading && previewState.docxError ? (
                                    <Alert type="warning" showIcon message={previewState.docxError} />
                                  ) : null}
                                  {!previewState.docxLoading && !previewState.docxError ? (
                                    <div
                                      className="docx-visual-container"
                                      ref={(node) => {
                                        if (node) docxContainerRefs.current[variant.variantId] = node;
                                      }}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            )
                          },
                          {
                            key: 'text',
                            label: 'Text',
                            children: (
                              <div className="paper-preview-wrap full-width-preview">
                                <pre className="preview">{variant.plainTextCv}</pre>
                              </div>
                            )
                          }
                        ]}
                      />
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`workflow-nav-dock saasFooter cvts-footer ${navElevated ? 'nav-elevated' : ''}`}>
            <div className="workflow-nav">
              <Button onClick={handleBackNavigation} disabled={!canGoBack} type="default">
                {backLabel}
              </Button>
              <div className="workflow-nav-primary">
                <Button
                  type="primary"
                  size="large"
                  loading={page === 'builder' && stage === 'customize' ? loading : false}
                  disabled={!canGoNext}
                  onClick={handleNextNavigation}
                  className={`saasCta cvts-ctaBtn ${stage === 'upload' && canGoNext ? 'cta-ready' : ''}`}
                  block
                >
                  {nextLabel}
                </Button>
                {stage === 'upload' ? <Text className="cta-footnote">Takes less than 30 seconds</Text> : null}
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
