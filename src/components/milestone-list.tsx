'use client';

import * as React from 'react';
import { CheckCircle2, Circle, Flag, Calendar, Trash2, RefreshCcw, Info } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getMilestonesForTask, markMilestoneAchieved, type Milestone, type TaskId } from '@/services/realcollab';
import { cn } from '@/lib/utils';

interface MilestoneListProps {
  taskId: TaskId;
  refreshKey?: number; // Optional key to trigger refresh
}

export function MilestoneList({ taskId, refreshKey }: MilestoneListProps) {
  const [milestones, setMilestones] = React.useState<Milestone[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const fetchMilestones = React.useCallback(async (showLoading = true) => {
    if (!taskId) {
      setError("No Task ID provided.");
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const fetchedData = await getMilestonesForTask(taskId);
      setMilestones(fetchedData); // API returns { milestones: [...] }
      console.log(`Fetched ${fetchedData.length} milestones for task ${taskId}`);
    } catch (err) {
      console.error(`Failed to fetch milestones for task ${taskId}:`, err);
      const message = err instanceof Error ? err.message : 'Could not load milestones.';
      setError(message);
      toast({
        title: "Error Loading Milestones",
        description: message,
        variant: "destructive",
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [taskId, toast]);

  React.useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones, refreshKey]); // Rerun if taskId or refreshKey changes

  const handleToggleAchieved = async (milestoneId: string, currentStatus: boolean) => {
    if (currentStatus) {
      // Currently, no API to un-achieve a milestone is defined
      toast({
        title: "Action Not Supported",
        description: "Cannot mark an achieved milestone as pending.",
        variant: "default",
      });
      return;
    }

    const originalMilestones = [...milestones];
    // Optimistic update
    setMilestones(prev =>
      prev.map(m =>
        m._id === milestoneId ? { ...m, isAchieved: true, completionDate: new Date().toISOString() } : m
      )
    );

    try {
      const result = await markMilestoneAchieved(milestoneId);
      toast({
        title: "Milestone Achieved",
        description: `Milestone "${result.milestone.milestoneName}" marked as complete.`,
      });
      // Update with actual data from backend (including precise completionDate)
      setMilestones(prev => prev.map(m => m._id === milestoneId ? result.milestone : m));
    } catch (error) {
      console.error(`Failed to mark milestone ${milestoneId} as achieved:`, error);
      setMilestones(originalMilestones); // Rollback
      const message = error instanceof Error ? error.message : 'Could not update milestone.';
      toast({
        title: "Update Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const getPriorityBadgeVariant = (priority?: Milestone['priority']): "destructive" | "secondary" | "default" => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Low': return 'secondary';
      case 'Medium':
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center p-3 border rounded-md h-[60px]">
            <Skeleton className="h-5 w-5 mr-3 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 ml-4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-destructive">
        <p>{error}</p>
        <Button onClick={() => fetchMilestones()} variant="outline" size="sm" className="mt-2">
          <RefreshCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Info className="mx-auto h-8 w-8 mb-2" />
        <p>No milestones defined for this task yet.</p>
        <p className="text-xs mt-1">Add milestones to break down the work.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone) => {
        const isOverdue = !milestone.isAchieved && isPast(parseISO(milestone.dueDate));
        return (
          <div
            key={milestone._id}
            className={cn(
              "flex items-center p-3 border rounded-lg transition-colors duration-150",
              milestone.isAchieved ? "bg-muted/50 opacity-70" : "bg-card hover:bg-muted/20",
              isOverdue && "border-destructive/50"
            )}
          >
            {/* Checkbox/Status Icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                      "h-7 w-7 mr-3 rounded-full",
                      milestone.isAchieved ? "text-green-600 cursor-default" : "text-muted-foreground hover:text-primary cursor-pointer",
                      isOverdue && !milestone.isAchieved && "text-destructive hover:text-destructive/80"
                  )}
                  onClick={() => handleToggleAchieved(milestone._id, milestone.isAchieved)}
                  disabled={milestone.isAchieved} // Disable clicking if already achieved
                  aria-label={milestone.isAchieved ? "Milestone Achieved" : "Mark as Achieved"}
                >
                  {milestone.isAchieved ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {milestone.isAchieved ? `Completed on ${format(parseISO(milestone.completionDate!), 'PPP')}` : `Due on ${format(parseISO(milestone.dueDate), 'PPP')}`}
              </TooltipContent>
            </Tooltip>

            {/* Milestone Name and Comments */}
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium truncate", milestone.isAchieved && "line-through")}>
                {milestone.milestoneName}
              </p>
              {milestone.comments && (
                <p className="text-xs text-muted-foreground truncate mt-0.5" title={milestone.comments}>
                  {milestone.comments}
                </p>
              )}
            </div>

            {/* Due Date */}
             <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "flex items-center text-xs ml-4 shrink-0",
                         milestone.isAchieved ? "text-muted-foreground" : "text-foreground",
                         isOverdue && "text-destructive font-medium"
                        )}>
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        <span>{format(parseISO(milestone.dueDate), 'MMM d')}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    Due Date: {format(parseISO(milestone.dueDate), 'PPP')}
                    {isOverdue && <span className="text-destructive block"> (Overdue)</span>}
                </TooltipContent>
            </Tooltip>


            {/* Priority */}
            {milestone.priority && (
               <Tooltip>
                 <TooltipTrigger asChild>
                    <Badge variant={getPriorityBadgeVariant(milestone.priority)} className="ml-3 shrink-0">
                        <Flag className="h-3 w-3 mr-1" />
                        {milestone.priority}
                    </Badge>
                 </TooltipTrigger>
                 <TooltipContent>{milestone.priority} Priority</TooltipContent>
               </Tooltip>
            )}

            {/* Optional: Delete Button */}
            {/* <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button> */}
          </div>
        );
      })}
    </div>
  );
}
