import Link from 'next/link';
import {
  Users,
  Shield,
  BarChart3,
} from 'lucide-react';
import { initDb } from '@/lib/db';
import { getActiveUserCounts } from '@/lib/db-queries';

const quickLinks = [
  {
    href: '/admin/users',
    title: 'User Management',
    description: 'Create, disable, and audit accounts',
    icon: Users,
    accent: 'from-white/20 via-white/0 to-white/10',
  },
  {
    href: '/admin/roles',
    title: 'Role Directory',
    description: 'Define permissions & responsibilities',
    icon: Shield,
    accent: 'from-white/20 via-white/0 to-white/10',
  },
  {
    href: '/dashboard',
    title: 'Analytics Dashboard',
    description: 'Launch the public insights experience',
    icon: BarChart3,
    accent: 'from-white/20 via-white/0 to-white/10',
  },
];

export default async function AdminPage() {
  await initDb();
  const { nonAdminCount } = await getActiveUserCounts();
  const formattedUsers = `${nonAdminCount.toLocaleString()} ${nonAdminCount === 1 ? 'user' : 'users'}`;
  const statCards = [
    {
      label: 'Active Users',
      value: formattedUsers,
      icon: Users,
      pill: 'Non-admin seats',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-white/10 bg-[#060606]/95 p-6 transition-all duration-300 hover:border-white/40 hover:bg-[#0a0a0a] hover:shadow-[0_15px_55px_rgba(0,0,0,0.65)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-wide text-white/60">
                {card.label}
              </p>
              <card.icon className="h-5 w-5 text-white/70" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">{card.value}</p>
            <span className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              {card.pill}
            </span>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-3xl border border-white/10 bg-[#050505]/90 p-6 transition-all duration-300 hover:border-white/40 hover:bg-[#0d0d0d] hover:shadow-[0_25px_70px_rgba(0,0,0,0.85)] hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-white/5 p-3 text-white">
                <link.icon className="h-6 w-6" />
              </div>
              <div
                className={`h-12 w-12 rounded-full bg-gradient-to-br ${link.accent} blur-2xl opacity-40`}
              />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">{link.title}</h3>
            <p className="mt-2 text-sm text-white/70">{link.description}</p>
            <span className="mt-6 inline-flex items-center text-sm font-semibold text-white/80">
              Open module →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

