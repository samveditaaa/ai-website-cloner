import { chromium } from 'playwright';

const MAX_TEXT = 14000;
const MAX_ELEMENTS = 180;
const MAX_IMAGES = 40;
const MAX_LINKS = 80;

function absoluteUrl(value, base) {
  try {
    return new URL(value, base).href;
  } catch {
    return value || '';
  }
}

export async function analyzeWebsite(targetUrl) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1800);

    const title = await page.title();
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 72, fullPage: false });

    const data = await page.evaluate(({ MAX_ELEMENTS, MAX_IMAGES, MAX_LINKS }) => {
      const clean = (s = '') => s.replace(/\\s+/g, ' ').trim();
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
      };
      const style = (el) => {
        const s = getComputedStyle(el);
        return {
          display: s.display,
          position: s.position,
          width: s.width,
          maxWidth: s.maxWidth,
          minHeight: s.minHeight,
          padding: s.padding,
          margin: s.margin,
          gap: s.gap,
          color: s.color,
          backgroundColor: s.backgroundColor,
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing,
          borderRadius: s.borderRadius,
          boxShadow: s.boxShadow,
          textAlign: s.textAlign,
          flexDirection: s.flexDirection,
          justifyContent: s.justifyContent,
          alignItems: s.alignItems,
          gridTemplateColumns: s.gridTemplateColumns
        };
      };

      const elements = Array.from(document.querySelectorAll('header, nav, main, section, footer, article, aside, form, h1, h2, h3, p, button, a, img, input, textarea'))
        .slice(0, MAX_ELEMENTS)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: typeof el.className === 'string' ? el.className.slice(0, 180) : '',
          text: clean(el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').slice(0, 500),
          href: el.tagName.toLowerCase() === 'a' ? el.getAttribute('href') || '' : '',
          src: el.tagName.toLowerCase() === 'img' ? el.getAttribute('src') || '' : '',
          alt: el.tagName.toLowerCase() === 'img' ? el.getAttribute('alt') || '' : '',
          rect: rect(el),
          style: style(el)
        }));

      const images = Array.from(document.images).slice(0, MAX_IMAGES).map((img) => ({
        src: img.currentSrc || img.src || '',
        alt: img.alt || '',
        width: img.naturalWidth,
        height: img.naturalHeight
      }));

      const links = Array.from(document.querySelectorAll('a')).slice(0, MAX_LINKS).map((a) => ({
        text: clean(a.innerText || a.getAttribute('aria-label') || '').slice(0, 160),
        href: a.href
      }));

      const meta = Array.from(document.querySelectorAll('meta[name], meta[property]')).map((m) => ({
        name: m.getAttribute('name') || m.getAttribute('property') || '',
        content: (m.getAttribute('content') || '').slice(0, 300)
      }));

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        bodyFont: getComputedStyle(document.body).fontFamily,
        elements,
        images,
        links,
        meta,
        visibleText: clean(document.body.innerText || '').slice(0, 12000)
      };
    }, { MAX_ELEMENTS, MAX_IMAGES, MAX_LINKS });

    const base = new URL(targetUrl).href;
    data.images = data.images.map((x) => ({ ...x, src: absoluteUrl(x.src, base) }));
    data.links = data.links.map((x) => ({ ...x, href: absoluteUrl(x.href, base) }));
    data.elements = data.elements.map((x) => ({
      ...x,
      href: x.href ? absoluteUrl(x.href, base) : '',
      src: x.src ? absoluteUrl(x.src, base) : ''
    }));

    return {
      url: targetUrl,
      title,
      screenshot: `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`,
      analysis: data
    };
  } finally {
    await browser.close();
  }
}
