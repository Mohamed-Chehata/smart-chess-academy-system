import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format, startOfMonth, endOfMonth, isWithinInterval,
  parseISO, subMonths, addMonths, isSameMonth,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TransactionModal from "@/components/dashboard/TransactionModal";
import TransferModal from "@/components/dashboard/TransferModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  Plus, ChevronLeft, ChevronRight, Search, Wallet,
  CreditCard, Banknote, Pencil, Trash2, TrendingUp,
  ArrowRightLeft, Landmark, CalendarDays,
} from "lucide-react";
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  ACCOUNT_LABELS,
} from "@/constants/enums";
import MemberPaymentsSection from "@/components/dashboard/MemberPaymentsSection";
import GroupPaymentsSection from "@/components/dashboard/GroupPaymentsSection";
import QuickTransactionBar, { type TxTemplate } from "@/components/dashboard/QuickTransactionBar";
import { useBranch } from "@/contexts/BranchContext";
import type { Transaction, TransactionCategory } from "@/types";

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

function getDefaultDate(viewedMonth: Date): string {
  const today = new Date();
  if (isSameMonth(viewedMonth, today)) return format(today, "yyyy-MM-dd");
  return format(startOfMonth(viewedMonth), "yyyy-MM-dd");
}

/** Bar-chart data for the last 6 months — transfers excluded */
function buildChartData(transactions: Transaction[]) {
  const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
  return months.map((month) => {
    const interval = { start: startOfMonth(month), end: endOfMonth(month) };
    const inMonth = transactions.filter((t) =>
      isWithinInterval(parseISO(t.date), interval)
    );
    return {
      name: format(month, "MMM yy"),
      Income:   inMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      Expenses: inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });
}

/** Caisse balance: income − expenses − transfers_out_of_caisse + transfers_into_caisse */
function calcCaisseBalance(txns: Transaction[]): number {
  return txns.reduce((s, t) => {
    if (t.type === "income") return s + t.amount;
    if (t.type === "expense") return s - t.amount;
    if (t.type === "transfer") {
      if (t.from_account === "caisse") return s - t.amount;
      if (t.to_account === "caisse")   return s + t.amount;
    }
    return s;
  }, 0);
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  amount: number;
  context: string;
  icon: React.ReactNode;
  accentClass: string;   // e.g. "border-l-primary"
  amountClass?: string;  // override text colour for negative balance
}

function StatCard({ title, amount, context, icon, accentClass, amountClass }: StatCardProps) {
  return (
    <Card className={`border-l-4 ${accentClass}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="pt-0">
        <p className={`text-2xl font-bold tracking-tight ${amountClass ?? ""}`}>
          {formatCurrency(amount)}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">{context}</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Finances = () => {
  const { isAdmin, isAssistant } = useAuth();
  const { activeBranch } = useBranch();
  const queryClient = useQueryClient();

  const [modalOpen,          setModalOpen]          = useState(false);
  const [transferOpen,       setTransferOpen]       = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [quickPrefill,       setQuickPrefill]       = useState<TxTemplate | null>(null);
  const [searchTerm,         setSearchTerm]         = useState("");
  const [typeFilter,         setTypeFilter]         = useState<string>("all");
  const [categoryFilter,     setCategoryFilter]     = useState<string>("all");
  const [currentMonth,       setCurrentMonth]       = useState(() => new Date());

  // ── Scroll-position persistence ────────────────────────────────────────────
  const SCROLL_KEY = "finances-scroll-y";
  const didRestoreRef = useRef(false);

  useEffect(() => {
    if (!didRestoreRef.current) {
      didRestoreRef.current = true;
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) {
        requestAnimationFrame(() =>
          window.scrollTo({ top: parseInt(saved), behavior: "instant" as ScrollBehavior })
        );
      }
    }
    const onScroll = () =>
      sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", activeBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("branch", activeBranch)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("student_payments").delete().eq("transaction_id", id);
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transaction deleted");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
    },
    onError: () => toast.error("Failed to delete transaction"),
  });

  // ── Access guard ───────────────────────────────────────────────────────────
  if (!isAdmin && !isAssistant) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const monthInterval = { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };

  const monthTransactions = transactions.filter((t) =>
    isWithinInterval(parseISO(t.date), monthInterval)
  );

  const monthlyIncome    = monthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses  = monthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const caisseBalance    = calcCaisseBalance(transactions);
  const monthlyCashDeposits = monthTransactions
    .filter((t) => t.type === "transfer" && t.from_account === "caisse")
    .reduce((s, t) => s + t.amount, 0);

  const chartData = buildChartData(transactions);

  const filtered = monthTransactions.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.from_account && ACCOUNT_LABELS[t.from_account]?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.to_account   && ACCOUNT_LABELS[t.to_account]?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType     = typeFilter     === "all" || t.type     === typeFilter;
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openAdd          = () => { setEditingTransaction(null); setQuickPrefill(null); setModalOpen(true); };
  const openEdit         = (t: Transaction) => { setEditingTransaction(t); setQuickPrefill(null); setModalOpen(true); };
  const openFromTemplate = (tpl: TxTemplate) => { setEditingTransaction(null); setQuickPrefill(tpl); setModalOpen(true); };

  const monthLabel = format(currentMonth, "MMMM yyyy");

  return (
    <DashboardLayout>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Finances</h1>
          <p className="text-muted-foreground mt-1.5">
            Track income, expenses, and transfers across the academy.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transfer Money
          </Button>
          <Button variant="gold" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          OVERVIEW — stat cards + chart
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard
          title="Income"
          amount={monthlyIncome}
          context={monthLabel}
          icon={<Banknote className="w-4 h-4 text-primary" />}
          accentClass="border-l-primary"
        />
        <StatCard
          title="Expenses"
          amount={monthlyExpenses}
          context={monthLabel}
          icon={<CreditCard className="w-4 h-4 text-destructive" />}
          accentClass="border-l-destructive"
        />
        <StatCard
          title="Cash Balance"
          amount={caisseBalance}
          context="All-time caisse"
          icon={<Wallet className="w-4 h-4 text-gold" />}
          accentClass="border-l-gold"
          amountClass={caisseBalance < 0 ? "text-destructive" : ""}
        />
        <StatCard
          title="Cash Deposits"
          amount={monthlyCashDeposits}
          context={`Transferred from caisse · ${monthLabel}`}
          icon={<Landmark className="w-4 h-4 text-blue-500" />}
          accentClass="border-l-blue-500"
        />
      </div>

      {/* 6-month chart */}
      <Card className="mb-12">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <TrendingUp className="w-4 h-4" />
            6-Month Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} width={64} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Bar dataKey="Income"   fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          MONTHLY SECTION — single month navigator governs everything below
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-base font-semibold text-foreground leading-tight">
              {monthLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              Transactions · Group payments · Member dues
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[128px] text-center px-3 py-1.5 rounded-md bg-muted">
            {monthLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Add templates */}
      <div className="mb-5">
        <QuickTransactionBar onUse={openFromTemplate} activeBranch={activeBranch} />
      </div>

      {/* ── Transaction list ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-semibold">Transactions</CardTitle>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">{TRANSACTION_TYPE_LABELS.income}</SelectItem>
                  <SelectItem value="expense">{TRANSACTION_TYPE_LABELS.expense}</SelectItem>
                  <SelectItem value="transfer">{TRANSACTION_TYPE_LABELS.transfer}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {TRANSACTION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {TRANSACTION_CATEGORY_LABELS[c as TransactionCategory]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-0 pb-0">
          {isLoading ? (
            <p className="text-center py-16 text-muted-foreground text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground text-sm">
              No transactions for this period.
            </p>
          ) : (
            /* Single table with sticky thead inside a scrollable div */
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[420px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow>
                      <TableHead className="pl-6">Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category / Accounts</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id} className="group">
                        <TableCell className="pl-6 text-sm text-muted-foreground whitespace-nowrap">
                          {format(parseISO(t.date), "dd/MM/yyyy")}
                        </TableCell>

                        <TableCell>
                          {t.type === "transfer" ? (
                            <Badge variant="outline" className="border-blue-400 text-blue-600 gap-1 text-xs">
                              <ArrowRightLeft className="w-3 h-3" />
                              Transfer
                            </Badge>
                          ) : (
                            <Badge
                              variant={t.type === "income" ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {TRANSACTION_TYPE_LABELS[t.type]}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-sm">
                          {t.type === "transfer" ? (
                            <span className="text-muted-foreground">
                              {ACCOUNT_LABELS[t.from_account ?? ""] ?? t.from_account}
                              {" → "}
                              {ACCOUNT_LABELS[t.to_account ?? ""] ?? t.to_account}
                            </span>
                          ) : t.category ? (
                            TRANSACTION_CATEGORY_LABELS[t.category]
                          ) : "—"}
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {t.description || "—"}
                        </TableCell>

                        <TableCell className={`text-right font-semibold tabular-nums ${
                          t.type === "income"   ? "text-green-600"
                          : t.type === "expense" ? "text-destructive"
                          : "text-blue-600"
                        }`}>
                          {t.type === "income"  ? `+${formatCurrency(t.amount)}`
                           : t.type === "expense" ? `-${formatCurrency(t.amount)}`
                           : formatCurrency(t.amount)}
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {t.type !== "transfer" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(t)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(t.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Group & member payment trackers ──────────────────────────────── */}
      <div className="space-y-6">
        <GroupPaymentsSection currentMonth={currentMonth} activeBranch={activeBranch} />
        <MemberPaymentsSection currentMonth={currentMonth} activeBranch={activeBranch} />
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTransaction(null); setQuickPrefill(null); }}
        transaction={editingTransaction}
        prefill={quickPrefill}
        defaultDate={getDefaultDate(currentMonth)}
        activeBranch={activeBranch}
      />

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        activeBranch={activeBranch}
      />

    </DashboardLayout>
  );
};

export default Finances;
