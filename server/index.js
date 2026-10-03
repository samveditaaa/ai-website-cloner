import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns/promises';
import net from 'net';
import { analyzeWebsite } from './analyzer.js';
import { generateFrontend, modifyFrontend } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN }));
app.use(express.json({ limit: '12mb' }));

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateIPv6(ip) {
  const v = ip.toLowerCase();
  return v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:');
}

async function validatePublicUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('Please enter a valid URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http:// and https:// URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || net.isIP(hostname) && (isPrivateIPv4(hostname) || isPrivateIPv6(hostname))) {
    throw new Error('For safety, local/private network URLs are not allowed.');
  }
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (records.some((r) => net.isIP(r.address) === 4 ? isPrivateIPv4(r.address) : isPrivateIPv6(r.address))) {
      throw new Error('The URL resolves to a private network address.');
    }
  } catch (err) {
    if (err.message.includes('private network')) throw err;
  }
  return url.href;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'ai-frontend-cloner' }));

app.post('/api/clone', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
    const url = await validatePublicUrl(req.body?.url);
    const site = await analyzeWebsite(url);
    const generated = await generateFrontend(site);
    res.json({ url, title: site.title, analysis: site.analysis, screenshot: site.screenshot, generated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Clone failed.' });
  }
});

app.post('/api/modify', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
    const { jsx, css, instruction, summary } = req.body || {};
    if (!jsx || !css || !instruction) return res.status(400).json({ error: 'jsx, css and instruction are required.' });
    const generated = await modifyFrontend({ jsx, css, instruction, sourceSummary: summary });
    res.json({ generated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Modification failed.' });
  }
});

const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => err && next(err));
});

app.listen(PORT, '0.0.0.0', () => console.log(`AI Cloner server running on http://localhost:${PORT}`));
