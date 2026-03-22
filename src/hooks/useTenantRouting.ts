// src/hooks/useTenantRouting.ts
import { useParams, useNavigate, type NavigateOptions } from "react-router-dom";

export function useTenantRouting() {
  // Extract tenantId, fallback to a default if somehow missing
  const { tenantId = "default-tenant" } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  // Helper to safely build a tenant-prefixed path
  const buildTenantPath = (path: string) => {
    // Prevent double slashes if the path already starts with one
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `/${tenantId}${cleanPath}`;
  };

  // Helper for programmatic navigation (like after a form submit)
  const navigateTo = (path: string, options?: NavigateOptions) => {
    navigate(buildTenantPath(path), options);
  };

  return {
    tenantId,
    buildTenantPath,
    navigateTo,
  };
}
