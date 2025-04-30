'use client'; // Required for hooks

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Clock, RefreshCcw, Info } from 'lucide-react';
import { getTimelogsForUser, type Timelog, getAllTasks, type Task, getUserById } from '@/services/realcollab';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceStrict, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { User as AuthUser } from '@/context/AuthContext';

export default function TimelogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [timelogs, setTimelogs] = React.useState<Timelog[]>([]);
  const [tasksMap, setTasksMap] = React.useState<Map<string, Task>>(new Map());
  const [usersMap, setUsersMap] = React.useState<Map<string, Partial<AuthUser>>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!authLoading && !user) {
      console.log("Timelogs page: No user found after loading, redirecting to /login");
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchData = React.useCallback(async () => {
    if (!user?._id) return; // Guard against missing user ID

    setLoading(true);
    setError(null);
    try {
      // Fetch timelogs, tasks, and users concurrently
      const [fetchedTimelogs, fetchedTasks, fetchedUsers] = await Promise.all([
        getTimelogsForUser(user._id),
        getAllTasks(),
        getAllUsers(), // Fetch all users to map names
      ]);

       // Create maps for quick lookup
      const taskMap = new Map<string, Task>();
      fetchedTasks.forEach(task => taskMap.set(task._id, task));
      setTasksMap(taskMap);

      const userMap = new Map<string, Partial<AuthUser>>();
      fetchedUsers.forEach(u => u._id && userMap.set(u._id, u));
       // Add current user to map if not present (in case getAllUsers doesn't include self)
       if (user && !userMap.has(user._id)) {
          userMap.set(user._id, user);
       }
      setUsersMap(userMap);

      // Sort timelogs by start time, most recent first
      fetchedTimelogs.sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());
      setTimelogs(fetchedTimelogs);

    } catch (err) {
      console.error("Failed to fetch timelogs data:", err);
      const message = err instanceof Error ? err.message : 'Could not load timelogs.';
      setError(message);
      toast({
        title: "Error Loading Data",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]); // Depend on user

  React.useEffect(() => {
    if (user) { // Fetch data only when user is available
      fetchData();
    } else if (!authLoading) { // If not loading and still no user, stop loading indicator
        setLoading(false);
    }
  }, [user, authLoading, fetchData]);

  const formatDuration = (minutes: number): string => {
      if (minutes < 1) return "< 1 min";
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      let result = '';
      if (hours > 0) result += `${hours} hr${hours > 1 ? 's' : ''} `;
      if (remainingMinutes > 0) result += `${remainingMinutes} min${remainingMinutes > 1 ? 's' : ''}`;
      return result.trim();
  };

  const getTaskTitle = (taskId: TaskId): string => {
      return tasksMap.get(taskId)?.title || 'Unknown Task';
  }

  const getUserName = (userId: UserId): string => {
      const u = usersMap.get(userId);
      if (!u) return 'Unknown User';
      return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User';
  }

   if (authLoading || (loading && !user)) { // Show loading while auth checks or initial data loads
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
            <SidebarTrigger className="block md:hidden" />
            <h1 className="text-2xl font-semibold flex items-center">
              <Clock className="mr-2 h-6 w-6 text-primary" /> My Timelogs
            </h1>
          </div>
          {/* Optional: Add date range filter or export button here */}
        </header>
        <div className="flex-1 p-6">
           {loading && (
             <div className="space-y-4">
               {[...Array(5)].map((_, i) => (
                 <Card key={i}>
                   <CardContent className="pt-6">
                     <div className="flex items-center space-x-4">
                       <Skeleton className="h-10 w-10 rounded-full" />
                       <div className="space-y-2 flex-1">
                         <Skeleton className="h-4 w-3/4" />
                         <Skeleton className="h-4 w-1/2" />
                       </div>
                       <Skeleton className="h-5 w-20" />
                     </div>
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
           {error && !loading && (
             <Card className="border-destructive">
               <CardHeader>
                 <CardTitle className="text-destructive">Error Loading Timelogs</CardTitle>
                 <CardDescription>{error}</CardDescription>
               </CardHeader>
               <CardContent>
                 <Button onClick={fetchData} variant="outline" disabled={loading}>
                   <RefreshCcw className="mr-2 h-4 w-4" /> Retry
                 </Button>
               </CardContent>
             </Card>
           )}
          {!loading && !error && timelogs.length === 0 && (
            <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                 <Info className="mx-auto h-10 w-10 mb-3" />
                <p>You haven't logged any time yet.</p>
                <p className="text-sm mt-1">Time logged on tasks will appear here.</p>
              </CardContent>
            </Card>
          )}
          {!loading && !error && timelogs.length > 0 && (
             <div className="space-y-4">
              {timelogs.map((log) => (
                <Card key={log._id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                       <div className="mb-2 sm:mb-0">
                            <p className="font-semibold text-base">{getTaskTitle(log.task)}</p>
                             <p className="text-sm text-muted-foreground">
                               Logged by: {getUserName(log.user)}
                             </p>
                        </div>
                        <div className="text-sm text-right">
                             <p className="font-medium text-primary">{formatDuration(log.duration)}</p>
                             <p className="text-muted-foreground">
                                 {format(parseISO(log.startTime), 'PPP, p')}
                             </p>
                        </div>
                    </div>
                     {log.notes && (
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                             Notes: {log.notes}
                         </p>
                     )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
