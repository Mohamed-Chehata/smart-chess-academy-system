import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Mail, Phone, MapPin, Award, TrendingUp, Users,
  Home, FileText, Calendar, ExternalLink, Loader2, Edit,
} from "lucide-react";
import EditMemberModal from "@/components/dashboard/EditMemberModal";
import type { Profile } from "@/types";

const MemberProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isCoach } = useAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: profile, isLoading: loading, error: profileError } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (profileError) {
      toast.error("Failed to load profile");
      navigate("/dashboard/directory");
    }
  }, [profileError, navigate]);

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested profile could not be found.</p>
            <Link to="/dashboard/directory">
              <Button variant="outline">Back to Directory</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const canEdit = isAdmin || (isCoach && profile.role === "player");

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/directory")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">{profile.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getRoleBadgeVariant(profile.role)} className="capitalize">
                  {profile.role}
                </Badge>
                {profile.level && (
                  <Badge variant={getLevelBadgeVariant(profile.level)} className="capitalize">
                    {profile.level}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {canEdit && (
            <Button variant="outline" onClick={() => setEditModalOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
              </div>

              {profile.phone_number && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{profile.phone_number}</p>
                  </div>
                </div>
              )}

              {profile.branch && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-medium capitalize">{profile.branch}</p>
                  </div>
                </div>
              )}

              {profile.address && (
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{profile.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Player-specific Information */}
          {profile.role === "player" && (
            <Card>
              <CardHeader>
                <CardTitle>Player Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.parent_name && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Parent/Guardian</p>
                      <p className="font-medium">{profile.parent_name}</p>
                    </div>
                  </div>
                )}

                {profile.level && (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Level</p>
                      <p className="font-medium capitalize">{profile.level}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* FIDE Information */}
          {profile.fide_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-gold" />
                  FIDE Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">FIDE ID</p>
                    <p className="font-medium">{profile.fide_id}</p>
                  </div>
                  <a
                    href={`https://ratings.fide.com/profile/${profile.fide_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View FIDE Profile
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {profile.memo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{profile.memo}</p>
              </CardContent>
            </Card>
          )}

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {new Date(profile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditMemberModal
        member={profile}
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["profile", userId] });
          queryClient.invalidateQueries({ queryKey: ["profiles"] });
        }}
        isAdmin={isAdmin}
      />
    </DashboardLayout>
  );
};

export default MemberProfile;
