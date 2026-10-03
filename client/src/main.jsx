import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '';

function Preview({ jsx, css }) {
  const srcDoc = useMemo(() => `<!doctype html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${css || ''}</style></head>
<body><div id="root"></div>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel">
try {
  ${jsx || 'function App(){ return <div style={{padding:40}}>Generate a website first.</div>; }'}
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
} catch (error) {
  document.getElementById('root').innerHTML = '<pre style="padding:24px;white-space:pre-wrap;font-family:monospace">Preview error: ' + String(error) + '</pre>';
}
</script></body></html>`, [jsx, css]);

  return <iframe className="preview-frame" title="Generated website preview" sandbox="allow-scripts" srcDoc={srcDoc} />;
}

function App() {
  const [url, setUrl] = useState('https://example.com');
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('preview');

  async function cloneSite() {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API}/api/clone`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clone failed');
      setResult(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function modifySite() {
    if (!result?.generated || !instruction.trim()) return;
    setModifying(true); setError('');
    try {
      const res = await fetch(`${API}/api/modify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsx: result.generated.jsx,
          css: result.generated.css,
          instruction,
          summary: result.generated.summary
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Modification failed');
      setResult((old) => ({ ...old, generated: data.generated }));
      setInstruction('');
    } catch (e) { setError(e.message); }
    finally { setModifying(false); }
  }

  const analysis = result?.analysis;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">FOUNDING AI ENGINEER • MVP</div>
          <h1>AI Frontend Cloner</h1>
          <p>URL → analysis → React generation → validation → AI modification</p>
        </div>
        <div className="status">{loading || modifying ? 'AI working…' : result ? 'Ready' : 'Idle'}</div>
      </header>

      <main className="layout">
        <section className="control-card">
          <label>Public website URL</label>
          <div className="url-row">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
            <button onClick={cloneSite} disabled={loading}>{loading ? 'Analyzing…' : 'Clone website'}</button>
          </div>
          <p className="hint">Use a publicly accessible site. The agent analyzes it with a real browser; it does not iframe the source website.</p>

          {result && <>
            <div className="divider" />
            <label>Modify the generated frontend</label>
            <div className="modify-row">
              <input value={instruction} onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && modifySite()} placeholder="e.g. Change the primary color to blue" />
              <button className="secondary" onClick={modifySite} disabled={modifying || !instruction.trim()}>{modifying ? 'Updating…' : 'Apply AI change'}</button>
            </div>
            <div className="examples">
              {['Make the navbar sticky', 'Add a testimonials section', 'Change the primary color to blue', 'Remove the pricing section'].map((x) => <button key={x} onClick={() => setInstruction(x)}>{x}</button>)}
            </div>
          </>}
          {error && <div className="error">{error}</div>}
        </section>

        {result && <section className="workspace">
          <div className="workspace-head">
            <div>
              <strong>{result.title || 'Generated frontend'}</strong>
              <span>{result.url}</span>
            </div>
            <div className="tabs">
              <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>Preview</button>
              <button className={tab === 'analysis' ? 'active' : ''} onClick={() => setTab('analysis')}>Analysis</button>
              <button className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>Code</button>
            </div>
          </div>

          {tab === 'preview' && <div className="preview-wrap"><Preview jsx={result.generated.jsx} css={result.generated.css} /></div>}
          {tab === 'analysis' && <div className="analysis-grid">
            <div className="metric"><b>Elements</b><span>{analysis?.elements?.length || 0}</span></div>
            <div className="metric"><b>Images</b><span>{analysis?.images?.length || 0}</span></div>
            <div className="metric"><b>Links</b><span>{analysis?.links?.length || 0}</span></div>
            <div className="metric"><b>Viewport</b><span>{analysis?.viewport?.width} × {analysis?.viewport?.height}</span></div>
            <div className="evidence"><h3>Detected visible text</h3><p>{analysis?.visibleText}</p></div>
            <div className="evidence"><h3>Original screenshot</h3><img src={result.screenshot} alt="Source website screenshot" /></div>
          </div>}
          {tab === 'code' && <div className="code-grid">
            <div><h3>App.jsx</h3><pre>{result.generated.jsx}</pre></div>
            <div><h3>styles.css</h3><pre>{result.generated.css}</pre></div>
          </div>}
        </section>}

        {!result && !loading && <section className="empty-card">
          <div className="empty-icon">✦</div>
          <h2>Paste a URL to start</h2>
          <p>The agent will inspect layout, navigation, text, images, colors, typography, spacing and responsive structure, then generate a fresh React implementation.</p>
        </section>}
      </main>
      <footer>AI Frontend Cloner • React + Express + Playwright + OpenAI Responses API</footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
