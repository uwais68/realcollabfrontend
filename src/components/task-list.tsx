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
import { Trash2, Edit, RefreshCcw } from 'lucide-react';
import { getAllTasks, deleteTask, updateTask, type Task, type UpdateTaskData } from '@/services/realcollab';
import { format, parseISO } from 'date-fns';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TaskListProps {
  limit?: number; // Optional limit for dashboard view
  refreshKey?: number; // Optional key to trigger refresh from parent
  onEditTask?: (task: Task) => void; // Callback to handle edit action
}

// TODO: Fetch actual user data to display names instead of IDs
const getUserNameById = (userId: string | undefined) => {
    // Replace with actual user fetching/lookup logic
    if (!userId) return 'Unassigned';
    return userId === 'admin' ? 'Admin User' : userId.startsWith('user') ? `User ${userId.slice(4)}` : userId;
}

export function TaskList({ limit, refreshKey, onEditTask }: TaskListProps) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = React.useCallback(async (showLoading = true) => {
    if (showLoading) {
        setLoading(true);
    }
    setError(null);
    try {
      const fetchedTasks = await getAllTasks();
       // Sort by creation date, newest first
      const sortedTasks = fetchedTasks.sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
      setTasks(sortedTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to load tasks: ${message}`);
      toast({
        title: "Error Loading Tasks",
        description: message,
        variant: "destructive",
      });
    } finally {
       if (showLoading) {
        setLoading(false);
       }
    }
  }, [toast]); // Include toast in dependencies

  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshKey]); // Add refreshKey to dependencies

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
       // await fetchTasks(false); // Fetch without showing loading spinner
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
         variant: "destructive", // Use destructive variant for delete confirmation
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

  const handleEdit = (task: Task) => {
    console.log(`Editing task ${task._id}`);
    if (onEditTask) {
        onEditTask(task);
    } else {
         toast({
          title: "Edit Task (Not Implemented)",
          description: `Edit action for task "${task.title}" is not configured.`,
        });
    }
  };

   const getBadgeVariant = (status: Task['status']): "secondary" | "default" | "outline" => {
    switch (status) {
        case 'Completed':
            return 'secondary';
        case 'In Progress':
            return 'outline'; // Or another variant if you prefer
        case 'Pending':
        default:
            return 'default'; // Default variant often maps to primary
    }
   };

  const displayedTasks = limit ? tasks.slice(0, limit) : tasks;

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(limit || 5)].map((_, i) => (
           <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
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

  if (displayedTasks.length === 0) {
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTasks.map((task) => (
              <TableRow key={task._id} data-state={task.status === 'Completed' ? 'selected' : undefined}>
                <TableCell>
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
                <TableCell>
                  {task.dueDate ? format(parseISO(task.dueDate), 'PPP') : <span className="text-muted-foreground">N/A</span>}
                </TableCell>
                 {/* TODO: Fetch and display user names instead of IDs */}
                <TableCell>{getUserNameById(task.assignedTo)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(task)} aria-label={`Edit task ${task.title}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                   <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" aria-label={`Delete task ${task.title}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
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
