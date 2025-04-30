'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Calendar, CheckCircle, Clock, Flag, Target, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { MilestoneList } from './milestone-list';
import { AddMilestoneForm } from './add-milestone-form'; // Import AddMilestoneForm
import type { Task, Milestone } from '@/services/realcollab'; // Import types
import { getUserById } from '@/services/realcollab'; // To fetch assignee details
import type { User as AuthUser } from '@/context/AuthContext'; // Use Auth User type
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';


interface TaskDetailsDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailsDialog({ task, isOpen, onClose }: TaskDetailsDialogProps) {
    const [assignee, setAssignee] = React.useState<Partial<AuthUser> | null>(null);
    const [loadingAssignee, setLoadingAssignee] = React.useState(false);
    const [showAddMilestoneForm, setShowAddMilestoneForm] = React.useState(false);
    const [milestoneRefreshKey, setMilestoneRefreshKey] = React.useState(0); // To refresh milestone list
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchAssignee = async () => {
            if (task?.assignedTo) {
                setLoadingAssignee(true);
                try {
                    const userDetails = await getUserById(task.assignedTo);
                    setAssignee(userDetails);
                } catch (error) {
                    console.error("Failed to fetch assignee details:", error);
                    toast({
                        title: "Error Loading Assignee",
                        description: "Could not load assignee details.",
                        variant: "destructive"
                    })
                    setAssignee(null); // Reset assignee on error
                } finally {
                    setLoadingAssignee(false);
                }
            } else {
                setAssignee(null); // Reset if task has no assignee
            }
        };

        if (task && isOpen) {
            fetchAssignee();
            setShowAddMilestoneForm(false); // Reset form visibility when dialog opens/task changes
        } else {
            setAssignee(null); // Clear assignee when dialog closes or task is null
            setLoadingAssignee(false);
            setShowAddMilestoneForm(false);
        }
    }, [task, isOpen, toast]);

     const getStatusBadgeVariant = (status: Task['status']): "secondary" | "default" | "outline" => {
         switch (status) {
             case 'Completed': return 'secondary';
             case 'In Progress': return 'outline';
             case 'Pending': default: return 'default'; // Teal
         }
     };

      const getStatusIcon = (status: Task['status']) => {
         switch (status) {
             case 'Completed': return <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />;
             case 'In Progress': return <Clock className="h-4 w-4 mr-1.5 text-blue-500" />; // Use theme variable ideally
             case 'Pending': default: return <AlertCircle className="h-4 w-4 mr-1.5 text-orange-500" />; // Use theme variable ideally
         }
     };

     const handleMilestoneAdded = () => {
        setShowAddMilestoneForm(false); // Hide form
        setMilestoneRefreshKey(prev => prev + 1); // Increment key to refresh MilestoneList
        toast({ title: "Milestone Added", description: "The new milestone has been added to the task." });
     };


     if (!task) return null; // Don't render anything if task is null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task.title}</DialogTitle>
          <DialogDescription>
            Details and milestones for this task.
            Created on {format(parseISO(task.createdAt), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-1 py-2 overflow-y-auto flex-1">
          {/* Left Column: Details */}
          <div className="md:col-span-1 space-y-4">
             <div className="flex items-center">
                {getStatusIcon(task.status)}
                <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
            </div>
             {task.dueDate && (
                <div className="flex items-center text-sm text-muted-foreground">
                 <Calendar className="h-4 w-4 mr-1.5" />
                 Due: {format(parseISO(task.dueDate), 'PPP')}
                </div>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
                <User className="h-4 w-4 mr-1.5" />
                Assigned to:
                 {loadingAssignee ? <Skeleton className="h-4 w-24 ml-1.5" /> :
                 assignee ? (
                    <span className="ml-1.5 font-medium text-foreground">{`${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.email}</span>
                 ) : (
                    <span className="ml-1.5 italic">Unassigned</span>
                 )}
            </div>
             {task.description && (
                <div className="text-sm space-y-1">
                    <p className="font-medium">Description:</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                 </div>
             )}
          </div>

          {/* Right Column: Milestones */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
                 <h3 className="text-lg font-semibold flex items-center">
                    <Target className="h-5 w-5 mr-2 text-primary" />
                    Milestones
                </h3>
                 {!showAddMilestoneForm && (
                    <Button variant="outline" size="sm" onClick={() => setShowAddMilestoneForm(true)}>
                        <Target className="mr-1.5 h-4 w-4" /> Add Milestone
                    </Button>
                )}
            </div>

            {showAddMilestoneForm && (
                <div className="p-4 border rounded-lg bg-muted/30">
                    <AddMilestoneForm
                        taskId={task._id}
                        onMilestoneAdded={handleMilestoneAdded}
                        onCancel={() => setShowAddMilestoneForm(false)}
                    />
                </div>
            )}

            <MilestoneList taskId={task._id} refreshKey={milestoneRefreshKey} />
          </div>
        </div>

        <Separator className="mt-4" />

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {/* Add other actions like Edit Task button if needed */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
