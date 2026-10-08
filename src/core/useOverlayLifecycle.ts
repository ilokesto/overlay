import { useCallback, useEffect, useRef } from "react";
import type { OverlayAdapterHooks, OverlayRenderProps } from "../contracts/adapter";
import type { OverlayId, OverlayItem, OverlayStoreApi } from "../contracts/overlay";
import type { OverlayPlugin } from "../contracts/plugin";

/**
 * Connects one rendered item to its adapter hooks and provider plugins.
 * Store removal, not provider unmount, owns the final lifecycle notification.
 */
export function useOverlayLifecycle(
  item: OverlayItem,
  store: OverlayStoreApi,
  plugins: ReadonlyArray<OverlayPlugin>,
): OverlayRenderProps["useLifecycle"] {
  const hooksRef = useRef<OverlayAdapterHooks | null>(null);
  const previousStatusRef = useRef<"open" | "closing" | "mounted">("mounted");

  const runPhase = useCallback(
    (
      phase: "onOpen" | "onClosing" | "onUnmount",
      id: OverlayId,
      phaseItem: OverlayItem,
    ): void => {
      const adapterHook = hooksRef.current?.[phase];
      if (adapterHook) {
        adapterHook(id, phaseItem);
        return;
      }
      for (const plugin of plugins) {
        plugin[phase]?.(id, phaseItem);
      }
    },
    [plugins],
  );

  useEffect(() => {
    if (previousStatusRef.current === "mounted" && item.status === "open") {
      runPhase("onOpen", item.id, item);
    } else if (
      previousStatusRef.current === "open" &&
      item.status === "closing"
    ) {
      runPhase("onClosing", item.id, item);
    }
    previousStatusRef.current = item.status;
  }, [item, runPhase]);

  useEffect(() => {
    return () => {
      // Effect replacement and StrictMode cleanup are not item removal.
      const itemRemainsInStore = store
        .getSnapshot()
        .some((storedItem) => storedItem.id === item.id);
      if (itemRemainsInStore) {
        return;
      }

      runPhase("onUnmount", item.id, item);
    };
  }, [item, runPhase, store]);

  return (hooks) => {
    hooksRef.current = hooks;
  };
}
