import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { answer, collectCitations, collectSituationCitations } from '../server.js';

const citation = { type: 'url_citation', url_citation: { title: 'Official source', url: 'https://example.gov.in/info' } };
const completed = (text = 'A clear answer.') => ({
  ok: true,
  status: 200,
  json: async () => ({ status: 'completed', output_text: text, output: [{ content: [{ annotations: [citation] }] }] })
});
function captureFetch(response = completed()) {
  const requests = [];
  const fetchImpl = async (url, options) => { requests.push({ url, options, body: JSON.parse(options.body) }); return response; };
  return { fetchImpl, requests };
}
function makePdf(text) {
  const escaped = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test('document workflow sends short and longer supplied text without web search', async () => {
  const { fetchImpl, requests } = captureFetch();
  await answer({ mode: 'explain', language: 'en', text: 'Notice: reply by 30 June.' }, { apiKey: 'test-secret', fetchImpl });
  await answer({ mode: 'explain', language: 'hi', text: 'Long supplied policy. '.repeat(500) }, { apiKey: 'test-secret', fetchImpl });
  await answer({ mode: 'explain', language: 'kn', text: 'A notice.' }, { apiKey: 'test-secret', fetchImpl });
  assert.equal(requests.length, 3);
  assert.equal(requests[0].url, 'https://api.groq.com/openai/v1/responses');
  assert.equal(requests[0].body.model, 'openai/gpt-oss-120b');
  assert.match(requests[0].body.input, /reply by 30 June/);
  assert.match(requests[0].body.instructions, /Not stated in the provided material/);
  assert.match(requests[1].body.instructions, /Hindi/);
  assert.match(requests[2].body.instructions, /English/);
  assert.equal(requests[0].body.tools, undefined);
  assert.equal(requests[0].body.store, undefined);
});

test('document workflow extracts validated PDF text before sending it to Groq', async () => {
  const { fetchImpl, requests } = captureFetch();
  const pdf = makePdf('Notice: reply by 30 June.');
  await answer({ mode: 'explain', text: 'My note', file: { name: 'notice.pdf', data: `data:application/pdf;base64,${pdf.toString('base64')}` } }, { apiKey: 'test-secret', fetchImpl });
  assert.equal(typeof requests[0].body.input, 'string');
  assert.match(requests[0].body.input, /Notice: reply by 30 June/);
  assert.match(requests[0].body.input, /My note/);
  assert.doesNotMatch(JSON.stringify(requests[0].body), /input_file|notice.pdf/);
  await assert.rejects(answer({ mode: 'explain', file: { name: 'fake.pdf', data: 'data:application/pdf;base64,SGVsbG8=' } }, { apiKey: 'test-secret', fetchImpl }), { status: 400 });
  const malformedPdf = Buffer.from('%PDF-1.4\nnot a PDF body');
  await assert.rejects(answer({ mode: 'explain', file: { name: 'invalid.pdf', data: `data:application/pdf;base64,${malformedPdf.toString('base64')}` } }, { apiKey: 'test-secret', fetchImpl }), err => err.status === 400 && /This PDF could not be read/.test(err.message));
  assert.equal(requests.length, 1);
});

test('PDF text extraction works without canvas or browser rendering globals', () => {
  const pdf = makePdf('Serverless text extraction.');
  const moduleUrl = new URL('../pdf-text-extractor.js', import.meta.url).href;
  const script = `
    import Module from 'node:module';
    for (const name of ['DOMMatrix', 'ImageData', 'Path2D']) delete globalThis[name];
    const originalLoad = Module._load;
    Module._load = function (specifier, parent, isMain) {
      if (specifier === '@napi-rs/canvas') throw new Error('canvas unavailable in test');
      return originalLoad.call(this, specifier, parent, isMain);
    };
    const { extractPdfText } = await import(${JSON.stringify(moduleUrl)});
    const text = await extractPdfText(Buffer.from(${JSON.stringify(pdf.toString('base64'))}, 'base64'));
    if (!text.includes('Serverless text extraction.')) throw new Error('PDF text was not extracted');
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('citation extraction only returns http and https URL annotations', () => {
  const response = { output: [{ content: [{ annotations: [citation, { type: 'url_citation', url_citation: { title: 'Unsafe', url: 'javascript:alert(1)' } }, { type: 'url_citation', url_citation: { url: 'file:///secret' } }] }] }] };
  assert.deepEqual(collectCitations(response), [{ title: 'Official source', url: 'https://example.gov.in/info' }]);
});

test('Situation citations come only from verified Indian official URL annotations or completed official browser opens', () => {
  const response = { output: [
    { type: 'message', content: [{ annotations: [
      citation,
      { type: 'url_citation', url_citation: { title: 'Foreign law', url: 'https://justice.example.uk/act' } },
      { type: 'url_citation', url_citation: { title: 'Unsafe', url: 'javascript:alert(1)' } }
    ] }] },
    { type: 'mcp_call', name: 'browser.search', status: 'completed', arguments: JSON.stringify({ query: 'Indian official portal' }), output: 'Search results include https://india.gov.in/' },
    { type: 'mcp_call', name: 'browser.open', status: 'completed', arguments: JSON.stringify({ url: 'https://www.rbi.org.in/Scripts/FAQView.aspx?Id=123' }), output: 'Opened source content.' },
    { type: 'mcp_call', name: 'browser.open', status: 'failed', arguments: JSON.stringify({ url: 'https://www.gov.in/unavailable' }), output: 'Error: unavailable' },
    { type: 'mcp_call', name: 'browser.open', status: 'completed', arguments: JSON.stringify({ url: 'https://foreign.example/guide' }), output: 'Opened foreign law.' }
  ] };
  assert.deepEqual(collectSituationCitations(response), [
    { title: 'example.gov.in', url: 'https://example.gov.in/info' },
    { title: 'www.rbi.org.in', url: 'https://www.rbi.org.in/Scripts/FAQView.aspx?Id=123' }
  ]);
});

test('situation workflow requires Groq browser search and carries realistic jurisdiction details', async () => {
  const scenarios = [
    'I received an online payment fraud message and lost money. What should I do now?',
    'I want to open a small business. Which registrations and permissions may apply?',
    'I have a problem. What law applies?'
  ];
  for (const situation of scenarios) {
    const { fetchImpl, requests } = captureFetch();
    const result = await answer({ mode: 'situation', situation, state: 'Maharashtra' }, { apiKey: 'test-secret', fetchImpl });
    assert.match(requests[0].body.input, new RegExp(situation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(requests[0].body.instructions, /official Indian government, regulator, police, judiciary/);
    assert.match(requests[0].body.instructions, /Apply only Indian law and procedure; never apply foreign law/i);
    assert.match(requests[0].body.instructions, /Never infer a city, district, or state/i);
    assert.match(requests[0].body.instructions, /at most two targeted searches/i);
    assert.match(requests[0].body.instructions, /Open only the best two or three relevant sources/i);
    assert.match(requests[0].body.instructions, /commencement\/amendment\/repeal status on the incident date/i);
    assert.match(requests[0].body.instructions, /maximum 200, with up to four prioritized steps/i);
    assert.equal(requests[0].body.tool_choice, 'auto');
    assert.equal(requests[0].body.tools[0].type, 'browser_search');
    assert.deepEqual(requests[0].body.reasoning, { effort: 'low' });
    assert.equal(requests[0].body.parallel_tool_calls, false);
    assert.equal(result.searched, true);
    assert.deepEqual(result.citations, [{ title: 'example.gov.in', url: 'https://example.gov.in/info' }]);
  }
  const { fetchImpl, requests } = captureFetch();
  await answer({ mode: 'situation', situation: 'What nationwide rule applies to this process?' }, { apiKey: 'test-secret', fetchImpl });
  assert.match(requests[0].body.input, /State\/UT: Not provided/);
  assert.match(requests[0].body.instructions, /Never infer a city, district, or state/);
});

test('situation workflow accepts completed MCP search output and logs only safe tool metadata', async () => {
  const toolResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      status: 'completed',
      output_text: 'Search-backed guidance.',
      output: [
        { type: 'mcp_call', server_label: 'browser-search', name: 'web_search', arguments: 'private query arguments', output: 'private search results' },
        { type: 'message', status: 'completed', content: [] }
      ]
    })
  };
  const { fetchImpl, requests } = captureFetch(toolResponse);
  const logs = [];
  const originalLog = console.log;
  console.log = message => logs.push(message);
  try {
    const result = await answer({ mode: 'situation', situation: 'How do I report a payment fraud?', state: 'Delhi' }, { apiKey: 'test-secret', fetchImpl });
    assert.equal(result.answer, 'Search-backed guidance.');
  } finally { console.log = originalLog; }
  assert.equal(requests[0].body.tool_choice, 'auto');
  assert.match(logs.join('\n'), /"toolType":"mcp_call"/);
  assert.match(logs.join('\n'), /"toolName":"web_search"/);
  assert.match(logs.join('\n'), /"hasToolOutput":true/);
  assert.doesNotMatch(logs.join('\n'), /private query arguments|private search results/);
});

test('situation incomplete responses retain safe failure handling and log token usage only', async () => {
  const incomplete = {
    ok: true,
    status: 200,
    json: async () => ({
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
      max_output_tokens: 1800,
      usage: { input_tokens: 4000, output_tokens: 1800, output_tokens_details: { reasoning_tokens: 900 }, total_tokens: 5800 },
      output: [{ type: 'mcp_call', server_label: 'browser-search', name: 'web_search', arguments: 'sensitive query', output: 'sensitive results' }]
    })
  };
  const { fetchImpl } = captureFetch(incomplete);
  const logs = [];
  const originalLog = console.log;
  console.log = message => logs.push(message);
  try {
    await assert.rejects(answer({ mode: 'situation', situation: 'Need steps after online fraud.', state: 'Kerala' }, { apiKey: 'test-secret', fetchImpl }), err => err.status === 502 && /incomplete/.test(err.message));
  } finally { console.log = originalLog; }
  assert.match(logs.join('\n'), /"incompleteReason":"max_output_tokens"/);
  assert.match(logs.join('\n'), /"inputTokens":4000/);
  assert.match(logs.join('\n'), /"outputTokens":1800/);
  assert.match(logs.join('\n'), /"reasoningTokens":900/);
  assert.doesNotMatch(logs.join('\n'), /sensitive query|sensitive results|test-secret/);
});

test('scheme workflow sends profile details, demands current official criteria, and labels assessment preliminary', async () => {
  const { fetchImpl, requests } = captureFetch(completed('Satisfied: reported criteria. Unknown: missing proof.'));
  const result = await answer({ mode: 'scheme', scheme: 'PM-KISAN', details: 'Small farmer, owns cultivable land; Aadhaar status unknown.', state: 'Uttar Pradesh' }, { apiKey: 'test-secret', fetchImpl });
  assert.match(requests[0].body.input, /owns cultivable land/);
  assert.match(requests[0].body.instructions, /Satisfied, Not satisfied, or Unknown/);
  assert.match(requests[0].body.instructions, /not approval/);
  assert.equal(requests[0].body.tool_choice, 'auto');
  assert.equal(requests[0].body.tools[0].type, 'browser_search');
  assert.equal(requests[0].body.reasoning, undefined);
  assert.equal(requests[0].body.parallel_tool_calls, undefined);
  assert.match(result.answer, /Unknown/);
});

test('communication drafting preserves the selected context, language and tone without research tools', async () => {
  const { fetchImpl, requests } = captureFetch(completed('Subject: Damaged mixer\n\nDear Support Team,\n\nThe mixer arrived damaged. Please arrange a replacement.\n\nRegards'));
  const result = await answer({
    mode: 'draft', recipient: 'company', story: 'My mixer arrived damaged yesterday.', contacted: 'yes',
    previousContact: 'I called support and was asked to email.', outcome: 'replacement', tone: 'firm', draftLanguage: 'kn'
  }, { apiKey: 'test-secret', fetchImpl });
  const body = requests[0].body;
  assert.equal(requests.length, 1);
  assert.equal(body.tools, undefined);
  assert.equal(body.tool_choice, undefined);
  assert.match(body.instructions, /requested tone \(firm\)/);
  assert.match(body.instructions, /recipient \(company\)/);
  assert.match(body.instructions, /requested outcome \(replacement\)/);
  assert.match(body.instructions, /Write the communication in Kannada/);
  assert.match(body.instructions, /Do not add laws, sections, legal threats, deadlines, promises/);
  assert.match(body.instructions, /Never invent names, dates, order numbers/);
  assert.match(body.input, /My mixer arrived damaged yesterday/);
  assert.match(body.input, /I called support and was asked to email/);
  assert.equal(result.answer, 'Subject: Damaged mixer\n\nDear Support Team,\n\nThe mixer arrived damaged. Please arrange a replacement.\n\nRegards');
  assert.deepEqual(result.citations, []);
  assert.equal(result.searched, false);
});

test('communication drafting validates required and conditional fields before contacting Groq', async () => {
  const requests = [];
  const fetchImpl = async (...args) => { requests.push(args); return completed(); };
  await assert.rejects(answer({ mode: 'draft', recipient: 'seller', outcome: 'refund', tone: 'polite' }, { apiKey: 'test-secret', fetchImpl }), { status: 400 });
  await assert.rejects(answer({ mode: 'draft', recipient: 'other', customRecipient: '', story: 'Issue', outcome: 'refund', tone: 'polite' }, { apiKey: 'test-secret', fetchImpl }), { status: 400 });
  await assert.rejects(answer({ mode: 'draft', recipient: 'seller', story: 'Issue', outcome: 'other', customOutcome: '', tone: 'polite' }, { apiKey: 'test-secret', fetchImpl }), { status: 400 });
  await assert.rejects(answer({ mode: 'draft', recipient: 'seller', story: 'Issue', outcome: 'refund', tone: 'aggressive' }, { apiKey: 'test-secret', fetchImpl }), { status: 400 });
  await assert.rejects(answer({ mode: 'draft', recipient: 'seller', story: 'x'.repeat(6001), outcome: 'refund', tone: 'polite' }, { apiKey: 'test-secret', fetchImpl }), { status: 400 });
  assert.equal(requests.length, 0);
});

test('missing key, invalid inputs, provider errors, incomplete output, network failures, and timeouts are safe', async () => {
  await assert.rejects(answer({ mode: 'explain', text: 'notice' }, { apiKey: '', fetchImpl: async () => { throw new Error('must not call'); } }), { status: 503 });
  await assert.rejects(answer(null, { apiKey: 'test-secret' }), { status: 400 });
  await assert.rejects(answer({ mode: 'situation', situation: 'x'.repeat(6001) }, { apiKey: 'test-secret' }), { status: 400 });
  const invalidKeyResponse = { ok: false, status: 401, json: async () => ({ error: { message: 'test-secret must not be exposed' } }) };
  await assert.rejects(answer({ mode: 'explain', text: 'notice' }, { apiKey: 'test-secret', fetchImpl: async () => invalidKeyResponse }), err => err.status === 502 && !err.message.includes('test-secret'));
  const limitedResponse = { ok: false, status: 429, json: async () => ({}) };
  await assert.rejects(answer({ mode: 'explain', text: 'notice' }, { apiKey: 'test-secret', fetchImpl: async () => limitedResponse }), { status: 429 });
  await assert.rejects(answer({ mode: 'explain', text: 'notice' }, { apiKey: 'test-secret', fetchImpl: async () => completed().json().then(data => ({ ok: true, status: 200, json: async () => ({ ...data, status: 'incomplete' }) })) }), { status: 502 });
  await assert.rejects(answer({ mode: 'explain', text: 'notice' }, { apiKey: 'test-secret', fetchImpl: async () => { throw new Error('raw transport detail'); } }), err => err.status === 502 && !err.message.includes('raw transport detail'));
  await assert.rejects(answer({ mode: 'explain', text: 'notice' }, { apiKey: 'test-secret', timeoutMs: 5, fetchImpl: (_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))) }), { status: 504 });
});
