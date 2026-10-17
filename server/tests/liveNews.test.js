import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

test('Live refresh refetches upstream, orders by date and preserves news during failure', async () => {
  const ts = createRequire(new URL('../../news-site/package.json', import.meta.url))('typescript');
  const directory = await mkdtemp(join(tmpdir(), 'elevate-live-feed-'));
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.BRIEF_API_KEY;
  try {
    await writeFile(join(directory, 'package.json'), '{"type":"module"}');
    for (const name of ['news', 'live-news', 'rss', 'categories', 'industry-relevance', 'news-translation', 'brief-openai', 'i18n']) {
      const source = await readFile(new URL(`../../news-site/src/lib/${name}.ts`, import.meta.url), 'utf8');
      const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/from "\.\/([^".]+)"/g, 'from "./$1.js"').replace('from "next/headers"', 'from "./headers.js"');
      await writeFile(join(directory, `${name}.js`), code);
    }
    await writeFile(join(directory, 'headers.js'), 'export async function headers() { return new Headers({"x-elevate-industry":"publishing", "x-elevate-news-mode":globalThis.testNewsMode || "translated"}); }');
    await writeFile(join(directory, 'images.js'), 'export async function attachImages(items) { return items; }');
    await writeFile(join(directory, 'site.js'), 'export const feedRevalidateSeconds=300; export const newsCountry="IN";');
    await writeFile(join(directory, 'news-api.js'), 'export const gnewsProvider={enabled:()=>false}; export const newsDataProvider={enabled:()=>false};');
    let calls=0, translations=0, failure=false;
    globalThis.fetch=async(url, options)=>{
      if (String(url).endsWith('/chat/completions')) {
        translations++;
        const input=JSON.parse(options.body);
        const toEnglish = input.messages[0].content.includes('English');
        const titles=JSON.parse(input.messages[1].content).map((_, i)=>toEnglish ? `Publishing books report ${i+1}` : `பதிப்பகச் செய்தி ${i+1}`);
        return new Response(`data: ${JSON.stringify({choices:[{delta:{content:JSON.stringify(titles)}}]})}\n\ndata: [DONE]\n`);
      }
      calls++; assert.equal(options.cache,'no-store');
      if (new URL(url).searchParams.get('hl') === 'ta') {
        assert.match(new URL(url).searchParams.get('q'), /பதிப்பக/);
        return new Response('<rss><channel><item><title>புதிய புத்தகம் வெளியீடு</title><link>https://publisher.example/tamil</link></item><item><title>Publishing English item</title><link>https://publisher.example/english</link></item></channel></rss>');
      }
      assert.match(new URL(url).searchParams.get('q'), /OR.*when:7d/);
      if(failure) throw new Error('Upstream unavailable');
      return new Response('<rss><channel><item><title>Publishing books older story</title><link>https://publisher.example/old</link><pubDate>Fri, 02 Oct 2026 10:00:00 GMT</pubDate></item><item><title>Publishing books new story</title><link>https://publisher.example/new</link><pubDate>Mon, 05 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>');
    };
    const {getNews, clearIndustryNewsCache}=await import(pathToFileURL(join(directory,'news.js')));
    const query={locale:'en',withImages:false};
    const first=await getNews(query); assert.equal(first.articles[0].title,'Publishing books new story'); assert.equal(calls,1);
    await getNews(query); assert.equal(calls,1,'Ordinary reads reuse the bounded cache');
    clearIndustryNewsCache('finance','en'); await getNews(query); assert.equal(calls,1,'Another industry cannot invalidate this cache');
    clearIndustryNewsCache('publishing','en'); const fresh=await getNews(query); assert.equal(calls,2,'Manual refresh must fetch upstream');
    process.env.BRIEF_API_KEY='test-only';
    const tamil=await getNews({...query,locale:'ta'});
    assert.equal(calls,2,'Other languages share the verified English feed');
    assert.equal(translations,1);
    assert.equal(tamil.articles[0].locale,'ta');
    assert.match(tamil.articles[0].title,/பதிப்பக/);
    assert.equal(tamil.articles[0].originalTitle,fresh.articles[0].title);
    const {filterIndustryArticles}=await import(pathToFileURL(join(directory,'industry-relevance.js')));
    assert.equal(filterIndustryArticles(tamil.articles,'publishing').length,2,'Translated headlines remain valid for their industry');
    assert.equal(filterIndustryArticles(tamil.articles,'finance').length,0);
    await getNews({...query,locale:'ta'}); assert.equal(translations,1,'Headline translations are cached');
    clearIndustryNewsCache('publishing','ta'); await getNews({...query,locale:'ta'}); assert.equal(calls,3,'Refresh in Tamil invalidates the shared source feed');
    const latest=await getNews(query); failure=true; clearIndustryNewsCache('publishing','en'); const stale=await getNews(query); assert.equal(stale.ok,false); assert.equal(stale.stale,true); assert.deepEqual(stale.articles,fresh.articles); assert.equal(stale.fetchedAt,latest.fetchedAt);
    globalThis.testNewsMode = 'native'; failure=false;
    const native=await getNews({...query,locale:'ta'});
    assert.equal(native.articles.length,1,'Native mode excludes English-language publishers');
    assert.equal(native.articles[0].title,'புதிய புத்தகம் வெளியீடு','Native mode preserves the publisher headline');
    assert.match(native.articles[0].originalTitle,/Publishing books/,'Relevance uses an internal English translation');
    assert.equal(new URL(native.feedUrl).searchParams.get('hl'),'ta');
    delete globalThis.testNewsMode;
  } finally { globalThis.fetch=originalFetch; if(originalKey===undefined) delete process.env.BRIEF_API_KEY; else process.env.BRIEF_API_KEY=originalKey; await rm(directory,{recursive:true,force:true}); }
});
