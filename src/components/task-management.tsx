'use client';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TaskList } from './task-list';
import { AddTaskForm } from './add-task-form';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Task } from '@/services/realcollab';
import { EditTaskForm } from './edit-task-form'; // Assuming you'll create this
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';


export function TaskManagement() {
   // State to trigger refresh in TaskList
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const { toast } = useToast();

   // Callback function for AddTaskForm
  const handleTaskAdded = () => {
    setRefreshKey(prevKey => prevKey + 1); // Increment key to trigger refresh
  };

  // Callback function for TaskList edit button
   const handleEditTask = (task: Task) => {
     console.log("Setting task to edit:", task);
     setEditingTask(task);
   };

   // Callback function for EditTaskForm
   const handleTaskUpdated = () => {
    setEditingTask(null); // Close the dialog/modal
    setRefreshKey(prevKey => prevKey + 1); // Trigger refresh
     toast({
        title: "Task Updated",
        description: "Task details saved successfully.",
      });
  };

   const handleEditDialogClose = (open: boolean) => {
       if (!open) {
           setEditingTask(null); // Reset editing task when dialog closes
       }
   };


  return (
     <div className="flex flex-col min-h-screen"> {/* Use min-h-screen for flexibility */}
         <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="block md:hidden"/> {/* Mobile trigger */}
                <h1 className="text-2xl font-semibold">Task Management</h1>
             </div>
              {/* Add user profile/actions here */}
         </header>
        <div className="flex-1 p-6 space-y-6 overflow-auto">
            <Card>
            <CardHeader>
                <CardTitle>Add New Task</CardTitle>
            </CardHeader>
            <CardContent>
                 {/* Pass the callback to AddTaskForm */}
                <AddTaskForm onTaskAdded={handleTaskAdded} />
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>All Tasks</CardTitle>
            </CardHeader>
            <CardContent>
                 {/* Pass refreshKey and onEditTask to TaskList */}
                <TaskList refreshKey={refreshKey} onEditTask={handleEditTask} />
            </CardContent>
            </Card>
        </div>

         {/* Edit Task Dialog/Modal */}
         <Dialog open={!!editingTask} onOpenChange={handleEditDialogClose}>
             <DialogContent className="sm:max-w-[425px]">
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

    </div>
  );
}
