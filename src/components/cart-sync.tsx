import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useCart } from "@/lib/cart-store";
import { getCartFromDb, syncCartToDb } from "@/lib/cart-fns";
import { getProductsPublic } from "@/lib/products-fns";
import { upsertCartSession, touchUserActivity } from "@/lib/ecommerce-fns";

export function CartSync() {
  const user = useCurrentUser();
  const items = useCart((s) => s.items);

  // Fetch live catalog products from database to ensure cart item prices never drift from site editor
  const { data: liveProducts } = useQuery({
    queryKey: ["publicProducts"],
    queryFn: () => getProductsPublic(),
    staleTime: 60_000,
  });

  // Reconcile and auto-heal cart prices and names against live database product records
  useEffect(() => {
    if (!liveProducts || liveProducts.length === 0) return;
    const currentItems = useCart.getState().items;
    let changed = false;
    const syncedItems = currentItems.map((item) => {
      if (item.kind === "product" && item.productSlug) {
        const live = liveProducts.find((p) => p.slug === item.productSlug);
        if (live) {
          const variant = live.variants?.find((v: any) =>
            (v.size === item.size || (!v.size && !item.size)) &&
            (v.color === item.color || (!v.color && !item.color))
          );
          const currentLivePrice = Number(variant ? variant.price : live.price);
          if (currentLivePrice && (item.unitPrice !== currentLivePrice || item.name !== live.name)) {
            changed = true;
            return {
              ...item,
              unitPrice: currentLivePrice,
              name: live.name,
              image: live.image || item.image,
            };
          }
        }
      }
      return item;
    });

    if (changed) {
      useCart.setState({ items: syncedItems });
    }
  }, [liveProducts]);

  // Keep active user session timestamp fresh while tab is open
  useEffect(() => {
    if (!user) return;
    touchUserActivity().catch(() => {});

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        touchUserActivity().catch(() => {});
      }
    }, 2 * 60 * 1000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        touchUserActivity().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  // When user logs in, fetch the remote cart and merge or replace the local cart.
  // We'll replace it to keep it simple, but we only do this once on login.
  useEffect(() => {
    if (!user) return;
    
    // Check if we've already synced this session
    const synced = sessionStorage.getItem("prynth-cart-synced");
    if (synced) return;

    // Fetch from DB
    getCartFromDb().then((res) => {
      if (res.items && res.items.length > 0) {
        // Merge local items with DB items (keep both)
        const dbItems = res.items;
        const localItems = items.filter(li => !dbItems.some(di => di.id === li.id));
        const merged = [...dbItems, ...localItems];
        useCart.setState({ items: merged });
        
        // If there were local items that aren't in DB yet, sync them up
        if (localItems.length > 0) {
          syncCartToDb({ data: { items: merged } }).catch(console.error);
        }
      } else if (items.length > 0) {
        // If DB cart is empty but local cart has items (guest added items then logged in), push to DB
        syncCartToDb({ data: { items } }).catch(console.error);
      }
      sessionStorage.setItem("prynth-cart-synced", "true");
    }).catch(console.error);
  }, [user]); // We intentionally do not include `items` here because this is for initialization only

  // When the local cart changes, or when forced (e.g. email typed), sync it to the DB.
  useEffect(() => {
    const sync = () => {
      // 1. Sync to logged-in user's cart (if logged in)
      if (user) {
        syncCartToDb({ data: { items } }).catch(console.error);
      }

      // 2. Sync to anonymous/guest cart_sessions for abandoned cart tracking
      let sessionId = localStorage.getItem("prynth-cart-session-id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("prynth-cart-session-id", sessionId);
      }
      
      // If user is logged in, use their email, else check if they've saved one in checkout
      const guestEmail = localStorage.getItem("prynth-guest-email") || undefined;
      const emailToUse = user?.primaryEmail || guestEmail;

      upsertCartSession({ 
        data: { id: sessionId, email: emailToUse, items } 
      }).catch(console.error);
    };

    // Debounce to avoid spamming the database on regular item changes
    const timeoutId = setTimeout(sync, 1000);

    // Also listen for explicit sync requests (e.g. guest email entered)
    const handleForceSync = () => {
      clearTimeout(timeoutId);
      sync();
    };
    window.addEventListener("prynth-sync-cart", handleForceSync);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("prynth-sync-cart", handleForceSync);
    };
  }, [items, user]);

  return null;
}
