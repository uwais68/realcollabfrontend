'use client';

import * as React from 'react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BellRing, MessageSquare, ListChecks, FileText, X } from 'lucide-react';
import { getAllNotifications, type Notification } from '@/services/realcollab'; // Adjust path as needed
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/context/SocketContext';
import { cn } from '@/lib/utils';

interface NotificationListProps {
  limit?: number; // Optional limit for dashboard view
}

export function NotificationList({ limit }: NotificationListProps) {
  const { notifications: socketNotifications, setNotifications: setSocketNotifications } = useSocket();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Fetch initial notifications (optional, depending on whether socket provides history)
  React.useEffect(() => {
    const fetchInitialNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        // TODO: Decide if fetching historical notifications is needed.
        // If yes, uncomment and implement API call:
        // const fetchedNotifications = await getAllNotifications('currentUser'); // Replace 'currentUser'
        // setSocketNotifications(fetchedNotifications); // Or merge with existing socket notifications

        // For now, we assume notifications primarily come via socket
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate check

      } catch (err) {
        console.error('Failed to fetch initial notifications:', err);
        setError('Failed to load initial notifications.');
         toast({
          title: "Error Loading Notifications",
          description: "Could not fetch initial notifications.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialNotifications();
  }, [toast, setSocketNotifications]); // Dependency added

  const handleDismiss = (notificationId: string) => {
     // TODO: Implement API call to dismiss/mark as read
    console.log(`Dismissing notification ${notificationId}`);
     toast({
      title: "Dismiss Notification (Not Implemented)",
      description: `Would dismiss notification ${notificationId}.`,
    });
    // Optimistically remove from UI
    setSocketNotifications(prev => prev.filter(n => n._id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <ListChecks className="h-5 w-5 text-primary" />;
      case 'chat':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'file':
         return <FileText className="h-5 w-5 text-green-500" />;
      default:
        return <BellRing className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Use socketNotifications directly as the source of truth
  const displayedNotifications = limit
    ? socketNotifications.slice(0, limit)
    : socketNotifications;

   // Reverse the order to show newest first
  const sortedNotifications = [...displayedNotifications].reverse();

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(limit || 3)].map((_, i) => (
           <div key={i} className="flex items-start space-x-3 p-3 border rounded-lg">
             <Skeleton className="h-6 w-6 rounded-full" />
             <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
             </div>
              <Skeleton className="h-6 w-6" />
          </div>
        ))}
      </div>
    );
  }

   if (error && socketNotifications.length === 0) { // Show error only if no notifications loaded yet
     return <p className="text-destructive">{error}</p>;
   }

  if (socketNotifications.length === 0 && !loading) {
      return <p className="text-center text-muted-foreground py-4">No notifications.</p>
  }


  return (
    <div className="space-y-3">
      {sortedNotifications.map((notification) => (
        <Card key={notification._id} className="flex items-start p-4 space-x-3 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="pt-1">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1">
             {/* <CardTitle className="text-sm font-medium">{notification.type.toUpperCase()}</CardTitle> */}
            <CardDescription className="text-sm">{notification.message}</CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
               {/* Assuming timestamp exists, otherwise use a placeholder */}
               {notification.timestamp ? formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true }) : 'Just now'}
             </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => handleDismiss(notification._id)}
            aria-label={`Dismiss notification: ${notification.message}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      ))}
    </div>
  );
}
