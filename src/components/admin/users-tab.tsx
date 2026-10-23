import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { getAllUsersAdmin } from "@/lib/admin-fns";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";

export function UsersTab({ orders }: { orders: any[] | undefined }) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => getAllUsersAdmin(),
  });

  if (isLoading) return <div className="p-8 text-center text-muted">Loading users...</div>;
  if (error) return <div className="p-8 text-center text-danger">Failed to load users</div>;

  const filteredUsers = users?.filter((user: any) => {
    const q = searchQuery.toLowerCase().replace(/^#/, '').trim();
    
    const hasMatchingOrder = orders?.some((order: any) => 
      order.user_id === user.id && order.order_number?.toLowerCase().includes(q)
    );

    return (
      (user.name?.toLowerCase().includes(q) ?? false) ||
      (user.email?.toLowerCase().includes(q) ?? false) ||
      hasMatchingOrder
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Registered Users</h2>
          <p className="text-muted mt-1 text-sm">View all registered accounts on your platform.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            type="text"
            placeholder="Search name, email, or order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-muted">
            <tr>
              <th className="p-4 font-medium">User</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!filteredUsers || filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-medium">
                        {user.name ? user.name.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{user.name || "Unnamed"}</div>
                        <div className="text-xs text-muted">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={user.emailVerified ? "bg-primary/20 text-primary border-primary/20" : "bg-warning/20 text-warning border-warning/20"}>
                      {user.emailVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

