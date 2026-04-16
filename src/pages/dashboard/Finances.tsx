import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format, startOfMonth, endOfMonth, isWithinInterval,
  parseISO, subMonths, addMonths, isSameMonth,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TransactionModal from "@/components/dashboard/TransactionModal";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  Plus, ChevronLeft, ChevronRight, Search, Wallet,
  CreditCard, Banknote, Pencil, Trash2, TrendingUp,
} from "lucide-react";
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/constants/enums";
import MemberPaymentsSection from "@/components/dashboard/MemberPaymentsSection";
import type { Transaction, TransactionCategory } from "@/types";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

/** Returns a YYYY-MM-DD string for the "Add Transaction" default date.
 *  - Current month → today's date
 *  - Any other month → 1st of that month
 */
function getDefaultDate(viewedMonth: Date): string {
  const today = new Date();
  if (isSameMonth(viewedMonth, today)) {
    return format(today, "yyyy-MM-dd");
  }
  return format(startOfMonth(viewedMonth), "yyyy-MM-dd");
}

/** Build bar-chart data for the last 6 months */
function buildChartData(transactions: Transaction[]) {
  const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
  return months.map((month) => {
    const interval = { start: startOfMonth(month), end: endOfMonth(month) };
    const inMonth = transactions.filter((t) =>
      isWithinInterval(parseISO(t.date), interval)
    );
    return {
      name: format(month, "MMM yy"),
      Income: inMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      Expenses: inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });
}

const Finances = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Remove linked student_payment records first (un-marks students as paid)
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

  if (!isAdmin) {
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
  const monthInterval = {
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  };

  const monthTransactions = transactions.filter((t) =>
    isWithinInterval(parseISO(t.date), monthInterval)
  );

  const monthlyIncome = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const monthlyExpenses = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const netBalance = transactions.reduce(
    (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
    0
  );

  const chartData = buildChartData(transactions);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = monthTransactions.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const openAdd = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setModalOpen(true);
  };

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Finances</h1>
          <p className="text-muted-foreground mt-1">
            Track income and expenses across the academy.
          </p>
        </div>
        <Button variant="gold" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income — {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <Banknote className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(monthlyIncome)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses — {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <CreditCard className="w-5 h-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(monthlyExpenses)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gold">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance (all-time)
            </CardTitle>
            <Wallet className="w-5 h-5 text-gold" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? "" : "text-destructive"}`}>
              {formatCurrency(netBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 6-month bar chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-gold" />
            Last 6 Months Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} TND`} width={80} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transaction list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-base">Transactions</CardTitle>
            {/* Month navigator */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium w-32 text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">{TRANSACTION_TYPE_LABELS.income}</SelectItem>
                <SelectItem value="expense">{TRANSACTION_TYPE_LABELS.expense}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 h-9">
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
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(parseISO(t.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={t.type === "income" ? "default" : "destructive"}
                        >
                          {TRANSACTION_TYPE_LABELS[t.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {TRANSACTION_CATEGORY_LABELS[t.category]}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {t.description || "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          t.type === "income" ? "text-green-600" : "text-destructive"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(t)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this transaction? This action cannot be undone.
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
          )}
        </CardContent>
      </Card>

      {/* Member payments for the viewed month */}
      <div className="mt-8">
        <MemberPaymentsSection currentMonth={currentMonth} />
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        defaultDate={getDefaultDate(currentMonth)}
      />
    </DashboardLayout>
  );
};

export default Finances;
