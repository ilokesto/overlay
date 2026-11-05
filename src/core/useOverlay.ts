import { useCallback } from "react";
import type { DisplayOptions, OverlayId } from "../contracts/overlay";
import type { OverlayContextValue } from "./createOverlayContext";

/** Hook reading the matching provider scope, throwing when no provider is mounted. */
export type OverlayContextGetter = () => OverlayContextValue;

/** Stable callbacks bound to the current provider's overlay store. */
export interface UseOverlayReturn {
  /** Opens an item and returns its eventual result, settled only on removal or clear. */
  readonly display: <TResult = unknown>(
    options: DisplayOptions
  ) => Promise<TResult | undefined>;
  /** Opens an item, returns its id, and handles rejection of its unexposed result promise. */
  readonly open: (options: DisplayOptions) => OverlayId;
  /** Starts closing with a result; call remove to settle the request. */
  readonly close: (id: OverlayId, result?: unknown) => void;
  /** Starts closing all open items without removing them. */
  readonly closeAll: () => void;
  /** Starts closing with a rejection reason; remove later rejects the request. */
  readonly reject: (id: OverlayId, reason?: unknown) => void;
  /** Removes and settles one item, defaulting to the most recently inserted. */
  readonly remove: (id?: OverlayId) => void;
  /** Removes all items and settles every pending request. */
  readonly clear: () => void;
}

/**
 * @description Binds overlay commands to a supplied provider context hook.
 * Call during React rendering inside that hook's matching provider.
 * @param {OverlayContextGetter} getContext - Hook reading the target overlay scope.
 * @returns {UseOverlayReturn} Memoized commands for the scope's current store.
 * - display `<TResult>(options: DisplayOptions) => Promise<TResult | undefined>` - Opens an item and awaits removal-based settlement.
 * - open `(options: DisplayOptions) => OverlayId` - Opens an item and returns its identity.
 * - close `(id: OverlayId, result?: unknown) => void` - Records a result and starts closing.
 * - closeAll `() => void` - Starts closing every open item.
 * - reject `(id: OverlayId, reason?: unknown) => void` - Records a rejection and starts closing.
 * - remove `(id?: OverlayId) => void` - Removes and settles the specified or last item.
 * - clear `() => void` - Removes and settles all items.
 * @example
 * ```tsx
 * function NoticeButton() {
 *   const overlay = useOverlay(useNoticeContext);
 *   return <button onClick={() => overlay.open({ type: "notice" })}>Show</button>;
 * }
 * ```
 */
export function useOverlay(getContext: OverlayContextGetter): UseOverlayReturn {
  const { store } = getContext();

  const display = useCallback(
    <TResult = unknown>(options: DisplayOptions): Promise<TResult | undefined> => {
      const { promise } = store.open<TResult>(options);
      return promise;
    },
    [store]
  );

  const open = useCallback(
    (options: DisplayOptions): OverlayId => {
      const { id, promise } = store.open(options);
      // This API exposes no promise for the caller to handle.
      void promise.catch(() => undefined);
      return id;
    },
    [store]
  );

  const close = useCallback(
    (id: OverlayId, result?: unknown): void => {
      store.close(id, result);
    },
    [store]
  );

  const closeAll = useCallback((): void => {
    store.closeAll();
  }, [store]);

  const reject = useCallback(
    (id: OverlayId, reason?: unknown): void => {
      store.reject(id, reason);
    },
    [store]
  );

  const remove = useCallback(
    (id?: OverlayId): void => {
      store.remove(id);
    },
    [store]
  );

  const clear = useCallback((): void => {
    store.clear();
  }, [store]);

  return { display, open, close, closeAll, reject, remove, clear };
}
