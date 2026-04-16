import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Profile } from "@/types";

const editMemberSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone_number: z.string().optional(),
  branch: z.enum(["tunis", "sousse"]).optional(),
  fide_id: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  parent_name: z.string().optional(),
  address: z.string().optional(),
  memo: z.string().optional(),
});

type EditMemberFormValues = z.infer<typeof editMemberSchema>;

interface EditMemberModalProps {
  member: Profile | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  isAdmin: boolean;
}

const EditMemberModal = ({ member, open, onClose, onUpdated }: EditMemberModalProps) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
  });

  useEffect(() => {
    if (member) {
      reset({
        full_name: member.full_name ?? "",
        phone_number: member.phone_number ?? "",
        branch: member.branch ?? undefined,
        fide_id: member.fide_id ?? "",
        level: member.level ?? undefined,
        parent_name: member.parent_name ?? "",
        address: member.address ?? "",
        memo: member.memo ?? "",
      });
    }
  }, [member, reset]);

  const onSubmit = async (values: EditMemberFormValues) => {
    if (!member) return;

    const updateData: Record<string, unknown> = {
      full_name: values.full_name,
      phone_number: values.phone_number || null,
      branch: values.branch || null,
      fide_id: values.fide_id || null,
      parent_name: values.parent_name || null,
      address: values.address || null,
      memo: values.memo || null,
    };

    if (member.role === "player") {
      updateData.level = values.level || null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", member.user_id);

    if (error) {
      toast.error(error.message || "Failed to update member");
      return;
    }

    toast.success("Member updated successfully");
    onUpdated();
    onClose();
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update {member.full_name}'s profile information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (read-only)</Label>
            <Input
              id="email"
              value={member.email}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              type="tel"
              placeholder="+216 XX XXX XXX"
              {...register("phone_number")}
            />
          </div>

          <div className="space-y-2">
            <Label>Branch</Label>
            <Controller
              name="branch"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="fide_id">FIDE ID</Label>
            <Input
              id="fide_id"
              placeholder="e.g., 12345678"
              {...register("fide_id")}
            />
          </div>

          {member.role === "player" && (
            <>
              <div className="space-y-2">
                <Label>Player Level</Label>
                <Controller
                  name="level"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="parent_name">Parent Name</Label>
                <Input
                  id="parent_name"
                  placeholder="Parent/Guardian name"
                  {...register("parent_name")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Home address"
                  {...register("address")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="memo">Memo / Notes</Label>
                <Textarea
                  id="memo"
                  placeholder="Any additional notes..."
                  {...register("memo")}
                  className="min-h-[80px]"
                />
              </div>
            </>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberModal;
