import { useCallback, useEffect, useRef } from "react";
import type { OverlayAdapterHooks, OverlayRenderProps } from "../contracts/adapter";
import type { OverlayId, OverlayItem, OverlayStoreApi } from "../contracts/overlay";
import type { OverlayPlugin } from "../contracts/plugin";

/**
 * @description Connects one rendered item to adapter hooks and provider plugins.
 * Adapter handlers override plugins per phase. Only open mounts and observed
 * open-to-closing changes notify those phases; final notification requires store
 * removal, not effect replacement, StrictMode replay, or provider-only unmount.
 * @param {OverlayItem} item - Rendered item snapshot.
 * @param {OverlayId} item.id - Store-local identity.
 * @param {string} item.type - Adapter registry key.
 * @param {Readonly<Record<string, unknown>>} item.props - Adapter-specific user values.
 * @param {OverlayStatus} item.status - Current lifecycle stage.
 * @param {number} item.createdAt - Creation timestamp in milliseconds.
 * @param {unknown} [item.closeResult] - Recorded resolution value.
 * @param {unknown} [item.rejectReason] - Recorded rejection reason.
 * @param {boolean} [item.rejected] - Whether removal rejects the pending request.
 * @param {OverlayStoreApi} store - Store owning this item's lifetime.
 * @param {OverlayStoreApi["open"]} store.open - Opens or reuses a pending request.
 * @param {OverlayStoreApi["close"]} store.close - Records a result and starts closing.
 * @param {OverlayStoreApi["closeAll"]} store.closeAll - Starts closing all open items.
 * @param {OverlayStoreApi["reject"]} store.reject - Records rejection and starts closing.
 * @param {OverlayStoreApi["remove"]} store.remove - Removes and settles one item.
 * @param {OverlayStoreApi["clear"]} store.clear - Removes and settles all items.
 * @param {OverlayStoreApi["subscribe"]} store.subscribe - Subscribes to item changes.
 * @param {OverlayStoreApi["getSnapshot"]} store.getSnapshot - Reads current items to distinguish removal from effect cleanup.
 * @param {OverlayStoreApi["getInitialSnapshot"]} store.getInitialSnapshot - Reads the initial empty items.
 * @param {ReadonlyArray<OverlayPlugin>} plugins - Fallback observers for phases without an adapter handler.
 * @returns {OverlayRenderProps["useLifecycle"]} Callback registering the latest adapter handlers during rendering.
 * @example
 * ```tsx
 * function CustomRenderer() {
 *   const register = useOverlayLifecycle(item, store, plugins);
 *   register({ onClosing: () => startExitAnimation() });
 *   return <div />;
 * }
 * ```
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
