import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getAllRoles } from '@/lib/db-queries';
import { initDb } from '@/lib/db';
import RoleManagementClient from './RoleManagementClient';

export default async function RolesPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.roles.includes('admin')) {
    redirect('/dashboard');
  }

  await initDb();
  // getAllRoles() will automatically clean up duplicates
  const roles = await getAllRoles();

  return <RoleManagementClient initialRoles={roles} />;
}

