'use client'; // Required for hooks

import * as React from 'react';
import { useRouter } from 'next/navigation';
// import { MilestoneManagement } from '@/components/milestone-management'; // Component likely not needed
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Target } from 'lucide-react';

export default function MilestonesPage() {
   const { user, isLoading } = useAuth();
   const router = useRouter();

   React.useEffect(() => {
    if (!isLoading && !user) {
       console.log("Milestones page: No user found after loading, redirecting to /login");
      router.push('/login');
    }
   }, [user, isLoading, router]);

   if (isLoading || !user) {
     return (
         <div className="flex justify-center items-center h-screen">
             <p>Loading...</p>
         </div>
     );
   }

  return (
    <div className="flex h-screen">
      <AppSidebar />
       <main className="flex-1 overflow-y-auto flex flex-col">
            <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="block md:hidden"/>
                    <h1 className="text-2xl font-semibold flex items-center">
                         <Target className="mr-2 h-6 w-6 text-primary" /> Milestones Guide
                    </h1>
                </div>
            </header>
            <div className="flex-1 p-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Viewing & Managing Milestones</CardTitle>
                        <CardDescription>
                           Milestones help break down larger tasks into smaller, manageable steps.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <p className="mb-4">
                          To view, add, or manage milestones for a specific task:
                       </p>
                       <ol className="list-decimal list-inside space-y-2 mb-4">
                            <li>Navigate to the <a href="/tasks" className="text-primary underline hover:text-primary/80 font-medium">Tasks page</a>.</li>
                            <li>Click on the task row you want to view or manage.</li>
                            <li>A dialog will open showing the task details and its associated milestones.</li>
                            <li>You can add new milestones or mark existing ones as achieved directly within the task details dialog.</li>
                       </ol>
                       <p className="text-muted-foreground text-sm">
                          Currently, there isn't a separate page to view all milestones across all tasks. Milestones are managed within the context of their parent task.
                       </p>
                    </CardContent>
                 </Card>
            </div>
        </main>
    </div>
  );
}
