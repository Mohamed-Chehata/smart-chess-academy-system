import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/constants/enums";
import type { Transaction, TransactionType } from "@/types";

const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: z.enum(["income", "expense"], { required_error: "Please select a type" }),
  category: z.enum(
    [
      "frais_inscription", "loyer", "salaire_coach", "materiel",
      "cotisation", "fournitures", "transport", "evenement", "autres",
    ],
    { required_error: "Please select a category" }
  ),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Amount must be a positive number",
    }),
  description: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  /** Pass an existing transaction to edit; omit for create mode */
  transaction?: Transaction | null;
  /**
   * Pre-fill the date field (YYYY-MM-DD).
   * Defaults to today when not provided.
   * Pass the first day of the viewed month so navigating to a past month
   * and hitting "Add Transaction" pre-selects that month.
   */
  defaultDate?: string;
}

const TransactionModal = ({
  open,
  onClose,
  transaction,
  defaultDate,
}: TransactionModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!transaction;

  const todayOrDefault = defaultDate ?? new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: todayOrDefault,
      type: undefined,
      category: undefined,
      amount: "",
      description: "",
    },
  });

  // Watch type so we can reset category and show the right options
  const selectedType = useWatch({ control, name: "type" }) as TransactionType | undefined;

  // Reset form whenever the modal opens / target transaction changes
  useEffect(() => {
    if (!open) return;
    if (transaction) {
      reset({
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        amount: String(transaction.amount),
        description: transaction.description ?? "",
      });
    } else {
      reset({
        date: todayOrDefault,
        type: undefined,
        category: undefined,
        amount: "",
        description: "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction, open]);

  // When type changes (in create mode) reset the category so an incompatible
  // value from a previous selection isn't silently submitted
  const handleTypeChange = (value: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(value);
    setValue("category", undefined as never);
  };

  const availableCategories =
    selectedType === "income"
      ? INCOME_CATEGORIES
      : selectedType === "expense"
      ? EXPENSE_CATEGORIES
      : [];

  const saveMutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      const payload = {
        date: values.date,
        type: values.type,
        category: values.category,
        amount: parseFloat(values.amount),
        description: values.description || null,
      };

      if (isEditing && transaction) {
        const { error } = await supabase
          .from("transactions")
          .update(payload)
          .eq("id", transaction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("transactions")
          .insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Transaction updated" : "Transaction added");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save transaction");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of this transaction."
              : "Record a new income or expense for the academy."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4 pt-2">

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Step 1 — Type (required first) */}
          <div className="space-y-2">
            <Label>
              Type <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {(["income", "expense"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(t, field.onChange)}
                      className={`rounded-lg border-2 py-3 px-4 text-sm font-medium transition-all ${
                        field.value === t
                          ? t === "income"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-destructive bg-destructive/10 text-destructive"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {TRANSACTION_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Step 2 — Category (only shown once type is selected) */}
          {selectedType && (
            <div className="space-y-2">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {TRANSACTION_CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>
          )}

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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Add a note..."
              {...register("description")}
              className="min-h-[70px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Update"
              ) : (
                "Add Transaction"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionModal;
