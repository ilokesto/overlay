# @ilokesto/overlay

This repository owns one public library.
Use Node 24.22.1 and pnpm 10.17.1. Run commands from this root.

- Keep the provider-scoped React overlay runtime, `OverlayHost`/`OverlayProvider`
  contracts, and adapter lifecycle behavior intact. Overlay never depends on modal or toast.
- `@ilokesto/store` is a registry dependency; never a sibling checkout or local substitute.
- Library source is in `src/`; runtime tests are in `tests/unit`, setup is in
  `tests/fixtures`, and Node tooling tests are in `tests/tooling`.
- Keep other libraries as registry dependencies. Only this library and private workspaces
  inside this repository may use workspace links.
- Run `pnpm typecheck` for library code and `pnpm test` for the full aggregate:
  build once, `test:unit`, `test:types` (test compiler checks), and `test:tooling`.
- Consumer-facing changes need a root Changeset.
- `release:verify --sha <full-SHA>` is read-only. Main merges maintain the Changesets release PR; merging
  it publishes only the exact successful Verify artifact through GitHub Actions with the
  latest dist-tag. Never publish locally.
- Before rollout, enable `Allow GitHub Actions to create and approve pull requests`
  and configure `NPM_TOKEN` in the `Production` environment.
