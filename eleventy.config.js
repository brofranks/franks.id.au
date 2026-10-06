import site from './content/_data/site.json' with { type: 'json' };
import markdownIt from 'markdown-it';
import math from './lib/math.js';
import anchor from 'markdown-it-anchor';
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import rss from '@11ty/eleventy-plugin-rss';

const slug = text =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
const isPost = item => item.inputPath.startsWith('./content/posts/');

export default function (config) {
  config.addPassthroughCopy({
    static: '/',
    'node_modules/katex/dist/katex.min.css': 'katex/katex.min.css',
    'node_modules/katex/dist/fonts': 'katex/fonts',
    'node_modules/katex/LICENSE': 'katex/LICENSE',
  });
  config.setServerOptions({ host: '0.0.0.0' });
  config.addPlugin(syntaxHighlight);
  config.addPlugin(rss);
  config.setNunjucksEnvironmentOptions({ autoescape: true });

  if (process.env.ELEVENTY_RUN_MODE === 'serve') {
    config.ignores.add('content/about.njk');
    config.addGlobalData('eleventyComputed', {
      permalink: data =>
        data.page.inputPath === './content/about.md' ? '/about/' : data.permalink,
      site: data => ({
        ...data.site,
        navigation: [
          { name: 'Posts', url: '/' },
          { name: 'About', url: '/about/' },
        ],
      }),
    });
  }

  const md = markdownIt({ html: true, typographer: true })
    .use(math)
    .use(anchor, { slugify: slug });
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    if (/^https?:\/\//.test(tokens[index].attrGet('href'))) {
      tokens[index].attrSet('target', '_blank');
      tokens[index].attrSet('rel', 'noreferrer');
    }
    return self.renderToken(tokens, index, options);
  };
  config.setLibrary('md', md);
  config.amendLibrary('md', library => library.enable('code'));

  config.addFilter('groupbyYear', posts => [
    ...Map.groupBy(posts, post => post.date.getUTCFullYear()),
  ]);
  config.addFilter('isoDate', value => new Date(value).toISOString());
  config.addFilter('displayDate', value =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(value)),
  );
  config.addFilter('absolute', value => new URL(value, site.url).href);
  config.addFilter('isPost', isPost);

  config.addCollection('posts', api =>
    api
      .getAll()
      .filter(isPost)
      .sort((a, b) => b.date - a.date),
  );

  return {
    dir: { input: 'content', includes: '_includes', data: '_data', output: 'public' },
    markdownTemplateEngine: false,
    htmlTemplateEngine: 'njk',
    templateFormats: ['md', 'njk'],
  };
}
