import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const read = path => readFile(`public/${path}`, 'utf8');

test('preview includes About content and local navigation alongside posts', () => {
  const pages = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
    import Eleventy from '@11ty/eleventy';
    const site = new Eleventy('content', 'public', { runMode: 'serve', quietMode: true });
    process.stdout.write(JSON.stringify(await site.toJSON()));
  `,
      ],
      { encoding: 'utf8' },
    ),
  );
  const about = pages.find(page => page.inputPath === './content/about.md');
  assert.equal(about.url, '/about/');
  assert.match(about.content, /<article>[\s\S]*<h1>[^<]+<\/h1>[\s\S]*<p[ >]/);
  assert.doesNotMatch(about.content, /http-equiv="refresh"/);
  assert.ok(!pages.some(page => page.inputPath === './content/about.njk'));
  const index = pages.find(page => page.url === '/');
  assert.match(index.content, /href="\/about\/">About<\/a>/);
  const posts = pages.filter(page => page.inputPath.startsWith('./content/posts/'));
  assert.ok(posts.length > 0);
  for (const post of posts) {
    assert.ok(index.content.includes(`href="${post.url}"`));
  }
});

test('site builds with content, feeds, and rendering intact', async () => {
  execFileSync('npm', ['run', 'build'], { stdio: 'pipe' });
  const index = await read('index.html');
  const feed = await read('atom.xml');
  const sitemap = await read('sitemap.xml');
  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  const posts = (await readdir('content/posts', { recursive: true })).filter(file =>
    file.endsWith('.md'),
  );
  assert.ok(entries.length > 0);
  assert.equal(entries.length, posts.length);
  for (const [, entry] of entries) {
    const url = entry.match(/<id>([^<]+)<\/id>/)[1];
    const date = entry.match(/<published>([^<]+)<\/published>/)[1];
    const pathname = new URL(url).pathname;
    const article = await read(`${pathname.slice(1)}index.html`);
    assert.equal(new Date(date).toISOString(), date);
    assert.ok(index.includes(`href="${pathname}"`));
    assert.match(article, /<article>[\s\S]*<h1>[^<]+<\/h1>/);
    for (const [heading] of article.matchAll(/<h[2-6][^>]*>/g)) {
      assert.match(heading, /id="[^"]+"/);
    }
    assert.match(article, /property="og:type" content="article"/);
    assert.ok(article.includes(`<link rel="canonical" href="${url}">`));
    assert.ok(article.includes(`property="article:published_time" content="${date}"`));
    assert.doesNotMatch(article, /mathjax|cdn.jsdelivr/i);
    if (article.includes('class="language-')) {
      assert.match(article, /class="token /);
    }
    const sitemapEntry = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
      .find(([, content]) => content.includes(`<loc>${url}</loc>`));
    assert.ok(sitemapEntry);
  }
  assert.doesNotMatch(index, /katex\.min\.css/);
  assert.match(index, /<button id="toggle-night-mode" aria-label="[^"]+"/);
  await access('public/katex/katex.min.css');
  await access('public/katex/fonts/KaTeX_Main-Regular.woff2');
  assert.match(index, /href="https:\/\/homes.cs.washington.edu\/~brof\/">About<\/a>/);
  const about = await read('about/index.html');
  assert.match(about, /content="0; url=https:\/\/homes.cs.washington.edu\/~brof\/"/);
  assert.match(about, /rel="canonical" href="https:\/\/homes.cs.washington.edu\/~brof\/"/);
  assert.doesNotMatch(index, /http-equiv="refresh"/);
  assert.match(feed, /&lt;p&gt;/);
  assert.doesNotMatch(sitemap, /categories/);
  assert.doesNotMatch(sitemap, /<lastmod>/);
  assert.doesNotMatch(sitemap, /https:\/\/franks.id.au\/about\//);
});
