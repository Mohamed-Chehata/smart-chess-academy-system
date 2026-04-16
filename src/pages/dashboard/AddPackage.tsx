import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus, Package as PackageIcon, Pencil, Trash2, Users, CalendarRange,
  Loader2, DollarSign,
} from "lucide-react";
import type { Package, Profile, StudentPackage } from "@/types";

// ─── Zod schema ───────────────────────────────────────────────────────────────
const packageSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z
    .string()
    .min(1, "Price is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Price must be a positive number",
    }),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  description: z.string().optional(),
}).refine((d) => d.end_date >= d.start_date, {
  message: "End date must be on or after start date",
  path: ["end_date"],
});

type PackageFormValues = z.infer<typeof packageSchema>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

// ─── Package Form Modal ───────────────────────────────────────────────────────
interface PackageFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: Package | null;
}

const PackageFormModal = ({ open, onClose, editing }: PackageFormModalProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: editing?.name ?? "",
      price: editing ? String(editing.price) : "",
      start_date: editing?.start_date ?? "",
      end_date: editing?.end_date ?? "",
      description: editing?.description ?? "",
    },
  });

  // Sync form when editing target changes
  useState(() => {
    reset({
      name: editing?.name ?? "",
      price: editing ? String(editing.price) : "",
      start_date: editing?.start_date ?? "",
      end_date: editing?.end_date ?? "",
      description: editing?.description ?? "",
    });
  });

  const saveMutation = useMutation({
    mutationFn: async (values: PackageFormValues) => {
      const payload = {
        name: values.name,
        price: parseFloat(values.price),
        start_date: values.start_date,
        end_date: values.end_date,
        description: values.description || null,
      };
      if (editing) {
        const { error } = await supabase.from("packages").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("packages").insert({
          ...payload,
          created_by: profile?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Package updated" : "Package created");
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save package"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Package" : "Create Package"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this package's details." : "Create a new subscription package."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Package Name</Label>
            <Input id="name" placeholder="e.g. Summer Package" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (TND)</Label>
            <Input id="price" type="number" step="0.01" min="0.01" placeholder="0.00" {...register("price")} />
            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" {...register("end_date")} />
              {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea id="description" placeholder="Package details..." {...register("description")} className="min-h-[70px]" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="gold" disabled={isSubmitting || saveMutation.isPending}>
              {(isSubmitting || saveMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Update Package" : "Create Package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Assign Students Modal ────────────────────────────────────────────────────
interface AssignStudentsModalProps {
  open: boolean;
  onClose: () => void;
  pkg: Package;
}

const AssignStudentsModal = ({ open, onClose, pkg }: AssignStudentsModalProps) => {
  const queryClient = useQueryClient();

  const { data: players = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("role", "player").order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["student_packages", pkg.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_packages")
        .select("*, package:packages(*)")
        .eq("is_active", true);
      if (error) throw error;
      return data as StudentPackage[];
    },
    enabled: open,
  });

  // Students currently assigned to THIS package
  const assignedToThisPkg = new Set(
    assignments.filter((a) => a.package_id === pkg.id).map((a) => a.student_id)
  );
  // Students assigned to a DIFFERENT active package
  const assignedToOtherPkg = new Map(
    assignments
      .filter((a) => a.package_id !== pkg.id)
      .map((a) => [a.student_id, a.package as Package])
  );

  const toggleMutation = useMutation({
    mutationFn: async ({ studentId, assign }: { studentId: string; assign: boolean }) => {
      if (assign) {
        // Deactivate any existing active package for this student first
        await supabase
          .from("student_packages")
          .update({ is_active: false })
          .eq("student_id", studentId)
          .eq("is_active", true);
        // Assign new
        const { error } = await supabase.from("student_packages").insert({
          student_id: studentId,
          package_id: pkg.id,
          is_active: true,
        });
        if (error) throw error;
      } else {
        // Remove assignment
        const { error } = await supabase
          .from("student_packages")
          .update({ is_active: false })
          .eq("student_id", studentId)
          .eq("package_id", pkg.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_packages"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update assignment"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Students — {pkg.name}</DialogTitle>
          <DialogDescription>
            Toggle which players are enrolled in this package. Each student can have only one active package.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {players.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No players found.</p>
          )}
          {players.map((player) => {
            const isAssigned = assignedToThisPkg.has(player.id);
            const otherPkg = assignedToOtherPkg.get(player.id);
            return (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg border p-3 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ studentId: player.id, assign: !!checked })
                    }
                    disabled={toggleMutation.isPending}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{player.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {player.level} · {player.branch}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {isAssigned && (
                    <Badge variant="default" className="text-xs">Enrolled</Badge>
                  )}
                  {!isAssigned && otherPkg && (
                    <Badge variant="secondary" className="text-xs max-w-[120px] truncate">
                      {otherPkg.name}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AddPackage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [assignModalPkg, setAssignModalPkg] = useState<Package | null>(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Package[];
    },
  });

  // Count students per package
  const { data: allAssignments = [] } = useQuery({
    queryKey: ["student_packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_packages")
        .select("package_id, student_id")
        .eq("is_active", true);
      if (error) throw error;
      return data as { package_id: string; student_id: string }[];
    },
  });

  const studentCountByPackage = allAssignments.reduce<Record<string, number>>((acc, a) => {
    acc[a.package_id] = (acc[a.package_id] ?? 0) + 1;
    return acc;
  }, {});

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Package deleted");
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      queryClient.invalidateQueries({ queryKey: ["student_packages"] });
    },
    onError: () => toast.error("Failed to delete package"),
  });

  const openCreate = () => {
    setEditingPackage(null);
    setFormModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormModalOpen(true);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can manage packages.</p>
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
          <h1 className="text-3xl font-display font-bold text-foreground">Packages</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage subscription packages. Assign them to students.
          </p>
        </div>
        <Button variant="gold" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Package
        </Button>
      </div>

      {/* Package list */}
      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading packages...</div>
      ) : packages.length === 0 ? (
        <div className="text-center py-20">
          <PackageIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">No packages yet.</p>
          <Button variant="gold" className="mt-4" onClick={openCreate}>
            Create your first package
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const studentCount = studentCountByPackage[pkg.id] ?? 0;
            const now = new Date().toISOString().split("T")[0];
            const isActive = pkg.start_date <= now && pkg.end_date >= now;

            return (
              <Card key={pkg.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{pkg.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(pkg)}
                        className="text-muted-foreground hover:text-foreground h-8 w-8"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Package</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete "{pkg.name}"? This will unassign all enrolled students. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(pkg.id)}
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

                <CardContent className="space-y-3">
                  {/* Price */}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gold shrink-0" />
                    <span className="font-semibold text-foreground">{formatCurrency(pkg.price)}</span>
                  </div>

                  {/* Date range */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarRange className="w-4 h-4 shrink-0" />
                    <span>
                      {format(parseISO(pkg.start_date), "dd MMM yyyy")} →{" "}
                      {format(parseISO(pkg.end_date), "dd MMM yyyy")}
                    </span>
                  </div>

                  {/* Students */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{studentCount} student{studentCount !== 1 ? "s" : ""} enrolled</span>
                  </div>

                  {/* Description */}
                  {pkg.description && (
                    <CardDescription className="text-xs line-clamp-2">
                      {pkg.description}
                    </CardDescription>
                  )}

                  {/* Assign button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setAssignModalPkg(pkg)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Students
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <PackageFormModal
        open={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingPackage(null); }}
        editing={editingPackage}
      />

      {assignModalPkg && (
        <AssignStudentsModal
          open={!!assignModalPkg}
          onClose={() => setAssignModalPkg(null)}
          pkg={assignModalPkg}
        />
      )}
    </DashboardLayout>
  );
};

export default AddPackage;
