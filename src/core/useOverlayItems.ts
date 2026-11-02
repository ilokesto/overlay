import { useSyncExternalStore } from "react";
import type { OverlayItem } from "../contracts/overlay";
import type { OverlayContextGetter } from "./useOverlay";

/**
 * @description Subscribes to all items in a supplied provider scope, including
 * closing items until removal. Uses the initial empty snapshot on the server.
 * @param {OverlayContextGetter} getContext - Hook reading the matching provider scope.
 * @returns {ReadonlyArray<OverlayItem>} Current stable item snapshot in insertion order.
 * @example
 * ```tsx
 * function NoticeCount() {
 *   const items = useOverlayItems(useNoticeContext);
 *   return <span>{items.length}</span>;
 * }
 * ```
 */
export function useOverlayItems(getContext: OverlayContextGetter): ReadonlyArray<OverlayItem> {
  const { store } = getContext();

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getInitialSnapshot
  );
}
