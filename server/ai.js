import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

const GENERATION_INSTRUCTIONS = `You are an expert frontend reconstruction engineer.
Your task is to create a NEW React implementation that visually resembles a public website from evidence supplied by a browser analyzer.

Rules:
- Return JSON only with exactly these string fields: jsx, css, summary.
- jsx must be a complete React component body that defines function App() and ends with the App function declaration. Do not include imports, export statements, markdown fences, or HTML document tags.
- You may use React hooks through the global React object, e.g. const { useState } = React. Do not import packages.
- Use semantic reusable sections/components inside the file.
- Use plain CSS only. Do not use Tailwind, CSS-in-JS, external component libraries, or build-time packages.
- Recreate the visible structure: navbar, hero, sections, cards, CTA, footer, typography, spacing, borders, shadows, colors and responsive behavior when those are present.
- Use the provided image URLs when useful. Never iframe, embed, or redirect to the original website.
- If an image URL is unavailable, use a visually appropriate CSS gradient or a stable remote image URL from the supplied asset evidence.
- Do not reproduce hidden scripts, trackers, analytics, authentication, payment forms, or private data.
- Make the result responsive at 360px, 768px and 1440px.
- Prefer CSS classes with clear names and avoid inline style except for truly dynamic values.
- Keep the generated code reasonably compact but complete.\n`;

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\\s*([\\s\\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  try { return JSON.parse(candidate); } catch {}

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(candidate.slice(start, end + 1)); } catch {}
  }
  throw new Error('AI did not return valid JSON.');
}

function validateGenerated(result) {
  const problems = [];
  if (!result || typeof result.jsx !== 'string' || typeof result.css !== 'string') {
    problems.push('Missing jsx or css string.');
  }
  if (result.jsx && !/function\s+App\s*\(/.test(result.jsx)) problems.push('JSX does not define App().');
  if (result.jsx && /<iframe/i.test(result.jsx)) problems.push('Generated code contains an iframe.');
  if (result.jsx && /import\s+.+from/i.test(result.jsx)) problems.push('Generated code contains imports.');
  if (result.jsx && /export\s+default/i.test(result.jsx)) problems.push('Generated code contains an export.');
  if (result.css && result.css.length > 80000) problems.push('CSS is excessively large.');
  if (result.jsx && result.jsx.length > 100000) problems.push('JSX is excessively large.');
  return problems;
}

async function callModel(content) {
  const response = await client.responses.create({
    model: MODEL,
    input: [{ role: 'user', content }],
    max_output_tokens: 18000
  });
  return extractJson(response.output_text);
}

export async function generateFrontend(site) {
  const evidence = JSON.stringify(site.analysis);
  const content = [
    { type: 'input_text', text: `${GENERATION_INSTRUCTIONS}\n\nSOURCE URL: ${site.url}\nPAGE TITLE: ${site.title}\n\nBROWSER EVIDENCE:\n${evidence}` },
    { type: 'input_image', image_url: site.screenshot, detail: 'high' }
  ];

  let result = await callModel(content);
  let problems = validateGenerated(result);

  if (problems.length) {
    result = await callModel(`Repair this generated React frontend. Return JSON only with jsx, css, summary.\nProblems: ${problems.join(' | ')}\n\nJSX:\n${result.jsx || ''}\n\nCSS:\n${result.css || ''}`);
    problems = validateGenerated(result);
  }

  if (problems.length) throw new Error(`Generated frontend failed validation: ${problems.join(' ')}`);
  return { ...result, model: MODEL, validation: 'passed' };
}

export async function modifyFrontend({ jsx, css, instruction, sourceSummary = '' }) {
  const prompt = `${GENERATION_INSTRUCTIONS}

You are MODIFYING an already generated frontend. Preserve its current design unless the instruction requires a change.
User instruction: ${instruction}
Existing summary: ${sourceSummary}

Return JSON only with jsx, css, summary.

CURRENT JSX:
${jsx}

CURRENT CSS:
${css}
`;
  const result = await callModel(prompt);
  const problems = validateGenerated(result);
  if (problems.length) throw new Error(`Modified frontend failed validation: ${problems.join(' ')}`);
  return { ...result, model: MODEL, validation: 'passed' };
}
