# @ilokesto/overlay

A headless React overlay runtime for hosting custom layers with adapters and provider-scoped stores.

[![npm version](https://img.shields.io/npm/v/%40ilokesto%2Foverlay?style=flat&color=555)](https://www.npmjs.com/package/@ilokesto/overlay)

[한국어](./README.ko.md)

- Isolated stacks with `OverlayProvider` and `createOverlayContext()`.
- Typed `display()` results with explicit `close()` / `remove()` lifecycle.
- Adapter lifecycle hooks, provider plugins, and single-item subscriptions.

## Installation

```bash
pnpm add @ilokesto/overlay react
```

## Quick start

This example opens a non-modal notice, then closes and removes it immediately when acknowledged.

```tsx
import { OverlayProvider, useOverlay, type OverlayAdapterMap } from '@ilokesto/overlay';

const adapters: OverlayAdapterMap = {
  notice: ({ close, remove, message }) => {
    const finish = () => {
      close(true);
      remove();
    };

    return (
      <aside aria-label="Notice">
        <p>{String(message)}</p>
        <button onClick={finish}>Got it</button>
      </aside>
    );
  },
};

function NoticeButton() {
  const { display } = useOverlay();

  async function showNotice() {
    const acknowledged = await display<boolean>({
      type: 'notice',
      props: { message: 'Your changes are saved.' },
    });
    console.log(acknowledged);
  }

  return <button onClick={() => void showNotice()}>Show notice</button>;
}

export function App() {
  return (
    <OverlayProvider adapters={adapters}>
      <NoticeButton />
    </OverlayProvider>
  );
}
```

`close()` only starts closing; the adapter must call `remove()` to settle the promise. With exit motion, remove after it finishes. The core does not supply focus trapping, Escape handling, scroll locking, or modal accessibility. Use `@ilokesto/modal` for ordinary dialogs.

<details>
<summary>Development</summary>

Use Node 24.22.1 and pnpm 10.17.1 from this repository root.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm test:tooling
```

`store.open()` can run before provider mount. Hooks must run inside their matching provider.

Read source in order: `createOverlayStore` → `OverlayHost` → `OverlayItemRenderer` → `useOverlayLifecycle`.

Effect replacement, StrictMode replay, and provider unmount do not remove stored items. Items already closing before mount do not invent an open-to-closing notification.

`pnpm release:verify --sha <full-SHA>` is read-only and requires remote bootstrap and exact-SHA CI verification. Pull requests run Verify CI. Main merges create or update a Changesets release PR; merging
that PR publishes only the exact successful Verify artifact through GitHub Actions. Enable
`Allow GitHub Actions to create and approve pull requests` and configure `NPM_TOKEN` in the
`Production` environment before rollout. Never publish locally.

License: MIT.

</details>
