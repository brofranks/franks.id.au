import configureSite from './eleventy.config.js';
import site from './content/_data/site.json' with { type: 'json' };

const homepageUrl = 'https://homes.cs.washington.edu/~brof/';

export default function (config) {
  const options = configureSite(config);
  config.addGlobalData('eleventyComputed', {
    permalink: () => '/index.html',
    site: () => ({
      ...site,
      url: homepageUrl,
      navigation: [
        { name: 'Posts', url: `${site.url}/` },
        { name: 'About', url: homepageUrl },
      ],
    }),
  });
  config.addGlobalData('assetPrefix', './');
  config.addGlobalData('feedUrl', `${site.url}/atom.xml`);
  config.addGlobalData('ogUrl', homepageUrl);
  return {
    ...options,
    dir: { ...options.dir, input: 'content/about.md', output: 'public-homepage' },
  };
}
