'use client';

import * as React from 'react';
import { Clock, Calendar, User, Trash2, RefreshCcw, Info, Edit, FileText } from 'lucide-react';
import { format, formatDistanceStrict, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getTimelogsForTask, type Timelog, type TaskId, type UserId, getAllUsers } from '@/services/realcollab'; // Corrected types and API functions
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import type { User as AuthUser } from '@/context/AuthContext'; // User type from auth context

interface TimelogListProps {
  taskId: TaskId; // Primarily fetch by task ID
  refreshKey?: number; // Optional key to trigger refresh
  // Remove edit/delete props as functionality is removed
}

export function TimelogList({ taskId, refreshKey }: TimelogListProps) {
  const [timelogs, setTimelogs] = React.useState<Timelog[]>([]);
  const [usersMap, setUsersMap] = React.useState<Map<string, Partial<AuthUser>>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = React.useCallback(async () => {
    try {
      const fetchedUsers = await getAllUsers();
      const map = new Map<string, Partial<AuthUser>>();
      fetchedUsers.forEach(user => user._id && map.set(user._id, user));
      setUsersMap(map);
    } catch (err) {
      console.error("Failed to fetch users for timelog list:", err);
      // Non-critical, proceed without names if needed
    }
  }, []);

  const fetchTimelogs = React.useCallback(async (showLoading = true) => {
    if (!taskId) {
      setError("No Task ID provided.");
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const fetchedData = await getTimelogsForTask(taskId); // Use updated API function
      // Sort by dateLogged descending (most recent first)
      fetchedData.sort((a, b) => parseISO(b.dateLogged).getTime() - parseISO(a.dateLogged).getTime());
      setTimelogs(fetchedData);
      console.log(`Fetched ${fetchedData.length} timelogs for task ${taskId}`);
    } catch (err) {
      console.error(`Failed to fetch timelogs for task ${taskId}:`, err);
      const message = err instanceof Error ? err.message : 'Could not load timelogs.';
      setError(message);
      toast({
        title: "Error Loading Timelogs",
        description: message,
        variant: "destructive",
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [taskId, toast]);

  React.useEffect(() => {
     setLoading(true);
     Promise.all([fetchTimelogs(false), fetchUsers()])
        .catch(console.error)
        .finally(() => setLoading(false));
  }, [fetchTimelogs, fetchUsers, refreshKey]); // Rerun if taskId, refreshKey changes

  // Remove handleDelete as the API route is not provided
  /*
  const handleDelete = async (timelogId: TimelogId) => { ... }
  */

  const formatDuration = (minutes: number): string => {
      if (minutes < 1) return "< 1 min";
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      let result = '';
      if (hours > 0) {
          result += `${hours} hr${hours > 1 ? 's' : ''} `;
      }
      if (remainingMinutes > 0) {
          result += `${remainingMinutes} min${remainingMinutes > 1 ? 's' : ''}`;
      }
      return result.trim();
   };

   const getUserName = (userId: UserId): string => {
       const user = usersMap.get(userId);
       if (!user) return userId["email"].substring(0, 6) + '...';
       return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User';
   }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center p-3 border rounded-md h-[70px]">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-16 ml-4" />
            {/* Removed skeleton for delete button */}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-destructive">
        <p>{error}</p>
        <Button onClick={() => fetchTimelogs()} variant="outline" size="sm" className="mt-2">
          <RefreshCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  if (timelogs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Info className="mx-auto h-8 w-8 mb-2" />
        <p>No time logged for this task yet.</p>
        <p className="text-xs mt-1">Use the 'Log Time' button to add entries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {timelogs.map((timelog) => (
        <div
          key={timelog._id}
          className="flex items-start p-3 border rounded-lg bg-card hover:bg-muted/20 transition-colors duration-150"
        >
           {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* User and Date Logged */}
            <div className="flex items-center text-sm text-muted-foreground">
                <User className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="font-medium mr-2 text-foreground">{getUserName(timelog.user)}</span>
                <Calendar className="h-4 w-4 mr-1.5 shrink-0" />
                <span>Logged: {format(parseISO(timelog.dateLogged), 'PPP')}</span>
                {timelog.endDate && (
                  <span className="ml-2 text-xs">(Ended: {format(parseISO(timelog.endDate), 'PPP')})</span>
                )}
             </div>

            {/* Time Spent */}
            <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-1.5 text-primary shrink-0" />
                <span className="font-semibold text-primary">{formatDuration(timelog.timeSpent)}</span>
             </div>

            {/* Description */}
            {timelog.description && (
              <div className="flex items-start text-xs text-muted-foreground pt-1">
                 <FileText className="h-3.5 w-3.5 mr-1.5 mt-0.5 shrink-0" />
                <p className=" " title={timelog.description}>
                     {timelog.description}
                 </p>
              </div>
            )}
          </div>

          {/* Actions (Removed as backend doesn't support edit/delete) */}
          {/*
           <div className="ml-4 flex flex-col space-y-1 items-end shrink-0">
                <AlertDialog> ... Delete Button ... </AlertDialog>
           </div>
           */}
        </div>
      ))}
    </div>
  );
}
