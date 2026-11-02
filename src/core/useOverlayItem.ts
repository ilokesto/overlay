import { useSyncExternalStore } from "react";
import type { OverlayId, OverlayItem } from "../contracts/overlay";
import type { OverlayContextGetter } from "./useOverlay";

/**
 * @description Subscribes to one item in the supplied provider scope. Missing
 * items and server rendering produce undefined; closing items remain readable.
 * @param {OverlayContextGetter} getContext - Hook reading the matching provider scope.
 * @param {OverlayId} id - Identity of the item to observe.
 * @returns {OverlayItem | undefined} The current item, or undefined when absent.
 * - id `OverlayId` - Store-local item identity.
 * - type `string` - Adapter registry key.
 * - props `Readonly<Record<string, unknown>>` - Adapter-specific user props.
 * - status `OverlayStatus` - Open or awaiting removal.
 * - createdAt `number` - Creation timestamp in milliseconds since the Unix epoch.
 * - closeResult `unknown` - Optional result recorded for resolution on removal.
 * - rejectReason `unknown` - Optional reason recorded for rejection on removal.
 * - rejected `boolean | undefined` - Whether removal rejects, even for an undefined reason.
 * @example
 * ```tsx
 * function NoticeStatus({ id }: { id: string }) {
 *   const item = useOverlayItem(useNoticeContext, id);
 *   return <span>{item?.status ?? "absent"}</span>;
 * }
 * ```
 */
export function useOverlayItem(
  getContext: OverlayContextGetter,
  id: OverlayId
): OverlayItem | undefined {
  const { store } = getContext();

  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().find((item) => item.id === id),
    () => undefined
  );
}
