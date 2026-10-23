import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAdminTeam, addAdmin, removeAdmin } from "@/lib/admin-fns";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Shield, UserCog } from "lucide-react";

export function AdminTeamTab() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["adminTeam"],
    queryFn: () => getAdminTeam(),
  });

  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      await addAdmin({ data: { email } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeam"] });
      toast.success("Admin added successfully");
      setNewEmail("");
    },
    onError: (err) => toast.error(err.message)
  });

  const removeMutation = useMutation({
    mutationFn: async (email: string) => {
      await removeAdmin({ data: { email } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTeam"] });
      toast.success("Admin removed");
    },
    onError: (err) => toast.error(err.message)
  });

  if (isLoading) return <div className="p-8 text-center text-muted">Loading team...</div>;
  if (error) return <div className="p-8 text-danger">{error.message || "Unauthorized. Super Admin only."}</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-semibold">Admin Team</h2>
        <p className="text-muted mt-1 text-sm">Manage who has access to this dashboard.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Add New Admin</h3>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newEmail) addMutation.mutate(newEmail);
          }}
          className="flex gap-4 max-w-md"
        >
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="admin@example.com"
            required
            className="flex-1 rounded border border-border bg-surface-2 p-2 text-sm"
          />
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium whitespace-nowrap"
          >
            {addMutation.isPending ? "Adding..." : "Add Admin"}
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-muted">
            <tr>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Added On</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {team?.map((admin: any) => (
              <tr key={admin.email} className="hover:bg-surface-2/50 transition-colors">
                <td className="p-4 font-medium">{admin.email}</td>
                <td className="p-4 capitalize">
                  <Badge className={admin.role === 'super_admin' ? 'bg-primary' : 'bg-secondary'}>
                    {admin.role.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="p-4 text-muted">{new Date(admin.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  {admin.role !== 'super_admin' && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${admin.email} from admin team?`)) {
                          removeMutation.mutate(admin.email);
                        }
                      }}
                      className="text-xs px-3 py-1.5 rounded bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

