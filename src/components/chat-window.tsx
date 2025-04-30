'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import {
    getAllChatMessages,
    sendChatMessage, // Use the new send function
    getUserById,
    type ChatMessage,
    type SendMessageData
} from '@/services/realcollab';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/context/AuthContext'; // Import User type

interface ChatWindowProps {
  chatRoomId: string;
}

export function ChatWindow({ chatRoomId }: ChatWindowProps) {
  const { socket, isConnected, emitEvent } = useSocket(); // Use emitEvent for socket actions
  const { user: currentUser, isLoading: authLoading } = useAuth(); // Get current user
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [usersInfo, setUsersInfo] = React.useState<Map<string, Partial<User>>>(new Map()); // Cache user info
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch user info for senders if not already cached
  const fetchUserInfo = React.useCallback(async (userId: string) => {
    if (!usersInfo.has(userId) && userId !== currentUser?._id) {
      try {
        const userInfo = await getUserById(userId);
        setUsersInfo(prev => new Map(prev).set(userId, userInfo));
      } catch (err) {
        console.warn(`Failed to fetch user info for ${userId}:`, err);
        // Store a placeholder to avoid refetching constantly on error
        setUsersInfo(prev => new Map(prev).set(userId, { _id: userId, firstName: 'Unknown', lastName: ''}));
      }
    }
  }, [usersInfo, currentUser?._id]);

  // Fetch initial messages and sender info
  React.useEffect(() => {
    const fetchMessages = async () => {
       if (!currentUser?._id) {
           console.log("ChatWindow: Waiting for current user...");
           // setLoading(false); // Don't show loading if we're just waiting for auth
           return; // Don't fetch if user isn't loaded yet
       }
      setLoading(true);
      setError(null);
      setMessages([]); // Clear previous room messages
      console.log(`Fetching messages for room: ${chatRoomId} (User: ${currentUser._id})`);
      try {
        const fetchedMessages = await getAllChatMessages(chatRoomId);
        console.log(`Fetched ${fetchedMessages.length} messages for room ${chatRoomId}`);
        // Make sure fetched messages conform to ChatMessage interface
        setMessages(fetchedMessages.map(msg => ({
            ...msg,
            timestamp: msg.createdAt || msg.timestamp, // Use createdAt if available, else timestamp
        })));


        // Fetch info for all unique senders in the initial load
        const senderIds = new Set(fetchedMessages.map(msg => msg.sender));
        senderIds.forEach(id => fetchUserInfo(id));

      } catch (err) {
        console.error('Failed to fetch messages:', err);
        const message = err instanceof Error ? err.message : 'Could not load messages.';
         setError(message);
         toast({
          title: "Error Loading Messages",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomId, toast, currentUser?._id]); // Rerun when room or user changes


   // Scroll to bottom when messages change or component loads
  React.useEffect(() => {
    if (scrollAreaRef.current) {
       const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
       if(scrollElement) {
         // Set a short timeout to allow the DOM to update fully
         setTimeout(() => {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          }, 100); // Increased timeout slightly
       }
    }
  }, [messages, loading]);


  // WebSocket listeners
  React.useEffect(() => {
    if (!socket || !isConnected || !currentUser?._id) return;

    console.log(`Joining room: ${chatRoomId}`);
    // Use safe emit function from context
    emitEvent('joinRoom', chatRoomId);

    const handleReceiveMessage = (data: any) => { // Use any for now, refine based on actual socket payload
       console.log('Received message data via socket:', data);

       // Adapt the incoming socket data structure to the ChatMessage interface
       const receivedMessage: ChatMessage = {
           _id: data._id || `temp-socket-${Date.now()}`, // Use ID from socket or generate temp
           chatRoom: data.chatRoom,
           sender: data.sender,
           content: data.content,
           messageType: data.messageType || 'text', // Default to text if not provided
           fileUrl: data.fileUrl,
           replyTo: data.replyTo,
           // Map other fields if they exist in the socket payload
           timestamp: data.timestamp || new Date().toISOString(), // Use provided timestamp or current time
           createdAt: data.createdAt || new Date().toISOString(), // Add createdAt
           updatedAt: data.updatedAt || new Date().toISOString(), // Add updatedAt
           senderName: data.senderName, // Include senderName if provided by socket
       };


       // Ensure the message is for the currently active room
      if (receivedMessage.chatRoom === chatRoomId) {
         console.log(`Adding message to room ${chatRoomId}:`, receivedMessage)
         setMessages((prevMessages) => [...prevMessages, receivedMessage]);
          // Fetch sender info if needed
          if (receivedMessage.sender !== currentUser?._id) {
             fetchUserInfo(receivedMessage.sender);
          }
      } else {
         console.log(`Message received for different room (${receivedMessage.chatRoom}), ignoring.`);
         // Optionally show a notification toast for other rooms
          // toast({ title: `New message in ${data.chatRoom}`, description: data.content });
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);

    // Cleanup on component unmount or chatRoomId change
    return () => {
      console.log(`Leaving room: ${chatRoomId}`);
      emitEvent('leaveRoom', chatRoomId); // Use safe emit
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, chatRoomId, isConnected, currentUser?._id, fetchUserInfo, emitEvent]);


  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim() || !currentUser?._id) return;

    const messageContent = newMessage; // Store content before clearing
    setNewMessage(''); // Clear input immediately

    // Prepare data for the API call using SendMessageData type
    const apiMessageData: SendMessageData = {
      chatRoom: chatRoomId,
      content: messageContent,
      messageType: 'text', // Assuming text messages for now
      // fileUrl and replyTo can be added later if needed
    };

     // Create an optimistic message structure matching ChatMessage
     const optimisticMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        chatRoom: chatRoomId,
        sender: currentUser._id,
        content: messageContent,
        messageType: 'text',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'sent', // Optimistic status
        senderName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
    };


    // Optimistic update: Add the message immediately to the UI
    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

    try {
        console.log('Sending message via API:', apiMessageData);
        const sentMessage = await sendChatMessage(apiMessageData);
        console.log('Message sent successfully via API:', sentMessage);

        // Update the optimistic message with the real ID and timestamp from the server response
        setMessages((prevMessages) =>
            prevMessages.map((msg) =>
                msg._id === optimisticMessage._id ? { ...sentMessage, timestamp: sentMessage.createdAt } : msg // Replace temp msg with real one
            )
        );

        // Optional: Emit via socket if the backend doesn't already handle broadcasting from the API route
        // This depends on backend setup. If the API route emits, this isn't needed.
        // emitEvent('sendMessage', { ...sentMessage, senderName: optimisticMessage.senderName });

    } catch (error) {
        console.error('Failed to send message:', error);
        toast({
            title: "Error Sending Message",
            description: error instanceof Error ? error.message : "Could not send message.",
            variant: "destructive",
        });
        // Remove the optimistic message on failure
        setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== optimisticMessage._id));
        setNewMessage(messageContent); // Restore input content on error
    }
  };

   const getInitials = (firstName?: string, lastName?: string): string => {
     const first = firstName?.[0] || '';
     const last = lastName?.[0] || '';
     return `${first}${last}`.toUpperCase() || '??';
   }

   const getUserInfo = (userId: string): Partial<User> => {
       if (userId === currentUser?._id) {
           return currentUser;
       }
       return usersInfo.get(userId) || { _id: userId, firstName: 'Loading...', lastName: '' };
   }

   if (authLoading) {
     return <div className="flex-1 flex items-center justify-center text-muted-foreground">Authenticating...</div>;
   }
   if (!currentUser) {
      return <div className="flex-1 flex items-center justify-center text-destructive">User not loaded. Cannot display chat.</div>;
   }


  return (
    <div className="flex flex-col h-full">
      {/* Optional Chat Header */}
      {/* <div className="p-4 border-b font-semibold"> Chat Room Name </div> */}

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {loading && (
            <>
             <Skeleton className="h-10 w-3/4 my-2 rounded-lg" />
             <Skeleton className="h-10 w-2/3 my-2 ml-auto rounded-lg" />
             <Skeleton className="h-16 w-4/5 my-2 rounded-lg" />
            </>
          )}
          {error && <p className="text-destructive text-center">{error}</p>}
          {!loading && !error && messages.map((message) => {
              const senderInfo = getUserInfo(message.sender);
              const isCurrentUser = message.sender === currentUser._id;
              const senderName = senderInfo.firstName || senderInfo.lastName ? `${senderInfo.firstName || ''} ${senderInfo.lastName || ''}`.trim() : senderInfo.email ?? 'User';
              const senderInitials = getInitials(senderInfo.firstName, senderInfo.lastName);

              return (
                <div
                    key={message._id} // Use message ID as key
                    className={cn(
                    'flex items-end space-x-2 group',
                    isCurrentUser ? 'justify-end' : 'justify-start'
                    )}
                >
                    {!isCurrentUser && (
                    <Avatar className="h-8 w-8">
                        {/* Use placeholder if profilePicture is missing */}
                        <AvatarImage src={senderInfo.profilePicture || `https://picsum.photos/seed/${message.sender}/40/40`} alt={senderName} />
                        <AvatarFallback>{senderInitials}</AvatarFallback>
                    </Avatar>
                    )}
                    <div
                    className={cn(
                        'max-w-xs lg:max-w-md p-3 rounded-lg shadow-sm',
                        isCurrentUser
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted rounded-bl-none'
                    )}
                    >
                        {/* Optional: Show sender name for group chats */}
                         {/* {!isCurrentUser && <p className="text-xs font-medium mb-1">{senderName}</p>} */}
                        <p className="text-sm break-words">{message.content}</p>
                        <p className={cn(
                            "text-xs mt-1 opacity-70",
                            isCurrentUser ? 'text-primary-foreground text-right' : 'text-muted-foreground text-left'
                        )}>
                            {/* Use parseISO for potentially ISO-formatted strings */}
                            {format(parseISO(message.timestamp), 'p')}
                        </p>
                    </div>
                    {isCurrentUser && (
                    <Avatar className="h-8 w-8">
                         {/* Use placeholder if profilePicture is missing */}
                        <AvatarImage src={currentUser.profilePicture || `https://picsum.photos/seed/${currentUser._id}/40/40`} alt="You" />
                        <AvatarFallback>{getInitials(currentUser.firstName, currentUser.lastName)}</AvatarFallback>
                    </Avatar>
                    )}
                </div>
              );
          })}
           {!loading && !error && messages.length === 0 && (
                <p className="text-center text-muted-foreground pt-10">No messages yet. Start the conversation!</p>
            )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            type="text"
            placeholder={isConnected ? "Type your message..." : "Connecting..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
             // Disable while authenticating, not connected, or message is empty after trimming
             disabled={authLoading || !isConnected || !currentUser || loading}
            className="flex-1"
            aria-label="Chat message input"
          />
          <Button type="submit"
                // Disable while authenticating, not connected, message is empty after trimming, or initial messages are loading
                disabled={authLoading || !isConnected || !newMessage.trim() || !currentUser || loading}
                size="icon"
                aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

    