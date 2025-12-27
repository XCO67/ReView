'use client';

import { useState, useEffect } from 'react';
import { isAdmin } from '@/lib/role-filter';
import { logger } from '@/lib/utils/logger';interface UserInfo {
  name: string;
  email: string;
  roles: string[];
}

export function useUserRoles() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUserInfo({
            name: data.user?.name || data.user?.username || "User",
            email: data.user?.email || "",
            roles: data.user?.roles || [],
          });
        }
      } catch (error) {
        logger.error('Failed to fetch user info', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

  const userIsAdmin = userInfo ? isAdmin(userInfo.roles) : false;

  return {
    userInfo,
    isLoading,
    isAdmin: userIsAdmin,
  };
}

