'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, RefreshCcw, Eye } from 'lucide-react'; // Added Eye icon
import { getAllTasks, deleteTask, updateTask, type Task, type UpdateTaskData, getAllUsers } from '@/services/realcollab';
import { format, parseISO, isPast } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import type { User } from '@/context/AuthContext';
import { cn } from '@/lib/utils'; // Import cn utility

interface TaskListProps {
  limit?: number; // Optional limit for dashboard view
  refreshKey?: number; // Optional key to trigger refresh from parent
  onEditTask: (task: Task) => void; // Callback to handle edit action
  onViewTask: (task: Task) => void; // Callback to handle view action
}


export function TaskList({ limit, refreshKey, onEditTask, onViewTask }: TaskListProps) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [users, setUsers] = React.useState<Map<string, Partial<User>>>(new Map()); // Map userId -> User details
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

   // Fetch users and store them in a map for quick lookup
   const fetchUsers = React.useCallback(async () => {
    try {
        const fetchedUsers = await getAllUsers();
        const userMap = new Map<string, Partial<User>>();
        fetchedUsers.forEach(user => user._id && userMap.set(user._id, user));
        setUsers(userMap);
        console.log("User map created:", userMap);
    } catch (err) {
        console.error('Failed to fetch users for task list:', err);
        // Non-critical error, maybe show a toast but don't block task loading
        toast({
            title: "Could Not Load User Names",
            description: "Assignee names might not display correctly.",
            variant: "default", // Less intrusive than destructive
        });
    }
   }, [toast]);


  // Fetch Tasks
  const fetchTasks = React.useCallback(async (showLoading = true) => {
    if (showLoading) {
        setLoading(true);
    }
    setError(null);
    try {
      const fetchedTasks = await getAllTasks();
       // Sort by creation date DESC (newest first), then by status (Pending > In Progress > Completed)
       const statusOrder: Record<Task['status'], number> = { 'Pending': 1, 'In Progress': 2, 'Completed': 3 };
      const sortedTasks = fetchedTasks.sort((a, b) => {
          if (a.status !== b.status) {
              return statusOrder[a.status] - statusOrder[b.status]; // Sort by status first
          }
           if (a.dueDate && b.dueDate) {
              return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(); // Then by due date ASC
           }
           if (a.dueDate) return -1; // Tasks with due date first
           if (b.dueDate) return 1;
          return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime(); // Fallback to creation date DESC
      });
      setTasks(sortedTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to load tasks: ${message}`);
      // Only show destructive toast if tasks fail critically
       if (message.includes("Unauthorized")) {
          toast({ title: "Unauthorized", description: "Please log in to view tasks.", variant: "destructive" });
       } else {
         toast({ title: "Error Loading Tasks", description: message, variant: "destructive" });
       }
    } finally {
       if (showLoading) {
        setLoading(false);
       }
    }
  }, [toast]); // Include toast in dependencies

   // Initial data fetch
   React.useEffect(() => {
      setLoading(true);
      Promise.all([fetchTasks(false), fetchUsers()]) // Fetch tasks and users concurrently
           .catch(console.error) // Catch potential errors from Promise.all itself
           .finally(() => setLoading(false));
   }, [fetchTasks, fetchUsers, refreshKey]); // Rerun if refreshKey changes


   // Function to get user name from the map
   const getUserNameById = (userId: string | undefined): string => {
     if (!userId) return 'Unassigned';
     const user = users.get(userId);
     if (!user) return userId.substring(0, 6) + '...'; // Fallback to short ID if user not found
     return user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.email ?? 'Unknown User';
   };


  const handleStatusChange = async (taskId: string, currentStatus: Task['status']) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed'; // Simple toggle for checkbox
     const originalTasks = [...tasks]; // Keep original state for rollback

    // Optimistic UI update
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task._id === taskId ? { ...task, status: newStatus } : task
      )
    );

    try {
       const updateData: UpdateTaskData = { status: newStatus };
       await updateTask(taskId, updateData);
       toast({
         title: "Status Updated",
         description: `Task status changed to ${newStatus}.`,
       });
       // Optionally refetch tasks to ensure consistency, or rely on optimistic update
        fetchTasks(false); // Refetch to get correct sorting after status change
    } catch (error) {
       console.error(`Failed to update task ${taskId} status:`, error);
        // Rollback optimistic update
       setTasks(originalTasks);
       const message = error instanceof Error ? error.message : 'Could not update status.';
       toast({
         title: "Status Update Failed",
         description: message,
         variant: "destructive",
       });
    }
  };

  const handleDelete = async (taskId: string) => {
    const originalTasks = [...tasks];
     // Optimistic UI update
     setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));

    try {
       await deleteTask(taskId);
       toast({
         title: "Task Deleted",
         description: `Task has been successfully deleted.`,
       });
        // No need to refetch if optimistic update is sufficient
    } catch (error) {
        console.error(`Failed to delete task ${taskId}:`, error);
         // Rollback optimistic update
        setTasks(originalTasks);
        const message = error instanceof Error ? error.message : 'Could not delete task.';
        toast({
            title: "Delete Task Failed",
            description: message,
            variant: "destructive",
        });
    }
  };

  const handleEdit = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation(); // Prevent row click event when clicking edit button
      console.log(`Editing task ${task._id}`);
      onEditTask(task);
   };

   const handleView = (task: Task) => {
       console.log(`Viewing task ${task._id}`);
       onViewTask(task);
   }

   const getBadgeVariant = (status: Task['status']): "secondary" | "default" | "outline" => {
    switch (status) {
        case 'Completed': return 'secondary'; // Greyed out or similar
        case 'In Progress': return 'outline'; // Often blue or default outline
        case 'Pending': default: return 'default'; // Primary color (Teal in this theme)
    }
   };

   const isTaskOverdue = (task: Task): boolean => {
       return task.status !== 'Completed' && !!task.dueDate && isPast(parseISO(task.dueDate));
   }


  const displayedTasks = limit ? tasks.slice(0, limit) : tasks;

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(limit || 5)].map((_, i) => (
           <div key={i} className="flex items-center space-x-4 p-4 border rounded-md h-[69px]"> {/* Approx height of a row */}
             <Skeleton className="h-5 w-5" />
             <Skeleton className="h-5 flex-grow" />
             <Skeleton className="h-5 w-24" />
             <Skeleton className="h-5 w-28" />
             <Skeleton className="h-5 w-24" />
             <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
        <div className="text-center py-4">
            <p className="text-destructive mb-2">{error}</p>
            <Button onClick={() => fetchTasks()} variant="outline" size="sm">
                <RefreshCcw className="mr-2 h-4 w-4" /> Retry
            </Button>
        </div>
    );
  }

  if (tasks.length === 0) { // Check tasks directly, not displayedTasks
      return <p className="text-center text-muted-foreground py-4">No tasks found. Add one to get started!</p>
  }


  return (
    <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead> {/* Checkbox */}
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTasks.map((task) => (
              <TableRow
                key={task._id}
                data-state={task.status === 'Completed' ? 'completed' : undefined}
                className={cn(
                    "cursor-pointer hover:bg-muted/50", // Make row clickable
                    task.status === 'Completed' ? 'opacity-70' : '',
                    isTaskOverdue(task) && 'border-l-2 border-l-destructive' // Add indicator for overdue
                   )}
                onClick={() => handleView(task)} // Trigger view details on row click
                >
                <TableCell onClick={(e) => e.stopPropagation()} className="cursor-default"> {/* Stop propagation on checkbox click */}
                  <Checkbox
                    checked={task.status === 'Completed'}
                    onCheckedChange={() => handleStatusChange(task._id, task.status)}
                    aria-label={`Mark task ${task.title} as ${task.status === 'Completed' ? 'Pending' : 'Completed'}`}
                    id={`task-checkbox-${task._id}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>
                   <Badge variant={getBadgeVariant(task.status)}>
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell className={cn(isTaskOverdue(task) && 'text-destructive font-medium')}>
                  {task.dueDate ? format(parseISO(task.dueDate), 'PPP') : <span className="text-muted-foreground">N/A</span>}
                </TableCell>
                <TableCell>{getUserNameById(task.assignedTo)}</TableCell>
                <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}> {/* Stop propagation on action buttons click */}
                  {/* View Button (Optional, as row click does the same) */}
                   {/* <Button variant="ghost" size="icon" onClick={() => handleView(task)} aria-label={`View task ${task.title}`}>
                     <Eye className="h-4 w-4" />
                   </Button> */}
                  <Button variant="ghost" size="icon" onClick={(e) => handleEdit(e, task)} aria-label={`Edit task ${task.title}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                   <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" aria-label={`Delete task ${task.title}`}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the task
                                "<span className="font-semibold">{task.title}</span>".
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(task._id)} className={buttonVariants({ variant: "destructive" })}>
                                Delete
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  );
}

