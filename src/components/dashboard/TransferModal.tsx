import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import { format } from "date-fns";
// Vite resolves this to the hashed asset URL at build time
import logoUrl from "@/assets/logo.png";
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

// ─── PDF helpers ──────────────────────────────────────────────────────────────

/**
 * Load a logo PNG and return a base64 data URL with the black background
 * replaced by transparency so it renders cleanly on the white PDF page.
 */
async function logoToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // Make near-black pixels transparent so the logo shows on white PDF
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < id.data.length; i += 4) {
        const [r, g, b] = [id.data[i], id.data[i + 1], id.data[i + 2]];
        if (r < 50 && g < 50 && b < 50) id.data[i + 3] = 0;
      }
      ctx.putImageData(id, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Format a TND amount the Tunisian way: 3 decimal places, comma as separator */
const dtFmt = (n: number) => n.toFixed(3).replace(".", ",");

// ─── Invoice PDF generator ────────────────────────────────────────────────────
async function downloadInvoicePDF(args: {
  invoiceNumber: string;
  date: string;          // "dd-MM-yyyy"
  designation: string;   // text shown in DESIGNATION cell
  amountTTC: number;     // total TTC amount in TND
  branch: string;
}) {
  const { invoiceNumber, date, designation, amountTTC, branch } = args;

  const logoBase64 = await logoToBase64(logoUrl);

  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;

  // Palette
  const GOLD: [number, number, number] = [213, 169, 28];
  const DARK: [number, number, number] = [22, 22, 22];
  const HDR_BG: [number, number, number] = [208, 215, 224]; // blue-ish gray like the original

  // ── Amount math ─────────────────────────────────────────────────────────────
  const TIMBRE = 1.0;
  const ht  = Math.round(((amountTTC - TIMBRE) / 1.19) * 1000) / 1000;
  const tva = Math.round((amountTTC - TIMBRE - ht) * 1000) / 1000;

  // ════════════════════════════════════════════════════════════════════════════
  // TOP HEADER
  // ════════════════════════════════════════════════════════════════════════════

  /* Gold bars */
  doc.setFillColor(...GOLD);
  doc.rect(9,  5, 63, 15, "F"); // left
  doc.rect(138, 5, 63, 15, "F"); // right

  /* Logo (chess knight, transparent bg) */
  doc.addImage(logoBase64, "PNG", 83, 1, 44, 29);

  /* Academy name */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("SMART CHESS ACADEMY", W / 2, 34, { align: "center" });

  /* Thin ornamental rule under name */
  doc.setFontSize(7);
  doc.text("- - - - - ◈ - - - - -", W / 2, 38, { align: "center" });

  /* Full-width separator line */
  doc.setLineWidth(0.35);
  doc.setDrawColor(160, 160, 160);
  doc.line(15, 42, W - 15, 42);

  // ════════════════════════════════════════════════════════════════════════════
  // ADDRESS + IDENTIFIANT
  // ════════════════════════════════════════════════════════════════════════════

  /* Address box with border */
  doc.setLineWidth(0.6);
  doc.setDrawColor(...DARK);
  doc.rect(12, 45, 80, 27);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ADRESSE", 15, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (branch === "sousse") {
    doc.text("IMMEUBLE BEN HAMMOUDA", 15, 59);
    doc.text("SAHLOUL 4 SOUSSE", 15, 65);
  } else {
    // Tunis address — update if you have the exact address
    doc.text("TUNIS", 15, 59);
  }

  /* Identifiant (right side, no box) */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("IDENTIFIANT:", 132, 52);
  doc.text("1923368XAM000", 132, 59);

  // ════════════════════════════════════════════════════════════════════════════
  // FACTURE N° + DATE
  // ════════════════════════════════════════════════════════════════════════════

  /* Rounded rectangle */
  doc.setLineWidth(1.1);
  doc.setDrawColor(...DARK);
  doc.roundedRect(58, 78, 94, 16, 5, 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text(`FACTURE N°${invoiceNumber}`, W / 2, 89, { align: "center" });

  /* Date */
  doc.setFontSize(13);
  doc.text(`DATE : ${date}`, W / 2, 103, { align: "center" });

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN TABLE (3 columns)
  // ════════════════════════════════════════════════════════════════════════════

  const TBX = 12;
  const TBY = 112;
  const TBW = W - 24;   // 186 mm
  const HDR_H = 15;     // header row height
  const ROW_H = 44;     // data row height
  const C1 = 90;        // DESIGNATION width
  const C2 = 48;        // Montant H.T width
  const C3 = TBW - C1 - C2; // MONTANT NET width (48)

  /* Header background */
  doc.setFillColor(...HDR_BG);
  doc.rect(TBX, TBY, TBW, HDR_H, "F");

  /* Outer border */
  doc.setLineWidth(0.5);
  doc.setDrawColor(...DARK);
  doc.rect(TBX, TBY, TBW, HDR_H + ROW_H);

  /* Header / data separator */
  doc.line(TBX, TBY + HDR_H, TBX + TBW, TBY + HDR_H);

  /* Column dividers (full height) */
  doc.line(TBX + C1,      TBY, TBX + C1,      TBY + HDR_H + ROW_H);
  doc.line(TBX + C1 + C2, TBY, TBX + C1 + C2, TBY + HDR_H + ROW_H);

  /* Header labels */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DESIGNATION",  TBX + C1 / 2,              TBY + 10, { align: "center" });
  doc.text("Montant H.T",  TBX + C1 + C2 / 2,         TBY + 10, { align: "center" });
  doc.text("MONTANT NET",  TBX + C1 + C2 + C3 / 2,    TBY + 10, { align: "center" });

  /* Designation text (wrapped) */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const desLines = doc.splitTextToSize(designation, C1 - 6);
  doc.text(desLines, TBX + 4, TBY + HDR_H + 12);

  /* HT and NET amounts — bold, vertically centered in data row */
  const midRow = TBY + HDR_H + ROW_H / 2 + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(dtFmt(ht),       TBX + C1 + C2 / 2,      midRow, { align: "center" });
  doc.text(dtFmt(amountTTC), TBX + C1 + C2 + C3 / 2, midRow, { align: "center" });

  // ════════════════════════════════════════════════════════════════════════════
  // BOTTOM SECTION — signature (left) + totals (right)
  // ════════════════════════════════════════════════════════════════════════════

  const BOT_Y = TBY + HDR_H + ROW_H + 22; // ~193 mm

  /* ── Signature box ── */
  const SIG_X = 12;
  const SIG_W = 82;
  const SIG_H = 62;

  doc.setLineWidth(0.5);
  doc.setDrawColor(...DARK);
  doc.rect(SIG_X, BOT_Y, SIG_W, SIG_H);

  /* Narrow inner rectangle at top (like the original) */
  doc.rect(SIG_X + 1, BOT_Y + 1, SIG_W - 2, 11);

  /* "SIGNATURE ET CACHET" label */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(
    "SIGNATURE ET CACHET",
    SIG_X + SIG_W / 2,
    BOT_Y + SIG_H / 2 + 6,
    { align: "center" }
  );

  /* ── Totals table ── */
  const TOT_X   = 110;
  const TOT_Y   = BOT_Y;
  const LBL_W   = 48;
  const VAL_W   = 48;
  const T_ROW_H = 16;

  const totals = [
    { label: "TOTAL H.T",     value: dtFmt(ht)        },
    { label: "TVA 19%",       value: dtFmt(tva)       },
    { label: "TIMBRE FISCAL", value: dtFmt(TIMBRE)    },
    { label: "TOTAL T.T.C",   value: dtFmt(amountTTC) },
  ];

  totals.forEach(({ label, value }, i) => {
    const ry = TOT_Y + i * T_ROW_H;

    /* Label cell — gray background */
    doc.setFillColor(...HDR_BG);
    doc.rect(TOT_X, ry, LBL_W, T_ROW_H, "F");

    /* Value cell — white */
    doc.setFillColor(255, 255, 255);
    doc.rect(TOT_X + LBL_W, ry, VAL_W, T_ROW_H, "F");

    /* Cell borders */
    doc.setLineWidth(0.4);
    doc.setDrawColor(...DARK);
    doc.rect(TOT_X, ry, LBL_W + VAL_W, T_ROW_H);
    doc.line(TOT_X + LBL_W, ry, TOT_X + LBL_W, ry + T_ROW_H);

    /* Label text */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(label, TOT_X + LBL_W / 2, ry + T_ROW_H / 2 + 3, { align: "center" });

    /* Value text */
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(value, TOT_X + LBL_W + VAL_W / 2, ry + T_ROW_H / 2 + 3.5, { align: "center" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // BOTTOM GOLD BAR
  // ════════════════════════════════════════════════════════════════════════════

  doc.setFillColor(...GOLD);
  doc.rect(0, H - 17, W, 17, "F");

  // Save
  doc.save(`facture-${invoiceNumber}.pdf`);
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

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      from_account: undefined,
      to_account: undefined,
      amount: "",
      description: "",
    },
  });

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

      // Build invoice number: e.g. "S4-A3B2"
      const d = new Date(result.date);
      const bInit = activeBranch.charAt(0).toUpperCase();
      const month = String(d.getMonth() + 1);
      const shortId = result.id.replace(/-/g, "").slice(0, 4).toUpperCase();
      const invoiceNumber = `${bInit}${month}-${shortId}`;

      // Designation line
      const fromLabel = ACCOUNT_LABELS[result.from_account] ?? result.from_account;
      const toLabel   = ACCOUNT_LABELS[result.to_account]   ?? result.to_account;
      const designation = result.description
        ? `${fromLabel} → ${toLabel}\n${result.description}`
        : `${fromLabel} → ${toLabel}`;

      // Generate and auto-download the invoice PDF
      downloadInvoicePDF({
        invoiceNumber,
        date: format(new Date(result.date), "dd-MM-yyyy"),
        designation,
        amountTTC: parseFloat(result.amount),
        branch: activeBranch,
      }).catch((err) => {
        console.error("PDF generation failed:", err);
        toast.error("Could not generate PDF receipt");
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
            Move funds between accounts. A PDF invoice is downloaded automatically on
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
              step="0.001"
              min="0.001"
              placeholder="0.000"
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
                  Transfer & Download Invoice
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
