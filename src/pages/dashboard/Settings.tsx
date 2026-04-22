import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  User, Lock, Users, MapPin, Mail, Phone,
  Plus, Trash2, Loader2, ShieldCheck, Eye, EyeOff,
} from "lucide-react";
import type { Profile, Branch } from "@/types";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone_number: z.string().optional(),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const assistantSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type ProfileFormValues    = z.infer<typeof profileSchema>;
type PasswordFormValues   = z.infer<typeof passwordSchema>;
type AssistantFormValues  = z.infer<typeof assistantSchema>;

// ─── Sub-component: assistant creation form ───────────────────────────────────
function AddAssistantForm({
  branch,
  onDone,
}: {
  branch: Branch;
  onDone: () => void;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [showPw, setShowPw] = useState(false);

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<AssistantFormValues>({
    resolver: zodResolver(assistantSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (values: AssistantFormValues) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            fullName: values.full_name,
            role: "assistant",
            branch,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create assistant");
      return result;
    },
    onSuccess: () => {
      toast.success("Assistant account created");
      queryClient.invalidateQueries({ queryKey: ["profiles", "assistants"] });
      reset();
      onDone();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => createMutation.mutate(v))}
      className="border border-border rounded-xl p-4 space-y-3 bg-muted/30 mt-3"
    >
      <p className="text-sm font-medium text-foreground capitalize">
        New {branch} assistant
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Name */}
        <div className="space-y-1">
          <Label className="text-xs">Full Name *</Label>
          <Input
            placeholder="Assistant's name"
            {...register("full_name")}
            className="h-9 text-sm"
          />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1">
          <Label className="text-xs">Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="assistant@example.com"
              {...register("email")}
              className="h-9 text-sm pl-8"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Password *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Min. 6 characters"
              {...register("password")}
              className="h-9 text-sm pl-8 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="gold" size="sm" className="h-8" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Creating…</>
          ) : (
            "Create account"
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Sub-component: one branch assistant panel ────────────────────────────────
function BranchAssistantPanel({
  branch,
  assistants,
  onDelete,
  deleteLoading,
}: {
  branch: Branch;
  assistants: Profile[];
  onDelete: (id: string, name: string) => void;
  deleteLoading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const branchLabel = branch === "tunis" ? "Tunis" : "Sousse";
  const branchColor = branch === "tunis"
    ? "bg-blue-50 border-blue-200 text-blue-700"
    : "bg-purple-50 border-purple-200 text-purple-700";

  return (
    <div className="space-y-3">
      {/* Branch header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{branchLabel} Branch</span>
          <Badge variant="outline" className={`text-xs capitalize ${branchColor}`}>
            {assistants.length} assistant{assistants.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add assistant
          </Button>
        )}
      </div>

      {/* Existing assistants list */}
      {assistants.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
          No assistants yet for the {branchLabel} branch.
        </p>
      ) : (
        <div className="space-y-2">
          {assistants.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-border p-3 bg-background"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    disabled={deleteLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke Assistant Access</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove <strong>{a.full_name}</strong>'s profile and immediately
                      revoke their access to the system. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(a.id, a.full_name)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Revoke Access
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {/* Inline creation form */}
      {showForm && (
        <AddAssistantForm branch={branch} onDone={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
const SettingsPage = () => {
  const { profile, isAdmin, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ── Profile form ─────────────────────────────────────────────────────────
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: profileDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? "",
      phone_number: profile?.phone_number ?? "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          phone_number: values.phone_number || null,
        })
        .eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      refreshProfile();
    },
    onError: () => toast.error("Failed to update profile"),
  });

  // ── Password form ─────────────────────────────────────────────────────────
  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      resetPw();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to change password"),
  });

  // ── Assistants query ──────────────────────────────────────────────────────
  const { data: assistants = [], isLoading: assistantsLoading } = useQuery({
    queryKey: ["profiles", "assistants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "assistant")
        .order("branch")
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  // ── Delete assistant ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      toast.success("Assistant access revoked");
      queryClient.setQueryData<Profile[]>(["profiles", "assistants"], (old) =>
        (old ?? []).filter((a) => a.id !== id)
      );
    },
    onError: () => toast.error("Failed to revoke access"),
  });

  const tunisAssistants  = assistants.filter((a) => a.branch === "tunis");
  const sousseAssistants = assistants.filter((a) => a.branch === "sousse");

  // Guard — only admin (owner) can access this page
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <ShieldCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only the academy owner can access settings.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and branch assistants.
          </p>
        </div>

        <div className="space-y-6">

          {/* ── My Account ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-5 h-5 text-gold" />
                My Account
              </CardTitle>
              <CardDescription>Update your display name, phone number, and password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Profile info */}
              <form
                onSubmit={handleProfileSubmit((v) => updateProfileMutation.mutate(v))}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-2">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email (cannot be changed here)</p>
                    <p className="text-sm font-medium">{profile?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="full_name"
                        placeholder="Your full name"
                        {...registerProfile("full_name")}
                        className="pl-9"
                      />
                    </div>
                    {profileErrors.full_name && (
                      <p className="text-sm text-destructive">{profileErrors.full_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone_number"
                        type="tel"
                        placeholder="+216 XX XXX XXX"
                        {...registerProfile("phone_number")}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="gold"
                    disabled={!profileDirty || updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                    ) : "Save Profile"}
                  </Button>
                </div>
              </form>

              <Separator />

              {/* Change password */}
              <form
                onSubmit={handlePwSubmit((v) => changePasswordMutation.mutate(v))}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Change Password</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPw ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        {...registerPw("newPassword")}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwErrors.newPassword && (
                      <p className="text-sm text-destructive">{pwErrors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPw ? "text" : "password"}
                        placeholder="Repeat new password"
                        {...registerPw("confirmPassword")}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwErrors.confirmPassword && (
                      <p className="text-sm text-destructive">{pwErrors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing…</>
                    ) : "Change Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ── Branch Assistants ───────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-gold" />
                Branch Assistants
              </CardTitle>
              <CardDescription>
                Create login accounts for your assistants. Each assistant has full access to their
                assigned branch — players, finances, groups and attendance — but cannot see the
                other branch's data or access Settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assistantsLoading ? (
                <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading assistants…</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Tunis */}
                  <BranchAssistantPanel
                    branch="tunis"
                    assistants={tunisAssistants}
                    onDelete={(id, name) => deleteMutation.mutate(id, {
                      onSuccess: () => toast.success(`${name}'s access revoked`),
                    })}
                    deleteLoading={deleteMutation.isPending}
                  />

                  <Separator />

                  {/* Sousse */}
                  <BranchAssistantPanel
                    branch="sousse"
                    assistants={sousseAssistants}
                    onDelete={(id, name) => deleteMutation.mutate(id, {
                      onSuccess: () => toast.success(`${name}'s access revoked`),
                    })}
                    deleteLoading={deleteMutation.isPending}
                  />
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
