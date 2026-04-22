import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import { format } from "date-fns";
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
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { ACCOUNTS, ACCOUNT_LABELS } from "@/constants/enums";
import type { Branch } from "@/types";

// ─── Zod schema ───────────────────────────────────────────────────────────────
const transferSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    from_account: z.enum(ACCOUNTS, { required_error: "Select source account" }),
    to_account: z.enum(ACCOUNTS, { required_error: "Select destination account" }),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
        message: "Amount must be positive",
      }),
    description: z.string().optional(),
  })
  .refine((d) => d.from_account !== d.to_account, {
    message: "Source and destination must be different",
    path: ["to_account"],
  });

type TransferFormValues = z.infer<typeof transferSchema>;

// ─── PDF generator ────────────────────────────────────────────────────────────
function downloadTransferPDF(data: {
  id: string;
  date: string;
  amount: number;
  from_account: string;
  to_account: string;
  description?: string;
  branch: string;
}) {
  // eslint-disable-next-line new-cap
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(n);

  /* ── Header ── */
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Transfer Receipt", pageW / 2, 28, { align: "center" });

  doc.setLineWidth(0.6);
  doc.setDrawColor(180, 150, 60); // gold-ish
  doc.line(20, 34, pageW - 20, 34);

  /* ── Helper to render a labelled row ── */
  const row = (label: string, value: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), 22, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(value, 22, y + 7);
  };

  let y = 46;
  const gap = 20;

  row("Date", format(new Date(data.date), "dd/MM/yyyy"), y);
  y += gap;
  row(
    "Branch",
    data.branch.charAt(0).toUpperCase() + data.branch.slice(1),
    y
  );
  y += gap;
  row("From", ACCOUNT_LABELS[data.from_account] ?? data.from_account, y);
  y += gap;
  row("To", ACCOUNT_LABELS[data.to_account] ?? data.to_account, y);
  y += gap;

  /* ── Amount — prominent block ── */
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("AMOUNT", 22, y);
  y += 8;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(fmt(data.amount), 22, y);
  y += gap;

  if (data.description) {
    row("Description", data.description, y);
    y += gap;
  }

  row("Transaction ID", data.id, y);
  y += gap;

  /* ── Footer ── */
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y + 4, pageW - 20, y + 4);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Smart Chess Academy — Internal Transfer Document",
    pageW / 2,
    y + 11,
    { align: "center" }
  );

  doc.save(`transfer-${data.id.slice(0, 8)}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────────────
interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  activeBranch: Branch;
}

const TransferModal = ({ open, onClose, activeBranch }: TransferModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: todayStr,
      from_account: undefined,
      to_account: undefined,
      amount: "",
      description: "",
    },
  });

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      reset({
        date: new Date().toISOString().split("T")[0],
        from_account: undefined,
        to_account: undefined,
        amount: "",
        description: "",
      });
    }
  }, [open, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: TransferFormValues) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user!.id,
          branch: activeBranch,
          date: values.date,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: "transfer" as any,
          category: null,
          amount: parseFloat(values.amount),
          description: values.description || null,
          from_account: values.from_account,
          to_account: values.to_account,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { ...values, id: data.id };
    },
    onSuccess: (result) => {
      toast.success("Transfer recorded");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Auto-download the PDF receipt
      downloadTransferPDF({
        id: result.id,
        date: result.date,
        amount: parseFloat(result.amount),
        from_account: result.from_account,
        to_account: result.to_account,
        description: result.description,
        branch: activeBranch,
      });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record transfer");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-gold" />
            Transfer Money
          </DialogTitle>
          <DialogDescription>
            Move funds between accounts. A PDF receipt is downloaded automatically on
            success.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="tf-date">Date</Label>
            <Input id="tf-date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* From / To */}
          <div className="grid grid-cols-2 gap-4">
            {/* From */}
            <div className="space-y-2">
              <Label>
                From <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="from_account"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNTS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {ACCOUNT_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.from_account && (
                <p className="text-sm text-destructive">
                  {errors.from_account.message}
                </p>
              )}
            </div>

            {/* To */}
            <div className="space-y-2">
              <Label>
                To <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="to_account"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNTS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {ACCOUNT_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.to_account && (
                <p className="text-sm text-destructive">
                  {errors.to_account.message}
                </p>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="tf-amount">
              Amount (TND) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tf-amount"
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
            <Label htmlFor="tf-desc">
              Description{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="tf-desc"
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
                  Processing…
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transfer & Download PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;
