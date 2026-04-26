import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBranch } from "@/contexts/BranchContext";
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
  UsersRound,
  ClipboardList,
  MapPin,
  Settings,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface DashboardLayoutProps {
  children: ReactNode;
}

// ─── Nav types ────────────────────────────────────────────────────────────────

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  /** Optional section label shown above the group */
  label?: string;
  items: NavItem[];
};

// ─── Nav group definitions ────────────────────────────────────────────────────

const adminGroups: NavGroup[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Manage",
    items: [
      { name: "Add Coach",   href: "/dashboard/add-coach",   icon: UserCog },
      { name: "Add Group",   href: "/dashboard/add-group",   icon: UsersRound },
      { name: "Add Player",  href: "/dashboard/add-player",  icon: UserPlus },
      { name: "Add Package", href: "/dashboard/add-package", icon: PackageIcon },
    ],
  },
  {
    label: "Directory",
    items: [
      { name: "Members", href: "/dashboard/directory", icon: Users },
      { name: "Players", href: "/dashboard/players",   icon: ClipboardList },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Finances", href: "/dashboard/finances", icon: Wallet },
    ],
  },
  {
    // Settings stands alone at the bottom — no label, separator above
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

// Assistants: same as admin minus Settings
const assistantGroups: NavGroup[] = adminGroups
  .map((g) => ({ ...g, items: g.items.filter((i) => i.href !== "/dashboard/settings") }))
  .filter((g) => g.items.length > 0);

const coachGroups: NavGroup[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Players",
    items: [
      { name: "Add Player", href: "/dashboard/add-player", icon: UserPlus },
      { name: "Directory",  href: "/dashboard/players",    icon: ClipboardList },
      { name: "My Players", href: "/dashboard/directory",  icon: Users },
    ],
  },
];

const playerGroups: NavGroup[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { profile, signOut, isAdmin, isAssistant, isCoach } = useAuth();
  const { activeBranch, setActiveBranch, canSwitch } = useBranch();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const groups = isAdmin
    ? adminGroups
    : isAssistant
    ? assistantGroups
    : isCoach
    ? coachGroups
    : playerGroups;

  // ── Sidebar content (shared between desktop + mobile) ───────────────────────
  const sidebarInner = (
    <div className="flex flex-col h-full">

      {/* Logo + branch */}
      <div className="px-5 pt-5 pb-4 border-b border-ivory/10">
        <Link to="/dashboard" onClick={() => setSidebarOpen(false)}>
          <img src={logo} alt="Smart Chess Academy" className="h-11" />
        </Link>

        {canSwitch ? (
          <div className="mt-4 flex rounded-lg overflow-hidden border border-ivory/20">
            {(["tunis", "sousse"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setActiveBranch(b)}
                className={`flex-1 py-1.5 text-xs font-semibold transition-all capitalize tracking-wide ${
                  activeBranch === b
                    ? "bg-gold text-navy-dark"
                    : "text-ivory/50 hover:text-ivory hover:bg-ivory/10"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        ) : (
          profile?.branch && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-ivory/40">
              <MapPin className="w-3 h-3" />
              <span className="capitalize">{profile.branch} Branch</span>
            </div>
          )
        )}
      </div>

      {/* User info */}
      <div className="px-5 py-3 border-b border-ivory/10">
        <p className="text-ivory text-sm font-semibold truncate leading-tight">
          {profile?.full_name || "Loading…"}
        </p>
        <p className="text-gold text-xs capitalize font-medium mt-0.5">
          {profile?.role || "…"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={gi}>
            {/* Separator before every group except the first */}
            {gi > 0 && (
              <div className="my-2 border-t border-ivory/10" />
            )}

            {/* Optional section label */}
            {group.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-ivory/30 select-none">
                {group.label}
              </p>
            )}

            {/* Nav items — tight spacing */}
            <div className="space-y-0.5">
              {group.items.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-gold text-navy-dark font-semibold"
                        : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory"
                    }`}
                  >
                    <link.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{link.name}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-ivory/10">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-sm text-ivory/60 hover:text-ivory hover:bg-ivory/10"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">

      {/* Mobile top bar */}
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
        {sidebarInner}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
