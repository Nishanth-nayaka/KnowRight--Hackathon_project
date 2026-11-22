import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('serves the app and rejects incomplete workflow requests', async t => {
  const port = 3187;
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port), GROQ_API_KEY: '' }, stdio: 'ignore' });
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = async () => {
      if (Date.now() - start > 5000) return reject(new Error('server did not start'));
      try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); if (r.ok) return resolve(); } catch {}
      setTimeout(poll, 50);
    };
    child.once('error', reject); poll();
  });
  const home = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /KnowRight/);
  assert.match(html, /<a class="brand"[^>]*data-view="home"[^>]*>.*KnowRight/);
  assert.match(html, /class="mobile-brand"[^>]*data-view="home">.*KnowRight/);
  assert.match(html, /© KnowRight/);
  assert.match(html, /id="explain-form"/);
  assert.match(html, /id="situation-form"/);
  assert.match(html, /id="scheme-form"/);
  assert.match(html, /data-view="draft"/);
  assert.match(html, /id="draft-form"/);
  assert.match(html, /id="draft-language"/);
  assert.match(html, /id="draft-result"/);
  assert.match(html, /data-view="learn-law"/);
  assert.match(html, /id="learn-library"/);
  assert.match(html, /id="learn-article"/);
  assert.match(html, /value="hi"/);
  assert.match(html, /value="kn"/);
  assert.match(html, /learn-law-content\.js/);
  assert.match(html, /id="menu-toggle"[^>]*aria-controls="sidebar"[^>]*aria-expanded="false"/);
  assert.match(html, /id="drawer-close"/);
  assert.match(html, /id="drawer-scrim"/);
  const appResponse = await fetch(`http://127.0.0.1:${port}/app.js`);
  assert.equal(appResponse.status, 200);
  const app = await appResponse.text();
  const lessonsResponse = await fetch(`http://127.0.0.1:${port}/learn-law-content.js`);
  assert.equal(lessonsResponse.status, 200);
  assert.match(await lessonsResponse.text(), /window\.learnLawContent/);
  assert.match(app, /event\.key === 'Escape'/);
  assert.match(app, /drawerScrim\.addEventListener\('click'/);
  assert.match(app, /mobileNavigation\.addEventListener\('change'/);
  assert.match(app, /requestDraft\(currentDraftRequest, true\)/);
  assert.match(app, /\$\('#draft-body'\)\.value/);
  assert.match(app, /navigator\.clipboard\.writeText\(current\)/);
  assert.match(app, /const current = \(subject \? subject \+ '\\n\\n' : ''\) \+ \$\('#draft-body'\)\.value/);
  assert.match(app, /body: JSON\.stringify\(payload\)/);
  assert.match(app, /renderDraft\(data\.answer\)/);
  const cssResponse = await fetch(`http://127.0.0.1:${port}/styles.css`);
  assert.equal(cssResponse.status, 200);
  const css = await cssResponse.text();
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /\.topbar\{position:sticky;top:0/);
  assert.match(css, /\.learn-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /body\.drawer-open \.sidebar\{transform:translateX\(0\)/);
  assert.match(css, /body\.drawer-open\{overflow:hidden\}/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/%E0%A4%A`)).status, 400);
  const bad = await fetch(`http://127.0.0.1:${port}/api/assist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'explain' }) });
  assert.equal(bad.status, 503);
  assert.match((await bad.json()).error, /GROQ_API_KEY/);
  const draftNoKey = await fetch(`http://127.0.0.1:${port}/api/assist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'draft', recipient: 'seller', story: 'Damaged item', outcome: 'refund', tone: 'polite', draftLanguage: 'en' }) });
  assert.equal(draftNoKey.status, 503);
});

test('validates input before making provider calls', async t => {
  const port = 3188;
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port), GROQ_API_KEY: 'test-key' }, stdio: 'ignore' });
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = async () => {
      if (Date.now() - start > 5000) return reject(new Error('server did not start'));
      try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); if (r.ok) return resolve(); } catch {}
      setTimeout(poll, 50);
    };
    child.once('error', reject); poll();
  });
  const bad = await fetch(`http://127.0.0.1:${port}/api/assist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'situation', situation: ' ' }) });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /Describe your situation/);
  const unsupported = await fetch(`http://127.0.0.1:${port}/api/assist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'learn-law' }) });
  assert.equal(unsupported.status, 400);
  assert.equal((await unsupported.json()).error, 'Choose a supported KnowRight workflow.');
  const invalidDraft = await fetch(`http://127.0.0.1:${port}/api/assist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'draft', recipient: 'seller', outcome: 'refund', tone: 'polite' }) });
  assert.equal(invalidDraft.status, 400);
  assert.match((await invalidDraft.json()).error, /Describe what happened/);
});

test('HTTP route recognizes the frontend draft workflow identifier', async t => {
  const port = 3189;
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port), GROQ_API_KEY: 'test-key' }, stdio: 'ignore' });
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = async () => {
      if (Date.now() - start > 5000) return reject(new Error('server did not start'));
      try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); if (r.ok) return resolve(); } catch {}
      setTimeout(poll, 50);
    };
    child.once('error', reject); poll();
  });
  const response = await fetch(`http://127.0.0.1:${port}/api/assist`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'draft', recipient: 'seller', outcome: 'refund', tone: 'polite', draftLanguage: 'en' })
  });
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.error, 'Describe what happened in 1 to 6,000 characters.');
});
