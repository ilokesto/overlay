import { createStore } from "@ilokesto/store";
import type {
  DisplayOptions,
  OverlayId,
  OverlayItem,
  OverlayRequest,
  OverlayState,
  OverlayStoreApi,
} from "../contracts/overlay";

type PendingSettler = {
  readonly resolve: (value: unknown | undefined) => void;
  readonly reject: (reason?: unknown) => void;
};

function createOverlayItem(options: DisplayOptions, id: OverlayId): OverlayItem {
  return {
    id,
    type: options.type,
    props: options.props ?? {},
    status: "open",
    createdAt: Date.now(),
  };
}

export function createOverlayStore(): OverlayStoreApi {
  const store = createStore<OverlayState>({ items: [] });
  const pendingSettlers = new Map<OverlayId, PendingSettler>();
  const pendingRequests = new Map<OverlayId, OverlayRequest>();
  let counter = 0;

  function nextId(): OverlayId {
    counter += 1;
    return `overlay-${counter}-${Date.now()}`;
  }

  function settle(id: OverlayId, item: OverlayItem): void {
    const settler = pendingSettlers.get(id);

    if (!settler) {
      return;
    }

    pendingSettlers.delete(id);
    pendingRequests.delete(id);

    if (item.rejected) {
      settler.reject(item.rejectReason);
    } else {
      settler.resolve(item.closeResult);
    }
  }

  function open<TResult = unknown>(options: DisplayOptions): OverlayRequest<TResult> {
    const id = options.id ?? nextId();

    const existing = pendingRequests.get(id);
    if (existing) {
      return existing as OverlayRequest<TResult>;
    }

    const item = createOverlayItem(options, id);

    const promise = new Promise<TResult | undefined>((resolve, reject) => {
      pendingSettlers.set(id, {
        resolve: resolve as PendingSettler["resolve"],
        reject: reject as PendingSettler["reject"],
      });
    });

    const request: OverlayRequest = { id, promise };
    pendingRequests.set(id, request);

    store.update((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));

    return request as OverlayRequest<TResult>;
  }

  function transitionToClosing(
    updateItem: (item: OverlayItem) => OverlayItem,
  ): void {
    store.setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.status === "closing" ? item : updateItem(item),
      ),
    }));
  }

  function close(id: OverlayId, result?: unknown): void {
    transitionToClosing((item) =>
      item.id === id
        ? {
            ...item,
            status: "closing",
            closeResult: result,
          }
        : item,
    );
  }

  function closeAll(): void {
    transitionToClosing((item) => ({
      ...item,
      status: "closing",
    }));
  }

  function reject(id: OverlayId, reason?: unknown): void {
    transitionToClosing((item) =>
      item.id === id
        ? {
            ...item,
            status: "closing",
            rejectReason: reason,
            rejected: true,
          }
        : item,
    );
  }

  function remove(id?: OverlayId): void {
    const targetId = id ?? store.getState().items.at(-1)?.id;

    if (!targetId) {
      return;
    }

    const targetItem = store.getState().items.find((item) => item.id === targetId);

    if (!targetItem) {
      return;
    }

    settle(targetId, targetItem);

    store.setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== targetId),
    }));
  }

  function clear(): void {
    for (const item of store.getState().items) {
      settle(item.id, item);
    }

    store.setState((prev) => ({
      ...prev,
      items: [],
    }));
  }

  function subscribe(listener: () => void): () => void {
    return store.subscribe(listener);
  }

  function getSnapshot(): ReadonlyArray<OverlayItem> {
    return store.getState().items;
  }

  function getInitialSnapshot(): ReadonlyArray<OverlayItem> {
    return store.getInitialState().items;
  }

  return {
    open,
    close,
    closeAll,
    reject,
    remove,
    clear,
    subscribe,
    getSnapshot,
    getInitialSnapshot,
  };
}
