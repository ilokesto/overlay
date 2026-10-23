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
import styles from '../landings/store-landing.module.css';

const copy = {
  en: {
    title: 'Assign a review from a detail panel',
    description: 'Open task details without blocking the page. Choose a teammate and keep the returned assignment.',
    open: 'Task details',
    reset: 'Reset',
    cardTitle: 'Review the landing page',
    cardBody: 'Who should review this task?',
    close: 'Close',
    idle: 'No reviewer selected.',
    waiting: 'Choose a reviewer in the panel.',
    closed: 'Result: panel closed.',
    mina: 'Mina',
    alex: 'Alex',
    assignedMina: 'Result: assigned to Mina.',
    assignedAlex: 'Result: assigned to Alex.',
    preview: 'Task details appear here.',
    cleared: 'Result reset.',
  },
  ko: {
    title: '상세 패널에서 리뷰 담당자 지정하기',
    description: '페이지를 막지 않고 작업 상세를 엽니다. 팀원을 선택하면 패널이 반환한 담당자가 화면에 남습니다.',
    open: '작업 상세',
    reset: '초기화',
    cardTitle: '랜딩 페이지 리뷰',
    cardBody: '누가 이 작업을 리뷰할까요?',
    close: '닫기',
    idle: '선택한 리뷰 담당자가 없습니다.',
    waiting: '패널에서 리뷰 담당자를 선택하세요.',
    closed: '결과: 패널을 닫았습니다.',
    mina: '미나',
    alex: '알렉스',
    assignedMina: '결과: 미나에게 배정했습니다.',
    assignedAlex: '결과: 알렉스에게 배정했습니다.',
    preview: '여기에 작업 상세가 표시됩니다.',
    cleared: '결과를 초기화했습니다.',
  },
} as const;

function TaskAdapter({
  isOpen,
  close,
  remove,
  title,
  message,
  closeLabel,
  minaLabel,
  alexLabel,
}: OverlayRenderProps & Record<string, unknown>) {
  if (!isOpen) return null;

  const handleClose = (reviewer: string) => {
    close(reviewer);
    remove();
  };

  return (
    <aside
      aria-label={String(title)}
      data-demo-result="overlay-card"
      className={`${styles.demoViewport} ${styles.demoPreview} gap-2`}
      style={{ gridArea: '3 / 1' }}
    >
      <p className="font-semibold">{String(title)}</p>
      <p className="text-sm leading-5">{String(message)}</p>
      <div className={styles.demoToolbar}>
        <button
          type="button"
          data-demo-action="overlay-select-mina"
          className={demoButtonClass}
          onClick={() => handleClose('mina')}
        >
          {String(minaLabel)}
        </button>
        <button
          type="button"
          data-demo-action="overlay-select-alex"
          className={demoSecondaryButtonClass}
          onClick={() => handleClose('alex')}
        >
          {String(alexLabel)}
        </button>
        <button
          type="button"
          data-demo-action="overlay-close"
          className={demoSecondaryButtonClass}
          onClick={() => handleClose('closed')}
        >
          {String(closeLabel)}
        </button>
      </div>
    </aside>
  );
}

function OverlayControls({ lang }: DemoProps) {
  const text = copy[lang];
  const { clear, display } = useOverlay();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string>(text.idle);
  const runRef = useRef(0);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openTask = async () => {
    const run = ++runRef.current;
    setPending(true);
    setResult(text.waiting);

    const closeResult = await display<string>({
      type: 'task',
      props: {
        title: text.cardTitle,
        message: text.cardBody,
        closeLabel: text.close,
        minaLabel: text.mina,
        alexLabel: text.alex,
      },
    });

    if (run === runRef.current) {
      setPending(false);
      setResult(closeResult === 'mina' ? text.assignedMina
        : closeResult === 'alex' ? text.assignedAlex
          : closeResult === 'closed' ? text.closed : text.cleared);
      triggerRef.current?.focus();
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
      <div className={styles.demoToolbar}>
        <button
          ref={triggerRef}
          type="button"
          data-demo-action="overlay-open"
          className={demoButtonClass}
          aria-disabled={pending}
          aria-expanded={pending}
          onClick={() => {
            if (!pending) void openTask();
          }}
        >
          {text.open}
        </button>
        <button
          type="button"
          data-demo-action="overlay-reset"
          className={demoSecondaryButtonClass}
          onClick={reset}
        >
          {text.reset}
        </button>
      </div>
      <p data-demo-result="overlay" role="status" className={`${styles.demoStatus} h-10 overflow-auto`}>
        {result}
      </p>
      <div
        data-demo-result="overlay-viewport"
        className={`${styles.demoViewport} ${styles.demoPreview} text-sm`}
        style={{ gridArea: '3 / 1' }}
      >
        {!pending && text.preview}
      </div>
    </>
  );
}

export function OverlayDemo({ lang }: DemoProps) {
  const text = copy[lang];
  const [store] = useState(createOverlayStore);
  const adapters = useMemo<OverlayAdapterMap>(
    () => ({ task: TaskAdapter }),
    [],
  );
  const code = lang === 'ko'
    ? `const reviewer =\n  await display<string>({\n    type: 'task',\n    props: { title: '랜딩 페이지 리뷰' },\n  });\n\n// 패널에서 팀원 선택\nclose('mina');\nremove();`
    : `const reviewer =\n  await display<string>({\n    type: 'task',\n    props: { title: 'Review this page' },\n  });\n\n// Choose a reviewer in the panel\nclose('mina');\nremove();`;

  return (
    <DemoFrame lang={lang} name="overlay" title={text.title} description={text.description} code={code}>
      <div className="grid grid-cols-1 gap-3">
        <OverlayProvider store={store} adapters={adapters}>
          <OverlayControls lang={lang} />
        </OverlayProvider>
      </div>
    </DemoFrame>
  );
}
