'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TaskList } from './task-list';
import { ChatWindow } from './chat-window';
import { NotificationList } from './notification-list';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { getAllTasks, Task } from '@/services/realcollab';
import { TaskDetailsDialog } from './task-details-dialog';

export function Dashboard() {
  // Placeholder for fetching summary data
  // const taskCount = 5;
  const unreadMessages = 3; // Example data
  const activeNotifications = 2; // Example data
  const [viewingTask, setViewingTask] = React.useState<Task | null>(null); // State for viewing details
  const [taskCount, setTaskCount] = React.useState<number | 0>(0); // State for viewing details

  const handleViewDialogClose = () => {
    setViewingTask(null);
   };
  async function fun  () {
    const tasks = await  getAllTasks()
    const len = tasks.filter((e)=>e.status=="Pending").length
    setTaskCount(len)
  }
  fun()
  return (
    <div className="flex flex-col h-screen">
       <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="block md:hidden"/> {/* Mobile trigger */}
            <h1 className="text-2xl font-semibold">Dashboard</h1>
          </div>
          {/* Add user profile/actions here */}
        </header>
      <div className="flex-1 p-6 space-y-6 overflow-auto">


        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Tasks Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p>You have {taskCount} active tasks.</p>
              {/* Add more task summary info or link */}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Chat Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{unreadMessages} unread messages.</p>
              {/* Add chat summary info or link */}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{activeNotifications} new notifications.</p>
              {/* Add notification summary info or link */}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList limit={5} onViewTask={setViewingTask}/>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Chat</CardTitle>
            </CardHeader>
            <CardContent>
               {/* Placeholder for a simplified chat view or link */}
               <p>Chat functionality available in the Chat section.</p>
               <Button variant="link" asChild>
                <a href="/chat">Go to Chat</a>
               </Button>
            </CardContent>
          </Card>
        </div>
         <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationList limit={5} />
            </CardContent>
          </Card>
      </div>
       {/* View Task Details Dialog */}
               <TaskDetailsDialog
                   task={viewingTask}
                   isOpen={!!viewingTask}
                   onClose={handleViewDialogClose}
               />
    </div>
    
  );
}
