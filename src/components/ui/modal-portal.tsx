import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ModalPortalProps {
  children: ReactNode;
  isOpen?: boolean;
}

/**
 * Portals modal dialogs directly to document.body, escaping any parent stacking contexts
 * (such as page animations, transforms, or relative containers) to ensure it renders at the
 * topmost layer with z-[99999] above headers and footers.
 *
 * Automatically locks background scroll on both <body> and <html> while the modal is visible.
 */
export function ModalPortal({ children, isOpen = true }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent layout jitter from disappearing scrollbar
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Lock scrolling completely
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen, mounted]);

  if (!mounted || !isOpen) return null;

  return createPortal(children, document.body);
}
