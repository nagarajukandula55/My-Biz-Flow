const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

test('ANu stays idle and performs no periodic polling', () => {
  const source = read('src/components/SupportWidget.tsx');
  assert.match(source, /if \(!open\) return;\s+void refresh\(\)/);
  assert.doesNotMatch(source, /setInterval/);
  assert.doesNotMatch(source, /POLL_MS/);
});

test('dynamic partner navigation does not prefetch every sidebar destination', () => {
  const source = read('src/components/Sidebar.tsx');
  assert.equal((source.match(/prefetch=\{false\}/g) || []).length, 3);
  assert.ok((read('src/components/PublicHeader.tsx').match(/prefetch=\{false\}/g) || []).length >= 4);
  assert.ok((read('src/components/BusinessOfferingDirectory.tsx').match(/prefetch=\{false\}/g) || []).length >= 3);
});

test('middleware skips public assets and public configuration reads are cached', () => {
  const middleware = read('src/middleware.ts');
  assert.match(middleware, /sw\.js/);
  assert.match(middleware, /webmanifest/);
  assert.match(read('src/lib/designer/partnerTypesData.ts'), /unstable_cache[\s\S]*revalidate: 600/);
  assert.match(read('src/lib/socialLinks.ts'), /unstable_cache[\s\S]*revalidate: 600/);
  assert.match(read('src/lib/plansData.ts'), /unstable_cache[\s\S]*revalidate: 600/);
  assert.match(read('src/lib/designer/moduleAppearance.ts'), /10 \* 60 \* 1000/);
  assert.match(read('src/lib/alerts.ts'), /partner-shell-alerts[\s\S]*revalidate: 600/);
  assert.match(read('src/lib/shellUsageCache.ts'), /partner-workspace-summary-shell[\s\S]*revalidate: 600/);
  assert.match(read('src/lib/designer/partnerAdminNav.ts'), /partner-admin-navigation[\s\S]*revalidate: 600/);
  assert.match(read('src/lib/shellUsageCache.ts'), /partner-telegram-settings-shell[\s\S]*revalidate: 600/);
  assert.match(read('next.config.mjs'), /manifest\.webmanifest[\s\S]*s-maxage=2592000/);
});
