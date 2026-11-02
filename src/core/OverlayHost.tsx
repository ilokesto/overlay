import { OverlayItemRenderer } from "./OverlayItemRenderer";
import { useOverlayItems } from "./useOverlayItems";
import type { OverlayContextGetter } from "./useOverlay";

interface OverlayHostProps {
  /** Hook reading the provider scope hosted here. */
  readonly useOverlayContext: OverlayContextGetter;
}

/**
 * @description Renders a keyed adapter for each item from the supplied provider
 * scope. Providers already mount a host; additional hosts duplicate rendering.
 * @param {OverlayHostProps} props - Host configuration.
 * @param {OverlayContextGetter} props.useOverlayContext - Hook reading the scope to host.
 * @returns {React.ReactElement} Fragment containing the scope's keyed item renderers.
 * @example
 * ```tsx
 * // For a custom provider implementation that does not mount its own host:
 * <OverlayHost useOverlayContext={useCustomOverlayContext} />
 * ```
 */
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
