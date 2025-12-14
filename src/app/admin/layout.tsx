import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AdminSidebarNav, type AdminNavItem } from '@/components/admin/AdminSidebarNav';
import { AdminHeaderActions } from '@/components/admin/AdminHeaderActions';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const NAV_ITEMS: AdminNavItem[] = [
  {
    label: 'Overview',
    description: 'Control center',
    href: '/admin',
    iconName: 'OV',
  },
  {
    label: 'Users',
    description: 'Create & manage accounts',
    href: '/admin/users',
    iconName: 'US',
  },
  {
    label: 'Roles',
    description: 'Permissions & access',
    href: '/admin/roles',
    iconName: 'RO',
  },
  {
    label: 'Audit Logs',
    description: 'Login and logout activity',
    href: '/admin/logs',
    iconName: 'LG',
  },
  {
    label: 'Analytics',
    description: 'Back to dashboard',
    href: '/dashboard',
    iconName: 'AD',
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.roles.includes('admin')) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020202] via-[#050505] to-[#0b0b0b] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-72 flex-col border-r border-white/10 bg-[#050505]/85 px-6 py-6 backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-start space-y-3">
            <BrandLogo
              size={170}
              showWordmark={false}
              priority
            />
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              Admin Control
            </p>
            <p className="text-sm text-white/60">
              Secure access to configuration tools
            </p>
          </div>
          <div className="flex flex-col">
            <AdminSidebarNav items={NAV_ITEMS} />
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <p className="text-xs uppercase text-white/40">Signed in as</p>
                <p className="mt-1 text-sm font-semibold">{session.name}</p>
                <p className="text-xs text-white/50">{session.email}</p>
                <span className="mt-2 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                  Admin
                </span>
              </div>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 px-6 py-4 backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                  Admin Portal
                </p>
                <h1 className="text-2xl font-semibold">Welcome back, {session.name}</h1>
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
          <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-[#050505] via-[#070707] to-[#0a0a0a] px-4 py-6 md:px-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

