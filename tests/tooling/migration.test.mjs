import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { verifyCheckpoint, verifyStandalone } from '../../scripts/verify-migration.mjs';

const repository = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(await readFile(path.join(repository, '.migration/source-manifest.json'), 'utf8'));
const git = (root, args) => execFileSync('git', ['--no-pager', '-C', root, ...args], {
  env: { ...process.env, GIT_MASTER: '1', GIT_PAGER: 'cat', PAGER: 'cat',
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.test',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.test' },
  stdio: 'pipe',
});
const put = async (root, file, value) => {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), JSON.stringify(value));
};

test('standalone workspace: own library and private runtime -> permitted without sibling links', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'overlay-workspace-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, ['init', '--quiet']);
  await put(root, 'package.json', { name: '@ilokesto/overlay', version: '9.0.0' });
  await put(root, 'website/package.json', { name: '@ilokesto/overlay-website', private: true, dependencies: {
    '@ilokesto/overlay': 'workspace:*', '@ilokesto/overlay-docs-runtime': 'workspace:*',
  } });
  await put(root, 'docs-publication/runtime/package.json', { name: '@ilokesto/overlay-docs-runtime', private: true,
    dependencies: { '@ilokesto/released-overlay': 'npm:@ilokesto/overlay@2.0.0' } });
  git(root, ['add', '.']);

  // Root library, private website and private released-runtime importer are the
  // only manifests; the private runtime may be linked from the private website.
  assert.equal((await verifyStandalone(root, manifest)).manifests, 3);

  await put(root, 'untracked/package.json', { name: 'untracked-consumer', private: true,
    dependencies: { '@ilokesto/store': 'workspace:*' } });
  await assert.rejects(verifyStandalone(root, manifest), /SIBLING_DEPENDENCY/);
  await put(root, 'untracked/package.json', { name: 'untracked-consumer', private: true });

  await put(root, 'website/package.json', { name: '@ilokesto/overlay-website', private: true,
    dependencies: { '@ilokesto/store': 'workspace:*' } });
  await assert.rejects(verifyStandalone(root, manifest), /SIBLING_DEPENDENCY/);
  await put(root, 'website/package.json', { name: '@ilokesto/overlay-website', private: true,
    dependencies: { '@ilokesto/store': 'file:../../store' } });
  await assert.rejects(verifyStandalone(root, manifest), /EXTERNAL_DEPENDENCY_PATH/);
  await put(root, 'website/package.json', { name: '@ilokesto/overlay-website', private: false,
    dependencies: { '@ilokesto/overlay': 'workspace:*' } });
  await assert.rejects(verifyStandalone(root, manifest), /SIBLING_DEPENDENCY/);
  await put(root, 'website/package.json', { name: '@ilokesto/overlay-website', private: true,
    dependencies: { '@ilokesto/queryable': '0.0.1' } });
  await assert.rejects(verifyStandalone(root, manifest), /PRIVATE_PACKAGE_DEPENDENCY/);
  await put(root, 'website/package.json', { name: '@ilokesto/overlay-website', private: true, dependencies: {
    '@ilokesto/overlay': 'workspace:*', '@ilokesto/overlay-docs-runtime': 'workspace:*',
  } });
  await put(root, 'package.json', { name: '@ilokesto/overlay', version: '9.0.0', dependencies: {
    '@ilokesto/store': 'workspace:^2.0.1',
  } });
  await assert.rejects(verifyStandalone(root, manifest), /SIBLING_DEPENDENCY/);
  await put(root, 'package.json', { name: '@ilokesto/overlay', version: '9.0.0', dependencies: {
    '@ilokesto/store': '^2.0.1',
  } });
  assert.equal((await verifyStandalone(root, manifest)).manifests, 4);
});

