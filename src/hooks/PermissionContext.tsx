import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api";

interface PermissionContextType {
  permissions: Record<string, boolean>;
  hasPermission: (resource: string, action?: string) => boolean;
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: {},
  hasPermission: () => false,
  isLoading: true,
});

export const PermissionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch the flattened permissions map from your Spring Boot API
    api
      .get("/api/permissions/my-permissions")
      .then((res) => setPermissions(res.data.permissions))
      .catch((err) => console.error("Failed to load permissions", err))
      .finally(() => setIsLoading(false));
  }, []);

  // The core check logic
  const hasPermission = (resource: string, action: string = "view") => {
    // Look for the exact key (e.g., "action:approve_order:execute")
    return permissions[`${resource}:${action}`] === true;
  };

  return (
    <PermissionContext.Provider
      value={{ permissions, hasPermission, isLoading }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);
