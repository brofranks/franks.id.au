import katex from 'katex';
import texmath from 'markdown-it-texmath';

export default function math(md) {
  md.use(texmath, { engine: katex, delimiters: ['dollars', 'brackets'] });
  // Render directly: texmath's default renderer catches errors and emits error HTML.
  for (const name of ['math_inline', 'math_inline_double', 'math_block', 'math_block_eqno']) {
    md.renderer.rules[name] = (tokens, index) =>
      katex.renderToString(tokens[index].content, {
        displayMode: name !== 'math_inline',
        output: 'htmlAndMathml',
        throwOnError: true,
        trust: false,
      });
  }
}
