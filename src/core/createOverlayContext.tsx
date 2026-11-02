import { createContext, useContext, useMemo } from "react";
import type { FC } from "react";
import { createOverlayStore } from "./createOverlayStore";
import { OverlayHost } from "./OverlayHost";
import { useOverlay as useOverlayImpl } from "./useOverlay";
import { useOverlayItems as useOverlayItemsImpl } from "./useOverlayItems";
import { useOverlayItem as useOverlayItemImpl } from "./useOverlayItem";
import type { OverlayAdapterMap } from "../contracts/adapter";
import type { OverlayId, OverlayItem, OverlayProviderProps, OverlayStoreApi } from "../contracts/overlay";
import type { OverlayPlugin } from "../contracts/plugin";
import type { UseOverlayReturn } from "./useOverlay";

/** Provider-scoped runtime dependencies consumed by the host and hooks. */
export interface OverlayContextValue {
  /** Store shared by this scope's renderers and commands. */
  readonly store: OverlayStoreApi;
  /** Adapter registry indexed by item type. */
  readonly adapters: OverlayAdapterMap;
  /** Lifecycle observers used for phases not handled by an adapter. */
  readonly plugins: ReadonlyArray<OverlayPlugin>;
}

/** A matching provider and hooks isolated from every other context instance. */
export interface OverlayContextInstance {
  /** Provider rendering its children and one host with the supplied adapters. */
  readonly Provider: FC<OverlayProviderProps>;
  /** Reads commands for the nearest matching provider; throws outside it. */
  readonly useOverlay: () => UseOverlayReturn;
  /** Subscribes to all items in the nearest matching provider. */
  readonly useOverlayItems: () => ReadonlyArray<OverlayItem>;
  /** Subscribes to a single item, returning undefined when absent or on the server. */
  readonly useOverlayItem: (id: OverlayId) => OverlayItem | undefined;
}

/**
 * @description Creates an independent React overlay scope with a provider and
 * matching hooks. Each provider creates a store unless one is supplied and mounts
 * its own host. Hooks throw outside a provider from this same context instance.
 * @returns {OverlayContextInstance} Isolated provider and hooks.
 * - Provider `FC<OverlayProviderProps>` - Hosts adapters and content using a provider-scoped store.
 * - useOverlay `() => UseOverlayReturn` - Reads store-bound overlay commands.
 * - useOverlayItems `() => ReadonlyArray<OverlayItem>` - Subscribes to all queued items.
 * - useOverlayItem `(id: OverlayId) => OverlayItem | undefined` - Subscribes to one identity, absent on the server.
 * @example
 * ```tsx
 * const notices = createOverlayContext();
 * function NoticeButton() {
 *   const overlay = notices.useOverlay();
 *   return <button onClick={() => overlay.open({ type: "notice" })}>Show</button>;
 * }
 * function App() {
 *   return <notices.Provider adapters={adapters}><NoticeButton /></notices.Provider>;
 * }
 * ```
 */
export function createOverlayContext(): OverlayContextInstance {
  const context = createContext<OverlayContextValue | null>(null);

  function useOverlayContext(): OverlayContextValue {
    const ctx = useContext(context);

    if (ctx === null) {
      throw new Error("useOverlay must be used within an <OverlayProvider>.");
    }

    return ctx;
  }

  function Provider({ adapters, children, store: storeProp, plugins }: OverlayProviderProps) {
    const store = useMemo<OverlayStoreApi>(
      () => storeProp ?? createOverlayStore(),
      [storeProp]
    );

    const pluginsRef = useMemo<ReadonlyArray<OverlayPlugin>>(
      () => plugins ?? [],
      [plugins]
    );

    const value = useMemo<OverlayContextValue>(
      () => ({ store, adapters, plugins: pluginsRef }),
      [store, adapters, pluginsRef]
    );

    return (
      <context.Provider value={value}>
        {children}
        <OverlayHost useOverlayContext={useOverlayContext} />
      </context.Provider>
    );
  }

  const useOverlay = () => useOverlayImpl(useOverlayContext);
  const useOverlayItems = () => useOverlayItemsImpl(useOverlayContext);
  const useOverlayItem = (id: Parameters<typeof useOverlayItemImpl>[1]) =>
    useOverlayItemImpl(useOverlayContext, id);

  return { Provider, useOverlay, useOverlayItems, useOverlayItem };
}
