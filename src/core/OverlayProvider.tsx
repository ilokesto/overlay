import { createOverlayContext } from "./createOverlayContext";
import type { OverlayContextValue } from "./createOverlayContext";

const defaultContext = createOverlayContext();

/**
 * @description Provides the default overlay scope and automatically hosts its
 * items. Creates a store per provider unless supplied; unmount does not remove
 * items from an external store or settle their requests.
 * @param {OverlayProviderProps} props - Default scope configuration.
 * @param {OverlayAdapterMap} props.adapters - Registry mapping item types to adapters.
 * @param {React.ReactNode} props.children - Content using this overlay scope.
 * @param {OverlayStoreApi} [props.store] - Optional external store, also usable before mount.
 * @param {OverlayStoreApi["open"]} [props.store.open] - Opens or reuses a pending request.
 * @param {OverlayStoreApi["close"]} [props.store.close] - Records a result and starts closing.
 * @param {OverlayStoreApi["closeAll"]} [props.store.closeAll] - Starts closing every open item.
 * @param {OverlayStoreApi["reject"]} [props.store.reject] - Records rejection and starts closing.
 * @param {OverlayStoreApi["remove"]} [props.store.remove] - Removes and settles one item.
 * @param {OverlayStoreApi["clear"]} [props.store.clear] - Removes and settles all items.
 * @param {OverlayStoreApi["subscribe"]} [props.store.subscribe] - Subscribes to item changes.
 * @param {OverlayStoreApi["getSnapshot"]} [props.store.getSnapshot] - Reads the current item snapshot.
 * @param {OverlayStoreApi["getInitialSnapshot"]} [props.store.getInitialSnapshot] - Reads the initial empty server snapshot.
 * @param {ReadonlyArray<OverlayPlugin>} [props.plugins] - Fallback observers for phases without adapter handlers.
 * @returns {React.ReactNode} Provider content and its automatically mounted overlay host.
 * @example
 * ```tsx
 * <OverlayProvider adapters={adapters}>
 *   <NoticeButton />
 * </OverlayProvider>
 * ```
 */
export const OverlayProvider = defaultContext.Provider;
/**
 * @description Reads commands bound to the nearest default OverlayProvider.
 * Call during React rendering; throws when no matching provider is mounted.
 * @returns {UseOverlayReturn} Stable callbacks for the current provider store.
 * - display `<TResult>(options: DisplayOptions) => Promise<TResult | undefined>` - Opens an item and awaits removal-based settlement.
 * - open `(options: DisplayOptions) => OverlayId` - Opens an item and returns its identity.
 * - close `(id: OverlayId, result?: unknown) => void` - Records a result and starts closing without removing.
 * - closeAll `() => void` - Starts closing every open item.
 * - reject `(id: OverlayId, reason?: unknown) => void` - Records rejection for settlement on removal.
 * - remove `(id?: OverlayId) => void` - Removes and settles the selected or last item.
 * - clear `() => void` - Removes all items and settles their pending requests.
 * @example
 * ```tsx
 * function NoticeButton() {
 *   const overlay = useOverlay();
 *   return <button onClick={() => overlay.open({ type: "notice" })}>Show</button>;
 * }
 * ```
 */
export const useOverlay = defaultContext.useOverlay;
/**
 * @description Subscribes to all items in the nearest default OverlayProvider,
 * including closing items. Throws outside the provider; uses an empty server snapshot.
 * @returns {ReadonlyArray<OverlayItem>} Current items in insertion order.
 * @example
 * ```tsx
 * function NoticeCount() {
 *   const items = useOverlayItems();
 *   return <span>{items.length}</span>;
 * }
 * ```
 */
export const useOverlayItems = defaultContext.useOverlayItems;
/**
 * @description Subscribes to one identity in the nearest default OverlayProvider.
 * Throws outside the provider and returns undefined for missing items or on the server.
 * @param {OverlayId} id - Identity of the item to observe.
 * @returns {OverlayItem | undefined} Current item snapshot, or undefined when absent.
 * - id `OverlayId` - Store-local item identity.
 * - type `string` - Adapter registry key.
 * - props `Readonly<Record<string, unknown>>` - Adapter-specific user props.
 * - status `OverlayStatus` - Open or waiting for removal.
 * - createdAt `number` - Creation timestamp in milliseconds since the Unix epoch.
 * - closeResult `unknown` - Optional result recorded for resolution.
 * - rejectReason `unknown` - Optional reason recorded for rejection.
 * - rejected `boolean | undefined` - Whether removal rejects, even with an undefined reason.
 * @example
 * ```tsx
 * function NoticeStatus({ id }: { id: string }) {
 *   const item = useOverlayItem(id);
 *   return <span>{item?.status ?? "absent"}</span>;
 * }
 * ```
 */
export const useOverlayItem = defaultContext.useOverlayItem;

export type { OverlayContextValue };
