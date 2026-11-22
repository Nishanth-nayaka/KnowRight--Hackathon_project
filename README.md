# KnowRight

A text-first civic information app with four AI workflows: explain an official document, research a real-life civic situation, compare a user's details against a government scheme, and draft a communication for the user to review and send. It also includes a static Learn Law library. The interface supports English, Hindi, and Kannada. No accounts, database, or saved history are used.

## Run locally

1. Install Node.js 20.16 or later (required by the PDF text extraction dependency).
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set `GROQ_API_KEY` to a server-side Groq API key. Optionally change `GROQ_MODEL` to a Groq Responses API model available to your account. Situation and scheme workflows use browser search, currently supported by Groq GPT-OSS models.
4. Run `npm start` and open <http://localhost:3000>.

The server reads `.env` directly. In PowerShell, you can also set `$env:GROQ_API_KEY='your-key'` before `npm start`. Never put the key in browser code or commit `.env`.

## Deploy on Vercel

Vercel uses the root `server.ts` entry to start the shared Node HTTP server. The existing `npm start` command still runs `server.js` for local development. Vercel serves files from `public/` as static assets.

Import the project with its root directory as the project root, then add `GROQ_API_KEY` in the Vercel project's Environment Variables for each deployment environment you use. Optionally add `GROQ_MODEL`. Do not upload or commit `.env`; Vercel injects configured values into `process.env`. Redeploy after adding or changing environment variables.

## Workflows and trust

- **Document explainer:** accepts pasted text up to 40,000 characters or a PDF up to 8 MB. PDF text is extracted locally and sent to Groq as text; image-only/scanned PDFs are not supported. The prompt confines the explanation to submitted material and calls out absent details.
- **Situation guidance:** uses Groq browser search for current India-specific guidance, asks for state when known, and tells the model to prefer official government and legal sources and surface local variation.
- **Scheme helper:** researches current official scheme pages and compares each criterion as satisfied, not satisfied, or unknown based on information provided. Its result is explicitly preliminary.
- **Draft my communication:** turns the user's account and requested outcome into a professional editable message in the chosen language and tone. It does not research law, invent missing details, or send messages. Users can edit, copy, and regenerate the draft.
- **Citations:** source annotations from search are returned to the browser as clickable links. Document explanations do not claim external verification.
- **Privacy:** handling is stateless; no application database or history is present. Requests are not logged by the app. Avoid entering sensitive identifiers.
- **Learn Law:** static, curated lessons cover consumer purchases, elementary education, RTI, and access to legal services. Lessons include scenario-based Quick Checks and official links. Learn Law makes no AI or backend calls.
- **Languages:** the interface and Learn Law lessons support English, Hindi, and Kannada. Existing AI workflow prompts still support English and Hindi; selecting Kannada currently leaves AI-generated answers in English. The backend prompts were intentionally left unchanged for this addition.

## Technical notes

Node's built-in HTTP server serves the static UI and proxies requests to Groq's OpenAI-compatible Responses API at `https://api.groq.com/openai/v1/responses`. One configured model handles the four workflows with distinct instructions; only situation and scheme research use Groq's `browser_search` tool. The server validates request sizes and PDF signatures, limits PDF size and extracted text, enforces a 75-second timeout, handles provider failures without returning upstream details, and never returns credentials to the browser.

The default model is `openai/gpt-oss-120b`. Groq's Responses API does not accept the OpenAI Responses `input_file` PDF flow, so uploaded PDFs are converted to selectable text in the backend. Scanned PDFs need OCR outside this MVP. Use a GPT-OSS model for browser search; arbitrary model overrides may not support that tool.

## Checks

- `npm test` runs local HTTP tests and mocked provider integration tests for the four workflows, realistic inputs, selectable-PDF extraction, citations, missing/invalid keys, rate limits, timeouts, and validation. Mocks verify application behavior, not live model quality or Groq account availability.
- `npm run check` runs JavaScript syntax checks.

Live model calls require a Groq API key with access to the selected model and browser search. No key is included in this repository.
