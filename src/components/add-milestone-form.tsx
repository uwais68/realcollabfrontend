'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Target } from 'lucide-react';

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
import { createMilestone, type CreateMilestoneData, type TaskId } from '@/services/realcollab'; // Import API function and types

const MILESTONE_PRIORITIES = ['Low', 'Medium', 'High'] as const;

// Form schema based on CreateMilestoneData
const formSchema = z.object({
  // task ID is passed as a prop, not part of the form fields directly
  milestoneName: z.string().min(2, {
    message: 'Milestone name must be at least 2 characters.',
  }),
  dueDate: z.date({
    required_error: "A due date is required.",
  }),
  priority: z.enum(MILESTONE_PRIORITIES).optional().default('Medium'),
  comments: z.string().optional(),
});

// Infer the type for the form based on the schema
type MilestoneFormValues = z.infer<typeof formSchema>;

interface AddMilestoneFormProps {
  taskId: TaskId;
  onMilestoneAdded: () => void;
  onCancel: () => void;
}

export function AddMilestoneForm({ taskId, onMilestoneAdded, onCancel }: AddMilestoneFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      milestoneName: '',
      priority: 'Medium',
      comments: '',
      dueDate: undefined, // Start with no date selected
    },
  });

  async function onSubmit(values: MilestoneFormValues) {
    setIsSubmitting(true);
    try {
      // Prepare data for API call
      const apiData: CreateMilestoneData = {
        task: taskId, // Add the task ID
        milestoneName: values.milestoneName,
        dueDate: values.dueDate.toISOString(), // Convert date to ISO string
        priority: values.priority,
        comments: values.comments,
      };

      console.log('Submitting milestone data to API:', apiData);
      const result = await createMilestone(apiData);
      console.log('Milestone created successfully:', result.newMilestone);

      // Use intermediate variable for description to avoid potential parsing issues
      const milestoneName = result.newMilestone?.milestoneName || 'Unknown Milestone';
      const descriptionText = `Milestone "${milestoneName}" added successfully.`;

      toast({
        title: "Milestone Created",
        description: descriptionText,
      });

      form.reset(); // Reset form after successful submission
      onMilestoneAdded(); // Callback to notify parent component

    } catch (error) {
      console.error('Failed to create milestone:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        title: "Error Creating Milestone",
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
        <FormField
          control={form.control}
          name="milestoneName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Milestone Name</FormLabel>
              <FormControl>
                <Input placeholder="Define the milestone objective" {...field} disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
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

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="pt-2">
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MILESTONE_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Add any relevant notes or details" {...field} disabled={isSubmitting}/>
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
             <Target className="mr-2 h-4 w-4" /> {/* Icon for adding */}
              {isSubmitting ? 'Adding Milestone...' : 'Add Milestone'}
            </Button>
         </div>
      </form>
    </Form>
  );
}
