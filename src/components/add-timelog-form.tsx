'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock, FileText } from 'lucide-react';

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { createTimelog, type CreateTimelogData, type Task } from '@/services/realcollab'; // Corrected Timelog types
import { useAuth } from '@/context/AuthContext'; // To get current user ID

// Form schema based on new CreateTimelogData (task, timeSpent, description, endDate)
const formSchema = z.object({
  // task and user are handled outside the form
  timeSpent: z.coerce.number().min(1, { message: "Time spent must be at least 1 minute." }), // Ensure positive number
  description: z.string().optional(),
  endDate: z.date().optional().nullable(), // Optional end date
});

// Infer the type for the form based on the schema
type TimelogFormValues = z.infer<typeof formSchema>;

interface AddTimelogFormProps {
  task: Task; // Pass the full task object for context if needed
  onTimelogAdded: () => void;
  onCancel: () => void;
}

export function AddTimelogForm({ task, onTimelogAdded, onCancel }: AddTimelogFormProps) {
  const { toast } = useToast();
  const { user } = useAuth(); // Get the logged-in user
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<TimelogFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      timeSpent: undefined, // Start empty
      description: '',
      endDate: null, // Start with no end date
    },
  });

  async function onSubmit(values: TimelogFormValues) {
     if (!user) {
        toast({ title: "Error", description: "You must be logged in to add a timelog.", variant: "destructive" });
        return;
     }
    setIsSubmitting(true);
    try {
      // Prepare data for API call based on new schema
      const apiData: CreateTimelogData = {
        task: task._id, // Task ID from prop
        timeSpent: values.timeSpent, // Time spent in minutes
        description: values.description,
        // Convert endDate to ISO string if it exists, otherwise undefined
        endDate: values.endDate ? values.endDate.toISOString() : undefined,
      };

      console.log('Submitting timelog data to API:', apiData);
      const result = await createTimelog(apiData);
      console.log('Timelog created successfully:', result.newTimelog);

      toast({
        title: "Timelog Added",
        description: `Time logged successfully for task "${task.title}".`,
      });

      form.reset(); // Reset form after successful submission
      onTimelogAdded(); // Callback to notify parent component

    } catch (error) {
      console.error('Failed to create timelog:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        title: "Error Adding Timelog",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
         <p className="text-sm text-muted-foreground">
             Logging time for task: <span className='font-medium text-foreground'>{task.title}</span>
         </p>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="timeSpent"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Time Spent (Minutes)</FormLabel>
                     <FormControl>
                        <Input type="number" placeholder="e.g., 30" {...field} disabled={isSubmitting} min="1"/>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                    <FormLabel>End Date (Optional)</FormLabel>
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
                            {field.value ? format(field.value, "PPP") : <span>Pick end date</span>}
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value ?? undefined} // Pass undefined if null
                            onSelect={(date) => field.onChange(date ?? null)} // Send null back if cleared
                            disabled={isSubmitting}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />

        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the work done during this time" {...field} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
             <Clock className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Logging Time...' : 'Log Time'}
            </Button>
         </div>
      </form>
    </Form>
  );
}
