import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Branch } from "@/types";

const STORAGE_KEY = "chess-active-branch";

export interface BranchContextValue {
  /** The branch whose data the UI is currently showing */
  activeBranch: Branch;
  /** Only callable when canSwitch is true (admin users) */
  setActiveBranch: (b: Branch) => void;
  /** True only for admins — coaches/players see only their own branch */
  canSwitch: boolean;
}

const BranchContext = createContext<BranchContextValue>({
  activeBranch: "tunis",
  setActiveBranch: () => {},
  canSwitch: false,
});

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const { profile, isAdmin } = useAuth();

  // Admins: remember last-chosen branch across reloads
  const [adminBranch, setAdminBranch] = useState<Branch>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "sousse" ? "sousse" : "tunis";
  });

  const setActiveBranch = (b: Branch) => {
    setAdminBranch(b);
    localStorage.setItem(STORAGE_KEY, b);
  };

  // Non-admins see their own branch; admins see whichever they switched to
  const activeBranch: Branch =
    !isAdmin && profile?.branch ? profile.branch : adminBranch;

  // When a non-admin's profile loads, snap to their branch
  useEffect(() => {
    if (!isAdmin && profile?.branch) {
      setAdminBranch(profile.branch);
    }
  }, [isAdmin, profile?.branch]);

  return (
    <BranchContext.Provider
      value={{ activeBranch, setActiveBranch, canSwitch: isAdmin }}
    >
      {children}
    </BranchContext.Provider>
  );
};

/** Use inside any component that needs to know / change the active branch */
export const useBranch = () => useContext(BranchContext);
