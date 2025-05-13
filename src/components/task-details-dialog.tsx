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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Import Tabs
import { AlertCircle, Calendar, CheckCircle, Clock, Flag, Target, User, ListChecks } from 'lucide-react'; // Added ListChecks
import { format, parseISO } from 'date-fns';
import { MilestoneList } from './milestone-list';
import { AddMilestoneForm } from './add-milestone-form';
import { TimelogList } from './timelog-list'; // Import TimelogList
import { AddTimelogForm } from './add-timelog-form'; // Import AddTimelogForm
import type { Task, Milestone, Timelog } from '@/services/realcollab';
import { getUserById } from '@/services/realcollab';
import type { User as AuthUser } from '@/context/AuthContext';
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
    const [showAddTimelogForm, setShowAddTimelogForm] = React.useState(false); // State for timelog form
    const [milestoneRefreshKey, setMilestoneRefreshKey] = React.useState(0);
    const [timelogRefreshKey, setTimelogRefreshKey] = React.useState(0); // State for timelog refresh
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchAssignee = async () => {
            if (task?.assignedTo) {
                setLoadingAssignee(true);
                try {
                    const userDetails = await getUserById(task.assignedTo);
                    console.log(userDetails)
                    setAssignee(userDetails);
                } catch (error) {
                    console.error("Failed to fetch assignee details:", error);
                    toast({
                        title: "Error Loading Assignee",
                        description: "Could not load assignee details.",
                        variant: "destructive"
                    })
                    setAssignee(null);
                } finally {
                    setLoadingAssignee(false);
                }
            } else {
                setAssignee(null);
            }
        };

        if (task && isOpen) {
            fetchAssignee();
            setShowAddMilestoneForm(false); // Reset forms visibility when dialog opens/task changes
            setShowAddTimelogForm(false);
            // Reset refresh keys? Maybe not necessary unless switching tasks in the dialog
            // setMilestoneRefreshKey(0);
            // setTimelogRefreshKey(0);
        } else {
            setAssignee(null);
            setLoadingAssignee(false);
            setShowAddMilestoneForm(false);
            setShowAddTimelogForm(false);
        }
    }, [task, isOpen, toast]);

     const getStatusBadgeVariant = (status: Task['status']): "secondary" | "default" | "outline" => {
         switch (status) {
             case 'Completed': return 'secondary';
             case 'In Progress': return 'outline';
             case 'Pending': default: return 'default';
         }
     };

      const getStatusIcon = (status: Task['status']) => {
         switch (status) {
             case 'Completed': return <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />;
             case 'In Progress': return <Clock className="h-4 w-4 mr-1.5 text-blue-500" />;
             case 'Pending': default: return <AlertCircle className="h-4 w-4 mr-1.5 text-orange-500" />;
         }
     };

     const handleMilestoneAdded = () => {
        setShowAddMilestoneForm(false);
        setMilestoneRefreshKey(prev => prev + 1);
        toast({ title: "Milestone Added", description: "The new milestone has been added." });
     };

     const handleTimelogAdded = () => {
         setShowAddTimelogForm(false);
         setTimelogRefreshKey(prev => prev + 1);
         toast({ title: "Time Logged", description: "The timelog entry has been added." });
     };


     if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
       {/* Increased max width and height, made content scrollable */}
       <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task.title}</DialogTitle>
          <DialogDescription>
            Details, milestones, and timelogs for this task.
            Created on {format(parseISO(task.createdAt), 'PPP')}
          </DialogDescription>
        </DialogHeader>

         {/* Task Details Section */}
         <div className="px-1 py-2 grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4 mb-4">
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
                <div className="text-sm space-y-1 md:col-span-3 mt-2"> {/* Span across on medium+ */}
                    <p className="font-medium">Description:</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                 </div>
             )}
          </div>

        {/* Tabs for Milestones and Timelogs */}
         <Tabs defaultValue="milestones" className="flex-1 overflow-hidden flex flex-col"> {/* Allow tabs to take remaining space and scroll */}
            <div className="flex justify-between items-center px-1 mb-4">
                 <TabsList>
                     <TabsTrigger value="milestones"><ListChecks className="mr-2 h-4 w-4"/> Milestones</TabsTrigger>
                     <TabsTrigger value="timelogs"><Clock className="mr-2 h-4 w-4"/> Timelogs</TabsTrigger>
                 </TabsList>
                 {/* Contextual Add Buttons */}
                 <div>
                    <TabsContent value="milestones" className="mt-0 p-0">
                         {!showAddMilestoneForm && (
                            <Button variant="outline" size="sm" onClick={() => setShowAddMilestoneForm(true)}>
                                <Target className="mr-1.5 h-4 w-4" /> Add Milestone
                            </Button>
                        )}
                    </TabsContent>
                     <TabsContent value="timelogs" className="mt-0 p-0">
                         {!showAddTimelogForm && (
                            <Button variant="outline" size="sm" onClick={() => setShowAddTimelogForm(true)}>
                                <Clock className="mr-1.5 h-4 w-4" /> Log Time
                            </Button>
                        )}
                    </TabsContent>
                 </div>
            </div>

            {/* Tab Content Area (Scrollable) */}
             <div className="flex-1 overflow-y-auto px-1 pb-4"> {/* Make this area scrollable */}
                 {/* Milestones Tab */}
                <TabsContent value="milestones" className="mt-0 space-y-4">
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
                </TabsContent>

                {/* Timelogs Tab */}
                <TabsContent value="timelogs" className="mt-0 space-y-4">
                     {showAddTimelogForm && (
                        <div className="p-4 border rounded-lg bg-muted/30">
                            <AddTimelogForm
                                task={task}
                                onTimelogAdded={handleTimelogAdded}
                                onCancel={() => setShowAddTimelogForm(false)}
                            />
                        </div>
                    )}
                    <TimelogList taskId={task._id} refreshKey={timelogRefreshKey} />
                </TabsContent>
            </div>
        </Tabs>

        {/* Separator and Footer remain fixed at the bottom */}
         {/* Removed Separator */}
        <DialogFooter className="pt-4 border-t mt-auto"> {/* Ensure footer is at bottom */}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
