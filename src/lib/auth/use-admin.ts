import { useQuery } from "@tanstack/react-query";
import { useCurrentUserState } from "./use-current-user";
import { checkCurrentUserIsAdmin } from "../admin-fns";

/**
 * Universal hook to verify whether the signed-in user has admin privileges.
 * 
 * Works dynamically across all devices and accounts:
 * - Checks database `admin_users` table
 * - Checks environment `ADMIN_EMAIL`
 * - Checks `site_settings.notify_email` fallback
 * - Returns immediately for known super admins, and fetches verified role from server
 */
export function useIsAdmin() {
  const { user, isPending: authPending } = useCurrentUserState();

  const query = useQuery({
    queryKey: ["adminRoleStatus", user?.id],
    queryFn: async () => {
      if (!user) return { isAdmin: false, role: null };
      const res = await checkCurrentUserIsAdmin();
      return {
        isAdmin: Boolean(res?.isAdmin),
        role: res?.role ?? null,
      };
    },
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
  });

  const isConfiguredSuperAdmin =
    user?.primaryEmail?.toLowerCase() === "prynth07@gmail.com";
  const isAdmin = isConfiguredSuperAdmin || Boolean(query.data?.isAdmin);
  const role = query.data?.role ?? (isConfiguredSuperAdmin ? "super_admin" : null);

  return {
    isAdmin,
    role,
    user,
    isLoading: authPending || (Boolean(user) && query.isLoading),
  };
}

