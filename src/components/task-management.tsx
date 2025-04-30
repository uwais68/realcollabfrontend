'use client';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TaskList } from './task-list';
import { AddTaskForm } from './add-task-form';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Task } from '@/services/realcollab';
import { EditTaskForm } from './edit-task-form';
import { TaskDetailsDialog } from './task-details-dialog'; // Import TaskDetailsDialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button'; // Import Button
import { Plus } from 'lucide-react'; // Import Icon


export function TaskManagement() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [viewingTask, setViewingTask] = React.useState<Task | null>(null); // State for viewing details
  const [isAddingTask, setIsAddingTask] = React.useState(false); // State for Add Task Dialog
  const { toast } = useToast();

  const handleTaskAdded = () => {
    setIsAddingTask(false); // Close add dialog
    setRefreshKey(prevKey => prevKey + 1);
    toast({ title: "Task Added", description: "The new task has been created." });
  };

  const handleEditTask = (task: Task) => {
    console.log("Setting task to edit:", task);
    setEditingTask(task);
  };

   // Callback function for TaskList view button/row click
   const handleViewTask = (task: Task) => {
     console.log("Setting task to view:", task);
     setViewingTask(task);
   };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    setRefreshKey(prevKey => prevKey + 1);
    toast({ title: "Task Updated", description: "Task details saved successfully." });
  };

  const handleEditDialogClose = (open: boolean) => {
    if (!open) setEditingTask(null);
  };

   const handleViewDialogClose = () => {
    setViewingTask(null);
   };

   const handleAddDialogClose = (open: boolean) => {
      if (!open) setIsAddingTask(false);
   }

  return (
     <div className="flex flex-col min-h-screen">
         <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="block md:hidden"/>
                <h1 className="text-2xl font-semibold">Task Management</h1>
             </div>
             <Button onClick={() => setIsAddingTask(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Task
             </Button>
         </header>
        <div className="flex-1 p-6 space-y-6 overflow-auto">
           {/* Removed Add Task Card */}
            {/* <Card>
            <CardHeader>
                <CardTitle>Add New Task</CardTitle>
            </CardHeader>
            <CardContent>
                <AddTaskForm onTaskAdded={handleTaskAdded} />
            </CardContent>
            </Card> */}

            <Card>
            <CardHeader>
                <CardTitle>All Tasks</CardTitle>
            </CardHeader>
            <CardContent>
                 {/* Pass refreshKey, onEditTask, and onViewTask to TaskList */}
                 <TaskList
                    refreshKey={refreshKey}
                    onEditTask={handleEditTask}
                    onViewTask={handleViewTask} // Pass the view handler
                  />
            </CardContent>
            </Card>
        </div>

         {/* Add Task Dialog */}
         <Dialog open={isAddingTask} onOpenChange={handleAddDialogClose}>
             <DialogContent className="sm:max-w-[500px]">
                 <DialogHeader>
                     <DialogTitle>Add New Task</DialogTitle>
                     <DialogDescription>
                         Fill in the details below to create a new task.
                     </DialogDescription>
                 </DialogHeader>
                 <AddTaskForm
                    onTaskAdded={handleTaskAdded}
                    // Pass a cancel handler if AddTaskForm supports it, otherwise rely on dialog close
                    // onCancel={() => setIsAddingTask(false)}
                 />
             </DialogContent>
         </Dialog>


         {/* Edit Task Dialog */}
         <Dialog open={!!editingTask} onOpenChange={handleEditDialogClose}>
             <DialogContent className="sm:max-w-[500px]"> {/* Adjusted size */}
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription>
                        Make changes to your task here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                 {editingTask && (
                    <EditTaskForm
                        task={editingTask}
                        onTaskUpdated={handleTaskUpdated}
                        onCancel={() => setEditingTask(null)}
                    />
                 )}
             </DialogContent>
         </Dialog>

         {/* View Task Details Dialog */}
         <TaskDetailsDialog
             task={viewingTask}
             isOpen={!!viewingTask}
             onClose={handleViewDialogClose}
         />

    </div>
  );
}
