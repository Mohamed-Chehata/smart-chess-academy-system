import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserCog,
  Wallet,
  Package as PackageIcon,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { profile, signOut, isAdmin, isCoach } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const adminLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Add Coach", href: "/dashboard/add-coach", icon: UserCog },
    { name: "Add Player", href: "/dashboard/add-player", icon: UserPlus },
    { name: "Add Package", href: "/dashboard/add-package", icon: PackageIcon },
    { name: "Member Directory", href: "/dashboard/directory", icon: Users },
    { name: "Finances", href: "/dashboard/finances", icon: Wallet },
  ];

  const coachLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Add Player", href: "/dashboard/add-player", icon: UserPlus },
    { name: "My Players", href: "/dashboard/directory", icon: Users },
  ];

  const playerLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  const links = isAdmin ? adminLinks : isCoach ? coachLinks : playerLinks;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-navy-dark border-b border-border h-16 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-ivory p-2"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <img src={logo} alt="Smart Chess Academy" className="h-10 ml-3" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-navy-dark border-r border-border transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-ivory/10">
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src={logo} alt="Smart Chess Academy" className="h-12" />
            </Link>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-ivory/10">
            <p className="text-ivory font-medium truncate">
              {profile?.full_name || "Loading..."}
            </p>
            <p className="text-gold text-sm capitalize font-medium">
              {profile?.role || "..."}
            </p>
            {profile?.branch && (
              <p className="text-ivory/50 text-xs capitalize mt-1">
                {profile.branch} Branch
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-gold text-navy-dark font-medium"
                      : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory"
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Sign Out */}
          <div className="p-4 border-t border-ivory/10">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-ivory/70 hover:text-ivory hover:bg-ivory/10"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
