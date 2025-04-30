'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
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
            if(socket?.connected) {
                console.log("SocketProvider: Disconnecting existing socket due to user logout/loading.");
                socket.disconnect();
            }
            setSocket(null);
            setIsConnected(false);
            return;
       }

        // Avoid reconnecting if already connected with the same ID
        if (socket?.connected && socket.auth?.userId === user._id) {
            console.log("SocketProvider: Already connected with the correct user ID.");
            return;
        }

        // Disconnect previous socket if it exists before creating a new one
        if(socket) {
            console.log("SocketProvider: Disconnecting previous socket instance.");
            socket.disconnect();
        }


       const token = getAuthTokenFromCookie(); // Get token at the time of connection attempt
       if (!token) {
         console.error("SocketProvider: No auth token found, cannot establish connection.");
         return; // Don't attempt connection without a token
       }

       console.log("SocketProvider: Initializing socket connection for user:", user._id, "to", SOCKET_URL); // Log URL
       const newSocket = io(SOCKET_URL, {
           // Pass token for authentication on connection
           auth: { token: `Bearer ${token}`, userId: user._id }, // Send token in auth payload
           transports: ['websocket'], // Optional: force websocket transport
           // reconnectionAttempts: 5, // Optional: limit reconnection attempts
       });

       setSocket(newSocket); // Set the new socket instance

        // Connection listeners
        newSocket.on('connect', () => {
          console.log('Socket connected:', newSocket.id);
          setIsConnected(true);
          // Avoid duplicate connect toasts if connection flaps
          // toast({ title: "Real-time Connected", description: "Ready for collaboration." });
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          setIsConnected(false);
          // Avoid toast if disconnect was intentional (e.g., logout)
          if (reason !== 'io client disconnect') {
              toast({
                  title: "Disconnected",
                  description: `Real-time connection lost: ${reason}. Reconnecting...`,
                  variant: "destructive",
              });
          }
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          // Specific handling for auth errors
           if (error.message.includes("Authentication error")) {
               toast({
                  title: "Authentication Error",
                  description: "Real-time connection failed (invalid token?). Please try logging in again.",
                  variant: "destructive",
                });
                // Consider logging out the user here if the token is definitively invalid
                // logout();
            } else {
               toast({
                 title: "Connection Error",
                 description: "Could not connect to real-time server.",
                 variant: "destructive",
               });
            }
           setIsConnected(false); // Ensure state reflects connection failure
           // Optionally schedule a retry or prompt user
        });

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

        newSocket.on('receiveNotification', handleReceiveNotification);

        // Cleanup listeners on socket instance change or unmount
        return () => {
            console.log('SocketProvider: Cleaning up listeners for socket:', newSocket.id);
            newSocket.off('connect');
            newSocket.off('disconnect');
            newSocket.off('connect_error');
            newSocket.off('receiveNotification', handleReceiveNotification);
         };

   }, [user, authIsLoading, toast, socket]); // Dependencies for re-initialization


   // Effect to initialize and cleanup socket based on auth state
   useEffect(() => {
        const cleanupListeners = initializeSocket(); // Initialize and get cleanup function

        // Return the cleanup function for the socket listeners AND disconnect the socket itself
        return () => {
            if (cleanupListeners) {
                cleanupListeners(); // Clean up listeners
            }
            if (socket) {
                console.log('SocketProvider: Disconnecting socket on component unmount or auth change.');
                socket.disconnect(); // Disconnect socket
                setSocket(null);
                setIsConnected(false);
            }
        };
    }, [initializeSocket, socket]); // Re-run when initializeSocket changes (due to user/authLoading change)


   // Safe emit function
   const emitEvent = useCallback((eventName: string, data: any) => {
       if (socket && isConnected) {
           socket.emit(eventName, data);
       } else {
           console.warn(`Socket not connected or available. Cannot emit event: ${eventName}`);
           // Optionally queue the event or show an error
           toast({
               title: "Cannot Send Data",
               description: "Real-time connection is not active.",
               variant: "destructive",
            });
       }
   }, [socket, isConnected, toast]);


  return (
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
