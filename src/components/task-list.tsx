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
import { Trash2, Edit } from 'lucide-react';
import { getAllTasks, type Task } from '@/services/realcollab'; // Adjust path as needed
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface TaskListProps {
  limit?: number; // Optional limit for dashboard view
}

export function TaskList({ limit }: TaskListProps) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedTasks = await getAllTasks();
        setTasks(fetchedTasks);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tasks. Please try again later.');
         toast({
          title: "Error Loading Tasks",
          description: "Could not fetch tasks from the server.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [toast]);

  const handleStatusChange = (taskId: string, currentStatus: string) => {
    // TODO: Implement API call to update task status
    console.log(`Updating status for task ${taskId} from ${currentStatus}`);
     toast({
      title: "Status Update (Not Implemented)",
      description: `Would update task ${taskId} status.`,
    });
    // Optimistically update UI or refetch after API call
  };

  const handleDelete = (taskId: string) => {
     // TODO: Implement API call to delete task
    console.log(`Deleting task ${taskId}`);
    toast({
      title: "Delete Task (Not Implemented)",
      description: `Would delete task ${taskId}.`,
      variant: "destructive",
    });
    // Optimistically remove from UI or refetch after API call
     setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
  }

  const handleEdit = (taskId: string) => {
    // TODO: Implement logic to open an edit modal/form
    console.log(`Editing task ${taskId}`);
     toast({
      title: "Edit Task (Not Implemented)",
      description: `Would open edit form for task ${taskId}.`,
    });
  }

  const displayedTasks = limit ? tasks.slice(0, limit) : tasks;

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(limit || 5)].map((_, i) => (
           <div key={i} className="flex items-center space-x-4 p-2">
             <Skeleton className="h-4 w-4" />
             <Skeleton className="h-4 flex-grow" />
             <Skeleton className="h-4 w-20" />
             <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (displayedTasks.length === 0) {
      return <p>No tasks found.</p>
  }


  return (
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
          <TableRow key={task._id}>
            <TableCell>
              <Checkbox
                 checked={task.status === 'Completed'} // Example: Check if completed
                 onCheckedChange={() => handleStatusChange(task._id, task.status)}
                 aria-label={`Mark task ${task.title} status`}
               />
            </TableCell>
            <TableCell className="font-medium">{task.title}</TableCell>
            <TableCell>
              <Badge variant={task.status === 'Completed' ? 'secondary' : 'default'}>
                {task.status}
              </Badge>
            </TableCell>
            <TableCell>
              {task.dueDate ? format(new Date(task.dueDate), 'PPP') : 'N/A'}
            </TableCell>
            <TableCell>{task.assignedTo}</TableCell>
             <TableCell className="text-right space-x-2">
               <Button variant="ghost" size="icon" onClick={() => handleEdit(task._id)} aria-label={`Edit task ${task.title}`}>
                 <Edit className="h-4 w-4" />
               </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(task._id)} aria-label={`Delete task ${task.title}`}>
                 <Trash2 className="h-4 w-4 text-destructive" />
               </Button>
             </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
