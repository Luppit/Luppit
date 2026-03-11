import { Roles } from "@/src/services/role.service";
import { getCurrentUserRole } from "@/src/services/user.role.service";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type RoleContextValue = {
  role: Roles | null;
  isLoading: boolean;
};

const RoleContext = createContext<RoleContextValue>({
  role: null,
  isLoading: true,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Roles | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const resolveRole = async () => {
      const result = await getCurrentUserRole();
      if (!active) return;

      if (result.ok) {
        setRole(result.data);
      } else {
        setRole(null);
      }
      setIsLoading(false);
    };

    void resolveRole();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ role, isLoading }), [role, isLoading]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
