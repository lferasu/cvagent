import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

async function downloadVariant(variant, type) {
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

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${variant.templateId}-cv.${type}`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [jobPosting, setJobPosting] = useState('');
  const [originalCv, setOriginalCv] = useState('');
  const [variants, setVariants] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onGenerate = async () => {
    setLoading(true);
    setError('');
    setVariants([]);
    setMeta(null);

    try {
      const res = await fetch(`${API_BASE}/api/generate-cvs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobPosting, originalCv })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate variants.');
      }

      setVariants(data.variants || []);
      setMeta(data.meta || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <h1>CV Tailor MVP</h1>
      <p>Paste the job posting and your original CV, then generate 3 ranked CV variants.</p>

      <div className="form-grid">
        <label>
          Job Posting
          <textarea value={jobPosting} onChange={(e) => setJobPosting(e.target.value)} rows={14} />
        </label>

        <label>
          Original CV
          <textarea value={originalCv} onChange={(e) => setOriginalCv(e.target.value)} rows={14} />
        </label>
      </div>

      <button className="generate-btn" onClick={onGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate'}
      </button>

      {error ? <div className="error">{error}</div> : null}
      {meta ? (
        <div className={`meta-banner ${meta.mode === 'mock' ? 'warn' : 'ok'}`}>
          <strong>Generation mode:</strong> {meta.mode}
          {meta.reason ? ` — ${meta.reason}` : ''}
        </div>
      ) : null}

      <section className="variants-grid">
        {variants.map((variant) => (
          <article key={variant.variantId} className="card">
            <h2>
              {variant.templateName} <span className="template-id">({variant.templateId})</span>
            </h2>
            <p className="rationale">{variant.rationale}</p>

            <h3>Preview</h3>
            <pre>{variant.plainTextCv}</pre>

            <div className="actions">
              <button onClick={() => navigator.clipboard.writeText(variant.plainTextCv)}>Copy plain text</button>
              <button onClick={() => downloadVariant(variant, 'docx')}>Download DOCX</button>
              <button onClick={() => downloadVariant(variant, 'pdf')}>Download PDF</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
