import { Navigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useBranch } from "@/contexts/BranchContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FinancialOverview from "@/components/dashboard/FinancialOverview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp, Trophy, MapPin, Calendar, Loader2 } from "lucide-react";
import type { Profile } from "@/types";

const DashboardHome = () => {
  const { profile, isAdmin, isCoach, isPlayer, loading, user } = useAuth();
  const { activeBranch } = useBranch();

  const { data: profilesData, isLoading: statsLoading } = useQuery({
    queryKey: ["profiles", "stats", activeBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, branch")
        .eq("branch", activeBranch);
      if (error) throw error;
      return data as Pick<Profile, "role" | "branch">[];
    },
    enabled: !!(isAdmin || isCoach) && !!profile,
  });

  const stats = {
    totalCoaches: profilesData?.filter((p) => p.role === "coach").length ?? 0,
    totalPlayers: profilesData?.filter((p) => p.role === "player").length ?? 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your profile...</p>
            <p className="text-xs text-muted-foreground mt-2">
              If this takes too long, try logging out and back in.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const firstName = profile.full_name?.split(" ")[0] || "there";

  return (
    <DashboardLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Welcome back, {firstName}!
        </h1>
        <p className="text-muted-foreground mt-2">
          {isAdmin && "Manage your academy from the admin dashboard."}
          {isCoach && "View your players and manage training sessions."}
          {isPlayer && "Track your progress and upcoming sessions."}
        </p>
        <div className="mt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gold/10 text-gold capitalize">
            {profile.role}
          </span>
          {profile.branch && (
            <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary capitalize">
              <MapPin className="w-3 h-3 mr-1" />
              {profile.branch} Branch
            </span>
          )}
        </div>
      </div>

      {/* Financial Overview - Admin Only */}
      {isAdmin && <FinancialOverview />}

      {/* Admin/Coach Stats */}
      {(isAdmin || isCoach) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Coaches
                </CardTitle>
                <Users className="w-4 h-4 text-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.totalCoaches}
                </div>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{activeBranch} branch</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Players
              </CardTitle>
              <Users className="w-4 h-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.totalPlayers}
              </div>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{activeBranch} branch</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Branch
              </CardTitle>
              <MapPin className="w-4 h-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold capitalize">{activeBranch}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently viewing</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdmin && (
          <Card className="hover:shadow-elevated transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gold" />
                Add New Coach
              </CardTitle>
              <CardDescription>
                Create a new coach account for the academy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/add-coach">
                <Button variant="gold" className="w-full">
                  Add Coach
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {(isAdmin || isCoach) && (
          <Card className="hover:shadow-elevated transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gold" />
                Add New Player
              </CardTitle>
              <CardDescription>
                Register a new player at the academy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/add-player">
                <Button variant="gold" className="w-full">
                  Add Player
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {(isAdmin || isCoach) && (
          <Card className="hover:shadow-elevated transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                View Directory
              </CardTitle>
              <CardDescription>
                Browse and manage all academy members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/directory">
                <Button variant="outline" className="w-full">
                  View Members
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isPlayer && (
          <>
            <Card className="hover:shadow-elevated transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gold" />
                  FIDE Progress
                </CardTitle>
                <CardDescription>
                  Track your rating progression over time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  {profile?.fide_id ? (
                    <a
                      href={`https://ratings.fide.com/profile/${profile.fide_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    >
                      View FIDE Profile →
                    </a>
                  ) : (
                    "No FIDE ID linked"
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-elevated transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gold" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription>
                  View your scheduled training sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  Coming soon
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-elevated transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gold" />
                  Tournaments
                </CardTitle>
                <CardDescription>
                  View upcoming tournaments and results.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  Coming soon
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
