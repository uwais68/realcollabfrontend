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
import { createTimelog, type CreateTimelogData, type TaskId, type Task } from '@/services/realcollab';
import { useAuth } from '@/context/AuthContext'; // To get current user ID

// Form schema based on CreateTimelogData
const formSchema = z.object({
  // task and user are passed as props/context
  startTime: z.date({ required_error: "Start date is required." }),
  endTime: z.date({ required_error: "End date is required." }),
  notes: z.string().optional(),
}).refine(data => data.endTime >= data.startTime, {
    message: "End time cannot be before start time.",
    path: ["endTime"], // Path of error
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
      startTime: undefined,
      endTime: undefined,
      notes: '',
    },
  });

  async function onSubmit(values: TimelogFormValues) {
     if (!user) {
        toast({ title: "Error", description: "You must be logged in to add a timelog.", variant: "destructive" });
        return;
     }
    setIsSubmitting(true);
    try {
        // Calculate duration in minutes (or adjust as needed based on backend expectation)
        const durationInMilliseconds = values.endTime.getTime() - values.startTime.getTime();
        const durationInMinutes = Math.round(durationInMilliseconds / (1000 * 60));

      // Prepare data for API call
      const apiData: CreateTimelogData = {
        task: task._id, // Task ID from prop
        user: user._id, // User ID from auth context
        startTime: values.startTime.toISOString(),
        endTime: values.endTime.toISOString(),
        duration: durationInMinutes, // Send calculated duration
        notes: values.notes,
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

  // Helper for combined Date/Time Picker - Basic version using two pickers
  // A more advanced component could combine date and time selection
    const DateTimePicker = ({ field, label, disabled }: { field: any, label: string, disabled: boolean }) => (
        <Popover>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        disabled={disabled}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP HH:mm") : <span>{label}</span>}
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={disabled}
                    initialFocus
                />
                 {/* Basic Time Input */}
                <div className="p-2 border-t">
                     <Input
                        type="time"
                        step="600" // 10-minute intervals
                        value={field.value ? format(field.value, "HH:mm") : ''}
                        onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = field.value ? new Date(field.value) : new Date();
                            newDate.setHours(hours, minutes);
                            field.onChange(newDate);
                        }}
                        disabled={disabled}
                        className="w-full"
                    />
                </div>
            </PopoverContent>
        </Popover>
    );


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
         <p className="text-sm text-muted-foreground">
             Logging time for task: <span className='font-medium text-foreground'>{task.title}</span>
         </p>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                    <FormLabel>Start Time</FormLabel>
                     <DateTimePicker field={field} label="Select start date & time" disabled={isSubmitting} />
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                    <FormLabel>End Time</FormLabel>
                    <DateTimePicker field={field} label="Select end date & time" disabled={isSubmitting} />
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Add any notes about the work done" {...field} disabled={isSubmitting}/>
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
