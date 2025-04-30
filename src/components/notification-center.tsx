'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { NotificationList } from './notification-list';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function NotificationCenter() {

   const handleClearAll = () => {
     // TODO: Implement API call to clear/mark all as read
     console.log("Clearing all notifications (Not Implemented)");
     // Update state or refetch
   }

  return (
    <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="block md:hidden"/> {/* Mobile trigger */}
                <h1 className="text-2xl font-semibold">Notifications</h1>
            </div>
           <Button variant="outline" onClick={handleClearAll}>Clear All</Button>
        </header>
        <div className="flex-1 p-6 overflow-auto">
            <Card>
                <CardContent className="pt-6">
                    <NotificationList />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
