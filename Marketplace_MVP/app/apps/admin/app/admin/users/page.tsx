import { fetchUsers } from '@/lib/actions';
import { UsersClient } from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await fetchUsers();
  return <UsersClient users={users} />;
}
