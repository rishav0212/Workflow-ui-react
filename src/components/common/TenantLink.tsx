// src/components/common/TenantLink.tsx
import { Link, type LinkProps } from "react-router-dom";
import { useTenantRouting } from "../../hooks/useTenantRouting";

interface TenantLinkProps extends Omit<LinkProps, "to"> {
  to: string; // The destination path AFTER the tenant (e.g., "/admin/jobs")
}

export default function TenantLink({
  to,
  children,
  ...props
}: TenantLinkProps) {
  const { buildTenantPath } = useTenantRouting();

  return (
    <Link to={buildTenantPath(to)} {...props}>
      {children}
    </Link>
  );
}
