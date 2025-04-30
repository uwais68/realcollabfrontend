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
import type { ChatMessage } from '@/services/realcollab';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  chatRoomId: string;
}

// Assume we have a way to get the current user's ID
const CURRENT_USER_ID = 'currentUser'; // Replace with actual user ID logic

export function ChatWindow({ chatRoomId }: ChatWindowProps) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
   const { toast } = useToast();

  // Fetch initial messages
  React.useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with actual API call: getAllChatMessages(chatRoomId)
        console.log(`Fetching messages for room: ${chatRoomId}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
        const fetchedMessages: ChatMessage[] = [
           { _id: 'm1', sender: 'user1', content: 'Hello there!', timestamp: new Date(Date.now() - 60000 * 5).toISOString(), },
           { _id: 'm2', sender: CURRENT_USER_ID, content: 'Hi! How are you?', timestamp: new Date(Date.now() - 60000 * 4).toISOString(), },
           { _id: 'm3', sender: 'user1', content: 'Doing well, thanks! Working on the new feature.', timestamp: new Date(Date.now() - 60000 * 3).toISOString(), },
         ];
        setMessages(fetchedMessages);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        setError('Failed to load messages.');
         toast({
          title: "Error Loading Messages",
          description: "Could not fetch messages for this chat.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [chatRoomId, toast]);


   // Scroll to bottom when messages change or component loads
  React.useEffect(() => {
    if (scrollAreaRef.current) {
       const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
       if(scrollElement) {
         scrollElement.scrollTop = scrollElement.scrollHeight;
       }
    }
  }, [messages, loading]);


  // WebSocket listeners
  React.useEffect(() => {
    if (!socket || !isConnected) return;

    console.log(`Joining room: ${chatRoomId}`);
    socket.emit('joinRoom', chatRoomId);

    const handleReceiveMessage = (data: ChatMessage & { chatRoom: string }) => {
       console.log('Received message data:', data);
       // Ensure the message is for the currently active room
      if (data.chatRoom === chatRoomId) {
         console.log(`Adding message to room ${chatRoomId}:`, data)
         setMessages((prevMessages) => [...prevMessages, data]);
      } else {
         console.log(`Message received for different room (${data.chatRoom}), ignoring.`);
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);

    // Cleanup on component unmount or chatRoomId change
    return () => {
      console.log(`Leaving room: ${chatRoomId}`);
      socket.emit('leaveRoom', chatRoomId);
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, chatRoomId, isConnected]);


  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim() || !socket || !isConnected) return;

    const messageData: ChatMessage & { chatRoom: string, senderName: string, receiverId?: string } = {
      _id: `temp-${Date.now()}`, // Temporary ID for optimistic update
      sender: CURRENT_USER_ID,
      content: newMessage,
      timestamp: new Date().toISOString(),
      chatRoom: chatRoomId,
      senderName: "You", // Replace with actual current user name
      // receiverId: 'TODO', // Need logic to determine receiver if it's a 1-on-1 chat
    };

    console.log('Sending message:', messageData);
    socket.emit('sendMessage', messageData);

    // Optimistic update: Add the message immediately to the UI
    setMessages((prevMessages) => [...prevMessages, messageData]);
    setNewMessage('');
  };

   const getInitials = (name: string) => {
     return name.split(' ').map(n => n[0]).join('').toUpperCase();
   }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header (Optional) */}
      {/* <div className="p-4 border-b"> Chat Room Name </div> */}

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {loading && (
            <>
             <Skeleton className="h-10 w-3/4 my-2" />
             <Skeleton className="h-10 w-2/3 my-2 ml-auto" />
             <Skeleton className="h-16 w-4/5 my-2" />
            </>
          )}
          {error && <p className="text-destructive text-center">{error}</p>}
          {!loading && !error && messages.map((message) => (
            <div
              key={message._id}
              className={cn(
                'flex items-end space-x-2',
                message.sender === CURRENT_USER_ID ? 'justify-end' : 'justify-start'
              )}
            >
              {message.sender !== CURRENT_USER_ID && (
                 <Avatar className="h-8 w-8">
                   <AvatarImage src={`https://picsum.photos/seed/${message.sender}/40/40`} alt={message.sender} />
                   <AvatarFallback>{getInitials(message.sender)}</AvatarFallback>
                 </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xs lg:max-w-md p-3 rounded-lg',
                  message.sender === CURRENT_USER_ID
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted rounded-bl-none'
                )}
              >
                <p className="text-sm">{message.content}</p>
                 <p className={cn(
                     "text-xs mt-1",
                     message.sender === CURRENT_USER_ID ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/70 text-left'
                 )}>
                    {format(new Date(message.timestamp), 'p')}
                 </p>
              </div>
               {message.sender === CURRENT_USER_ID && (
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://picsum.photos/seed/${CURRENT_USER_ID}/40/40`} alt="You" />
                   <AvatarFallback>ME</AvatarFallback>
                 </Avatar>
              )}
            </div>
          ))}
           {!loading && !error && messages.length === 0 && (
                <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
            )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            type="text"
            placeholder={isConnected ? "Type your message..." : "Connecting..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!isConnected || loading}
            className="flex-1"
            aria-label="Chat message input"
          />
          <Button type="submit" disabled={!isConnected || !newMessage.trim() || loading} size="icon" aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
