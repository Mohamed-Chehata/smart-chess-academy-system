import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  UserPlus, Mail, User, MapPin, Award,
  TrendingUp, ExternalLink, Phone, Home, Users, FileText,
} from "lucide-react";

const playerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().optional().refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { message: "Invalid email address" }
  ),
  branch: z.enum(["tunis", "sousse"], { required_error: "Please select a branch" }),
  level: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select a level",
  }),
  fideId: z.string().optional(),
  phoneNumber: z.string().optional(),
  parentName: z.string().optional(),
  address: z.string().optional(),
  memo: z.string().optional(),
});

type PlayerFormValues = z.infer<typeof playerSchema>;

const AddPlayer = () => {
  const { isAdmin, isCoach, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      branch: undefined,
      level: undefined,
      fideId: "",
      phoneNumber: "",
      parentName: "",
      address: "",
      memo: "",
    },
  });

  const fideIdValue = watch("fideId");

  const createPlayerMutation = useMutation({
    mutationFn: async (values: PlayerFormValues) => {
      const { error } = await supabase.from("profiles").insert({
        user_id: crypto.randomUUID(),
        email: values.email || "",
        full_name: values.fullName,
        role: "player",
        branch: values.branch,
        level: values.level,
        fide_id: values.fideId || null,
        phone_number: values.phoneNumber || null,
        parent_name: values.parentName || null,
        address: values.address || null,
        memo: values.memo || null,
        created_by: profile?.id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Player added successfully!");
      reset();
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add player");
    },
  });

  if (!isAdmin && !isCoach) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators and coaches can access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Add New Player</h1>
          <p className="text-muted-foreground mt-2">
            Register a new player at the academy.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-gold" />
              Player Details
            </CardTitle>
            <CardDescription>
              Enter the player's information to add them to the academy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((values) => createPlayerMutation.mutate(values))}
              className="space-y-6"
            >
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Enter player's full name"
                    {...register("fullName")}
                    className="pl-10"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    {...register("email")}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Branch + Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Controller
                      name="branch"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tunis">Tunis Branch</SelectItem>
                            <SelectItem value="sousse">Sousse Branch</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {errors.branch && (
                    <p className="text-sm text-destructive">{errors.branch.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Player Level *</Label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Controller
                      name="level"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {errors.level && (
                    <p className="text-sm text-destructive">{errors.level.message}</p>
                  )}
                </div>
              </div>

              {/* Optional Fields */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Optional Information</h3>

                <div className="space-y-4">
                  {/* FIDE ID */}
                  <div className="space-y-2">
                    <Label htmlFor="fideId">FIDE ID</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="fideId"
                          placeholder="e.g., 12345678"
                          {...register("fideId")}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          fideIdValue &&
                          window.open(`https://ratings.fide.com/profile/${fideIdValue}`, "_blank")
                        }
                        disabled={!fideIdValue}
                        className="shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Verify
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="phoneNumber"
                          type="tel"
                          placeholder="+216 XX XXX XXX"
                          {...register("phoneNumber")}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parentName">Parent Name</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="parentName"
                          placeholder="Parent/Guardian name"
                          {...register("parentName")}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="address"
                        placeholder="Home address"
                        {...register("address")}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="memo">Memo / Notes</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Textarea
                        id="memo"
                        placeholder="Any additional notes about the player..."
                        {...register("memo")}
                        className="pl-10 min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  className="flex-1"
                  disabled={createPlayerMutation.isPending}
                >
                  {createPlayerMutation.isPending ? "Adding..." : "Add Player"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddPlayer;
