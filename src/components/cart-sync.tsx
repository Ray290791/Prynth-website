import { useEffect } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useCart } from "@/lib/cart-store";
import { getCartFromDb, syncCartToDb } from "@/lib/cart-fns";
import { upsertCartSession } from "@/lib/ecommerce-fns";

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

  // When the local cart changes, or when forced (e.g. email typed), sync it to the DB.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
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
    timeoutId = setTimeout(sync, 1000);

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