test('checkpoint: future development commit and new version -> immutable history remains valid', async t => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'overlay-future-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'clone');
  git(repository, ['clone', '--no-local', '--quiet', repository, root]);
  // Future development continues from this repository's standalone state, which is
  // present on disk here; the clone itself still only contains committed history.
  const current = JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8'));
  current.version = '9.0.0';
  await put(root, 'package.json', current);
  await writeFile(path.join(root, 'future-development.txt'), 'future development\n');
  git(root, ['add', 'package.json', 'future-development.txt']);
  git(root, ['commit', '--quiet', '-m', 'Future development fixture']);

  const result = await verifyCheckpoint(root, manifest);

  assert.equal(result.checkpoint, manifest.checkpoint.commit);
  assert.notEqual(git(root, ['rev-parse', 'HEAD']).toString().trim(), manifest.checkpoint.commit);
  await verifyStandalone(root, manifest);
});

async function pathFixture(t) {
  await mkdir(path.join(repository, '.qa'), { recursive: true });
  const parent = await mkdtemp(path.join(repository, '.qa/overlay-path-repair-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'repo');
  const outside = path.join(parent, 'outside');
  await mkdir(root);
  await mkdir(outside);
  git(root, ['init', '--quiet']);
  for (const file of ['package.json', 'website/package.json', 'docs-publication/runtime/package.json']) {
    await put(root, file, JSON.parse(await readFile(path.join(repository, file), 'utf8')));
  }
  return { root, outside };
}

function verifyPathFixture(t, root, expectedCode) {
  const command = [process.execPath, path.join(repository, 'scripts/verify-migration.mjs'),
    'standalone', '--repo', root, '--manifest-stdin', '-'];
  const result = spawnSync(command[0], command.slice(1), {
    cwd: root, input: JSON.stringify(manifest), encoding: 'utf8', timeout: 10_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  t.diagnostic(JSON.stringify({ command, exitCode: result.status, stdout: result.stdout, stderr: result.stderr }));
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, expectedCode ? 1 : 0);
  const output = JSON.parse(expectedCode ? result.stderr : result.stdout);
  if (expectedCode) assert.equal(output.code, expectedCode);
  return output;
}

for (const staged of [false, true]) {
  test(`standalone paths: ${staged ? 'staged' : 'untracked'} own workspaces and internal local dependencies -> accepted`, async t => {
    const { root } = await pathFixture(t);
    if (staged) git(root, ['add', '.']);
    assert.equal(verifyPathFixture(t, root).results[0].manifests, 3);
    for (const protocol of ['file', 'link']) {
      await put(root, 'website/package.json', {
        name: '@ilokesto/overlay-website', private: true,
        dependencies: { '@ilokesto/overlay-docs-runtime': `${protocol}:../docs-publication/runtime` },
      });

      assert.equal(verifyPathFixture(t, root).results[0].manifests, 3);
    }
    for (const range of [
      'workspace:@ilokesto/overlay-docs-runtime@*',
      'workspace:@ilokesto/overlay@^2.0.1',
      'workspace:../docs-publication/runtime',
      'workspace:..',
    ]) {
      await put(root, 'website/package.json', {
        name: '@ilokesto/overlay-website', private: true, dependencies: { local: range },
      });

      assert.equal(verifyPathFixture(t, root).results[0].manifests, 3);
    }
  });
}

for (const protocol of ['file', 'link']) {
  test(`standalone paths: normalized and symlink ${protocol} escapes -> rejected`, async t => {
    const { root, outside } = await pathFixture(t);
    git(root, ['add', '.']);
    for (const spelling of ['./../outside', './nested/../../outside', '.\\nested\\..\\..\\outside', outside]) {
      await put(root, 'package.json', {
        name: '@ilokesto/overlay', dependencies: { probe: `${protocol}:${spelling}` },
      });

      verifyPathFixture(t, root, 'EXTERNAL_DEPENDENCY_PATH');
    }
    await writeFile(path.join(root, '.gitignore'), 'escape\n');
    await symlink(outside, path.join(root, 'escape'), 'dir');
    await put(root, 'package.json', {
      name: '@ilokesto/overlay', dependencies: { probe: `${protocol}:./escape` },
    });

    verifyPathFixture(t, root, 'EXTERNAL_DEPENDENCY_PATH');
  });

  test(`standalone paths: ${protocol} literal percent and protocol slashes -> internal targets accepted`, async t => {
    const { root } = await pathFixture(t);
    await put(root, '%2e%2e/payload/package.json', { name: 'overlay-local-data', private: true });
    await put(root, 'package.json', {
      name: '@ilokesto/overlay', dependencies: { data: `${protocol}:%2e%2e/payload` },
    });
    await put(root, 'website/package.json', {
      name: '@ilokesto/overlay-website', private: true,
      dependencies: { runtime: `${protocol}://../docs-publication/runtime` },
    });

    assert.equal(verifyPathFixture(t, root).results[0].manifests, 4);
  });
}

test('standalone compatibility: pinned pnpm resolves internal aliases and literal percent paths -> scanner agrees', async t => {
  const { root } = await pathFixture(t);
  await put(root, 'package.json', {
    name: '@ilokesto/overlay', version: '2.0.1', private: true, packageManager: 'pnpm@10.17.1',
  });
  await put(root, 'website/package.json', {
    name: '@ilokesto/overlay-website', private: true,
    dependencies: {
      'own-overlay': 'workspace:@ilokesto/overlay@*',
      runtime: 'workspace:@ilokesto/overlay-docs-runtime@*',
      'relative-runtime': 'workspace:../docs-publication/runtime',
      'linked-runtime': 'link://../docs-publication/runtime',
      'local-data': 'file:../%2e%2e/payload',
    },
  });
  await put(root, 'docs-publication/runtime/package.json', {
    name: '@ilokesto/overlay-docs-runtime', version: '0.0.0', private: true,
  });
  await put(root, '%2e%2e/payload/package.json', {
    name: 'overlay-local-data', version: '1.0.0', private: true,
  });
  await writeFile(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - .\n  - website\n  - docs-publication/runtime\n');
  const command = ['pnpm', 'install', '--lockfile-only', '--offline', '--ignore-scripts',
    '--store-dir', path.join(root, '.pnpm-store')];

  const result = spawnSync(command[0], command.slice(1), {
    cwd: root, encoding: 'utf8', timeout: 30_000,
    env: { ...process.env, COREPACK_ENABLE_AUTO_PIN: '0' },
  });

  t.diagnostic(JSON.stringify({ command, cwd: root, exitCode: result.status, stdout: result.stdout, stderr: result.stderr }));
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(verifyPathFixture(t, root).results[0].manifests, 4);
});

test('standalone workspace: own-name path redirect and foreign local package -> rejected', async t => {
  const { root } = await pathFixture(t);
  git(root, ['add', 'package.json']);
  for (const range of ['workspace:../../store', 'workspace:%2e%2e/%2e%2e/store', 'workspace:@ilokesto/store@*']) {
    await put(root, 'website/package.json', {
      name: '@ilokesto/overlay-website', private: true, dependencies: { '@ilokesto/overlay': range },
    });

    verifyPathFixture(t, root, 'SIBLING_DEPENDENCY');
  }
  await put(root, 'website/package.json', { name: '@ilokesto/overlay-website', private: true });
  await put(root, 'local-store/package.json', { name: '@ilokesto/store', private: true });

  verifyPathFixture(t, root, 'SIBLING_DEPENDENCY');
});

test('standalone discovery: external manifest and directory symlinks -> rejected', async t => {
  const { root, outside } = await pathFixture(t);
  await put(outside, 'package.json', { name: 'external-private', private: true });
  await mkdir(path.join(root, 'external-manifest'));
  await symlink(path.join(outside, 'package.json'), path.join(root, 'external-manifest/package.json'));

  verifyPathFixture(t, root, 'EXTERNAL_REPOSITORY_PATH');

  await rm(path.join(root, 'external-manifest/package.json'));
  await symlink(outside, path.join(root, 'external-directory'), 'dir');

  verifyPathFixture(t, root, 'EXTERNAL_REPOSITORY_PATH');
});
