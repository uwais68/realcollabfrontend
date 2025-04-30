
import { NotificationCenter } from '@/components/notification-center';
import { AppSidebar } from '@/components/app-sidebar';

export default function NotificationsPage() {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1">
        <NotificationCenter />
      </main>
    </div>
  );
}
