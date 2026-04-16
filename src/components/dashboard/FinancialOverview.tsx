import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, CreditCard, Banknote, Loader2 } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

const FinancialOverview = () => {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", "summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("type, amount, date");
      if (error) throw error;
      return data as { type: string; amount: number; date: string }[];
    },
  });

  const now = new Date();
  const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };

  const thisMonth = transactions.filter((t) =>
    isWithinInterval(parseISO(t.date), monthInterval)
  );

  const monthlyExpenses = thisMonth
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyIncome = thisMonth
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = transactions.reduce(
    (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
    0
  );

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-4">Financial Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Expenses this month */}
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses This Month
            </CardTitle>
            <CreditCard className="w-5 h-5 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(monthlyExpenses)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Current month</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Cash balance */}
        <Card className="border-l-4 border-l-gold">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Balance
            </CardTitle>
            <Wallet className="w-5 h-5 text-gold" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-foreground" : "text-destructive"}`}>
                  {formatCurrency(netBalance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All-time balance</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Income this month */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income This Month
            </CardTitle>
            <Banknote className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(monthlyIncome)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Current month</p>
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default FinancialOverview;
