import { requireAdmin } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();
  const adminEmail = profile.email ?? 'admin';

  return (
    <div className="flex h-screen">
      <Sidebar adminEmail={adminEmail} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
