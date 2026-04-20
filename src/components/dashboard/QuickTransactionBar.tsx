import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Zap, Plus, X, Pencil, Check } from "lucide-react";
import {
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, TRANSACTION_CATEGORY_LABELS,
} from "@/constants/enums";
import type { TransactionType, TransactionCategory } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TxTemplate {
  id: string;
  name: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
}

const STORAGE_KEY = "chess-tx-templates";

const loadTemplates = (): TxTemplate[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
};

const saveTemplates = (list: TxTemplate[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

// ─── Mini form schema ─────────────────────────────────────────────────────────
const templateSchema = z.object({
  name: z.string().min(1, "Name required"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Category required"),
  amount: z
    .string()
    .min(1, "Amount required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Must be positive"),
  description: z.string().optional(),
});
type TemplateFormValues = z.infer<typeof templateSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  /** Called when the user clicks a template chip — open TransactionModal with this data */
  onUse: (tpl: TxTemplate) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
const QuickTransactionBar = ({ onUse }: Props) => {
  const [templates, setTemplates] = useState<TxTemplate[]>(loadTemplates);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const persist = (list: TxTemplate[]) => {
    setTemplates(list);
    saveTemplates(list);
  };

  // ── Add / edit form ────────────────────────────────────────────────────────
  const {
    register, handleSubmit, control, reset, watch,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", type: "expense", category: "", amount: "", description: "" },
  });

  const selectedType = watch("type") as TransactionType;
  const availableCats = selectedType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const openAddForm = () => {
    setEditingId(null);
    reset({ name: "", type: "expense", category: "", amount: "", description: "" });
    setShowForm(true);
  };

  const openEditForm = (tpl: TxTemplate) => {
    setEditingId(tpl.id);
    reset({
      name: tpl.name,
      type: tpl.type,
      category: tpl.category,
      amount: String(tpl.amount),
      description: tpl.description,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const onSubmit = (values: TemplateFormValues) => {
    if (editingId) {
      persist(
        templates.map((t) =>
          t.id === editingId
            ? { ...t, ...values, amount: parseFloat(values.amount), category: values.category as TransactionCategory }
            : t
        )
      );
    } else {
      const newTpl: TxTemplate = {
        id: crypto.randomUUID(),
        name: values.name,
        type: values.type,
        category: values.category as TransactionCategory,
        amount: parseFloat(values.amount),
        description: values.description ?? "",
      };
      persist([...templates, newTpl]);
    }
    cancelForm();
  };

  const deleteTemplate = (id: string) => {
    persist(templates.filter((t) => t.id !== id));
    if (editingId === id) cancelForm();
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-gold" />
            Quick Add
          </CardTitle>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={openAddForm}>
            <Plus className="w-3.5 h-3.5" />
            New template
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Template chips ─────────────────────────────────────────────── */}
        {templates.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">
            No templates yet. Click <span className="font-medium">New template</span> to save a recurring transaction.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`group flex items-center gap-2 rounded-full px-3 py-1.5 border text-sm font-medium cursor-pointer transition-all
                  ${tpl.type === "income"
                    ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-red-300 bg-red-50 text-destructive hover:bg-red-100"
                  }`}
                onClick={() => onUse(tpl)}
                title="Click to quick-add this transaction"
              >
                <span>{tpl.name}</span>
                <span className="opacity-60 text-xs">{tpl.amount} TND</span>

                {/* Edit */}
                <button
                  onClick={(e) => { e.stopPropagation(); openEditForm(tpl); }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ml-1"
                  title="Edit template"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  title="Delete template"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Add / edit form ────────────────────────────────────────────── */}
        {showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="border border-border rounded-xl p-4 space-y-4 bg-muted/30"
          >
            <p className="text-sm font-medium text-foreground">
              {editingId ? "Edit template" : "New template"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input placeholder="e.g. Hatem privé" {...register("name")} className="h-8 text-sm" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <Label className="text-xs">Default amount (TND) *</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0.00" {...register("amount")} className="h-8 text-sm" />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>

              {/* Type */}
              <div className="space-y-1">
                <Label className="text-xs">Type *</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      {(["income", "expense"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => field.onChange(t)}
                          className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all capitalize ${
                            field.value === t
                              ? t === "income"
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-destructive bg-destructive/10 text-destructive"
                              : "border-border text-muted-foreground hover:border-foreground/30"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <Label className="text-xs">Category *</Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCats.map((c) => (
                          <SelectItem key={c} value={c} className="text-sm">
                            {TRANSACTION_CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Default description <span className="text-muted-foreground">(optional)</span></Label>
                <Input placeholder="e.g. cours particulier" {...register("description")} className="h-8 text-sm" />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={cancelForm}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button type="submit" variant="gold" size="sm" className="h-8">
                <Check className="w-3.5 h-3.5 mr-1" /> {editingId ? "Save changes" : "Save template"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickTransactionBar;
