# @ilokesto/overlay

어댑터와 provider 단위 store로 커스텀 레이어를 호스팅하는 headless React overlay runtime입니다.

[![npm version](https://img.shields.io/npm/v/%40ilokesto%2Foverlay?style=flat&color=555)](https://www.npmjs.com/package/@ilokesto/overlay)

[문서](https://ilokesto.ayden94.com/ko/overlay) | [API](./docs/reference/entrypoints.ko.mdx) | [English](./README.md)

- `OverlayProvider`와 `createOverlayContext()`로 격리된 스택을 구성합니다.
- `display()`의 typed 결과와 명시적인 `close()` / `remove()` 수명주기를 제공합니다.
- 어댑터 lifecycle hook, provider plugin, 단일 아이템 구독을 지원합니다.

## 설치

```bash
pnpm add @ilokesto/overlay react
```

## 빠른 시작

이 예제는 애니메이션 없는 알림을 열고, 확인 시 닫은 뒤 즉시 제거합니다.

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

`close()`는 closing 상태로 전환할 뿐입니다. 어댑터가 `remove()`를 호출해야 Promise가 정산됩니다. 애니메이션이 있다면 종료 후 제거하세요. 코어는 focus trap, Escape 처리, scroll lock이나 modal 접근성을 제공하지 않습니다. 일반 dialog에는 `@ilokesto/modal`을 사용하세요.

## 더 알아보기

- [실행 가능한 시작 가이드](./docs/quick-start.ko.mdx)
- [Store 명령, ID 중복 방지, reject](./docs/reference/create-overlay-store.ko.mdx)
- [Provider와 컨텍스트 격리](./docs/advanced/provider-scoping.ko.mdx)
- [어댑터 hook과 plugin 우선순위](./docs/reference/adapter-contracts.ko.mdx)
- [닫기와 Promise 정산](./docs/advanced/lifecycle-model.ko.mdx)

<details>
<summary>개발</summary>

이 저장소 루트에서 Node 24.22.1과 pnpm 10.17.1을 사용하세요.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm test:tooling
pnpm migrate:verify
pnpm docs:publication:verify
pnpm docs:typecheck
pnpm docs:build
pnpm docs:test
```

`store.open()`은 provider 마운트 전에도 가능합니다. Hook은 일치하는 provider 안에서 사용하세요.

코드는 `createOverlayStore` → `OverlayHost` → `OverlayItemRenderer` → `useOverlayLifecycle` 순서로 읽으세요.

Effect 교체, StrictMode 재실행, provider unmount만으로 store 아이템이 제거되지는 않습니다. 마운트 전부터 closing인 아이템은 open → closing 알림을 만들지 않습니다.

문서: `pnpm docs:start`. 브라우저 준비: `pnpm --dir website exec playwright install chromium`.

`docs/`는 한영 원본, `website/`는 렌더러입니다. 공개 예제는 `docs-publication/active.json`의 npm 버전, `/en/overlay/next`와 `/ko/overlay/next`는 현재 체크아웃을 사용합니다.

Schema 1/2 아카이브는 불변이며 새 캡처는 명시적인 schema 3와 검토된 카탈로그 항목이 필요합니다. `pnpm release:verify --sha <full-SHA>`는 읽기 전용이며 원격 준비와 exact-SHA CI 검증이 필요합니다. PR은 Verify CI를 실행합니다. main 병합은 Changesets 릴리스 PR을 생성·갱신하며,
릴리스 PR을 병합하면 GitHub Actions가 성공한 Verify의 정확한 아티팩트만 게시합니다.
적용 전에 `Allow GitHub Actions to create and approve pull requests`를 켜고
`Production` 환경에 `NPM_TOKEN`을 설정하세요. 로컬 게시나 문서 배포는 하지 않습니다.

라이선스: MIT.

</details>
