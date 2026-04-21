import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useBranch } from "@/contexts/BranchContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EditMemberModal from "@/components/dashboard/EditMemberModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, Search, Trash2, UserCheck, MapPin, Pencil } from "lucide-react";
import type { Profile } from "@/types";

const Directory = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isCoach, profile } = useAuth();
  const { activeBranch } = useBranch();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: profiles = [], isLoading: loading, error: profilesError } = useQuery({
    queryKey: ["profiles", activeBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("branch", activeBranch)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  useEffect(() => {
    if (profilesError) toast.error("Failed to load directory");
  }, [profilesError]);

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, userId) => {
      queryClient.setQueryData<Profile[]>(["profiles"], (old) =>
        (old ?? []).filter((p) => p.user_id !== userId)
      );
    },
    onError: () => toast.error("Failed to delete member"),
  });

  const handleDelete = (userId: string, fullName: string) => {
    deleteMutation.mutate(userId, {
      onSuccess: () => toast.success(`${fullName} has been removed`),
    });
  };

  const handleEdit = (member: Profile) => {
    setEditingMember(member);
    setEditModalOpen(true);
  };

  const handleNameClick = (member: Profile) => {
    navigate(`/dashboard/member/${member.user_id}`);
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || p.role === filterRole;
    if (isCoach && !isAdmin) {
      return matchesSearch && p.role === "player";
    }
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "coach": return "default";
      case "player": return "secondary";
      default: return "outline";
    }
  };

  const getLevelBadgeVariant = (level: string | null) => {
    switch (level) {
      case "advanced": return "default";
      case "intermediate": return "secondary";
      default: return "outline";
    }
  };

  if (!isAdmin && !isCoach) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">
          {isAdmin ? "Member Directory" : "My Players"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isAdmin
            ? "View and manage all coaches and players in the academy."
            : "View and manage your assigned players."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            {isAdmin ? "All Members" : "Players"}
          </CardTitle>
          <CardDescription>
            {filteredProfiles.length} member{filteredProfiles.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {["all", "coach", "player"].map((role) => (
                  <Button
                    key={role}
                    variant={filterRole === role ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterRole(role)}
                    className="capitalize"
                  >
                    {role === "all" ? "All" : `${role}s`}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    {(isAdmin || isCoach) && <TableHead>Level</TableHead>}
                    <TableHead>FIDE ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <button
                          onClick={() => handleNameClick(member)}
                          className="font-medium text-foreground hover:text-gold hover:underline transition-colors text-left"
                        >
                          {member.full_name}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.branch && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />
                            <span className="capitalize">{member.branch}</span>
                          </div>
                        )}
                      </TableCell>
                      {(isAdmin || isCoach) && (
                        <TableCell>
                          {member.level && (
                            <Badge variant={getLevelBadgeVariant(member.level)} className="capitalize">
                              {member.level}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {member.fide_id ? (
                          <a
                            href={`https://ratings.fide.com/profile/${member.fide_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold hover:underline"
                          >
                            {member.fide_id}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(isAdmin || (isCoach && member.role === "player")) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(member)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}

                          {isAdmin && member.user_id !== profile?.user_id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {member.full_name} from the academy? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(member.user_id, member.full_name)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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

      <EditMemberModal
        member={editingMember}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingMember(null);
        }}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["profiles"] })}
        isAdmin={isAdmin}
      />
    </DashboardLayout>
  );
};

export default Directory;
