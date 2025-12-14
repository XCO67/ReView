/**
 * Role-based data filtering utilities
 * Maps user roles to business classes for data filtering
 */

export const ADMIN_ROLES = ['admin']; // Only main admin role
export const SUPER_USER_ROLE = 'Super User'; // Super user has all data access but no admin panel
export const BUSINESS_ROLES = ['fi', 'eg', 'ca', 'hu', 'marine', 'ac', 'en', 'li'];

/**
 * Maps role names to their corresponding class values in the CSV data
 * This mapping should match the exact values in the UW_CLASS column (column 7) of the CSV
 * The filtering is case-insensitive, so variations like 'FI', 'fi', 'Fi' will all match
 */
export const ROLE_TO_CLASS_MAP: Record<string, string[]> = {
  'fi': ['FI', 'Property', 'PROPERTY', 'property', 'Fi', 'FI Property'], // Property/FI class
  'eg': ['EG', 'Energy', 'ENERGY', 'energy', 'Eg', 'EG Energy'], // Energy class
  'ca': ['CA', 'Cargo', 'CARGO', 'cargo', 'Ca', 'CA Cargo'], // Cargo class
  'hu': ['HU', 'Hull', 'HULL', 'hull', 'Hu', 'HU Hull'], // Hull class
  'marine': ['CA', 'HU', 'Cargo', 'Hull', 'Marine', 'MARINE', 'marine', 'CA Cargo', 'HU Hull'], // Marine includes both CA and HU
  'ac': ['AC', 'Casualty', 'CASUALTY', 'casualty', 'Ac', 'AC Casualty'], // Casualty class
  'en': ['EN', 'Engineering', 'ENGINEERING', 'engineering', 'En', 'EN Engineering'], // Engineering class
  'li': ['LI', 'Life', 'LIFE', 'life', 'Li', 'LI Life'], // Life class
};

/**
 * Get allowed classes for a user based on their roles
 * Returns null if user is admin (no filtering needed)
 * Returns array of allowed class values if user has business roles
 */
export function getAllowedClasses(userRoles: string[] | undefined): string[] | null {
  if (!userRoles || userRoles.length === 0) {
    return null; // No roles = no access
  }

  // Admin and super-user roles see all data (no class filtering)
  const hasAdminRole = userRoles.some(role => 
    ADMIN_ROLES.includes(role.toLowerCase())
  );
  
  const hasSuperUserRole = userRoles.some(role => 
    role.toLowerCase() === SUPER_USER_ROLE.toLowerCase()
  );
  
  if (hasAdminRole || hasSuperUserRole) {
    return null; // null means no filtering (see all data)
  }

  // Collect all allowed classes from business roles
  const allowedClasses = new Set<string>();
  
  userRoles.forEach(role => {
    const roleLower = role.toLowerCase();
    const classes = ROLE_TO_CLASS_MAP[roleLower];
    if (classes) {
      classes.forEach(cls => allowedClasses.add(cls));
    }
  });

  // If user has business roles, return allowed classes
  if (allowedClasses.size > 0) {
    return Array.from(allowedClasses);
  }

  // Unknown role - no business class access
  return [];
}

/**
 * Filter data by class based on user roles
 * Works with records that have a `className` field (ReinsuranceData)
 */
export function filterByRole<T extends { className?: string | null }>(
  data: T[],
  userRoles: string[] | undefined
): T[] {
  const allowedClasses = getAllowedClasses(userRoles);
  
  // null means admin - no filtering
  if (allowedClasses === null) {
    return data;
  }

  // Empty array means no business class access
  if (allowedClasses.length === 0) {
    return [];
  }

  // Filter data by allowed classes (case-insensitive, with partial matching for flexibility)
  return data.filter(record => {
    const recordClass = (record.className?.trim() || '').toLowerCase();
    if (!recordClass) return false;
    
    // Check if record's class matches any allowed class (case-insensitive)
    // Also check for partial matches (e.g., "FI Property" matches "FI")
    return allowedClasses.some(allowedClass => {
      const allowedClassLower = allowedClass.toLowerCase();
      return recordClass === allowedClassLower || 
             recordClass.includes(allowedClassLower) ||
             allowedClassLower.includes(recordClass);
    });
  });
}

/**
 * Filter renewal records by class based on user roles
 * Works with records that have a `class` field (RenewalRecord)
 */
export function filterRenewalsByRole<T extends { class?: string | null }>(
  data: T[],
  userRoles: string[] | undefined
): T[] {
  const allowedClasses = getAllowedClasses(userRoles);
  
  // null means admin - no filtering
  if (allowedClasses === null) {
    return data;
  }

  // Empty array means no business class access
  if (allowedClasses.length === 0) {
    return [];
  }

  // Filter data by allowed classes (case-insensitive, with partial matching for flexibility)
  return data.filter(record => {
    const recordClass = (record.class?.trim() || '').toLowerCase();
    if (!recordClass) return false;
    
    // Check if record's class matches any allowed class (case-insensitive)
    // Also check for partial matches (e.g., "FI Property" matches "FI")
    return allowedClasses.some(allowedClass => {
      const allowedClassLower = allowedClass.toLowerCase();
      return recordClass === allowedClassLower || 
             recordClass.includes(allowedClassLower) ||
             allowedClassLower.includes(recordClass);
    });
  });
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some(role => ADMIN_ROLES.includes(role.toLowerCase()));
}

/**
 * Check if user has super-user privileges (all data access but no admin panel)
 */
