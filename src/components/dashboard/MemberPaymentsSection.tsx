import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search, Users2, Package as PackageIcon } from "lucide-react";
import MarkPaidModal from "@/components/dashboard/MarkPaidModal";
import type { Profile, StudentPayment, StudentPackage } from "@/types";

interface MemberPaymentsSectionProps {
  currentMonth: Date;
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  package: "Package",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

const MemberPaymentsSection = ({ currentMonth }: MemberPaymentsSectionProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [markPaidStudent, setMarkPaidStudent] = useState<Profile | null>(null);

  const billingPeriodStr = format(startOfMonth(currentMonth), "yyyy-MM-dd");

  // All players
  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ["profiles", "players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "player")
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Payment records for current billing period
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["student_payments", billingPeriodStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_payments")
        .select("*")
        .eq("billing_period", billingPeriodStr);
      if (error) throw error;
      return data as StudentPayment[];
    },
  });

  // Active package assignments for all students
  const { data: activeAssignments = [] } = useQuery({
    queryKey: ["student_packages", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_packages")
        .select("*, package:packages(*)")
        .eq("is_active", true);
      if (error) throw error;
      return data as StudentPackage[];
    },
  });

  // Build lookup maps
  const paymentByStudent = payments.reduce<Record<string, StudentPayment>>((acc, p) => {
    acc[p.student_id] = p;
    return acc;
  }, {});

  const packageByStudent = activeAssignments.reduce<Record<string, StudentPackage>>((acc, a) => {
    acc[a.student_id] = a;
    return acc;
  }, {});

  // Undo payment — for package payments, removes all covered months; for others, just this month
  const undoMutation = useMutation({
    mutationFn: async (payment: StudentPayment) => {
      if (payment.payment_frequency === "package" && payment.transaction_id) {
        // Delete all student_payments sharing this transaction (all package months)
        await supabase.from("student_payments").delete().eq("transaction_id", payment.transaction_id);
        await supabase.from("transactions").delete().eq("id", payment.transaction_id);
      } else {
        const { error: spError } = await supabase
          .from("student_payments")
          .delete()
          .eq("id", payment.id);
        if (spError) throw spError;
        if (payment.transaction_id) {
          await supabase.from("transactions").delete().eq("id", payment.transaction_id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Payment reversed");
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: () => toast.error("Failed to reverse payment"),
  });

  // Base counts (before status filter, after search)
  const searched = players.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );
  const paidCount   = searched.filter((p) =>  !!paymentByStudent[p.id]).length;
  const unpaidCount = searched.filter((p) => !paymentByStudent[p.id]).length;

  // Apply status filter on top
  const filtered = searched.filter((p) => {
    if (statusFilter === "paid")   return  !!paymentByStudent[p.id];
    if (statusFilter === "unpaid") return !paymentByStudent[p.id];
    return true;
  });
  const isLoading = playersLoading || paymentsLoading;

  const existingPaymentForModal = markPaidStudent
    ? paymentByStudent[markPaidStudent.id] ?? null
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            {/* Title row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users2 className="w-5 h-5 text-gold" />
                  Member Payments — {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {paidCount} paid · {unpaidCount} unpaid
                </p>
              </div>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Status filter pills */}
            <div className="flex gap-2">
              {(["all", "paid", "unpaid"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                    statusFilter === s
                      ? s === "paid"
                        ? "bg-green-100 border-green-500 text-green-700"
                        : s === "unpaid"
                        ? "bg-red-100 border-destructive text-destructive"
                        : "bg-gold/10 border-gold text-gold"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  {s === "all"
                    ? `All (${paidCount + unpaidCount})`
                    : s === "paid"
                    ? `Paid (${paidCount})`
                    : `Unpaid (${unpaidCount})`}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No students found.</div>
          ) : (
            <div className="overflow-y-auto max-h-[640px] divide-y divide-border">
              {/* Unpaid first, then paid — max 8 rows (~80px each) then scrolls */}
              {[...filtered]
                .sort((a, b) => {
                  const aPaid = !!paymentByStudent[a.id];
                  const bPaid = !!paymentByStudent[b.id];
                  if (aPaid === bPaid) return a.full_name.localeCompare(b.full_name);
                  return aPaid ? 1 : -1; // unpaid first
                })
                .map((student) => {
                  const payment = paymentByStudent[student.id];
                  const assignment = packageByStudent[student.id];
                  const isPaid = !!payment;

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between py-3 gap-4 flex-wrap"
                    >
                      {/* Student info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isPaid ? "bg-green-500" : "bg-destructive"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{student.full_name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {student.branch && (
                              <span className="text-xs text-muted-foreground capitalize">
                                {student.branch}
                              </span>
                            )}
                            {student.level && (
                              <span className="text-xs text-muted-foreground capitalize">
                                · {student.level}
                              </span>
                            )}
                            {assignment?.package && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <PackageIcon className="w-3 h-3" />
                                {(assignment.package as { name: string }).name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side: status + action */}
                      <div className="flex items-center gap-3 shrink-0">
                        {isPaid ? (
                          <>
                            <div className="text-right">
                              <Badge variant="outline" className="text-green-600 border-green-500 gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Paid
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatCurrency(payment.amount)} ·{" "}
                                {FREQUENCY_LABELS[payment.payment_frequency]}
                              </p>
                            </div>
                            {/* Undo */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive h-8">
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Undo
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reverse Payment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will mark <strong>{student.full_name}</strong> as unpaid for{" "}
                                    {format(currentMonth, "MMMM yyyy")} and delete the associated income transaction.
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => undoMutation.mutate(payment)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Reverse Payment
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline" className="text-destructive border-destructive gap-1">
                              <XCircle className="w-3 h-3" />
                              Unpaid
                            </Badge>
                            <Button
                              size="sm"
                              variant="gold"
                              className="h-8"
                              onClick={() => setMarkPaidStudent(student)}
                            >
                              Mark Paid
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {markPaidStudent && (
        <MarkPaidModal
          open={!!markPaidStudent}
          onClose={() => setMarkPaidStudent(null)}
          student={markPaidStudent}
          billingPeriod={currentMonth}
          existingPayment={existingPaymentForModal}
        />
      )}
    </>
  );
};

export default MemberPaymentsSection;
