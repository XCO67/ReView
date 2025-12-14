import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

function hasRole(session: Awaited<ReturnType<typeof getSession>>, role: string): boolean {
  return session?.roles?.some((r) => r.toLowerCase() === role.toLowerCase()) ?? false;
}

const BUSINESS_ROLES = ['fi', 'eg', 'ca', 'hu', 'marine', 'ac', 'en', 'li'];
const ADMIN_ROLES = ['admin'];
const SUPER_USER_ROLE = 'Super User';

function hasBusinessRole(session: Awaited<ReturnType<typeof getSession>>): boolean {
  if (!session?.roles) return false;
  return session.roles.some((r) => BUSINESS_ROLES.includes(r.toLowerCase()));
}

export default async function HomePage() {
  const session = await getSession();
  
  // No session - redirect to login
  if (!session) {
    redirect('/login');
  }

  // Admin users go to admin panel
  if (hasRole(session, 'admin')) {
    redirect('/admin');
  }

  // Default to dashboard for super-user and business role users
  redirect('/dashboard');
}
