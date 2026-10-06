import test from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import math from '../lib/math.js';

const md = new MarkdownIt().use(math);

test('inline and display delimiters produce HTML and accessible MathML', () => {
  for (const source of ['$x^2$', String.raw`\(x^2\)`, '$$x^2$$', String.raw`\[x^2\]`]) {
    const html = md.render(source);
    assert.match(html, /class="katex"/);
    assert.match(html, /class="katex-mathml"/);
    assert.equal(
      html.includes('class="katex-display"'),
      source.startsWith('$$') || source.startsWith('\\['),
    );
  }
  assert.match(md.render('$$\nx = y^2\n$$'), /katex-display/);
  assert.match(md.render('\\[\nx = y^2\n\\]'), /katex-display/);
});

test('code and escaped currency remain literal', () => {
  for (const source of ['`$x$`', '```tex\n$x$\n```', '    $x$', String.raw`Price: \$5 and \$10.`]) {
    assert.doesNotMatch(md.render(source), /class="katex/);
  }
});

test('invalid or unsupported math fails rendering', () => {
  assert.throws(() => md.render(String.raw`$\unknowncommand{x}$`), /Undefined control sequence/);
  assert.throws(() => md.render('$\\frac{1}{$'), /ParseError/);
});
