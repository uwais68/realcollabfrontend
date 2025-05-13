'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { updateTask, type Task, type UpdateTaskData, getAllUsers } from '@/services/realcollab'; // Import API function and types
import type { User } from '@/context/AuthContext'; // Import User type if needed

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'] as const; // Match backend schema

// Form schema for editing (similar to creation, but using UpdateTaskData structure)
const formSchema = z.object({
  title: z.string().min(2, {
    message: 'Title must be at least 2 characters.',
  }),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES),
  dueDate: z.date().optional().nullable(), // Allow null for clearing the date
  assignedTo: z.string().optional().nullable(), // Allow null for unassigning
});

// Infer the type for the form based on the schema
type TaskFormValues = z.infer<typeof formSchema>;

interface EditTaskFormProps {
  task: Task;
  onTaskUpdated: () => void;
  onCancel: () => void;
}

export function EditTaskForm({ task, onTaskUpdated, onCancel }: EditTaskFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [users, setUsers] = React.useState<Partial<User>[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);

   // Fetch users on component mount
   React.useEffect(() => {
     const fetchUsers = async () => {
       setLoadingUsers(true);
       try {
         const fetchedUsers = await getAllUsers();
         setUsers(fetchedUsers);
       } catch (error) {
         console.error("Failed to fetch users:", error);
         toast({
           title: "Error Loading Users",
           description: "Could not load user list for assignment.",
           variant: "destructive",
         });
       } finally {
         setLoadingUsers(false);
       }
     };
     fetchUsers();
   }, [toast]);


  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task.title || '',
      description: task.description || '',
      status: task.status || TASK_STATUSES[0],
      // Ensure assignedTo is handled correctly (might be undefined/null in Task)
      assignedTo: task.assignedTo || null,
      // Parse ISO string date back to Date object for the calendar
      dueDate: task.dueDate ? parseISO(task.dueDate) : null,
    },
  });

  async function onSubmit(values: TaskFormValues) {
    setIsSubmitting(true);
    try {
      // Prepare data for API call
      const apiData: UpdateTaskData = {
        title: values.title,
        description: values.description,
        status: values.status,
        // Convert Date back to ISO string if present, handle null for clearing
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined, // Send undefined to backend if null/cleared
        // assignedTo should be string or undefined for the API
        assignedTo: values.assignedTo || undefined,
      };

      // Filter out unchanged values to send only necessary updates
      const changedData: UpdateTaskData = {};
      let hasChanges = false;

      // Compare title
        if (apiData.title !== task.title) {
            changedData.title = apiData.title;
            hasChanges = true;
        }

        // Compare description (handle undefined/null)
        if ((apiData.description ?? '') !== (task.description ?? '')) {
            changedData.description = apiData.description;
            hasChanges = true;
        }

        // Compare status
        if (apiData.status !== task.status) {
            changedData.status = apiData.status;
            hasChanges = true;
        }

       // Compare dueDate (handle Date vs ISO string vs null/undefined)
       const originalDueDateISO = task.dueDate ? parseISO(task.dueDate).toISOString() : undefined;
       if (apiData.dueDate !== originalDueDateISO) {
           changedData.dueDate = apiData.dueDate;
           hasChanges = true;
       }

       // Compare assignedTo (handle null/undefined)
       const originalAssignedTo = task.assignedTo || undefined;
       if (apiData.assignedTo !== originalAssignedTo) {
           changedData.assignedTo = apiData.assignedTo;
           hasChanges = true;
       }


       if (!hasChanges) {
           toast({ title: "No Changes Detected", description: "No fields were modified."});
           setIsSubmitting(false);
           onCancel(); // Close the form as no changes were made
           return;
       }

      console.log(`Submitting updated task data for ${task._id}:`, changedData);
      await updateTask(task._id, changedData);

      // No need for toast here, parent component handles it via onTaskUpdated
      onTaskUpdated(); // Notify parent component

    } catch (error) {
      console.error('Failed to update task:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        title: "Error Updating Task",
        description: errorMessage,
        variant: "destructive",
      });
       setIsSubmitting(false); // Re-enable buttons on error
    }
    // Don't set isSubmitting=false on success, parent closes the dialog
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter task title" {...field} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter task description (optional)" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col pt-2">
                <FormLabel>Due Date</FormLabel>
                 <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                         disabled={isSubmitting}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                         {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                         selected={field.value ?? undefined} // Pass undefined if null
                         onSelect={(date) => field.onChange(date ?? null)} // Send null back if cleared
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0)) || isSubmitting // Disable past dates and during submit
                        }
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <div className="grid grid-cols-1 gap-4"> {/* Only Assignee here */}
          <FormField
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign To</FormLabel>
                 <Select
                    onValueChange={(value) => field.onChange(value === "unassigned" ? null : value)}
                    value={field.value ?? "unassigned"} // Use "unassigned" instead of empty string
                    disabled={isSubmitting || loadingUsers}>
                  <FormControl>
                    <SelectTrigger>
                       <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select user"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     <SelectItem value="unassigned">
                        <span className="text-muted-foreground">Unassigned</span>
                    </SelectItem>
                    {!loadingUsers && users.map((user) => (
                        <SelectItem key={user._id} value={user._id!}>
                          {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.email}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loadingUsers}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
         </div>
      </form>
    </Form>
  );
}