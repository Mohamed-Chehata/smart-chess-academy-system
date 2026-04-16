import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, addMonths, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Package as PackageIcon } from "lucide-react";
import type { Profile, StudentPayment, StudentPackage } from "@/types";

const PAYMENT_FREQUENCY_LABELS = {
  monthly: "Monthly",
  weekly: "Weekly",
  package: "Package",
} as const;

const markPaidSchema = z.object({
  payment_frequency: z.enum(["monthly", "weekly", "package"], {
    required_error: "Please select a payment type",
  }),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Amount must be a positive number",
    }),
  notes: z.string().optional(),
});

type MarkPaidFormValues = z.infer<typeof markPaidSchema>;

interface MarkPaidModalProps {
  open: boolean;
  onClose: () => void;
  student: Profile;
  billingPeriod: Date;          // the current month the Finance page is showing
  existingPayment: StudentPayment | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

const MarkPaidModal = ({
  open, onClose, student, billingPeriod, existingPayment,
}: MarkPaidModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const billingPeriodStr = format(startOfMonth(billingPeriod), "yyyy-MM-dd");

  // Fetch this student's active package (if any)
  const { data: activeAssignment } = useQuery({
    queryKey: ["student_packages", "active", student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_packages")
        .select("*, package:packages(*)")
        .eq("student_id", student.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as StudentPackage | null;
    },
    enabled: open,
  });

  const activePackage = activeAssignment?.package ?? null;

  const {
    register, handleSubmit, control, reset, setValue, formState: { errors },
  } = useForm<MarkPaidFormValues>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      payment_frequency: existingPayment?.payment_frequency ?? (activePackage ? "package" : "monthly"),
      amount: existingPayment ? String(existingPayment.amount) : (activePackage ? String(activePackage.price) : ""),
      notes: existingPayment?.notes ?? "",
    },
  });

  // Re-seed defaults when modal opens or context changes
  useEffect(() => {
    if (!open) return;
    reset({
      payment_frequency: existingPayment?.payment_frequency ?? (activePackage ? "package" : "monthly"),
      amount: existingPayment
        ? String(existingPayment.amount)
        : activePackage
        ? String(activePackage.price)
        : "",
      notes: existingPayment?.notes ?? "",
    });
  }, [open, existingPayment, activePackage, reset]);

  const markPaidMutation = useMutation({
    mutationFn: async (values: MarkPaidFormValues) => {
      const amount = parseFloat(values.amount);
      const today = new Date().toISOString().split("T")[0];
      const paidAt = new Date().toISOString();
      const isPackage = values.payment_frequency === "package" && activePackage;

      // 1. Create one transaction
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user!.id,
          date: today,
          type: "income",
          category: "frais_inscription",
          amount,
          description: values.notes || null,
        })
        .select("id")
        .single();

      if (txError) throw txError;

      // 2. Determine which billing periods to mark paid
      const billingPeriods: string[] = [];

      if (isPackage) {
        // All months covered by the package
        let cursor = startOfMonth(parseISO(activePackage.start_date));
        const last = startOfMonth(parseISO(activePackage.end_date));
        while (cursor <= last) {
          billingPeriods.push(format(cursor, "yyyy-MM-dd"));
          cursor = addMonths(cursor, 1);
        }
      } else {
        billingPeriods.push(billingPeriodStr);
      }

      // 3. Upsert one student_payment per billing period
      for (const period of billingPeriods) {
        const { error: spError } = await supabase.from("student_payments").upsert(
          {
            student_id: student.id,
            billing_period: period,
            payment_frequency: values.payment_frequency,
            amount,
            is_paid: true,
            paid_at: paidAt,
            transaction_id: txData.id,
            package_id: isPackage ? activePackage.id : null,
            notes: values.notes || null,
          },
          { onConflict: "student_id,billing_period" }
        );

        if (spError) {
          // Rollback: delete the transaction and any payments already inserted
          await supabase.from("student_payments").delete().eq("transaction_id", txData.id);
          await supabase.from("transactions").delete().eq("id", txData.id);
          throw spError;
        }
      }
    },
    onSuccess: () => {
      toast.success(`${student.full_name} marked as paid`);
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to mark as paid"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>
            Recording payment for <strong>{student.full_name}</strong> —{" "}
            {format(billingPeriod, "MMMM yyyy")}
          </DialogDescription>
        </DialogHeader>

        {/* Active package info */}
        {activePackage && (
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <PackageIcon className="w-5 h-5 text-gold shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{activePackage.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(activePackage.price)} ·{" "}
                {format(new Date(activePackage.start_date), "dd MMM")} –{" "}
                {format(new Date(activePackage.end_date), "dd MMM yyyy")}
              </p>
            </div>
            <Badge variant="default" className="ml-auto shrink-0">Active package</Badge>
          </div>
        )}

        <form
          onSubmit={handleSubmit((v) => markPaidMutation.mutate(v))}
          className="space-y-4"
        >
          {/* Payment frequency */}
          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Controller
              name="payment_frequency"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  {(["monthly", "weekly", "package"] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => {
                        field.onChange(freq);
                        // Pre-fill price when switching to package
                        if (freq === "package" && activePackage) {
                          setValue("amount", String(activePackage.price));
                        }
                      }}
                      disabled={freq === "package" && !activePackage}
                      className={`rounded-lg border-2 py-2 px-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        field.value === freq
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {PAYMENT_FREQUENCY_LABELS[freq]}
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.payment_frequency && (
              <p className="text-sm text-destructive">{errors.payment_frequency.message}</p>
            )}
            {!activePackage && (
              <p className="text-xs text-muted-foreground">
                Assign a package to this student to use the Package option.
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (TND)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Add a note..."
              {...register("notes")}
              className="min-h-[60px]"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="gold" disabled={markPaidMutation.isPending}>
              {markPaidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MarkPaidModal;
