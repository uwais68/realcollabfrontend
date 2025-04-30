'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Notification } from '@/services/realcollab'; // Assuming Notification type exists
import { useToast } from '@/hooks/use-toast';

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>; // Allow updating notifications
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

// TODO: Replace with your actual backend URL from environment variables
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();


  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_URL, {
      // Add authentication headers/query params if needed
      // query: { token: 'your_auth_token' }
       transports: ['websocket'], // Optional: force websocket transport
    });
    setSocket(newSocket);

    // Connection listeners
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
       toast({
         title: "Connected",
         description: "Real-time connection established.",
       });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
       toast({
         title: "Disconnected",
         description: `Real-time connection lost: ${reason}`,
         variant: "destructive",
       });
    });

     newSocket.on('connect_error', (error) => {
       console.error('Socket connection error:', error);
       setIsConnected(false);
       toast({
         title: "Connection Error",
         description: "Could not connect to real-time server.",
         variant: "destructive",
       });
     });

    // Notification listener
    const handleReceiveNotification = (notification: Notification) => {
      console.log('Received notification:', notification);
      setNotifications((prevNotifications) => [notification, ...prevNotifications]); // Add to start (newest first)

       // Show a toast for new notifications
      toast({
         title: `New Notification (${notification.type})`,
         description: notification.message,
      });

    };

    newSocket.on('receiveNotification', handleReceiveNotification);

    // Cleanup on component unmount
    return () => {
      console.log('Disconnecting socket...');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('receiveNotification', handleReceiveNotification);
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [toast]); // Add toast to dependency array

  return (
    <SocketContext.Provider value={{ socket, isConnected, notifications, setNotifications }}>
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
