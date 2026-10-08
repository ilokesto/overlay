import { useCallback, useEffect, useRef } from "react";
import type { OverlayRenderProps } from "../contracts/adapter";
import type { OverlayItem } from "../contracts/overlay";
import type { OverlayContextGetter } from "./useOverlay";
import { useOverlayLifecycle } from "./useOverlayLifecycle";

type OverlayItemRendererProps = {
  readonly item: OverlayItem;
  readonly getContext: OverlayContextGetter;
};

/** Selects an adapter and binds runtime props, which take precedence over user props. */
export function OverlayItemRenderer({ item, getContext }: OverlayItemRendererProps) {
  const { store, adapters, plugins } = getContext();
  const Adapter = adapters[item.type];
  const useLifecycle = useOverlayLifecycle(item, store, plugins);
  const missingAdapterReportedRef = useRef(false);

  const close = useCallback(
    (result?: unknown) => {
      store.close(item.id, result);
    },
    [item.id, store],
  );

  const remove = useCallback(() => {
    store.remove(item.id);
  }, [item.id, store]);

  useEffect(() => {
    if (
      typeof process === "undefined" ||
      process.env.NODE_ENV !== "development" ||
      Adapter ||
      missingAdapterReportedRef.current
    ) {
      return;
    }

    missingAdapterReportedRef.current = true;
    console.error("[@ilokesto/overlay] Missing adapter", {
      id: item.id,
      type: item.type,
    });
  }, [Adapter, item.id, item.type]);

  if (!Adapter) {
    return null;
  }

  const renderProps: OverlayRenderProps = {
    id: item.id,
    isOpen: item.status === "open",
    status: item.status,
    close,
    remove,
    useLifecycle,
  };

  return <Adapter {...item.props} {...renderProps} />;
}
