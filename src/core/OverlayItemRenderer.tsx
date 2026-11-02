import { useCallback, useEffect, useRef } from "react";
import type { OverlayRenderProps } from "../contracts/adapter";
import type { OverlayItem } from "../contracts/overlay";
import type { OverlayContextGetter } from "./useOverlay";
import { useOverlayLifecycle } from "./useOverlayLifecycle";

type OverlayItemRendererProps = {
  /** Snapshot whose type selects an adapter and whose id scopes controls. */
  readonly item: OverlayItem;
  /** Hook reading the matching provider's store, adapters, and plugins. */
  readonly getContext: OverlayContextGetter;
};

/**
 * @description Selects an item's adapter and binds item-scoped lifecycle controls.
 * Runtime props override user props. Missing adapters render nothing and are
 * reported once per renderer in development without removing the queued item.
 * @param {OverlayItemRendererProps} props - Item renderer inputs.
 * @param {OverlayItem} props.item - Current snapshot of the rendered item.
 * @param {OverlayId} props.item.id - Store-local identity.
 * @param {string} props.item.type - Adapter registry key.
 * @param {Readonly<Record<string, unknown>>} props.item.props - Adapter-specific user values.
 * @param {OverlayStatus} props.item.status - Open or awaiting removal.
 * @param {number} props.item.createdAt - Creation timestamp in milliseconds.
 * @param {unknown} [props.item.closeResult] - Result recorded for settlement.
 * @param {unknown} [props.item.rejectReason] - Recorded rejection reason.
 * @param {boolean} [props.item.rejected] - Whether removal rejects the request.
 * @param {OverlayContextGetter} props.getContext - Hook reading the matching provider scope.
 * @returns {React.ReactElement | null} Adapter element, or null when no adapter matches.
 * @example
 * ```tsx
 * <OverlayItemRenderer item={item} getContext={useCustomOverlayContext} />
 * ```
 */
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
