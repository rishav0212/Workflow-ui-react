import React from "react";
import { usePermissions } from "../../hooks/PermissionContext";

interface SecureProps {
  resource: string;
  action?: string; // Defaults to "view"
  children: React.ReactNode;
  fallback?: React.ReactNode; // What to show if denied (default: null)
  disableInstead?: boolean; // If true, renders the children but disabled
}

export const Secure = ({
  resource,
  action = "view",
  children,
  fallback = null,
  disableInstead = false,
}: SecureProps) => {
  const { hasPermission, isLoading } = usePermissions();

  // 1. Show a loading skeleton while permissions are being fetched
  if (isLoading) {
    return (
      <span className="animate-pulse bg-canvas-subtle rounded w-full h-full block min-h-[1.5rem]" />
    );
  }

  // 2. Check if the user has the required permission
  const isAllowed = hasPermission(resource, action);

  // 3. If allowed, render the component normally
  if (isAllowed) {
    return <>{children}</>;
  }

  // 4. If denied but `disableInstead` is true, we clone the element and disable it
  if (disableInstead && React.isValidElement(children)) {
    // Safely cast children to a ReactElement so TS knows we can read .props
    const childElement = children as React.ReactElement<any>;

    return React.cloneElement(childElement, {
      disabled: true,
      title: "You do not have permission to perform this action.",
      // Safely append to any existing classes the child already has
      className: `${childElement.props.className || ""} opacity-50 cursor-not-allowed`,
      onClick: undefined, // Strip the click handler so it can't be triggered!
    });
  }

  // 5. Otherwise, render the fallback (which defaults to nothing/hidden)
  return <>{fallback}</>;
};
