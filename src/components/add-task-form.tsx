'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
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
import { createTask, type CreateTaskData, getAllUsers } from '@/services/realcollab'; // Import API function and type
import type { User } from '@/context/AuthContext'; // Import User type if needed

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'] as const; // Match backend schema

// Form schema based on CreateTaskData (excluding backend-generated fields)
const formSchema = z.object({
  title: z.string().min(2, {
    message: 'Title must be at least 2 characters.',
  }),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES),
  dueDate: z.date().optional(),
  assignedTo: z.string().optional().nullable(), // Allow null for unassigned
});

// Infer the type for the form based on the schema
type TaskFormValues = z.infer<typeof formSchema>;

export function AddTaskForm({ onTaskAdded }: { onTaskAdded?: () => void }) {
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
        // Leave users array empty or handle error state appropriately
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [toast]);


  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      status: TASK_STATUSES[0], // Default to 'Pending'
      assignedTo: null, // Default to null for unassigned
      dueDate: undefined,
    },
  });

  async function onSubmit(values: TaskFormValues) {
    setIsSubmitting(true);
    try {
      // Prepare data for API call, potentially converting date
      const apiData: CreateTaskData = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
        // assignedTo is already a string (UserId) or null
        assignedTo: values.assignedTo || "Assigned", // Ensure null if empty string
      };

      console.log('Submitting task data to API:', apiData);
      const newTask = await createTask(apiData);
      console.log('Task created successfully:', newTask);

      toast({
        title: "Task Created",
        description: `Task "${newTask.title}" has been added successfully.`,
      });
      form.reset(); // Reset form after successful submission
      onTaskAdded?.(); // Callback to notify parent component (e.g., refresh task list)

    } catch (error) {
      console.error('Failed to create task:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        title: "Error Creating Task",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Textarea placeholder="Enter task description (optional)" {...field} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
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
                <FormLabel>Due Date (Optional)</FormLabel>
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
                        selected={field.value}
                        onSelect={field.onChange}
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
         <div className="grid md:grid-cols-1 gap-6"> {/* Single column for assignee */}
          <FormField
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign To (Optional)</FormLabel>
                <Select
                   onValueChange={(value) => field.onChange(value === "" ? null : value)}
                   value={field.value ?? ""} // Use empty string for 'Unassigned'
                   disabled={isSubmitting || loadingUsers}
                 >
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
                         {/* Display user's full name or email */}
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
        <Button type="submit" disabled={isSubmitting || loadingUsers}>
          {isSubmitting ? 'Adding Task...' : 'Add Task'}
        </Button>
      </form>
    </Form>
  );
}
