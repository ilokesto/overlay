# @ilokesto/overlay

This repository owns one public library and its private local documentation workspace.
Use Node 24.22.1 and pnpm 10.17.1. Run commands from this root.

- Keep the provider-scoped React overlay runtime, `OverlayHost`/`OverlayProvider`
  contracts, and adapter lifecycle behavior intact. Overlay never depends on modal or toast.
- `@ilokesto/store` is a registry dependency; never a sibling checkout or local substitute.
- Library source and tests are in `src/`; canonical bilingual MDX is in `docs/`.
- The renderer is `website/`; immutable released inputs are in `docs-publication/`.
- Preserve every historical receipt and archive byte. New captures use explicit schema 3.
- Keep other libraries as registry dependencies. Only this library and private workspaces
  inside this repository may use workspace links.
- Run `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:tooling`,
  and the four docs quality commands in README.
- Consumer-facing changes need a root Changeset.
- `release:verify --sha <full-SHA>` is read-only. Main merges maintain the Changesets release PR; merging
  it publishes only the exact successful Verify artifact through GitHub Actions with the
  latest dist-tag. Never publish locally or deploy docs.
- Before rollout, enable `Allow GitHub Actions to create and approve pull requests`
  and configure `NPM_TOKEN` in the `Production` environment.
