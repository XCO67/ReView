import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

function hasAdminRole(roles: string[] = []) {
  return roles.some((role) => role.toLowerCase() === 'main-admin');
}

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login?next=/admin');
  }

  if (!hasAdminRole(session.roles)) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Admin Control Center</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage users, roles, and system activity for the Kuwait Re analytics portal.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">User Overview</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Main Admin
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Placeholder area for user provisioning tools. Hook this card up to the upcoming admin APIs to view and invite users.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Audit Trail</h2>
            <p className="text-sm text-muted-foreground mt-2">
              This section will display recent admin actions once the audit API is connected.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Signed in as</h2>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>Name: {session.name ?? 'N/A'}</p>
            <p>Email: {session.email ?? 'N/A'}</p>
            <p>Roles: {session.roles.join(', ') || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}


