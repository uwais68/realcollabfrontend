'use client';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TaskList } from './task-list';
import { AddTaskForm } from './add-task-form';
import { SidebarTrigger } from '@/components/ui/sidebar';


export function TaskManagement() {
  return (
     <div className="flex flex-col h-screen">
         <header className="flex items-center justify-between p-4 border-b">
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
                <AddTaskForm />
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>All Tasks</CardTitle>
            </CardHeader>
            <CardContent>
                <TaskList />
            </CardContent>
            </Card>
        </div>
    </div>
  );
}
