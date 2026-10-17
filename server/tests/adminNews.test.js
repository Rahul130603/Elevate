import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const credentials = { userId: 'Admin', password: process.env.TEST_ADMIN_PASSWORD || 'admin123' };
const login = body => fetch(`${base}/api/admin/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('Admin news requires login, validates industry, persists scope and revokes on logout', async () => {
  assert.equal((await fetch(`${base}/admin-news/en/industry/finance`)).status, 401);
  assert.equal((await fetch(`${base}/api/news`)).status, 404);
  const wrong = await login({ ...credentials, password: 'incorrect', industry: 'finance' });
  assert.equal(wrong.status, 401);
  assert.match((await wrong.json()).error, /Invalid Admin/);
  assert.equal((await login(credentials)).status, 400);
  assert.equal((await login({ ...credentials, industry: 'nonexistent' })).status, 400);

  for (const industry of ['finance', 'it-software']) {
    const response = await login({ ...credentials, industry });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.industry, industry);
    assert.equal(data.admin.role, 'ADMIN');
    const cookieHeader = response.headers.get('set-cookie');
    assert.match(cookieHeader, /HttpOnly/i);
    const cookie = cookieHeader.split(';')[0];
    const session = await fetch(`${base}/api/admin/news-session`, { headers: { cookie, 'x-elevate-industry': 'healthcare-medical' } });
    assert.equal((await session.json()).industry, industry);

    if (process.env.TEST_NEWS_SITE === '1') {
      const redirect = await fetch(`${base}/admin-news/en/industry/healthcare-medical`, { headers: { cookie }, redirect: 'manual' });
      assert.equal(redirect.status, 307);
      assert.ok(redirect.headers.get('location').endsWith(`/admin-news/en/industry/${industry}`));
      const news = await fetch(`${base}/admin-news/en/industry/${industry}`, { headers: { cookie } });
      assert.equal(news.status, 200);
      assert.match(await news.text(), /<html/);
    }

    await fetch(`${base}/api/admin/logout`, { method: 'POST', headers: { cookie } });
    assert.equal((await fetch(`${base}/admin-news/en/industry/${industry}`, { headers: { cookie } })).status, 401);
  }
});

test('Industry filtering excludes unrelated and unclassified headlines even for sparse feeds', async () => {
  const require = createRequire(new URL('../../news-site/package.json', import.meta.url));
  const ts = require('typescript');
  const directory = await mkdtemp(join(tmpdir(), 'elevate-industry-test-'));
  const files = ['categories', 'industry-relevance'];
  try {
    await writeFile(join(directory, 'package.json'), '{"type":"module"}');
    for (const name of files) {
      const source = await readFile(new URL(`../../news-site/src/lib/${name}.ts`, import.meta.url), 'utf8');
      const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
      await writeFile(join(directory, `${name}.js`), result.outputText.replace('from "./categories"', 'from "./categories.js"'));
    }
    const { filterIndustryArticles } = await import(pathToFileURL(join(directory, 'industry-relevance.js')));
    const articles = [
      { id: 'it', title: 'Software services industry invests in SaaS cloud computing and cybersecurity' },
      { id: 'bank', title: 'Banking sector expands loans and mutual funds investment' },
      { id: 'medical', title: 'Hospital healthcare nurses improve medical devices and diagnostics' },
      { id: 'neutral', title: 'A beautiful sunrise today' },
    ];
    assert.deepEqual(filterIndustryArticles(articles, 'it-software').map(item => item.id), ['it']);
    assert.deepEqual(filterIndustryArticles(articles, 'finance').map(item => item.id), ['bank']);
    assert.deepEqual(filterIndustryArticles(articles, 'healthcare-medical').map(item => item.id), ['medical']);
    assert.deepEqual(filterIndustryArticles([articles[3]], 'finance'), []);
  } finally {
    for (const name of [...files.map(name => `${name}.js`), 'package.json']) await unlink(join(directory, name)).catch(() => {});
    await rmdir(directory);
  }
});
