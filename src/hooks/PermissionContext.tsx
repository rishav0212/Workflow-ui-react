import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api, { unwrapData } from '../api'; // Use our unwrap helper!

interface PermissionContextType {
    permissions: Record<string, boolean>;
    hasPermission: (resource: string, action: string) => boolean;
    loading: boolean;
    refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            // 🟢 1. Hit the new modular endpoint and unwrap the ApiResponse envelope
            const responseData = unwrapData(await api.get('/api/permissions/my-permissions'));
            
            // 🟢 2. Safely set the permissions map (fallback to empty object if undefined)
            setPermissions(responseData?.permissions || {});
        } catch (error) {
            console.error('Failed to load user permissions:', error);
            setPermissions({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            fetchPermissions();
        } else {
            setLoading(false);
        }
    }, []);

    const hasPermission = (resource: string, action: string): boolean => {
        // 🟢 3. DEFENSIVE CHECK: If permissions are not loaded yet, deny access instead of crashing
        if (!permissions) return false;
        
        const key = `${resource}:${action}`;
        return !!permissions[key];
    };

    return (
        <PermissionContext.Provider value={{ permissions, hasPermission, loading, refreshPermissions: fetchPermissions }}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermissions = () => {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionProvider');
    }
    return context;
};