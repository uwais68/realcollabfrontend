'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Smile, Trash2, CornerDownLeft, Edit, Check, CheckCheck } from 'lucide-react'; // Added Check, CheckCheck
import { cn } from '@/lib/utils';
import { format, parseISO, isSameDay, formatDistanceToNowStrict } from 'date-fns';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import {
    getAllMessages,
    sendMessage,
    markMessageAsRead, // Use new function for marking as read
    updateUserTypingStatus, // For sending typing status
    // getUserLastSeen, // Function exists, UI integration later
    getUserById,
    type ChatMessage,
    type SendMessageAPIData, // Use the specific type for sending via API
    // Removed unused types like ReplyMessageData if send handles replies
} from '@/services/realcollab';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/context/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// AlertDialog for delete confirmation is removed as delete functionality is removed for now
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
// import { buttonVariants } from '@/components/ui/button';


interface ChatWindowProps {
  chatRoomId: string;
}

export function ChatWindow({ chatRoomId }: ChatWindowProps) {
    console.log(`CHAT WINDOW ${chatRoomId}`)
  const { socket, isConnected, emitEvent } = useSocket();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [usersInfo, setUsersInfo] = React.useState<Map<string, Partial<User>>>(new Map());
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    socket?.on("receiveMessage",(data:ChatMessage)=>{
        if(data.sender==currentUser){
        console.log(currentUser)    
        console.log(data.sender)    
        setMessages([...messages,data])}
    })
    socket?.emit('joinRoom', chatRoomId);

  const fetchUserInfo = React.useCallback(async (userId: string) => {
    if (!usersInfo.has(userId) && userId !== currentUser?._id) {
      try {
        // Check if sender is already populated as an object
        const existingUser = messages.find(m => typeof m.sender === 'object' && m.sender._id === userId);
        if (existingUser && typeof existingUser.sender === 'object') {
            setUsersInfo(prev => new Map(prev).set(userId, existingUser.sender as Partial<User>));
            return;
        }
        const userInfo = await getUserById(userId);
        setUsersInfo(prev => new Map(prev).set(userId, userInfo));
      } catch (err) {
        console.warn(`Failed to fetch user info for ${userId}:`, err);
        setUsersInfo(prev => new Map(prev).set(userId, { _id: userId, firstName: 'User', lastName: ''}));
      }
    }
  }, [usersInfo, currentUser?._id, messages]);

  React.useEffect(() => {
    const fetchMessages = async () => {
       if (!currentUser?._id) {
           console.log("ChatWindow: Waiting for current user...");
           setLoading(false); // Stop loading if no user
           return;
       }
      setLoading(true);
      setError(null);
      setMessages([]);
      console.log(`Fetching messages for room: ${chatRoomId} (User: ${currentUser._id})`);
      try {
        const fetchedMessages = await getAllMessages(chatRoomId);
        console.log(`Fetched ${fetchedMessages.length} messages for room ${chatRoomId}`);
        
        const processedMessages = fetchedMessages.map(msg => {
            const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender._id;
             if (typeof msg.sender === 'object' && msg.sender !== null && !usersInfo.has(senderId)) {
                setUsersInfo(prev => new Map(prev).set(senderId, msg.sender as Partial<User>));
            } else if (typeof msg.sender === 'string') {
                fetchUserInfo(msg.sender);
            }
            return {
                ...msg,
                timestamp: msg.createdAt || msg.timestamp,
                deletedForCurrentUser: msg.deletedFor?.includes(currentUser._id),
            };
        }).filter(msg => !msg.deletedForCurrentUser);

        setMessages(processedMessages);

        // Mark messages as read
        const unreadMessages = processedMessages.filter(m => m.status !== 'read' && (typeof m.sender === 'string' ? m.sender : m.sender._id) !== currentUser._id);
        unreadMessages.forEach(async (msg) => {
            try {
                await markMessageAsRead(msg._id);
                // Optionally update local message status, or wait for socket event if backend broadcasts
                setMessages(prev => prev.map(m => m._id === msg._id ? {...m, status: 'read'} : m));
            } catch (readError) {
                console.warn(`Failed to mark message ${msg._id} as read:`, readError);
            }
        });

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

    if(chatRoomId) fetchMessages();
    else {
        setMessages([]);
        setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomId, currentUser?._id]);


  React.useEffect(() => {
    if (scrollAreaRef.current) {
       const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
       if(scrollElement) {
         setTimeout(() => {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          }, 150);
       }
    }
  }, [messages, loading]);


  React.useEffect(() => {
    if (!socket || !isConnected || !currentUser?._id || !chatRoomId) return;

    console.log(`Socket effects: Joining room: ${chatRoomId}`);
    emitEvent('joinRoom', chatRoomId);

    const handleReceiveMessage = (receivedMessage: ChatMessage) => {
       console.log('Received message data via socket:', receivedMessage);
       if (receivedMessage.chatRoom === chatRoomId && !receivedMessage.deletedFor?.includes(currentUser._id)) {
         setMessages((prevMessages) => {
             if (prevMessages.some(msg => msg._id === receivedMessage._id)) {
                 return prevMessages.map(msg => msg._id === receivedMessage._id ? {...msg, ...receivedMessage, timestamp: receivedMessage.createdAt || receivedMessage.timestamp} : msg);
             }
             return [...prevMessages, {...receivedMessage, timestamp: receivedMessage.createdAt || receivedMessage.timestamp}];
         });
          const senderId = typeof receivedMessage.sender === 'string' ? receivedMessage.sender : receivedMessage.sender._id;
          if (senderId !== currentUser?._id) {
             fetchUserInfo(senderId);
             // Mark as read if received while window is active
             markMessageAsRead(receivedMessage._id).catch(e => console.warn("Failed to mark incoming as read", e));
          }
      }
    };

     const handleMessageUpdate = (updatedMessage: ChatMessage) => {
        console.log('Received message update via socket (e.g. status change):', updatedMessage);
        if (updatedMessage.chatRoom === chatRoomId) {
            setMessages(prev => prev.map(msg =>
                msg._id === updatedMessage._id
                    ? { ...msg, ...updatedMessage, deletedForCurrentUser: updatedMessage.deletedFor?.includes(currentUser._id), timestamp: updatedMessage.createdAt || updatedMessage.timestamp }
                    : msg
            ).filter(msg => !msg.deletedForCurrentUser));
        }
     };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageUpdated', handleMessageUpdate); // For status updates, reactions (if re-added)

    return () => {
      console.log(`Socket effects: Leaving room: ${chatRoomId}`);
      emitEvent('leaveRoom', chatRoomId);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageUpdated', handleMessageUpdate);
    };
  }, [socket, chatRoomId, isConnected, currentUser?._id, fetchUserInfo, emitEvent]);


  const handleTyping = (isTyping: boolean) => {
      if (!isConnected) return;
      // Backend API /api/chat/typing-status doesn't take chatRoomId. It's for current user's general typing status.
      // For room-specific typing, socket event `userTypingInRoom` would be better.
      // Using provided API:
      updateUserTypingStatus(isTyping).catch(e => console.warn("Failed to update typing status", e));

      // If using socket directly for typing in room (example, backend needs to support this)
      // emitEvent('typingInRoom', { chatRoomId, userId: currentUser?._id, isTyping });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (e.target.value.trim()) {
        handleTyping(true); // User started typing
        typingTimeoutRef.current = setTimeout(() => {
            handleTyping(false); // User stopped typing after 1 second
        }, 1000);
    } else {
        handleTyping(false); // User cleared input
    }
  };


    const handleSendMessageOrReply = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!newMessage.trim() || !currentUser?._id || !chatRoomId) return;

      const messageContent = newMessage;
      const currentReplyingTo = replyingTo;
      setNewMessage('');
      setReplyingTo(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      handleTyping(false);

      const apiMessageData: SendMessageAPIData = {
           chatRoom: chatRoomId,
           content: messageContent,
           messageType: 'text',
           fileUrl: undefined, // Add file upload logic later
           replyTo: currentReplyingTo?._id,
      };

       const optimisticMessage: ChatMessage = {
           _id: `temp-${Date.now()}`,
           chatRoom: chatRoomId,
           sender: currentUser._id, // Send full user object for optimistic display
           content: messageContent,
           messageType: 'text',
           replyTo: currentReplyingTo?._id,
           reactions: [],
           deletedFor: [],
           timestamp: new Date().toISOString(),
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString(),
           status: 'sent',
           senderName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
       };
      setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

      try {
         console.log('Sending message via API /api/chat/send:', apiMessageData);
         // The backend's /api/chat/send controller handles saving and should ideally also broadcast via socket.
         // The socket.on('sendMessage') on backend is for client-emitted socket messages.
         // For consistency with saving to DB, HTTP POST is safer unless backend socket handler also saves.
         const sentMessage = await sendMessage(apiMessageData);
         socket?.emit("sendMessage",optimisticMessage)
         // API call
         console.log('Message sent successfully via API, server returned:', sentMessage);

         setMessages((prevMessages) =>
             prevMessages.map((msg) =>
                 msg._id === optimisticMessage._id
                 ? { ...sentMessage, timestamp: sentMessage.createdAt || sentMessage.timestamp, deletedForCurrentUser: false }
                 : msg
             )
         );
         // If backend HTTP handler doesn't broadcast, we might need client to emit also,
         // but that means server socket 'sendMessage' handler should ONLY broadcast and NOT save to avoid duplicates.
         // emitEvent('sendMessage', { ...sentMessage, senderName: optimisticMessage.senderName, receiverId: getReceiverIdForDM() });

      } catch (error) {
         console.error('Failed to send message/reply:', error);
         toast({
             title: "Error Sending Message",
             description: error instanceof Error ? error.message : "Could not send message.",
             variant: "destructive",
         });
         setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== optimisticMessage._id));
         setNewMessage(messageContent);
         setReplyingTo(currentReplyingTo);
      }
    };

   const getInitials = (firstName?: string, lastName?: string): string => {
     const first = firstName?.[0] || '';
     const last = lastName?.[0] || '';
     return `${first}${last}`.toUpperCase() || '??';
   }

   const getUserInfoFromStateOrMessage = (sender: ChatMessage['sender']): Partial<User> => {
        if (typeof sender === 'object' && sender !== null && '_id' in sender) {
            return sender; // Sender is already a populated object
        }
        if (typeof sender === 'string') {
            if (sender === currentUser?._id) {
                return currentUser;
            }
            return usersInfo.get(sender) || { _id: sender, firstName: 'User', lastName: '' };
        }
        return { firstName: 'Unknown', lastName: '' }; // Fallback
    };

   if (authLoading && !currentUser) {
     return <div className="flex-1 flex items-center justify-center text-muted-foreground">Authenticating...</div>;
   }
   // If chatRoomId is not selected, show a placeholder
   if (!chatRoomId && !loading) {
        return <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">Select a chat to start messaging.</div>;
   }


  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-1">
          {loading && (
            <>
             <Skeleton className="h-10 w-3/4 my-2 rounded-lg" />
             <Skeleton className="h-10 w-2/3 my-2 ml-auto rounded-lg" />
             <Skeleton className="h-16 w-4/5 my-2 rounded-lg" />
            </>
          )}
          {error && <p className="text-destructive text-center">{error}</p>}
          {!loading && !error && messages.map((message, index) => {
              if (message.deletedForCurrentUser) return null;

              const senderInfo = getUserInfoFromStateOrMessage(message.sender);
              const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
              const isCurrentUser = senderId === currentUser?._id;
              const senderName = senderInfo.firstName || senderInfo.lastName ? `${senderInfo.firstName || ''} ${senderInfo.lastName || ''}`.trim() : senderInfo.email ?? 'User';
              const senderInitials = getInitials(senderInfo.firstName, senderInfo.lastName);
              
              const replyParent = message.replyTo && typeof message.replyTo !== 'string' ? message.replyTo : messages.find(m => m._id === message.replyTo);
              const replyParentSenderInfo = replyParent ? getUserInfoFromStateOrMessage(replyParent.sender!) : null;
              const replyParentSenderName = replyParentSenderInfo?.firstName || replyParentSenderInfo?.lastName ? `${replyParentSenderInfo.firstName || ''} ${replyParentSenderInfo.lastName || ''}`.trim() : replyParentSenderInfo?.email ?? 'User';

              // Date Grouping Logic
              let dateSeparator = null;
              const messageDate = parseISO(message.timestamp);
              if (index === 0) {
                dateSeparator = <DateSeparator date={messageDate} />;
              } else {
                const prevMessageDate = parseISO(messages[index - 1].timestamp);
                if (!isSameDay(messageDate, prevMessageDate)) {
                  dateSeparator = <DateSeparator date={messageDate} />;
                }
              }

              return (
                <React.Fragment key={message._id}>
                  {dateSeparator}
                  <div
                      className={cn(
                          'flex items-end space-x-2 group relative py-1',
                          isCurrentUser ? 'justify-end' : 'justify-start'
                      )}
                  >
                      {/* Message Actions (Simplified for now) */}
                       <div className={cn(
                           "absolute top-0 -mt-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-muted rounded-full p-0.5 shadow-sm",
                           isCurrentUser ? "right-10" : "left-10"
                       )}>
                           <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyingTo(message)} aria-label="Reply">
                               <CornerDownLeft className="h-3 w-3" />
                           </Button>
                           {/* Reaction and Delete buttons removed as per API simplification */}
                       </div>

                      {!isCurrentUser && (
                      <Avatar className="h-8 w-8 self-end mb-1">
                          <AvatarImage src={senderInfo.profilePicture || `https://picsum.photos/seed/${senderId}/40/40`} alt={senderName} />
                          <AvatarFallback>{senderInitials}</AvatarFallback>
                      </Avatar>
                      )}

                      <div
                          className={cn(
                              'max-w-xs lg:max-w-md p-2.5 rounded-lg shadow-sm relative',
                              isCurrentUser
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-card text-card-foreground border border-border rounded-bl-none'
                          )}
                      >
                          {replyParent && (
                               <div className={cn(
                                   "text-xs opacity-80 border-l-2 pl-2 mb-1.5 py-0.5",
                                   isCurrentUser ? "border-primary-foreground/60" : "border-primary/60"
                                   )}>
                                   Replying to {replyParentSenderInfo?._id === currentUser._id ? "yourself" : replyParentSenderName}:{' '}
                                   <span className="italic truncate block max-w-[150px] sm:max-w-[200px]">
                                       {replyParent.content || `(${replyParent.messageType})`}
                                   </span>
                               </div>
                           )}

                          <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                          <div className={cn(
                              "text-xs mt-1.5 opacity-80 flex items-center",
                              isCurrentUser ? 'text-primary-foreground justify-end' : 'text-muted-foreground justify-start'
                          )}>
                              <span>{format(parseISO(message.timestamp), 'p')}</span>
                              {isCurrentUser && (
                                  message.status === 'read' ? <CheckCheck className="ml-1 h-4 w-4 text-blue-400" /> :
                                  message.status === 'delivered' ? <CheckCheck className="ml-1 h-4 w-4" /> :
                                  <Check className="ml-1 h-4 w-4" />
                              )}
                          </div>
                          {/* Reactions display removed */}
                      </div>

                      {isCurrentUser && (
                      <Avatar className="h-8 w-8 self-end mb-1">
                          <AvatarImage src={currentUser.profilePicture || `https://picsum.photos/seed/${currentUser._id}/40/40`} alt="You" />
                          <AvatarFallback>{getInitials(currentUser.firstName, currentUser.lastName)}</AvatarFallback>
                      </Avatar>
                      )}
                  </div>
                </React.Fragment>
              );
          })}
           {!loading && !error && messages.length === 0 && chatRoomId && (
                <p className="text-center text-muted-foreground pt-10">No messages yet. Start the conversation!</p>
            )}
        </div>
      </ScrollArea>

       {replyingTo && (
          <div className="p-2.5 border-t bg-muted/30 text-sm text-muted-foreground flex justify-between items-center">
             <div className="truncate">
                Replying to <span className="font-medium text-foreground">{getUserInfoFromStateOrMessage(replyingTo.sender).firstName || 'User'}</span>:
                 <span className="italic ml-1">{replyingTo.content || `(${replyingTo.messageType})`}</span>
             </div>
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
                 <Trash2 className="h-4 w-4" />
             </Button>
          </div>
       )}

      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessageOrReply} className="flex space-x-2">
          <Input
            type="text"
            placeholder=    "Type your message..."  
            value={newMessage}
            onChange={handleInputChange}
            
            className="flex-1"
            aria-label="Chat message input"
          />
          <Button type="submit" 
                size="icon"
                aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// Helper component for date separators
const DateSeparator = ({ date }: { date: Date }) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label;
    if (isSameDay(date, today)) {
        label = "Today";
    } else if (isSameDay(date, yesterday)) {
        label = "Yesterday";
    } else {
        label = format(date, "MMMM d, yyyy");
    }

    return (
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
                <span className="bg-background px-2 text-xs text-muted-foreground">{label}</span>
            </div>
        </div>
    );
};