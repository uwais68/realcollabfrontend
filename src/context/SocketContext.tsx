'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Notification } from '@/services/realcollab'; // Assuming Notification type exists
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext'; // Import useAuth

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>; // Allow updating notifications
  // Add function to emit events safely
  emitEvent: (eventName: string, data: any) => void;
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

// Use NEXT_PUBLIC_SOCKET_URL environment variable with a fallback
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const AUTH_TOKEN_COOKIE_NAME = 'authToken'; // Keep consistent

// Helper to get token (needed within context setup)
const getAuthTokenFromCookie = (): string | null => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.startsWith(AUTH_TOKEN_COOKIE_NAME + '=')) {
        return decodeURIComponent(cookie.substring(AUTH_TOKEN_COOKIE_NAME.length + 1));
      }
    }
    return null;
};


export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null); // Use ref to avoid dependency issues
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user, isLoading: authIsLoading } = useAuth(); // Use auth context state
  const { toast } = useToast();

  // Function to initialize socket connection
   const initializeSocket = useCallback(() => {
       // Only connect if user is loaded and logged in
       if (!user || authIsLoading) {
            console.log("SocketProvider: User not loaded or not authenticated, skipping socket connection.");
            // Disconnect if already connected (e.g., on logout)
            if(socketRef.current?.connected) {
                console.log("SocketProvider: Disconnecting existing socket due to user logout/loading.");
                socketRef.current.disconnect();
                 setSocket(null); // Update state after disconnecting ref
                 socketRef.current = null;
                 setIsConnected(false);
            }
            return null; // Indicate no socket was created/listeners attached
       }

        // Avoid reconnecting if already connected with the same ID
        if (socketRef.current?.connected && socketRef.current.auth?.userId === user._id) {
            console.log("SocketProvider: Already connected with the correct user ID.");
             // Return a no-op cleanup function if already connected correctly
             return () => {};
        }

        // Disconnect previous socket if it exists before creating a new one
        if(socketRef.current) {
            console.log("SocketProvider: Disconnecting previous socket instance.");
            socketRef.current.disconnect();
            socketRef.current = null; // Clear ref
            setSocket(null); // Clear state
             setIsConnected(false);
        }


       const token = getAuthTokenFromCookie(); // Get token at the time of connection attempt
       if (!token) {
         console.error("SocketProvider: No auth token found, cannot establish connection.");
         return null; // Don't attempt connection without a token
       }

       console.log("SocketProvider: Initializing socket connection for user:", user._id, "to", SOCKET_URL); // Log URL
       const newSocket = io(SOCKET_URL, {
           // Pass token for authentication on connection
           auth: { token: `Bearer ${token}`, userId: user._id }, // Send token in auth payload
           transports: ['websocket'], // Optional: force websocket transport
           reconnection: true,
           reconnectionAttempts: 5,
           // reconnectionAttempts: 5, // Optional: limit reconnection attempts
       });

       socketRef.current = newSocket; // Store in ref
       setSocket(newSocket); // Store in state for context consumers

        // Connection listeners
        const onConnect = () => {
          console.log('Socket connected:', newSocket.id);
          setIsConnected(true);
          // Avoid duplicate connect toasts if connection flaps
          // toast({ title: "Real-time Connected", description: "Ready for collaboration." });
        };

        const onDisconnect = (reason: Socket.DisconnectReason) => {
          console.log('Socket disconnected:', reason);
          setIsConnected(false);
           // Reset socket state/ref on disconnect
           setSocket(null);
           socketRef.current = null;
          // Avoid toast if disconnect was intentional (e.g., logout) or during cleanup
          if (reason !== 'io client disconnect') {
              toast({
                  title: "Disconnected",
                  description: `Real-time connection lost: ${reason}. Attempting to reconnect...`,
                  variant: "destructive",
              });
          }
        };

       const onConnectError = (error: Error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false); // Ensure state reflects connection failure
            setSocket(null); // Clear socket state on error
            socketRef.current = null; // Clear ref on error

            // Specific handling for auth errors
            if (error.message.includes("Authentication error") || error.message.includes("Unauthorized")) {
                toast({
                    title: "Authentication Error",
                    description: "Real-time connection failed (invalid token?). Please log in again.",
                    variant: "destructive",
                });
                 // Consider logging out the user here if the token is definitively invalid
                 // logout(); // Make sure logout is available if needed
            } else {
                toast({
                    title: "Connection Error",
                    description: `Could not connect to real-time server: ${error.message}.`,
                    variant: "destructive",
                });
            }
            // Optionally schedule a retry or prompt user
       };


        // Notification listener
        const handleReceiveNotification = (notification: Notification) => {
          console.log('Received notification via socket:', notification);
          // Add to start and ensure no duplicates based on ID
           setNotifications((prevNotifications) => {
               const exists = prevNotifications.some(n => n._id === notification._id);
               return exists ? prevNotifications : [notification, ...prevNotifications];
           });

           // Show a toast for new notifications
          toast({
             title: `Notification: ${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`, // Capitalize type
             description: notification.message,
          });
        };

        newSocket.on('connect', onConnect);
        newSocket.on('disconnect', onDisconnect);
        newSocket.on('connect_error', onConnectError);
        newSocket.on('receiveNotification', handleReceiveNotification);

        // Cleanup function to remove listeners
        const cleanup = () => {
             console.log('SocketProvider: Cleaning up listeners for socket:', newSocket.id);
             newSocket.off('connect', onConnect);
             newSocket.off('disconnect', onDisconnect);
             newSocket.off('connect_error', onConnectError);
             newSocket.off('receiveNotification', handleReceiveNotification);
             // Optionally disconnect here too if not handled elsewhere
             // if (newSocket.connected) {
             //    newSocket.disconnect();
             // }
         };
         return cleanup; // Return cleanup function

    // Only depend on user and authLoading to re-trigger initialization
   }, [user, authIsLoading, toast]);


   // Effect to initialize and cleanup socket based on auth state
   useEffect(() => {
       const cleanupListeners = initializeSocket(); // Initialize and get cleanup function

       // Return the cleanup function for the socket listeners AND disconnect the socket itself
       return () => {
           if (cleanupListeners) {
               cleanupListeners(); // Clean up listeners
           }
           if (socketRef.current) {
                console.log('SocketProvider: Disconnecting socket via ref on effect cleanup.');
                socketRef.current.disconnect(); // Disconnect socket via ref
                socketRef.current = null;
                // State update is handled within initializeSocket or disconnect listener now
           }
       };
   // Use initializeSocket as the dependency. It changes when user/authLoading changes.
   }, [initializeSocket]);


   // Safe emit function - use the socket from state for reactivity
   const emitEvent = useCallback((eventName: string, data: any) => {
       const currentSocket = socketRef.current; // Use ref for emitting
       if (currentSocket && currentSocket.connected) {
            console.log(`Emitting event '${eventName}':`, data);
           currentSocket.emit(eventName, data);
       } else {
           console.warn(`Socket not connected or available. Cannot emit event: ${eventName}`);
           // Optionally queue the event or show an error
           toast({
               title: "Cannot Send Data",
               description: "Real-time connection is not active.",
               variant: "destructive",
            });
       }
   }, [toast]); // Doesn't need socket/isConnected dependency


  return (
    // Provide the state socket for consumers, but manage connection via ref
    <SocketContext.Provider value={{ socket, isConnected, notifications, setNotifications, emitEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
