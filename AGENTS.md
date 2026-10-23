# @ilokesto/overlay

This repository owns one public library and its private local documentation workspace.
Use Node 22 and pnpm 10.17.1. Run commands from this root.

- Keep the provider-scoped React overlay runtime, `OverlayHost`/`OverlayProvider`
  contracts, and adapter lifecycle behavior intact. Overlay never depends on modal or toast.
- `@ilokesto/store` is a registry dependency; never a sibling checkout or local substitute.
- Library source and tests are in `src/`; canonical bilingual MDX is in `docs/`.
- The renderer is `website/`; immutable released inputs are in `docs-publication/`.
- Preserve every historical receipt and archive byte. New captures use explicit schema 3.
- Keep other libraries as registry dependencies. Only this library and private workspaces
  inside this repository may use workspace links.
- Run `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:tooling`,
  `pnpm migrate:verify`, and the four docs quality commands in README.
- Consumer-facing changes need a root Changeset; repository migration alone does not.
- Preserve `.migration/source-manifest.json`, original archive refs and tag objects.
  `migrate:verify` protects immutable history and present standalone safety without
  fixing future HEAD, package version, or API to the migration checkpoint.
- `release:verify --sha <full-SHA>` is read-only. Publishing is disabled by
  `.release/policy.json`; never publish locally or deploy docs during migration.
- Future publication remains token-based GitHub Actions with the latest dist-tag.
