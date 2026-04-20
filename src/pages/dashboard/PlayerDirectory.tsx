import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Users, ChevronRight, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import type { Profile, Group, GroupCoach, Attendance } from "@/types";

const TODAY = format(new Date(), "yyyy-MM-dd");

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-blue-100 text-blue-700 border-blue-200",
  intermediate: "bg-amber-100 text-amber-700 border-amber-200",
  advanced: "bg-green-100 text-green-700 border-green-200",
};

// ─── Quick attendance button ──────────────────────────────────────────────────
// Cycles: nothing → present → absent → nothing
interface AttendanceBtnProps {
  playerId: string;
  record: Attendance | undefined;
  onCycle: (playerId: string, record: Attendance | undefined) => void;
  isPending: boolean;
}

const AttendanceBtn = ({ playerId, record, onCycle, isPending }: AttendanceBtnProps) => {
  if (!record) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onCycle(playerId, record); }}
        disabled={isPending}
        title="Mark present"
        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors"
      >
        <MinusCircle className="w-4 h-4" />
      </button>
    );
  }
  if (record.is_present) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onCycle(playerId, record); }}
        disabled={isPending}
        title="Mark absent"
        className="w-8 h-8 rounded-full flex items-center justify-center text-green-600 hover:text-green-700 transition-colors"
      >
        <CheckCircle2 className="w-5 h-5" />
      </button>
    );
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onCycle(playerId, record); }}
      disabled={isPending}
      title="Clear attendance"
      className="w-8 h-8 rounded-full flex items-center justify-center text-destructive hover:text-red-700 transition-colors"
    >
      <XCircle className="w-5 h-5" />
    </button>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const PlayerDirectory = () => {
  const navigate = useNavigate();
  const { isAdmin, isCoach, profile } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [coachFilter, setCoachFilter] = useState("all");

  // All players
  const { data: allPlayers = [], isLoading: playersLoading } = useQuery({
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

  // Today's attendance for all players
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["attendance", "today", TODAY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("session_date", TODAY);
      if (error) throw error;
      return data as Attendance[];
    },
  });

  // All groups
  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").order("name");
      if (error) throw error;
      return data as Group[];
    },
  });

  // All coaches (admin only filter)
  const { data: coaches = [] } = useQuery({
    queryKey: ["profiles", "coaches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "coach")
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  // Group-coach links
  const { data: groupCoaches = [] } = useQuery({
    queryKey: ["group_coaches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_coaches").select("*");
      if (error) throw error;
      return data as GroupCoach[];
    },
  });

  // Today's attendance lookup: player_id → record
  const todayByPlayer = useMemo(
    () => Object.fromEntries(todayAttendance.map((a) => [a.player_id, a])),
    [todayAttendance]
  );

  // Attendance cycle mutation
  const attendanceMutation = useMutation({
    mutationFn: async ({ playerId, record }: { playerId: string; record: Attendance | undefined }) => {
      if (!record) {
        // nothing → present
        const { error } = await supabase.from("attendance").insert({
          player_id: playerId,
          session_date: TODAY,
          is_present: true,
          recorded_by: profile?.id ?? null,
        });
        if (error) throw error;
      } else if (record.is_present) {
        // present → absent
        const { error } = await supabase
          .from("attendance")
          .update({ is_present: false })
          .eq("id", record.id);
        if (error) throw error;
      } else {
        // absent → nothing (delete)
        const { error } = await supabase.from("attendance").delete().eq("id", record.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "today", TODAY] });
    },
    onError: () => toast.error("Failed to update attendance"),
  });

  // Coach's own group IDs
  const myGroupIds = useMemo(() => {
    if (!isCoach || !profile) return [];
    return groupCoaches.filter((gc) => gc.coach_id === profile.id).map((gc) => gc.group_id);
  }, [isCoach, profile, groupCoaches]);

  // Groups coached by selected coach (admin filter)
  const groupIdsByCoach = useMemo(() => {
    if (coachFilter === "all") return null;
    return groupCoaches.filter((gc) => gc.coach_id === coachFilter).map((gc) => gc.group_id);
  }, [coachFilter, groupCoaches]);

  const groupById = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.id, g])),
    [groups]
  );

  const filtered = useMemo(() => {
    let list = allPlayers;
    if (isCoach) list = list.filter((p) => p.group_id && myGroupIds.includes(p.group_id));
    if (groupFilter !== "all") list = list.filter((p) => p.group_id === groupFilter);
    if (groupIdsByCoach !== null) list = list.filter((p) => p.group_id && groupIdsByCoach.includes(p.group_id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          groupById[p.group_id ?? ""]?.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPlayers, isCoach, myGroupIds, groupFilter, groupIdsByCoach, search, groupById]);

  const availableGroups = useMemo(() => {
    if (isCoach) return groups.filter((g) => myGroupIds.includes(g.id));
    return groups;
  }, [isCoach, groups, myGroupIds]);

  // Today's summary counts
  const presentToday = filtered.filter((p) => todayByPlayer[p.id]?.is_present === true).length;
  const absentToday = filtered.filter((p) => todayByPlayer[p.id]?.is_present === false).length;
  const unmarkedToday = filtered.length - presentToday - absentToday;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Player Directory</h1>
        <p className="text-muted-foreground mt-1">
          {isCoach ? "Players in your assigned groups." : "All players across the academy."}
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or group…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            <SelectItem value="none">No group</SelectItem>
            {availableGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={coachFilter} onValueChange={setCoachFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All coaches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All coaches</SelectItem>
              {coaches.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Today's summary + count */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "player" : "players"}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Today:</span>
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> {presentToday} present
        </span>
        <span className="flex items-center gap-1 text-destructive font-medium">
          <XCircle className="w-3.5 h-3.5" /> {absentToday} absent
        </span>
        <span className="text-muted-foreground">{unmarkedToday} unmarked</span>
      </div>

      {/* Player list */}
      {playersLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">No players found.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {/* Shows 8 rows (~64px each) then scrolls */}
          <div className="overflow-y-auto max-h-[512px] divide-y divide-border">
          {filtered.map((player) => {
            const group = player.group_id ? groupById[player.group_id] : null;
            const todayRecord = todayByPlayer[player.id];
            return (
              <div
                key={player.id}
                onClick={() => navigate(`/dashboard/players/${player.id}`)}
                className="flex items-center justify-between px-5 py-3.5 bg-card hover:bg-muted/40 cursor-pointer transition-colors"
              >
                {/* Left: name + badges */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gold/20 text-gold font-semibold text-sm flex items-center justify-center shrink-0">
                    {player.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{player.full_name}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {player.branch && (
                        <span className="text-xs text-muted-foreground capitalize">{player.branch}</span>
                      )}
                      {group && (
                        <Badge variant="secondary" className="text-xs py-0">{group.name}</Badge>
                      )}
                      {player.level && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${LEVEL_COLORS[player.level] ?? ""}`}>
                          {player.level.charAt(0).toUpperCase() + player.level.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: attendance btn + chevron */}
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <AttendanceBtn
                    playerId={player.id}
                    record={todayRecord}
                    onCycle={(pid, rec) => attendanceMutation.mutate({ playerId: pid, record: rec })}
                    isPending={attendanceMutation.isPending}
                  />
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PlayerDirectory;
