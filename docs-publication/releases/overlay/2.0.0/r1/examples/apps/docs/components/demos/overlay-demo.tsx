'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  OverlayProvider,
  createOverlayStore,
  useOverlay,
  type OverlayAdapterMap,
  type OverlayRenderProps,
} from '@ilokesto/overlay';
import {
  DemoFrame,
  demoButtonClass,
  demoSecondaryButtonClass,
  type DemoProps,
} from './demo-frame';

const copy = {
  en: {
    title: 'A provider-scoped notification',
    description: 'Open a lightweight card through the real overlay store and adapter, then observe the result returned when it closes.',
    open: 'Open notification',
    reset: 'Reset',
    cardTitle: 'Upload complete',
    cardBody: 'The overlay is rendered by a custom, non-modal adapter.',
    close: 'Close notification',
    idle: 'No result yet.',
    waiting: 'Waiting for the notification to close...',
    closed: 'Result: notification closed.',
    cleared: 'Result reset.',
  },
  ko: {
    title: '프로바이더 범위의 알림',
    description: '프로바이더가 관리하는 실제 저장소와 렌더링 방식을 사용해 알림 카드를 열고, 닫힐 때 반환되는 결과를 확인합니다.',
    open: '알림 열기',
    reset: '초기화',
    cardTitle: '업로드 완료',
    cardBody: '사용자 정의 비모달 렌더러가 이 알림을 표시합니다.',
    close: '알림 닫기',
    idle: '아직 결과가 없습니다.',
    waiting: '알림이 닫히기를 기다리는 중...',
    closed: '결과: 알림이 닫혔습니다.',
    cleared: '결과를 초기화했습니다.',
  },
} as const;

function NotificationAdapter({
  isOpen,
  close,
  remove,
  title,
  message,
  closeLabel,
}: OverlayRenderProps & Record<string, unknown>) {
  if (!isOpen) return null;

  const handleClose = () => {
    close('closed');
    remove();
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      data-demo-result="overlay-card"
      className="mt-4 space-y-2 text-fd-card-foreground"
    >
      <p className="font-semibold">{String(title)}</p>
      <p className="mt-1 text-sm leading-6 text-fd-muted-foreground">{String(message)}</p>
      <button
        type="button"
        data-demo-action="overlay-close"
        className={`${demoSecondaryButtonClass} mt-3 w-full sm:w-auto`}
        onClick={handleClose}
      >
        {String(closeLabel)}
      </button>
    </aside>
  );
}

function OverlayControls({ lang }: DemoProps) {
  const text = copy[lang];
  const { clear, display } = useOverlay();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string>(text.idle);
  const runRef = useRef(0);

  const openNotification = async () => {
    const run = ++runRef.current;
    setPending(true);
    setResult(text.waiting);

    const closeResult = await display<string>({
      type: 'notification',
      props: {
        title: text.cardTitle,
        message: text.cardBody,
        closeLabel: text.close,
      },
    });

    if (run === runRef.current) {
      setPending(false);
      setResult(closeResult === 'closed' ? text.closed : text.cleared);
    }
  };

  const reset = () => {
    runRef.current += 1;
    clear();
    setPending(false);
    setResult(text.idle);
  };

  useEffect(() => () => {
    runRef.current += 1;
    clear();
  }, [clear]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          data-demo-action="overlay-open"
          className={`${demoButtonClass} w-full sm:w-auto`}
          disabled={pending}
          onClick={() => void openNotification()}
        >
          {text.open}
        </button>
        <button
          type="button"
          data-demo-action="overlay-reset"
          className={`${demoSecondaryButtonClass} w-full sm:w-auto`}
          onClick={reset}
        >
          {text.reset}
        </button>
      </div>
      <p data-demo-result="overlay" aria-live="polite" className="text-sm text-fd-muted-foreground">
        {result}
      </p>
    </>
  );
}

export function OverlayDemo({ lang }: DemoProps) {
  const text = copy[lang];
  const [store] = useState(createOverlayStore);
  const adapters = useMemo<OverlayAdapterMap>(
    () => ({ notification: NotificationAdapter }),
    [],
  );
  const code = lang === 'ko'
    ? `const result = await display<string>({\n  type: 'notification',\n  props: { title: '업로드 완료' },\n});\n\n// adapter 내부\nclose('closed');\nremove();`
    : `const result = await display<string>({\n  type: 'notification',\n  props: { title: 'Upload complete' },\n});\n\n// Inside the adapter\nclose('closed');\nremove();`;

  return (
    <DemoFrame lang={lang} name="overlay" title={text.title} description={text.description} code={code}>
        <div className="space-y-4">
          <OverlayProvider store={store} adapters={adapters}>
            <div className="space-y-5"><OverlayControls lang={lang} /></div>
          </OverlayProvider>
        </div>
    </DemoFrame>
  );
}
