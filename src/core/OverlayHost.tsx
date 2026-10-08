import { OverlayItemRenderer } from "./OverlayItemRenderer";
import { useOverlayItems } from "./useOverlayItems";
import type { OverlayContextGetter } from "./useOverlay";

interface OverlayHostProps {
  readonly useOverlayContext: OverlayContextGetter;
}

/** Subscribes to the provider's items and preserves each renderer's keyed identity. */
export function OverlayHost({ useOverlayContext }: OverlayHostProps) {
  const items = useOverlayItems(useOverlayContext);

  return (
    <>
      {items.map((item) => (
        <OverlayItemRenderer
          key={item.id}
          item={item}
          getContext={useOverlayContext}
        />
      ))}
    </>
  );
}
