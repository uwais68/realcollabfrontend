'use client';

import * as React from 'react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BellRing, MessageSquare, ListChecks, FileText, X, RefreshCcw } from 'lucide-react'; // Added RefreshCcw
import { getAllNotifications, type Notification } from '@/services/realcollab'; // Adjust path as needed
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { cn } from '@/lib/utils';

interface NotificationListProps {
  limit?: number; // Optional limit for dashboard view
}

export function NotificationList({ limit }: NotificationListProps) {
  const { notifications: socketNotifications, setNotifications: setSocketNotifications } = useSocket();
  const { user, isLoading: authLoading } = useAuth(); // Get current user
  const [loading, setLoading] = React.useState(true);
  const [initialFetchDone, setInitialFetchDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Fetch initial notifications only once when the user is loaded
  const fetchInitialNotifications = React.useCallback(async () => {
    if (!user || initialFetchDone || authLoading) {
         // Don't fetch if user not loaded, already fetched, or auth is loading
         if (!initialFetchDone) setLoading(false); // Ensure loading stops if we bail early
         return;
     }

    console.log("Fetching initial notifications for user:", user._id);
    setLoading(true);
    setError(null);
    try {
      const fetchedNotifications = await getAllNotifications(); // Fetches for logged-in user
      console.log(`Fetched ${fetchedNotifications.length} initial notifications.`);
      // Combine fetched with any potentially received via socket before fetch completed
      // Use a Set to handle potential duplicates if socket message arrives during fetch
      const combinedNotifications = new Map<string, Notification>();
       // Add fetched first (potentially older)
       fetchedNotifications.forEach(n => combinedNotifications.set(n._id, n));
       // Add socket notifications (potentially newer, overwriting fetched if duplicate ID)
       socketNotifications.forEach(n => combinedNotifications.set(n._id, n));

      // Sort combined notifications by timestamp, newest first
      const sortedCombined = Array.from(combinedNotifications.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setSocketNotifications(sortedCombined);
      setInitialFetchDone(true); // Mark initial fetch as complete

    } catch (err) {
      console.error('Failed to fetch initial notifications:', err);
      const message = err instanceof Error ? err.message : "Could not load notifications.";
       setError(`Failed to load notifications: ${message}`);
      toast({
        title: "Error Loading Notifications",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, initialFetchDone, authLoading, setSocketNotifications, toast, socketNotifications]); // Add socketNotifications dependency


  React.useEffect(() => {
    fetchInitialNotifications();
  }, [fetchInitialNotifications]); // Run the fetch logic


  const handleDismiss = (notificationId: string) => {
     // TODO: Implement API call to dismiss/mark as read (e.g., PUT /api/notifications/:id/read)
    console.log(`Dismissing notification ${notificationId} (API call not implemented)`);
     toast({
      title: "Dismissed (Locally)",
      description: `Notification removed from view. Mark as read API not implemented.`,
    });
    // Optimistically remove from UI
    setSocketNotifications(prev => prev.filter(n => n._id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type?.toLowerCase()) { // Ensure case-insensitivity
      case 'task':
        return <ListChecks className="h-5 w-5 text-primary" />;
      case 'chat':
        return <MessageSquare className="h-5 w-5 text-blue-500" />; // Consider theme variable
      case 'file':
         return <FileText className="h-5 w-5 text-green-500" />; // Consider theme variable
      case 'mention':
         return <BellRing className="h-5 w-5 text-orange-500" />; // Example for mention
      default:
        return <BellRing className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Determine which notifications to display based on limit and sort order
  const sortedNotifications = React.useMemo(() => {
       // Sort by timestamp DESC (newest first)
       return [...socketNotifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
   }, [socketNotifications]);

   const displayedNotifications = limit
    ? sortedNotifications.slice(0, limit)
    : sortedNotifications;

  // --- Render Logic ---

  if (authLoading || (loading && !initialFetchDone)) { // Show skeleton while auth loads or initial fetch is happening
    return (
      <div className="space-y-4">
        {[...Array(limit || 3)].map((_, i) => (
           <div key={i} className="flex items-start space-x-3 p-3 border rounded-lg h-[70px]"> {/* Approx height */}
             <Skeleton className="h-6 w-6 rounded-full mt-1" />
             <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/4 mt-1" />
             </div>
              <Skeleton className="h-6 w-6 rounded-sm" />
          </div>
        ))}
      </div>
    );
  }

   if (error) { // Show error message if fetch failed
     return (
       <div className="text-center py-4">
         <p className="text-destructive mb-2">{error}</p>
         <Button onClick={fetchInitialNotifications} variant="outline" size="sm" disabled={loading}>
           <RefreshCcw className="mr-2 h-4 w-4" /> Retry
         </Button>
       </div>
     );
   }

  if (!user) { // Check if user is logged out after loading
      return <p className="text-center text-muted-foreground py-4">Please log in to view notifications.</p>;
  }

  if (displayedNotifications.length === 0) { // Show if logged in but no notifications
      return <p className="text-center text-muted-foreground py-4">No notifications yet.</p>;
  }


  return (
    <div className="space-y-3">
      {displayedNotifications.map((notification) => (
        <Card key={notification._id} className={cn(
            "flex items-start p-4 space-x-3 shadow-sm hover:shadow-md transition-shadow duration-200",
            notification.read ? "opacity-60 bg-muted/50" : "bg-card" // Style read notifications
           )}>
          <div className="pt-1">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1">
             {/* Optional: Title based on type */}
             {/* <CardTitle className="text-sm font-medium">{notification.type.toUpperCase()}</CardTitle> */}
            <CardDescription className="text-sm text-foreground">{notification.message}</CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
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
       {/* Show "View All" button if limited */}
       {limit && socketNotifications.length > limit && (
         <div className="text-center pt-2">
             <Button variant="link" asChild>
                 <a href="/notifications">View All Notifications</a>
             </Button>
         </div>
       )}
    </div>
  );
}
