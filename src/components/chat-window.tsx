'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { getAllChatMessages, getUserById, type ChatMessage } from '@/services/realcollab'; // Import getUserById
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/context/AuthContext'; // Import User type

interface ChatWindowProps {
  chatRoomId: string;
}

export function ChatWindow({ chatRoomId }: ChatWindowProps) {
  const { socket, isConnected } = useSocket();
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
        setMessages(fetchedMessages);

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
          }, 50);
       }
    }
  }, [messages, loading]);


  // WebSocket listeners
  React.useEffect(() => {
    if (!socket || !isConnected || !currentUser?._id) return;

    console.log(`Joining room: ${chatRoomId}`);
    socket.emit('joinRoom', chatRoomId);

    const handleReceiveMessage = (data: ChatMessage & { chatRoom: string }) => {
       console.log('Received message data via socket:', data);
       // Ensure the message is for the currently active room
      if (data.chatRoom === chatRoomId) {
         console.log(`Adding message to room ${chatRoomId}:`, data)
         setMessages((prevMessages) => [...prevMessages, data]);
          // Fetch sender info if needed
          if (data.sender !== currentUser?._id) {
             fetchUserInfo(data.sender);
          }
      } else {
         console.log(`Message received for different room (${data.chatRoom}), ignoring.`);
         // Optionally show a notification toast for other rooms
          // toast({ title: `New message in ${data.chatRoom}`, description: data.content });
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);

    // Cleanup on component unmount or chatRoomId change
    return () => {
      console.log(`Leaving room: ${chatRoomId}`);
      socket.emit('leaveRoom', chatRoomId);
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, chatRoomId, isConnected, currentUser?._id, fetchUserInfo]);


  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim() || !socket || !isConnected || !currentUser?._id) return;

    // TODO: Determine receiverId for 1-on-1 chats if applicable
    // For group chats, receiverId might not be needed or could be the room ID?
    // This depends heavily on the backend `sendMessage` event implementation.
    // If the API assumes the 'chatRoom' param covers group/user chats, we might not need receiverId here.
    let receiverId: string | undefined = undefined;
    // Example logic: If chatRoomId doesn't look like a room ID (e.g., based on length or prefix), assume it's a user ID
    if (chatRoomId.length === 24 && !chatRoomId.startsWith('group_')) { // Example heuristic
       receiverId = chatRoomId;
    }

    const messageData: ChatMessage & { chatRoom: string, senderName: string, receiverId?: string } = {
      _id: `temp-${Date.now()}`, // Temporary ID for optimistic update
      sender: currentUser._id,
      content: newMessage,
      timestamp: new Date().toISOString(),
      chatRoom: chatRoomId,
      senderName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email, // Use current user's name
      receiverId: receiverId, // Send receiverId if determined
    };

    console.log('Sending message:', messageData);
    socket.emit('sendMessage', messageData);

    // Optimistic update: Add the message immediately to the UI
    // Ensure the optimistic update also includes senderName
    setMessages((prevMessages) => [...prevMessages, messageData]);
    setNewMessage('');
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
                    key={message._id}
                    className={cn(
                    'flex items-end space-x-2 group',
                    isCurrentUser ? 'justify-end' : 'justify-start'
                    )}
                >
                    {!isCurrentUser && (
                    <Avatar className="h-8 w-8">
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
                            {format(new Date(message.timestamp), 'p')}
                        </p>
                    </div>
                    {isCurrentUser && (
                    <Avatar className="h-8 w-8">
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
            disabled={!isConnected || loading || authLoading || !currentUser }
            className="flex-1"
            aria-label="Chat message input"
          />
          <Button type="submit" disabled={!isConnected || !newMessage.trim() || loading || authLoading || !currentUser} size="icon" aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