export function isSuperUser(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some(role => role.toLowerCase() === SUPER_USER_ROLE.toLowerCase());
}

/**
 * Get display name for a role (e.g., 'li' -> 'LIFE', 'fi' -> 'PROPERTY')
 */
export function getRoleDisplayName(role: string): string {
  const roleLower = role.toLowerCase();
  const displayNames: Record<string, string> = {
    'li': 'LIFE',
    'fi': 'PROPERTY',
    'eg': 'ENERGY',
    'ca': 'CARGO',
    'hu': 'HULL',
    'marine': 'MARINE',
    'ac': 'CASUALTY',
    'en': 'ENGINEERING',
    'admin': 'Main Admin',
    'super user': 'Super User',
    'super-user': 'Super User',
  };
  return displayNames[roleLower] || role.toUpperCase();
}

/**
 * Get primary business role for display (prioritizes business roles over admin)
 */
export function getPrimaryRole(userRoles: string[] | undefined): string | null {
  if (!userRoles || userRoles.length === 0) return null;
  
  // First, check for business roles
  for (const role of userRoles) {
    if (BUSINESS_ROLES.includes(role.toLowerCase())) {
      return role;
    }
  }
  
  // Then check for admin roles
  for (const role of userRoles) {
    if (ADMIN_ROLES.includes(role.toLowerCase())) {
      return role;
    }
  }
  
  // Return first role if no match
  return userRoles[0] || null;
}

/**
 * Get role-specific dashboard description
 */
export function getRoleDashboardDescription(userRoles: string[] | undefined): string {
  if (!userRoles || userRoles.length === 0) {
    return 'Access your portfolio analysis dashboard to view key performance indicators and metrics.';
  }
  
  const primaryRole = getPrimaryRole(userRoles);
  if (!primaryRole) {
    return 'Access your portfolio analysis dashboard to view key performance indicators and metrics.';
  }
  
  const roleLower = primaryRole.toLowerCase();
  
  if (ADMIN_ROLES.includes(roleLower)) {
    return 'As Main Admin, you have full access to all portfolio data across all business classes and can manage system settings. Use this dashboard to monitor overall performance, analyze trends, and manage system settings.';
  }
  
  if (roleLower === SUPER_USER_ROLE.toLowerCase()) {
    return 'As a Super User, you have full access to all portfolio data across all business classes. Use this dashboard to monitor overall performance, analyze trends, and view comprehensive analytics.';
  }
  
  const descriptions: Record<string, string> = {
    'li': 'As a Life Underwriter, you have access to all dashboard features and analytical tools. All data displayed is filtered to show only Life (LI) class business, allowing you to focus on your specific portfolio. Use the Dashboard for KPIs, Analytics for detailed breakdowns, World Map for geographic distribution, Overview for time-based analysis, and Client Overview for broker/cedant insights.',
    'fi': 'As a Property Underwriter, you have access to all dashboard features and analytical tools. All data displayed is filtered to show only Property (FI) class business, allowing you to focus on your specific portfolio. Use the Dashboard for KPIs, Analytics for detailed breakdowns, World Map for geographic distribution, Overview for time-based analysis, and Client Overview for broker/cedant insights.',
    'eg': 'As an Energy Underwriter, you have access to all dashboard features and analytical tools. All data displayed is filtered to show only Energy (EG) class business, allowing you to focus on your specific portfolio. Use the Dashboard for KPIs, Analytics for detailed breakdowns, World Map for geographic distribution, Overview for time-based analysis, and Client Overview for broker/cedant insights.',
    'ca': 'As a Cargo Underwriter, you have access to all dashboard features and analytical tools. All data displayed is filtered to show only Cargo (CA) class business, allowing you to focus on your specific portfolio. Use the Dashboard for KPIs, Analytics for detailed breakdowns, World Map for geographic distribution, Overview for time-based analysis, and Client Overview for broker/cedant insights.',
    'hu': 'As a Hull Underwriter, you have access to all dashboard features and analytical tools. All data displayed is filtered to show only Hull (HU) class business, allowing you to focus on your specific portfolio. Use the Dashboard for KPIs, Analytics for detailed breakdowns, World Map for geographic distribution, Overview for time-based analysis, and Client Overview for broker/cedant insights.',
    'marine': 'As a Marine Underwriter, you have access to all dashboard features and analytical tools. All data displayed is filtered to show only Marine (CA + HU) class business, allowing you to focus on your specific portfolio. Use the Dashboard for KPIs, Analytics for detailed breakdowns, World Map for geographic distribution, Overview for time-based analysis, and Client Overview for broker/cedant insights.',
    'ac': 'As a Casualty Underwriter, you have access to all dashboard features and analytical tools. All data displayed is filtered to show only Casualty (AC) class business, allowing you to focus on your specific portfolio. Use the Dashboard for KPIs, Analytics for detailed breakdowns, World Map for geographic distribution, Overview for time-based analysis, and Client Overview for broker/cedant insights.',
    'en': 'As an Engineering Underwriter, you have access to all dashboard features and analytical tools. All data displayed is filtered to show only Engineering (EN) class business, allowing you to focus on your specific portfolio. Use the Dashboard for KPIs, Analytics for detailed breakdowns, World Map for geographic distribution, Overview for time-based analysis, and Client Overview for broker/cedant insights.',
  };
  
  return descriptions[roleLower] || 'Access your portfolio analysis dashboard to view key performance indicators and metrics specific to your role.';
}

