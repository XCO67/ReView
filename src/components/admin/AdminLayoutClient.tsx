"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AdminHeaderActions } from '@/components/admin/AdminHeaderActions';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  sessionName: string;
}

export function AdminLayoutClient({ children, sessionName }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const isRiskAssessmentPage = pathname?.includes('/admin/risk-assessment');

  return (
    <>
      {!isRiskAssessmentPage && (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 px-6 py-4 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                Admin Portal
              </p>
              <h1 className="text-2xl font-semibold">Welcome back, {sessionName}</h1>
              <p className="text-sm text-white/60">
                Monitor system health and manage secure access.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:scale-[1.01] hover:from-gray-600 hover:to-gray-700"
              >
                View dashboard
              </Link>
              <AdminHeaderActions />
            </div>
          </div>
        </header>
      )}
      {children}
    </>
  );
}

