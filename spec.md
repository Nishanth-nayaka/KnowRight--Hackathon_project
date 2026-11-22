KNOWRIGHT — SDD v0.1
Multilingual Policy, Rights & Scheme Explainer
Hackathon build plan | 30-hour target | Draft for implementation


1. Product vision
Build an AI-powered web platform that helps ordinary people understand government schemes, official notices, and laws in clear, accessible language, and helps them understand how official requirements may apply to their own circumstances.

The product should reduce confusion caused by complex wording, fragmented information, and language barriers. It should help users understand their next steps—not replace official authorities or qualified professionals.
2. Core problem
People may struggle to understand:
- Government schemes, eligibility criteria, and application requirements.
- Official notices and legal/administrative language.
- Laws relevant to their real-life situations.
- What documents or next steps they may need.
3. Intended users
- Citizens seeking to understand schemes or official information.
- People who need a plain-language explanation of laws/notices.
- People describing a real-life situation and asking what requirements may apply.
- Users who benefit from regional-language explanations.
4. MVP scope (Phase 1)
A. Plain-language document / notice explainer
User provides or uploads an official notice, scheme document, or law-related text. The AI explains it in simple language, summarizes key points, and identifies requirements, dates, and actions when present in the supplied material. It should distinguish facts in the document from general explanation and avoid inventing missing details.
B. Situation-based law and civic guidance
User describes a situation in natural language (example: “I want to open a small shop. What registrations, permissions, and paperwork might I need?”). The assistant clarifies essential missing details when needed, provides relevant general guidance, identifies potentially applicable laws or requirements, and offers a practical checklist of next steps. State/local differences and uncertainty must be surfaced.
C. Scheme eligibility helper
User provides relevant personal/situation details through a guided input or conversation. The system compares these details against available scheme criteria, then reports:
- Criteria that appear satisfied.
- Criteria not satisfied (if supported).
- Criteria that are unknown or need verification.
- Potential documents required.
- Official application/source links and next steps, where available.
  It must not present a preliminary AI assessment as guaranteed eligibility or approval.
D. Language accessibility
The interface and AI outputs should support English and a chosen regional language for the hackathon demo. Exact language coverage is to be confirmed during implementation planning.
5. Later / stretch feature
Learn Law (personal-touch feature)
A curated educational section that teaches selected practical laws and legal concepts in simple language, for example everyday road/driving rules, basic consumer rights, cyber safety, workplace awareness, renting/agreement basics, or beginner business compliance.
This is intentionally not part of the initial MVP. Add it only after core flows are working and time remains. It is a curated learning experience—not a complete law encyclopedia. Each lesson should use verified sources and include a practical example, plain-language explanation, key legal reference (when verified), and a short knowledge check if time allows.
6. Explicitly out of scope for initial MVP
- Autonomous submission of government applications or portal automation.
- Exhaustive coverage of all Indian laws, schemes, or states.
- Guaranteeing legal outcomes, scheme eligibility, or approvals.
- User accounts, persistent profiles, or long-term chat history unless later deemed necessary.
- A full Learn Law content library before core MVP completion.
- Complex multi-agent orchestration solely to showcase multiple models.
7. AI behavior and trust requirements
- Prefer reliable, official source material for law, schemes, and notices.
- Provide source links/references for factual legal or scheme claims whenever the system has access to sources.
- Clearly label uncertainty, missing details, and jurisdiction/state-specific variation.
- Never fabricate law sections, deadlines, eligibility rules, required documents, fees, or official links.
- Ask for only essential clarifications; avoid overconfident conclusions.
- Use plain-language explanations and preserve important caveats.
- Treat outputs as informational guidance, not a substitute for official confirmation or professional legal/accounting advice.
8. Data and database decision (not locked)
A database is not currently required for the planned MVP if the app does not need accounts, saved user profiles, persistent history, or shared content.
Initial approach may keep interaction state in memory/browser session and process uploaded files transiently. Do not add MongoDB (or another database) by default.
Revisit database only if a confirmed feature requires durable storage. If persistence becomes necessary, choose the simplest suitable option after defining what data is stored, why, retention, and privacy needs.
Do not store sensitive personal details unnecessarily. Uploaded documents should not be retained beyond what the MVP needs.
9. Voice (candidate / stretch)
The notes mention voice interaction. Treat voice input/output as a potential enhancement, not a blocker for the core MVP, unless time and implementation feasibility are confirmed. Text-first functionality must work.
10. User experience principles
- Simple, approachable, beginner-friendly interface.
- Clear separation between document explanation, situation-based assistance, and scheme eligibility.
- Avoid overwhelming users with long legal paragraphs.
- Present practical next steps and checklists.
- Make language selection visible and easy to use.
- Display sources and verification caveats in a readable way.
11. Two-phase delivery plan (30-hour target)
Phase 1 — Core build
Implement the main application in one coordinated build pass:
- Establish app shell/navigation and primary pages.
- Implement document/notice explanation.
- Implement situation-based legal/civic assistant.
- Implement scheme eligibility flow and results.
- Connect AI and source handling based on the final chosen stack/provider.
- Keep Learn Law deferred.
- Keep persistence/database out unless a required MVP feature proves it is necessary.
- Build text-first; voice is optional.
Phase 2 — Integration, verification, and submission
- Connect and verify all core flows end-to-end.
- Test representative inputs, edge cases, missing information, and unsupported questions.
- Verify citations/official sources and ensure the assistant does not invent details.
- Fix critical bugs and usability issues.
- Add a small polish pass.
- Add Learn Law only if the core MVP is stable and sufficient time remains.
- Prepare a clear demo scenario, screen recording if required, submission description, and final link.
12. Proposed 30-hour time allocation (adjustable)
- Product clarification and spec lock: 2 hours.
- Core build: 16 hours.
- Integration and testing: 5 hours.
- Demo/submission preparation: 4 hours.
- Contingency buffer: 3 hours.
  Total: 30 hours.
13. Demo outline (draft)
1. Open with a confusing government notice or scheme text.
2. Show a plain-language explanation with key requirements and source references.
3. Ask a real-life question (e.g., opening a small shop) and receive a practical, jurisdiction-aware checklist.
4. Enter a sample profile for a scheme and show satisfied / not satisfied / unknown eligibility criteria with source links.
5. If stable and time remains, show Learn Law as a separate curated learning section.
14. Open decisions (not yet locked)
- Project/product name.
- Frontend/backend stack and deployment approach.
- AI provider/model(s) and whether multiple models are genuinely needed.
- Retrieval/source strategy and which official source set is available for the demo.
- Which regional language(s) will be demonstrated.
- Exact scheme(s) used in the demo and their authoritative source documents.
- Voice input/output implementation.
- Database only if persistence is proven necessary.
- Learn Law content selection, to be decided only after core MVP progress.
15. Build rule
Do not start feature coding until the core scope and build choices are sufficiently clear. Avoid scope expansion. The MVP is successful if its three primary flows work reliably and can be demonstrated end-to-end with understandable, source-grounded outputs.