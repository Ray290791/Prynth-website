import { useEffect } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useCart } from "@/lib/cart-store";
import { getCartFromDb, syncCartToDb } from "@/lib/cart-fns";

export function CartSync() {
  const user = useCurrentUser();
  const items = useCart((s) => s.items);

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

  // When the local cart changes and the user is logged in, sync it to the DB.
  useEffect(() => {
    if (!user) return;
    // Debounce or just send immediately since it's an optimistic UI
    const timeoutId = setTimeout(() => {
      syncCartToDb({ data: { items } }).catch(console.error);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [items, user]);

  return null;
}
