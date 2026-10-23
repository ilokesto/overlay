import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveInstalledPackage } from '../../scripts/docs-runtime.mjs';
import { scopeDevelopmentLink, getDocsChannel, publishedPackages } from '../lib/publication.ts';
import { publicPackageNames, rewriteDocsLink, rewriteMarkdownLinks } from '../lib/docs-links.ts';

test('released Overlay: pinned npm runtime and registry Store graph resolve from the public registry', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const installed = await resolveInstalledPackage('@ilokesto/released-overlay', path.join(root, 'docs-publication/runtime'));
  assert.equal(installed.manifest.version, publishedPackages.overlay.version);
  assert.equal(installed.manifest.dependencies['@ilokesto/store'], '^2.0.0');
  assert.ok(installed.directory.startsWith(path.join(root, 'node_modules')));
  // The dependency edge resolves to the registry graph, not a sibling checkout.
  const storeDependency = await resolveInstalledPackage('@ilokesto/store', installed.directory);
  assert.ok(storeDependency.directory.startsWith(path.join(root, 'node_modules')));
  assert.equal(storeDependency.manifest.version, '2.0.0');
  // The registry Store carries the real runtime used by the released Overlay graph.
  const { createStore } = await import(pathToFileURL(path.join(storeDependency.directory, 'dist/index.js')).href);
  const external = createStore({ items: [] });
  assert.deepEqual(external.getState(), { items: [] });
  external.setState({ items: [{ id: 'one' }] });
  assert.equal(external.getState().items.length, 1);
  external.subscribe(() => {});
  assert.equal(external.getInitialState().items.length, 0);
});

test('development links: complete public classification -> locale and channel preserved', () => {
  assert.equal(publicPackageNames.length, 8);
  for (const name of publicPackageNames) {
    const host = name === 'overlay' ? '' : 'https://ilokesto.ayden94.com';
    assert.equal(scopeDevelopmentLink(`/en/${name}/quick-start#install`), `${host}/en/${name}/next/quick-start#install`);
    assert.equal(scopeDevelopmentLink(`/ko/${name}?x=1`), `${host}/ko/${name}/next?x=1`);
    assert.equal(scopeDevelopmentLink(`/en/${name}/next/quick-start`), `${host}/en/${name}/next/quick-start`);
    assert.equal(rewriteDocsLink(`/ko/${name}/next/core-concepts`, false, 'overlay'), `${host}/ko/${name}/next/core-concepts`);
  }
  assert.equal(getDocsChannel(['overlay']), 'released');
  assert.equal(getDocsChannel(['overlay', 'next']), 'next');
  assert.equal(getDocsChannel(['modal', 'next']), undefined);
  assert.equal(scopeDevelopmentLink('https://example.com/en/store'), 'https://example.com/en/store');
  assert.equal(scopeDevelopmentLink('../reference/store'), '../reference/store');
  assert.equal(scopeDevelopmentLink('/en/queryable'), '/en/queryable');
  assert.equal(scopeDevelopmentLink('/en/unknown'), '/en/unknown');
});

test('Markdown links: prose versus code -> only real link destinations change', () => {
  const code = '```ts\nconst link = "[Modal](/ko/modal)";\n```\n';
  const inline = '`[Modal](/ko/modal)` and ``const x = `[/en/modal](/en/modal)`;``\n';
  const markdown = '[Modal](/ko/modal#provider) [Self](/en/overlay/core-concepts)\n'
    + '[modal]: /en/modal/next/core-concepts\n' + code + inline;

  const output = rewriteMarkdownLinks(markdown, true, 'overlay');

  assert.ok(output.includes('[Modal](https://ilokesto.ayden94.com/ko/modal/next#provider)'));
  assert.ok(output.includes('[Self](/en/overlay/next/core-concepts)'));
  assert.ok(output.includes('[modal]: https://ilokesto.ayden94.com/en/modal/next/core-concepts'));
  assert.ok(output.endsWith(code + inline));
  const multiline = '`example\n[Modal](/ko/modal)\n`';
  assert.equal(rewriteMarkdownLinks(multiline, true, 'overlay'), multiline);
  const fenced = '```md\n```typescript\n[Modal](/ko/modal)\n```\n';
  assert.equal(rewriteMarkdownLinks(fenced, true, 'overlay'), fenced);
});

test('source links: current versus archived revision -> owning successor paths', () => {
  const old = 'https://github.com/ilokesto/ilokesto';
  assert.equal(rewriteDocsLink(`${old}/tree/main/packages/overlay/src`, true, 'overlay'),
    'https://github.com/ilokesto/overlay/tree/main/src');
  const sha = 'e'.repeat(40);
  assert.equal(rewriteDocsLink(`${old}/blob/${sha}/packages/overlay/src/core/OverlayHost.tsx`, false, 'overlay'),
    `https://github.com/ilokesto/overlay/blob/${sha}/packages/overlay/src/core/OverlayHost.tsx`);
});
