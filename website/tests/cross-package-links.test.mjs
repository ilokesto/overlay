import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, realpath } from 'node:fs/promises';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { publicPackageNames, rewriteDocsLink, rewriteMarkdownLinks } from '../lib/docs-links.ts';

const compilerRoot = await realpath(new URL('../node_modules/fumadocs-mdx', import.meta.url));
const require = createRequire(`${compilerRoot}/package.json`);
const { evaluate } = await import(pathToFileURL(require.resolve('@mdx-js/mdx')).href);

for (const locale of ['en', 'ko']) {
  test(`Overlay ${locale} corpus: foreign rendered and Markdown links keep locale and next channel, own package stays local`, async () => {
    const bytes = await readFile(new URL(`./fixtures/modal-core-concepts.${locale}.mdx`, import.meta.url), 'utf8');
    const document = bytes.replace(/^---\n[\s\S]*?\n---\n/, '');
    const module = await evaluate(document, { ...runtime, development: false });
    const components = { a: ({ href, ...props }) => createElement('a', {
      ...props, href: rewriteDocsLink(href, true, 'overlay'),
    }) };

    const html = renderToStaticMarkup(createElement(module.default, { components }));
    const markdown = rewriteMarkdownLinks(document, true, 'overlay');

    // The corpus links to the owning package: it stays local and gains /next.
    assert.ok(html.includes(`href="/${locale}/overlay/next"`));
    assert.ok(markdown.includes(`](/${locale}/overlay/next)`));
    assert.ok(!html.includes(`href="https://ilokesto.ayden94.com/${locale}/overlay`));
    // Same-package deep navigation stays local with the development channel preserved.
    assert.equal(rewriteDocsLink(`/${locale}/overlay/core-concepts`, true, 'overlay'), `/${locale}/overlay/next/core-concepts`);
    // A foreign package link from this corpus shape routes to the retained host.
    assert.equal(rewriteDocsLink(`/${locale}/modal/core-concepts`, true, 'overlay'), `https://ilokesto.ayden94.com/${locale}/modal/next/core-concepts`);
  });
}

test('complete classification: every public foreign package -> rendered and Markdown destinations agree', async () => {
  for (const owner of publicPackageNames) {
    for (const locale of ['en', 'ko']) {
      const document = publicPackageNames.map(name => `[${name}](/${locale}/${name}/next/core-concepts)`).join('\n\n');
      const module = await evaluate(document, { ...runtime, development: false });
      const html = renderToStaticMarkup(createElement(module.default, {
        components: { a: ({ href, ...props }) => createElement('a', { ...props, href: rewriteDocsLink(href, true, owner) }) },
      }));
      const markdown = rewriteMarkdownLinks(document, true, owner);
      for (const name of publicPackageNames) {
        const href = `${owner === name ? '' : 'https://ilokesto.ayden94.com'}/${locale}/${name}/next/core-concepts`;
        assert.ok(html.includes(`href="${href}"`));
        assert.ok(markdown.includes(`](${href})`));
      }
    }
  }
});
