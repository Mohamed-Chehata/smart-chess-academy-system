import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Search, Users2,
  Package as PackageIcon, MapPin, User, Phone, Calendar, CreditCard, StickyNote,
} from "lucide-react";
import MarkPaidModal from "@/components/dashboard/MarkPaidModal";
import type { Profile, StudentPayment, StudentPackage, Group, Branch } from "@/types";

// ── sessionStorage keys ────────────────────────────────────────────────────────
const SS_STATUS  = "member-payments-status-filter";
const SS_GROUP   = "member-payments-group-filter";

interface MemberPaymentsSectionProps {
  currentMonth: Date;
  activeBranch: Branch;
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  package: "Package",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

// ── Helper: display a profile field row ───────────────────────────────────────
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

// ── Member Detail Dialog ───────────────────────────────────────────────────────
function MemberDetailDialog({
  student,
  payment,
  onClose,
}: {
  student: Profile | null;
  payment: StudentPayment | null;
  onClose: () => void;
}) {
  if (!student) return null;
  return (
    <Dialog open={!!student} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-gold" />
            {student.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-0.5 mt-2">
          <DetailRow
            icon={<User className="w-4 h-4" />}
            label="Email"
            value={student.email}
          />
          <DetailRow
            icon={<Phone className="w-4 h-4" />}
            label="Phone"
            value={student.phone_number}
          />
          <DetailRow
            icon={<MapPin className="w-4 h-4" />}
            label="Branch"
            value={student.branch ? <span className="capitalize">{student.branch}</span> : null}
          />
          <DetailRow
            icon={<Users2 className="w-4 h-4" />}
            label="Level"
            value={student.level ? <span className="capitalize">{student.level}</span> : null}
          />
          <DetailRow
            icon={<Calendar className="w-4 h-4" />}
            label="Birth Date"
            value={
              student.birth_date
                ? format(parseISO(student.birth_date), "dd/MM/yyyy")
                : null
            }
          />
          <DetailRow
            icon={<User className="w-4 h-4" />}
            label="Parent / Guardian"
            value={student.parent_name}
          />
          <DetailRow
            icon={<MapPin className="w-4 h-4" />}
            label="Address"
            value={student.address}
          />
          <DetailRow
            icon={<CreditCard className="w-4 h-4" />}
            label="FIDE ID"
            value={
              student.fide_id ? (
                <a
                  href={`https://ratings.fide.com/profile/${student.fide_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  {student.fide_id}
                </a>
              ) : null
            }
          />
          <DetailRow
            icon={<StickyNote className="w-4 h-4" />}
            label="Memo"
            value={student.memo}
          />
          <DetailRow
            icon={<Calendar className="w-4 h-4" />}
            label="Member Since"
            value={format(parseISO(student.created_at), "dd/MM/yyyy")}
          />

          {/* Current payment status */}
          <div className="flex items-start gap-3 py-2">
            <span className="text-muted-foreground shrink-0 mt-0.5">
              <CreditCard className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Payment Status</p>
              {payment ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-green-600 border-green-500 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Paid
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(payment.amount)} · {FREQUENCY_LABELS[payment.payment_frequency]}
                  </span>
                </div>
              ) : (
                <Badge variant="outline" className="text-destructive border-destructive gap-1 mt-0.5">
                  <XCircle className="w-3 h-3" />
                  Unpaid this month
                </Badge>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const MemberPaymentsSection = ({ currentMonth, activeBranch }: MemberPaymentsSectionProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Restore filters from sessionStorage
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(() => {
    const saved = sessionStorage.getItem(SS_STATUS);
    return (saved as "all" | "paid" | "unpaid") || "all";
  });
  const [groupFilter, setGroupFilter] = useState<string>(() => {
    return sessionStorage.getItem(SS_GROUP) || "all";
  });

  const [markPaidStudent, setMarkPaidStudent]     = useState<Profile | null>(null);
  const [detailStudent,   setDetailStudent]       = useState<Profile | null>(null);

  const persistStatus = (v: "all" | "paid" | "unpaid") => {
    setStatusFilter(v);
    sessionStorage.setItem(SS_STATUS, v);
  };
  const persistGroup = (v: string) => {
    setGroupFilter(v);
    sessionStorage.setItem(SS_GROUP, v);
  };

  const billingPeriodStr = format(startOfMonth(currentMonth), "yyyy-MM-dd");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: players = [], isLoading: playersLoading } = useQuery({
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

  const { data: groups = [] } = useQuery({
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

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const paymentByStudent = payments.reduce<Record<string, StudentPayment>>((acc, p) => {
    acc[p.student_id] = p;
    return acc;
  }, {});

  const packageByStudent = activeAssignments.reduce<Record<string, StudentPackage>>((acc, a) => {
    acc[a.student_id] = a;
    return acc;
  }, {});

  // ── Undo mutation ──────────────────────────────────────────────────────────
  const undoMutation = useMutation({
    mutationFn: async (payment: StudentPayment) => {
      if (payment.payment_frequency === "package" && payment.transaction_id) {
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

  // ── Filtering pipeline ─────────────────────────────────────────────────────
  // 1. name search
  const afterSearch = players.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // 2. group filter
  const afterGroup = groupFilter === "all"
    ? afterSearch
    : afterSearch.filter((p) => p.group_id === groupFilter);

  // 3. counts for pills (after search + group, before status)
  const paidCount   = afterGroup.filter((p) =>  !!paymentByStudent[p.id]).length;
  const unpaidCount = afterGroup.filter((p) => !paymentByStudent[p.id]).length;

  // 4. status filter
  const filtered = afterGroup.filter((p) => {
    if (statusFilter === "paid")   return  !!paymentByStudent[p.id];
    if (statusFilter === "unpaid") return !paymentByStudent[p.id];
    return true;
  });

  const isLoading = playersLoading || paymentsLoading;

  const existingPaymentForModal = markPaidStudent
    ? paymentByStudent[markPaidStudent.id] ?? null
    : null;

  const detailPayment = detailStudent
    ? paymentByStudent[detailStudent.id] ?? null
    : null;

  // ── Group with students that have payments (for showing relevant groups only)
  const groupsWithPlayers = groups.filter((g) =>
    players.some((p) => p.group_id === g.id)
  );

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

            {/* Group filter pills */}
            {groupsWithPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => persistGroup("all")}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    groupFilter === "all"
                      ? "bg-gold/10 border-gold text-gold"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  All groups
                </button>
                {groupsWithPlayers.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => persistGroup(g.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      groupFilter === g.id
                        ? "bg-gold/10 border-gold text-gold"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            {/* Status filter pills */}
            <div className="flex gap-2">
              {(["all", "paid", "unpaid"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => persistStatus(s)}
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
              {[...filtered]
                .sort((a, b) => {
                  const aPaid = !!paymentByStudent[a.id];
                  const bPaid = !!paymentByStudent[b.id];
                  if (aPaid === bPaid) return a.full_name.localeCompare(b.full_name);
                  return aPaid ? 1 : -1;
                })
                .map((student) => {
                  const payment    = paymentByStudent[student.id];
                  const assignment = packageByStudent[student.id];
                  const isPaid     = !!payment;

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between py-3 gap-4 flex-wrap"
                    >
                      {/* Student info — click opens detail dialog */}
                      <button
                        className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
                        onClick={() => setDetailStudent(student)}
                        title="View details"
                      >
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isPaid ? "bg-green-500" : "bg-destructive"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate hover:text-gold transition-colors">
                            {student.full_name}
                          </p>
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
                      </button>

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

      <MemberDetailDialog
        student={detailStudent}
        payment={detailPayment}
        onClose={() => setDetailStudent(null)}
      />
    </>
  );
};

export default MemberPaymentsSection;
