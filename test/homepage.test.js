import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

test('UW homepage builds independently with content and assets under /~brof/', async () => {
  execFileSync('npm', ['run', 'build:homepage'], { stdio: 'pipe' });
  const files = await readdir('public-homepage', { recursive: true });
  assert.deepEqual(files.filter(file => file.endsWith('.html')), ['index.html']);
  for (const excluded of ['atom.xml', 'sitemap.xml']) {
    assert.ok(!files.includes(excluded));
  }
  const html = await readFile('public-homepage/index.html', 'utf8');
  assert.match(html, /<article>[\s\S]*<h1>[^<]+<\/h1>[\s\S]*<p[ >]/);
  assert.match(html, /href="https:\/\/franks.id.au\/">Posts<\/a>/);
  assert.match(html, /href="https:\/\/franks.id.au\/atom.xml"/);
  assert.match(html, /property="og:url" content="https:\/\/homes.cs.washington.edu\/~brof\/"/);
  assert.match(html, /rel="canonical" href="https:\/\/homes.cs.washington.edu\/~brof\/"/);
  assert.doesNotMatch(html, /http-equiv="refresh"/);
  for (const [, url] of html.matchAll(/(?:href|src)="(\.\/[^" ]+)"/g)) {
    assert.ok(new URL(url, 'https://homes.cs.washington.edu/~brof/').pathname.startsWith('/~brof/'));
    await access(`public-homepage/${url.slice(2)}`);
  }
  assert.match(html, /id="toggle-night-mode"/);
  for (const icon of ['sun', 'moon']) {
    await access(`public-homepage/images/${icon}.svg`);
  }
});
