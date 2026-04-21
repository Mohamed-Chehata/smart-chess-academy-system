import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { UsersRound, TrendingUp } from "lucide-react";
import type { Group, Profile, StudentPayment, Branch } from "@/types";

const GROUP_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#14b8a6",
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

interface Props {
  currentMonth: Date;
  activeBranch: Branch;
}

const GroupPaymentsSection = ({ currentMonth, activeBranch }: Props) => {
  const billingPeriodStr = format(startOfMonth(currentMonth), "yyyy-MM-dd");

  // Which groups are visible in the chart (empty = all)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilter = () => setSelectedIds(new Set());

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["groups", activeBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("branch", activeBranch)
        .order("name");
      if (error) throw error;
      return data as Group[];
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ["profiles", "players", activeBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "player")
        .eq("branch", activeBranch)
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  // All student_payment records — invalidated whenever MarkPaidModal saves
  const { data: allPayments = [] } = useQuery({
    queryKey: ["student_payments", "group_tracker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_payments")
        .select("student_id, billing_period, amount");
      if (error) throw error;
      return data as Pick<StudentPayment, "student_id" | "billing_period" | "amount">[];
    },
  });

  // ── Derived ──────────────────────────────────────────────────────────────────

  const playerGroupMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p.group_id])),
    [players]
  );

  // Groups that have at least one player
  const activeGroups = useMemo(
    () => groups.filter((g) => players.some((p) => p.group_id === g.id)),
    [groups, players]
  );

  // Groups shown in the CHART (all when nothing selected, otherwise the chosen ones)
  const visibleGroups = useMemo(
    () =>
      selectedIds.size === 0
        ? activeGroups
        : activeGroups.filter((g) => selectedIds.has(g.id)),
    [activeGroups, selectedIds]
  );

  // Per-group stats for the currently viewed month (always shows ALL groups in table)
  const groupStats = useMemo(() => {
    return activeGroups.map((group) => {
      const groupPlayers = players.filter((p) => p.group_id === group.id);
      const monthPaid = allPayments.filter(
        (p) =>
          p.billing_period === billingPeriodStr &&
          playerGroupMap[p.student_id] === group.id
      );
      const paidCount = monthPaid.length;
      const collected = monthPaid.reduce((s, p) => s + p.amount, 0);
      const expected = groupPlayers.length * group.monthly_fee;
      const pct =
        groupPlayers.length > 0
          ? Math.round((paidCount / groupPlayers.length) * 100)
          : 0;
      return { group, playerCount: groupPlayers.length, paidCount, unpaidCount: groupPlayers.length - paidCount, collected, expected, pct };
    });
  }, [activeGroups, players, allPayments, billingPeriodStr, playerGroupMap]);

  // Stacked bar chart: last 6 months × visibleGroups only
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    return months.map((month) => {
      const periodStr = format(startOfMonth(month), "yyyy-MM-dd");
      const entry: Record<string, string | number> = { name: format(month, "MMM yy") };
      visibleGroups.forEach((group) => {
        const ids = new Set(players.filter((p) => p.group_id === group.id).map((p) => p.id));
        entry[group.name] = allPayments
          .filter((p) => p.billing_period === periodStr && ids.has(p.student_id))
          .reduce((s, p) => s + p.amount, 0);
      });
      return entry;
    });
  }, [visibleGroups, players, allPayments]);

  if (groupsLoading || activeGroups.length === 0) return null;

  const totalPlayers   = groupStats.reduce((s, g) => s + g.playerCount, 0);
  const totalPaid      = groupStats.reduce((s, g) => s + g.paidCount, 0);
  const totalUnpaid    = groupStats.reduce((s, g) => s + g.unpaidCount, 0);
  const totalCollected = groupStats.reduce((s, g) => s + g.collected, 0);
  const totalExpected  = groupStats.reduce((s, g) => s + g.expected, 0);

  return (
    <div className="space-y-6">
      {/* ── Monthly breakdown table ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersRound className="w-5 h-5 text-gold" />
            Group Payments — {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left pb-2 font-medium">Group</th>
                  <th className="text-center pb-2 font-medium">Fee / mo</th>
                  <th className="text-center pb-2 font-medium">Players</th>
                  <th className="text-center pb-2 font-medium">Paid</th>
                  <th className="text-center pb-2 font-medium">Unpaid</th>
                  <th className="text-right pb-2 font-medium">Collected</th>
                  <th className="text-right pb-2 font-medium">Expected</th>
                  <th className="text-center pb-2 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groupStats.map(({ group, playerCount, paidCount, unpaidCount, collected, expected, pct }) => (
                  <tr key={group.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium">{group.name}</td>
                    <td className="py-3 text-center text-muted-foreground">{formatCurrency(group.monthly_fee)}</td>
                    <td className="py-3 text-center">{playerCount}</td>
                    <td className="py-3 text-center font-medium text-green-600">{paidCount}</td>
                    <td className="py-3 text-center font-medium">
                      <span className={unpaidCount > 0 ? "text-destructive" : "text-muted-foreground"}>{unpaidCount}</span>
                    </td>
                    <td className="py-3 text-right font-semibold text-green-600">{formatCurrency(collected)}</td>
                    <td className="py-3 text-right text-muted-foreground">{formatCurrency(expected)}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {groupStats.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold text-sm">
                    <td className="pt-3 text-muted-foreground">Total</td>
                    <td />
                    <td className="pt-3 text-center">{totalPlayers}</td>
                    <td className="pt-3 text-center text-green-600">{totalPaid}</td>
                    <td className="pt-3 text-center text-destructive">{totalUnpaid}</td>
                    <td className="pt-3 text-right text-green-600">{formatCurrency(totalCollected)}</td>
                    <td className="pt-3 text-right text-muted-foreground">{formatCurrency(totalExpected)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Revenue chart with group filter ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-gold" />
              Group Revenue — Last 6 Months
            </CardTitle>

            {/* Group filter pills */}
            {activeGroups.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Show:</span>
                {activeGroups.map((group, i) => {
                  const isActive = selectedIds.size === 0 || selectedIds.has(group.id);
                  const color = GROUP_COLORS[i % GROUP_COLORS.length];
                  return (
                    <button
                      key={group.id}
                      onClick={() => toggleGroup(group.id)}
                      style={isActive ? { backgroundColor: color + "22", borderColor: color, color } : {}}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        isActive
                          ? "border-current"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      {group.name}
                    </button>
                  );
                })}
                {selectedIds.size > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={clearFilter}>
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {visibleGroups.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Select at least one group to display.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={70} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                {visibleGroups.map((group, i) => {
                  // Find the original index so colour stays consistent even when filtered
                  const colorIdx = activeGroups.findIndex((g) => g.id === group.id);
                  const isLast = i === visibleGroups.length - 1;
                  return (
                    <Bar
                      key={group.id}
                      dataKey={group.name}
                      stackId="revenue"
                      fill={GROUP_COLORS[colorIdx % GROUP_COLORS.length]}
                      radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupPaymentsSection;
