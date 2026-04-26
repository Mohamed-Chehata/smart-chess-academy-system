import { useState, useEffect, useRef, useMemo } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  Plus, ChevronLeft, ChevronRight, Search, Wallet,
  CreditCard, Banknote, Pencil, Trash2, TrendingUp,
  ArrowRightLeft, Landmark, LayoutDashboard, Receipt, Users,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLOURS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#14b8a6",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(n);

function getDefaultDate(viewedMonth: Date): string {
  const today = new Date();
  if (isSameMonth(viewedMonth, today)) return format(today, "yyyy-MM-dd");
  return format(startOfMonth(viewedMonth), "yyyy-MM-dd");
}

function buildChartData(transactions: Transaction[]) {
  const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
  return months.map((month) => {
    const iv = { start: startOfMonth(month), end: endOfMonth(month) };
    const inM = transactions.filter((t) => isWithinInterval(parseISO(t.date), iv));
    return {
      name: format(month, "MMM yy"),
      Income:   inM.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      Expenses: inM.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });
}

function calcCaisseBalance(txns: Transaction[]): number {
  return txns.reduce((s, t) => {
    if (t.type === "income")   return s + t.amount;
    if (t.type === "expense")  return s - t.amount;
    if (t.type === "transfer") {
      if (t.from_account === "caisse") return s - t.amount;
      if (t.to_account   === "caisse") return s + t.amount;
    }
    return s;
  }, 0);
}

// ─── Shared stat card ─────────────────────────────────────────────────────────

function StatCard({
  title, amount, context, icon, accent, negative = false,
}: {
  title: string; amount: number; context: string;
  icon: React.ReactNode; accent: string; negative?: boolean;
}) {
  return (
    <Card className={`border-l-4 ${accent}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="pt-0">
        <p className={`text-2xl font-bold tracking-tight ${negative ? "text-destructive" : ""}`}>
          {formatCurrency(amount)}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">{context}</p>
      </CardContent>
    </Card>
  );
}

// ─── Month navigator ──────────────────────────────────────────────────────────

function MonthNav({
  month, onChange,
}: {
  month: Date; onChange: (m: Date) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="icon" className="h-8 w-8"
        onClick={() => onChange(subMonths(month, 1))}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="min-w-[128px] text-center text-sm font-semibold px-3 py-1.5 rounded-md bg-muted">
        {format(month, "MMMM yyyy")}
      </span>
      <Button variant="outline" size="icon" className="h-8 w-8"
        onClick={() => onChange(addMonths(month, 1))}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Finances = () => {
  const { isAdmin, isAssistant } = useAuth();
  const { activeBranch } = useBranch();
  const queryClient = useQueryClient();

  // ── Tab state (persisted) ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("finances-tab") ?? "overview"
  );
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    sessionStorage.setItem("finances-tab", tab);
  };

  // ── Modal / form state ────────────────────────────────────────────────────
  const [modalOpen,          setModalOpen]          = useState(false);
  const [transferOpen,       setTransferOpen]       = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [quickPrefill,       setQuickPrefill]       = useState<TxTemplate | null>(null);

  // ── Shared month (Transactions + Payments tabs stay in sync) ──────────────
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  // ── Filter state (Transactions tab) ───────────────────────────────────────
  const [searchTerm,     setSearchTerm]     = useState("");
  const [typeFilter,     setTypeFilter]     = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // ── Scroll persistence ────────────────────────────────────────────────────
  const SCROLL_KEY = "finances-scroll-y";
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (!didRestoreRef.current) {
      didRestoreRef.current = true;
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) requestAnimationFrame(() =>
        window.scrollTo({ top: parseInt(saved), behavior: "instant" as ScrollBehavior })
      );
    }
    const onScroll = () =>
      sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", activeBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions").select("*")
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

  // ── Access guard ──────────────────────────────────────────────────────────
  if (!isAdmin && !isAssistant) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh] text-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only administrators can access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── All-time derived (Overview tab) ───────────────────────────────────────
  const totalIncome   = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const caisseBalance = calcCaisseBalance(transactions);
  const chartData     = buildChartData(transactions);

  // Category breakdown for Overview (all-time expenses)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const expensesByCategory = useMemo(() =>
    TRANSACTION_CATEGORIES
      .map((cat) => ({
        name:  TRANSACTION_CATEGORY_LABELS[cat as TransactionCategory],
        value: transactions
          .filter((t) => t.type === "expense" && t.category === cat)
          .reduce((s, t) => s + t.amount, 0),
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value),
  [transactions]);

  // ── Monthly derived (Transactions + Payments tabs) ────────────────────────
  const monthInterval    = { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };
  const monthTransactions = transactions.filter((t) =>
    isWithinInterval(parseISO(t.date), monthInterval)
  );
  const monthlyIncome        = monthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses      = monthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthlyCashDeposits  = monthTransactions
    .filter((t) => t.type === "transfer" && t.from_account === "caisse")
    .reduce((s, t) => s + t.amount, 0);

  const filtered = monthTransactions.filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      t.description?.toLowerCase().includes(q) ||
      (t.from_account && ACCOUNT_LABELS[t.from_account]?.toLowerCase().includes(q)) ||
      (t.to_account   && ACCOUNT_LABELS[t.to_account]?.toLowerCase().includes(q));
    return matchSearch
      && (typeFilter     === "all" || t.type     === typeFilter)
      && (categoryFilter === "all" || t.category === categoryFilter);
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd          = () => { setEditingTransaction(null); setQuickPrefill(null); setModalOpen(true); };
  const openEdit         = (t: Transaction) => { setEditingTransaction(t); setQuickPrefill(null); setModalOpen(true); };
  const openFromTemplate = (tpl: TxTemplate) => { setEditingTransaction(null); setQuickPrefill(tpl); setModalOpen(true); };

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <DashboardLayout>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Finances</h1>
          <p className="text-muted-foreground mt-1.5">
            Overview, transactions, and monthly payment tracking.
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

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>

        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <Receipt className="w-4 h-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <Users className="w-4 h-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1 — OVERVIEW
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">

          {/* All-time stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              title="Total Income"
              amount={totalIncome}
              context="All-time"
              icon={<Banknote className="w-4 h-4 text-primary" />}
              accent="border-l-primary"
            />
            <StatCard
              title="Total Expenses"
              amount={totalExpenses}
              context="All-time"
              icon={<CreditCard className="w-4 h-4 text-destructive" />}
              accent="border-l-destructive"
            />
            <StatCard
              title="Cash Balance"
              amount={caisseBalance}
              context="Net caisse balance"
              icon={<Wallet className="w-4 h-4 text-gold" />}
              accent="border-l-gold"
              negative={caisseBalance < 0}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 6-month income vs expenses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4" />
                  6-Month Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={60} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ paddingTop: 12 }} />
                    <Bar dataKey="Income"   fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense breakdown by category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <CreditCard className="w-4 h-4" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {expensesByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    No expenses recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {expensesByCategory.map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="w-28 text-xs text-right text-muted-foreground truncate shrink-0">
                          {cat.name}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0}%`,
                              backgroundColor: CATEGORY_COLOURS[i % CATEGORY_COLOURS.length],
                            }}
                          />
                        </div>
                        <span className="w-24 text-xs font-semibold text-right shrink-0 tabular-nums">
                          {formatCurrency(cat.value)}
                        </span>
                        <span className="w-9 text-xs text-muted-foreground text-right shrink-0">
                          {totalExpenses > 0 ? Math.round((cat.value / totalExpenses) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — TRANSACTIONS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="transactions" className="space-y-5">

          {/* Month navigator + monthly stat cards */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="grid grid-cols-3 gap-4 flex-1">
              <StatCard
                title="Income"
                amount={monthlyIncome}
                context={format(currentMonth, "MMMM yyyy")}
                icon={<Banknote className="w-4 h-4 text-primary" />}
                accent="border-l-primary"
              />
              <StatCard
                title="Expenses"
                amount={monthlyExpenses}
                context={format(currentMonth, "MMMM yyyy")}
                icon={<CreditCard className="w-4 h-4 text-destructive" />}
                accent="border-l-destructive"
              />
              <StatCard
                title="Deposits"
                amount={monthlyCashDeposits}
                context="From caisse"
                icon={<Landmark className="w-4 h-4 text-blue-500" />}
                accent="border-l-blue-500"
              />
            </div>
            <MonthNav month={currentMonth} onChange={setCurrentMonth} />
          </div>

          {/* Quick Add templates */}
          <QuickTransactionBar onUse={openFromTemplate} activeBranch={activeBranch} />

          {/* Transaction list */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base font-semibold">
                  Transactions — {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
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
                <p className="text-center py-16 text-sm text-muted-foreground">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-center py-16 text-sm text-muted-foreground">
                  No transactions for this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="overflow-y-auto max-h-[460px]">
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
                                <Badge variant={t.type === "income" ? "default" : "destructive"} className="text-xs">
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
                              ) : t.category ? TRANSACTION_CATEGORY_LABELS[t.category] : "—"}
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                              {t.description || "—"}
                            </TableCell>

                            <TableCell className={`text-right font-semibold tabular-nums ${
                              t.type === "income"   ? "text-green-600"
                              : t.type === "expense" ? "text-destructive"
                              : "text-blue-600"
                            }`}>
                              {t.type === "income"   ? `+${formatCurrency(t.amount)}`
                               : t.type === "expense" ? `-${formatCurrency(t.amount)}`
                               : formatCurrency(t.amount)}
                            </TableCell>

                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {t.type !== "transfer" && (
                                  <Button variant="ghost" size="icon"
                                    onClick={() => openEdit(t)}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive">
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
                                        className="bg-destructive hover:bg-destructive/90">
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
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3 — PAYMENTS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="payments" className="space-y-6">

          {/* Month navigator — prominent, shared with Transactions tab */}
          <div className="flex items-center justify-between pb-5 border-b border-border">
            <div>
              <p className="text-base font-semibold text-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Group collection and individual member dues
              </p>
            </div>
            <MonthNav month={currentMonth} onChange={setCurrentMonth} />
          </div>

          <GroupPaymentsSection currentMonth={currentMonth} activeBranch={activeBranch} />
          <MemberPaymentsSection currentMonth={currentMonth} activeBranch={activeBranch} />
        </TabsContent>

      </Tabs>

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
