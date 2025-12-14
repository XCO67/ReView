import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getAllUsers, getAllRoles } from '@/lib/db-queries';
import { initDb } from '@/lib/db';
import UserManagementClient from './UserManagementClient';

export default async function UsersPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.roles.includes('admin')) {
    redirect('/dashboard');
  }

  await initDb();
  const [users, roles] = await Promise.all([getAllUsers(), getAllRoles()]);

  return <UserManagementClient initialUsers={users} roles={roles} />;
}

