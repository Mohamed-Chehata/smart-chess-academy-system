import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format, startOfMonth, subMonths, parseISO,
  isWithinInterval, startOfMonth as som, endOfMonth,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarDays, MessageSquare, CheckCircle2,
  XCircle, Plus, Pencil, User, MapPin, Award, Phone,
} from "lucide-react";
import type { Profile, Group, Attendance, PlayerComment } from "@/types";

// ─── Attendance Modal ─────────────────────────────────────────────────────────
interface AttendanceModalProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  existing?: Attendance | null;
}

const AttendanceModal = ({ open, onClose, playerId, existing }: AttendanceModalProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(existing?.session_date ?? format(new Date(), "yyyy-MM-dd"));
  const [isPresent, setIsPresent] = useState(existing?.is_present ?? true);
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance").upsert(
        {
          player_id: playerId,
          session_date: date,
          is_present: isPresent,
          notes: notes || null,
          recorded_by: profile?.id ?? null,
        },
        { onConflict: "player_id,session_date" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance recorded");
      queryClient.invalidateQueries({ queryKey: ["attendance", playerId] });
      onClose();
    },
    onError: () => toast.error("Failed to save attendance"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Record Attendance</DialogTitle>
          <DialogDescription>Mark the player's attendance for a session.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Session Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPresent(true)}
                className={`rounded-lg border-2 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  isPresent
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Present
              </button>
              <button
                type="button"
                onClick={() => setIsPresent(false)}
                className={`rounded-lg border-2 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  !isPresent
                    ? "border-destructive bg-red-50 text-destructive"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <XCircle className="w-4 h-4" />
                Absent
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="e.g. sick, tournament..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gold" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Comment Modal ────────────────────────────────────────────────────────────
interface CommentModalProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  month: Date;
  existing?: PlayerComment | null;
}

const CommentModal = ({ open, onClose, playerId, month, existing }: CommentModalProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState(existing?.comment ?? "");
  const monthStr = format(startOfMonth(month), "yyyy-MM-dd");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) throw new Error("Comment cannot be empty");
      const { error } = await supabase.from("player_comments").upsert(
        {
          player_id: playerId,
          month: monthStr,
          comment: comment.trim(),
          created_by: profile?.id ?? null,
        },
        { onConflict: "player_id,month" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment saved");
      queryClient.invalidateQueries({ queryKey: ["player_comments", playerId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save comment"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Comment" : "Add Comment"}</DialogTitle>
          <DialogDescription>
            Monthly progress note for <strong>{format(month, "MMMM yyyy")}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Progress Notes</Label>
          <Textarea
            placeholder="Describe the player's progress this month..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[120px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gold" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const PlayerProfile = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isCoach } = useAuth();

  const [attendanceModal, setAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [commentModal, setCommentModal] = useState(false);
  const [commentMonth, setCommentMonth] = useState(new Date());
  const [editingComment, setEditingComment] = useState<PlayerComment | null>(null);

  // Player profile
  const { data: player, isLoading } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId!)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!profileId,
  });

  // Player's group
  const { data: group } = useQuery({
    queryKey: ["groups", player?.group_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", player!.group_id!)
        .single();
      if (error) throw error;
      return data as Group;
    },
    enabled: !!player?.group_id,
  });

  // Attendance records
  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("player_id", profileId!)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!profileId,
  });

  // Monthly comments
  const { data: comments = [] } = useQuery({
    queryKey: ["player_comments", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_comments")
        .select("*")
        .eq("player_id", profileId!)
        .order("month", { ascending: false });
      if (error) throw error;
      return data as PlayerComment[];
    },
    enabled: !!profileId,
  });

  // Attendance chart — last 6 months
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    return months.map((month) => {
      const interval = { start: som(month), end: endOfMonth(month) };
      const inMonth = attendance.filter((a) =>
        isWithinInterval(parseISO(a.session_date), interval)
      );
      return {
        name: format(month, "MMM yy"),
        Present: inMonth.filter((a) => a.is_present).length,
        Absent: inMonth.filter((a) => !a.is_present).length,
      };
    });
  }, [attendance]);

  // Comment lookup by month string
  const commentByMonth = useMemo(
    () => Object.fromEntries(comments.map((c) => [c.month, c])),
    [comments]
  );

  const openAddAttendance = () => {
    setEditingAttendance(null);
    setAttendanceModal(true);
  };

  const openEditAttendance = (a: Attendance) => {
    setEditingAttendance(a);
    setAttendanceModal(true);
  };

  const openComment = (month: Date, existing?: PlayerComment) => {
    setCommentMonth(month);
    setEditingComment(existing ?? null);
    setCommentModal(true);
  };

  const canEdit = isAdmin || isCoach;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!player) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">Player not found.</div>
      </DashboardLayout>
    );
  }

  const totalSessions = attendance.length;
  const presentCount = attendance.filter((a) => a.is_present).length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null;

  return (
    <DashboardLayout>
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to directory
      </button>

      {/* Player header */}
      <div className="flex items-start gap-5 mb-8 flex-wrap">
        <div className="w-16 h-16 rounded-full bg-gold/20 text-gold font-bold text-2xl flex items-center justify-center shrink-0">
          {player.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold text-foreground">{player.full_name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {group && <Badge variant="secondary">{group.name}</Badge>}
            {player.level && (
              <Badge variant="outline" className="capitalize">{player.level}</Badge>
            )}
            {player.branch && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                <MapPin className="w-3 h-3" /> {player.branch}
              </span>
            )}
            {attendanceRate !== null && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  attendanceRate >= 75
                    ? "bg-green-100 text-green-700"
                    : attendanceRate >= 50
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {attendanceRate}% attendance
              </span>
            )}
          </div>

          {/* Extra info */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
            {player.email && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {player.email}
              </span>
            )}
            {player.phone_number && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> {player.phone_number}
              </span>
            )}
            {player.fide_id && (
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3" /> FIDE: {player.fide_id}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Attendance ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="w-5 h-5 text-gold" />
                  Attendance — Last 6 Months
                </CardTitle>
                {canEdit && (
                  <Button variant="gold" size="sm" onClick={openAddAttendance}>
                    <Plus className="w-4 h-4 mr-1" />
                    Record
                  </Button>
                )}
              </div>
              {attendanceRate !== null && (
                <p className="text-xs text-muted-foreground">
                  {presentCount} present / {totalSessions} total sessions
                </p>
              )}
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No attendance records yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Present" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent attendance list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {attendance.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">No records.</p>
              ) : (
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {attendance.slice(0, 20).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        {a.is_present ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {format(parseISO(a.session_date), "dd/MM/yyyy")}
                          </p>
                          {a.notes && (
                            <p className="text-xs text-muted-foreground">{a.notes}</p>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditAttendance(a)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Monthly Comments ── */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="w-5 h-5 text-gold" />
                  Monthly Progress
                </CardTitle>
                {canEdit && (
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => openComment(new Date(), commentByMonth[format(startOfMonth(new Date()), "yyyy-MM-dd")])}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    This Month
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {comments.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground px-4">
                  No progress notes yet.
                  {canEdit && (
                    <p className="mt-1">Click "This Month" to add the first one.</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {comments.map((c) => {
                    const monthDate = parseISO(c.month);
                    return (
                      <div key={c.id} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-foreground">
                            {format(monthDate, "MMMM yyyy")}
                          </span>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => openComment(monthDate, c)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {c.comment}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AttendanceModal
        open={attendanceModal}
        onClose={() => setAttendanceModal(false)}
        playerId={player.id}
        existing={editingAttendance}
      />
      <CommentModal
        open={commentModal}
        onClose={() => setCommentModal(false)}
        playerId={player.id}
        month={commentMonth}
        existing={editingComment}
      />
    </DashboardLayout>
  );
};

export default PlayerProfile;
