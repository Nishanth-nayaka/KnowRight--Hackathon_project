import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadStaticContent() {
  const source = await readFile(new URL('../public/learn-law-content.js', import.meta.url), 'utf8');
  const window = {};
  vm.runInNewContext(source, { window });
  return window;
}

test('Learn Law has matching, fully localized static lessons and no remote logic', async () => {
  const { learnLawContent, learnLawI18n } = await loadStaticContent();
  assert.deepEqual(Object.keys(learnLawContent).sort(), ['en', 'hi', 'kn']);
  for (const locale of ['en', 'hi', 'kn']) {
    const data = learnLawContent[locale];
    assert.ok(data.ui.title && data.ui.notApplies && data.ui.quick && data.ui.sources);
    assert.equal(data.categories.length, 4);
    assert.equal(data.topics.length, 4);
    assert.deepEqual(Array.from(data.topics, topic => topic.id), Array.from(learnLawContent.en.topics, topic => topic.id));
    for (const topic of data.topics) {
      for (const key of ['title', 'description', 'understand', 'scenario', 'law', 'applies', 'notApplies', 'takeaway']) assert.ok(topic[key], `${locale}:${topic.id}:${key}`);
      assert.ok(topic.actions.length >= 2);
      assert.ok(topic.quick.question && topic.quick.correct && topic.quick.incorrect);
      assert.ok(topic.quick.answer >= 0 && topic.quick.answer < topic.quick.options.length);
      assert.ok(topic.quick.options.every(Boolean));
      assert.ok(topic.sources.length);
      assert.ok(topic.sources.every(source => /^https:\/\//.test(source.url) && ['www.indiacode.nic.in', 'indiacode.nic.in', 'nalsa.gov.in', 'consumerhelpline.gov.in', 'dopt.gov.in', 'rti.dopt.gov.in', 'cic.gov.in'].includes(new URL(source.url).hostname)));
    }
  }
  assert.equal(learnLawI18n.kn.learnLawNav, 'ಕಾನೂನು ತಿಳಿಯಿರಿ');
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const draftKeys = ['draftNav','chooseRecipient','chooseOptional','chooseOutcome','featureDraftKicker','featureDraftTitle','featureDraftDesc','draftEyebrow','draftTitle','draftIntro','draftRecipient','recipientSeller','recipientCompany','recipientGovernment','recipientAuthority','recipientOther','recipientOtherLabel','recipientOtherPlaceholder','draftStory','draftStoryPlaceholder','draftContacted','contactNo','contactYes','draftPrevious','draftPreviousPlaceholder','draftOutcome','outcomeRefund','outcomeReplacement','outcomeResolve','outcomeInformation','outcomeAction','outcomeOther','outcomeOtherLabel','outcomeOtherPlaceholder','draftTone','tonePolite','toneFormal','toneFirm','draftLanguage','draftEnglish','draftHindi','draftKannada','draftPrivacy','draftGenerate','draftLoading','draftError','draftResult','draftSubject','draftBody','draftReview','draftCopy','draftCopied','draftCopyError','draftRegenerate','draftRegenerating','draftNoSubject'];
  for (const locale of ['en', 'hi', 'kn']) {
    const block = app.match(new RegExp('Object\\.assign\\(translations\\.' + locale + ', \\{([\\s\\S]*?)\\n\\}\\);'));
    assert.ok(block, `missing communication-draft translations for ${locale}`);
    for (const key of draftKeys) assert.match(block[1], new RegExp('\\b' + key + ':'));
  }
  for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g)) assert.ok(learnLawI18n.kn[key] || draftKeys.includes(key), `missing Kannada UI translation: ${key}`);
  for (const [, key] of html.matchAll(/data-placeholder="([^"]+)"/g)) assert.ok(learnLawI18n.kn[key] || draftKeys.includes(key), `missing Kannada placeholder translation: ${key}`);
  for (const [, key] of html.matchAll(/data-i18n-aria-label="([^"]+)"/g)) assert.ok(learnLawI18n.kn[key], `missing Kannada accessible label: ${key}`);
  assert.match(app, /translations\[locale\] = \{ \.\.\.\(translations\[locale\] \|\| \{\}\), \.\.\.strings \}/);
  assert.match(app, /fetch\('\/api\/assist'/);
  assert.match(app, /window\.learnLawContent\[language\]/);
  assert.doesNotMatch(app.slice(app.indexOf('let activeLearnCategory')), /fetch\(/);
});
