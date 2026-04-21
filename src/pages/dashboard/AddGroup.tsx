import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBranch } from "@/contexts/BranchContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Users, DollarSign, UsersRound } from "lucide-react";
import type { Group, GroupCoach, Profile } from "@/types";

// ─── Schema ───────────────────────────────────────────────────────────────────
const groupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  monthly_fee: z
    .string()
    .min(1, "Monthly fee is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: "Must be a valid non-negative number",
    }),
  description: z.string().optional(),
});

type GroupFormValues = z.infer<typeof groupSchema>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

// ─── Group Form Modal ─────────────────────────────────────────────────────────
interface GroupFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: Group | null;
}

const GroupFormModal = ({ open, onClose, editing }: GroupFormModalProps) => {
  const { profile } = useAuth();
  const { activeBranch } = useBranch();
  const queryClient = useQueryClient();
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>([]);

  // Fetch coaches for this branch only
  const { data: coaches = [] } = useQuery({
    queryKey: ["profiles", "coaches", activeBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "coach")
        .eq("branch", activeBranch)
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: open,
  });

  // Fetch current coach assignments when editing
  useQuery({
    queryKey: ["group_coaches", editing?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_coaches")
        .select("*")
        .eq("group_id", editing!.id);
      if (error) throw error;
      setSelectedCoachIds((data as GroupCoach[]).map((gc) => gc.coach_id));
      return data as GroupCoach[];
    },
    enabled: open && !!editing,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    values: editing
      ? {
          name: editing.name,
          monthly_fee: String(editing.monthly_fee),
          description: editing.description ?? "",
        }
      : { name: "", monthly_fee: "", description: "" },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: GroupFormValues) => {
      const payload = {
        name: values.name,
        monthly_fee: parseFloat(values.monthly_fee),
        branch: activeBranch,
        description: values.description || null,
        created_by: profile?.id ?? null,
      };

      let groupId = editing?.id;

      if (editing) {
        const { error } = await supabase
          .from("groups")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("groups")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        groupId = data.id;
      }

      // Sync coach assignments: delete all then re-insert
      await supabase.from("group_coaches").delete().eq("group_id", groupId!);
      if (selectedCoachIds.length > 0) {
        const { error } = await supabase.from("group_coaches").insert(
          selectedCoachIds.map((coach_id) => ({ group_id: groupId!, coach_id }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Group updated" : "Group created");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group_coaches"] });
      reset();
      setSelectedCoachIds([]);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save group"),
  });

  const toggleCoach = (coachId: string) => {
    setSelectedCoachIds((prev) =>
      prev.includes(coachId) ? prev.filter((id) => id !== coachId) : [...prev, coachId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Group" : "Create Group"}</DialogTitle>
          <DialogDescription>
            {editing ? `Editing "${editing.name}"` : "Set up a new training group."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input id="name" placeholder="e.g. Beginners A" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Monthly Fee */}
          <div className="space-y-2">
            <Label htmlFor="monthly_fee">Monthly Fee (TND) *</Label>
            <Input
              id="monthly_fee"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("monthly_fee")}
            />
            {errors.monthly_fee && (
              <p className="text-sm text-destructive">{errors.monthly_fee.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe this group..."
              {...register("description")}
              className="min-h-[70px]"
            />
          </div>

          {/* Coach Assignment */}
          <div className="space-y-2">
            <Label>
              Coaches{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            {coaches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No coaches found. Add coaches first.</p>
            ) : (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {coaches.map((coach) => (
                  <label
                    key={coach.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedCoachIds.includes(coach.id)}
                      onCheckedChange={() => toggleCoach(coach.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{coach.full_name}</p>
                      {coach.branch && (
                        <p className="text-xs text-muted-foreground capitalize">{coach.branch}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AddGroup = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Group[];
    },
  });

  // Fetch all coach assignments for all groups
  const { data: allGroupCoaches = [] } = useQuery({
    queryKey: ["group_coaches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_coaches")
        .select("*, coach:profiles(*)")
        .order("assigned_at");
      if (error) throw error;
      return data as GroupCoach[];
    },
  });

  // Fetch player counts per group
  const { data: players = [] } = useQuery({
    queryKey: ["profiles", "players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, group_id")
        .eq("role", "player");
      if (error) throw error;
      return data as { id: string; group_id: string | null }[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Group deleted");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: () => toast.error("Failed to delete group"),
  });

  const openCreate = () => {
    setEditingGroup(null);
    setModalOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setModalOpen(true);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can manage groups.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Groups</h1>
          <p className="text-muted-foreground mt-1">
            Manage training groups, assign coaches, and set monthly fees.
          </p>
        </div>
        <Button variant="gold" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Groups grid */}
      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20">
          <UsersRound className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">No groups yet</h3>
          <p className="text-muted-foreground mb-4">Create your first training group to get started.</p>
          <Button variant="gold" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.map((group) => {
            const coaches = allGroupCoaches.filter((gc) => gc.group_id === group.id);
            const playerCount = players.filter((p) => p.group_id === group.id).length;

            return (
              <Card key={group.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{group.name}</CardTitle>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(group)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Group</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>{group.name}</strong>?
                              Players assigned to this group will be unassigned. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(group.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3 flex-1">
                  {/* Monthly fee */}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gold shrink-0" />
                    <span className="font-semibold text-gold">
                      {formatCurrency(group.monthly_fee)}
                    </span>
                    <span className="text-muted-foreground">/ month</span>
                  </div>

                  {/* Player count */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>
                      {playerCount} {playerCount === 1 ? "player" : "players"}
                    </span>
                  </div>

                  {/* Description */}
                  {group.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {group.description}
                    </p>
                  )}

                  {/* Coaches */}
                  {coaches.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t">
                      {coaches.map((gc) => (
                        <Badge key={gc.id} variant="secondary" className="text-xs">
                          {(gc.coach as Profile)?.full_name ?? "—"}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-auto pt-2 border-t">
                      No coaches assigned
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GroupFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGroup(null);
        }}
        editing={editingGroup}
      />
    </DashboardLayout>
  );
};

export default AddGroup;
