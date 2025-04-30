
import { TaskManagement } from '@/components/task-management';
import { AppSidebar } from '@/components/app-sidebar';

export default function TasksPage() {
  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1">
        <TaskManagement />
      </main>
    </div>
  );
}
