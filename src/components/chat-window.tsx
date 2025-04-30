'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Smile, Trash2, CornerDownLeft, Edit } from 'lucide-react'; // Added icons
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import {
    getAllMessages, // Changed from getAllChatMessages
    sendMessage, // Changed from sendChatMessage
    deleteMessage,
    reactToMessage,
    replyToMessage,
    updateMessageStatus,
    getUserById,
    type ChatMessage,
    type SendMessageData,
    type ReplyMessageData,
} from '@/services/realcollab';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/context/AuthContext'; // Import User type
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // For emoji picker
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';


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
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null); // For replying
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

  // Fetch initial messages and sender info using the new API function
  React.useEffect(() => {
    const fetchMessages = async () => {
       if (!currentUser?._id) {
           console.log("ChatWindow: Waiting for current user...");
           return; // Don't fetch if user isn't loaded yet
       }
      setLoading(true);
      setError(null);
      setMessages([]); // Clear previous room messages
      console.log(`Fetching messages for room: ${chatRoomId} (User: ${currentUser._id})`);
      try {
        const fetchedMessages = await getAllMessages(chatRoomId); // Use new function
        console.log(`Fetched ${fetchedMessages.length} messages for room ${chatRoomId}`);
        // Make sure fetched messages conform to ChatMessage interface
        setMessages(fetchedMessages.map(msg => ({
            ...msg,
            timestamp: msg.createdAt || msg.timestamp, // Use createdAt if available, else timestamp
            // Filter out reactions associated with users deleted from the message
            reactions: msg.reactions?.filter(r => !msg.deletedFor?.includes(r.user)),
             // Filter message if deleted for current user
             deletedForCurrentUser: msg.deletedFor?.includes(currentUser._id),
        })).filter(msg => !msg.deletedForCurrentUser) // Filter out locally deleted messages
       );


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
    emitEvent('joinRoom', chatRoomId);

    const handleReceiveMessage = (data: any) => {
       console.log('Received message data via socket:', data);

       const receivedMessage: ChatMessage = {
           _id: data._id || `temp-socket-${Date.now()}`,
           chatRoom: data.chatRoom,
           sender: data.sender,
           content: data.content,
           messageType: data.messageType || 'text',
           fileUrl: data.fileUrl,
           replyTo: data.replyTo,
           reactions: data.reactions || [],
           status: data.status || 'sent',
           deletedFor: data.deletedFor || [],
           timestamp: data.timestamp || new Date().toISOString(),
           createdAt: data.createdAt || new Date().toISOString(),
           updatedAt: data.updatedAt || new Date().toISOString(),
           senderName: data.senderName,
       };

      if (receivedMessage.chatRoom === chatRoomId && !receivedMessage.deletedFor?.includes(currentUser._id)) {
         console.log(`Adding message to room ${chatRoomId}:`, receivedMessage)
         setMessages((prevMessages) => {
              // Avoid duplicates if message already exists (e.g., from optimistic update)
             if (prevMessages.some(msg => msg._id === receivedMessage._id)) {
                 return prevMessages;
             }
             return [...prevMessages, receivedMessage];
         });
          if (receivedMessage.sender !== currentUser?._id) {
             fetchUserInfo(receivedMessage.sender);
             // Mark as delivered/read if window is active? (Needs backend logic)
             // updateMessageStatus(receivedMessage._id, 'delivered');
          }
      } else {
         console.log(`Message received for different room (${receivedMessage.chatRoom}) or deleted for user, ignoring.`);
      }
    };

     // Listen for message updates (e.g., reactions, status changes, edits, deletes)
     const handleMessageUpdate = (updatedMessage: ChatMessage) => {
        console.log('Received message update via socket:', updatedMessage);
        if (updatedMessage.chatRoom === chatRoomId) {
            setMessages(prev => prev.map(msg =>
                msg._id === updatedMessage._id
                    ? { ...msg, // Keep existing local state if needed
                        ...updatedMessage, // Apply updates from socket
                        // Filter reactions and check deletion status again
                        reactions: updatedMessage.reactions?.filter(r => !updatedMessage.deletedFor?.includes(r.user)),
                        deletedForCurrentUser: updatedMessage.deletedFor?.includes(currentUser._id),
                      }
                    : msg
            ).filter(msg => !msg.deletedForCurrentUser)); // Re-apply filter
        }
     };


    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageUpdated', handleMessageUpdate); // Add listener for updates

    // Cleanup on component unmount or chatRoomId change
    return () => {
      console.log(`Leaving room: ${chatRoomId}`);
      emitEvent('leaveRoom', chatRoomId);
      socket.off('receiveMessage', handleReceiveMessage);
       socket.off('messageUpdated', handleMessageUpdate); // Remove listener
    };
  }, [socket, chatRoomId, isConnected, currentUser?._id, fetchUserInfo, emitEvent]);


   // Function to handle sending either a new message or a reply
    const handleSendMessageOrReply = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!newMessage.trim() || !currentUser?._id) return;

      const messageContent = newMessage;
      const currentReplyingTo = replyingTo; // Capture replyingTo state at time of send
      setNewMessage(''); // Clear input
      setReplyingTo(null); // Clear reply state

      // Prepare base data
       const baseMessageData = {
           content: messageContent,
           messageType: 'text' as const, // Assuming text for now
           fileUrl: undefined, // Add file upload logic later
       };

       // Create optimistic message structure
       const optimisticMessage: ChatMessage = {
           _id: `temp-${Date.now()}`,
           chatRoom: chatRoomId,
           sender: currentUser._id,
           ...baseMessageData,
           replyTo: currentReplyingTo?._id, // Set replyTo if applicable
           reactions: [],
           deletedFor: [],
           timestamp: new Date().toISOString(),
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString(),
           status: 'sent',
           senderName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
       };

      // Optimistic update
      setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

      try {
         let sentMessage: ChatMessage;
         if (currentReplyingTo) {
             // Call replyToMessage API
             const replyData: ReplyMessageData = baseMessageData;
             console.log(`Replying to message ${currentReplyingTo._id} via API:`, replyData);
             const response = await replyToMessage(currentReplyingTo._id, replyData);
             sentMessage = response.replyMessage;
             console.log('Reply sent successfully via API:', sentMessage);
         } else {
             // Call sendMessage API
             const apiMessageData: SendMessageData = {
                 chatRoom: chatRoomId,
                 ...baseMessageData,
             };
             console.log('Sending message via API:', apiMessageData);
             sentMessage = await sendMessage(apiMessageData);
             console.log('Message sent successfully via API:', sentMessage);
         }

          // Update optimistic message with real data
         setMessages((prevMessages) =>
             prevMessages.map((msg) =>
                 msg._id === optimisticMessage._id
                 ? { ...sentMessage, timestamp: sentMessage.createdAt, deletedForCurrentUser: false } // Ensure deletion status is correct
                 : msg
             )
         );

         // Optional: Socket emit if backend API doesn't broadcast
         // emitEvent('sendMessage', { ...sentMessage, senderName: optimisticMessage.senderName });

      } catch (error) {
         console.error('Failed to send message/reply:', error);
         toast({
             title: "Error Sending",
             description: error instanceof Error ? error.message : "Could not send message.",
             variant: "destructive",
         });
         // Rollback optimistic update
         setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== optimisticMessage._id));
         setNewMessage(messageContent); // Restore input
         setReplyingTo(currentReplyingTo); // Restore replyingTo state
      }
    };


    const handleDeleteMessage = async (messageId: string) => {
        console.log(`Attempting to delete message: ${messageId}`);
        // Optimistic UI Update: Visually remove the message
        setMessages(prev => prev.filter(msg => msg._id !== messageId));

        try {
            await deleteMessage(messageId);
            toast({
                title: "Message Deleted",
                description: "The message has been removed for you.",
            });
            // No need to refetch, socket 'messageUpdated' should handle broadcase if needed
            // Or rely on the optimistic removal.
        } catch (error) {
            console.error(`Failed to delete message ${messageId}:`, error);
            toast({
                title: "Error Deleting Message",
                description: error instanceof Error ? error.message : "Could not delete message.",
                variant: "destructive",
            });
            // Rollback: Potentially refetch messages or add the message back
            // For simplicity, we might just leave it removed optimistically,
            // or trigger a full refresh:
            // fetchMessages(); // Replace fetchMessages with the actual fetch function name if different
        }
    };


    const handleReactToMessage = async (messageId: string, emoji: string) => {
       console.log(`Reacting to message ${messageId} with ${emoji}`);

       // Optimistic UI Update
       setMessages(prevMessages =>
           prevMessages.map(msg => {
               if (msg._id === messageId) {
                   const existingReactionIndex = msg.reactions?.findIndex(
                       r => r.user === currentUser?._id && r.emoji === emoji
                   );
                   let newReactions = [...(msg.reactions || [])];

                   if (existingReactionIndex !== undefined && existingReactionIndex > -1) {
                       // Remove existing reaction
                       newReactions.splice(existingReactionIndex, 1);
                   } else {
                        // Remove any previous reaction by the user (optional: allow multiple reactions?)
                        // newReactions = newReactions.filter(r => r.user !== currentUser?._id);
                       // Add new reaction
                       newReactions.push({ user: currentUser!._id, emoji: emoji });
                   }
                   return { ...msg, reactions: newReactions };
               }
               return msg;
           })
       );


       try {
           await reactToMessage(messageId, emoji);
           // Success: Optimistic update is likely sufficient.
           // Backend should broadcast via socket 'messageUpdated' to other users.
       } catch (error) {
            console.error(`Failed to react to message ${messageId}:`, error);
            toast({
                title: "Error Reacting",
                description: error instanceof Error ? error.message : "Could not add reaction.",
                variant: "destructive",
            });
           // TODO: Rollback optimistic update (requires storing original state or refetching)
            // For now, we'll leave the optimistic state.
       }
   };

   // Simple Emoji Picker (replace with a proper component later)
   const EmojiPicker = ({ onSelectEmoji }: { onSelectEmoji: (emoji: string) => void }) => {
       const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
       return (
           <div className="flex space-x-1 p-1">
               {emojis.map(emoji => (
                   <Button
                       key={emoji}
                       variant="ghost"
                       size="icon"
                       className="h-7 w-7 rounded-full"
                       onClick={() => onSelectEmoji(emoji)}
                   >
                       {emoji}
                   </Button>
               ))}
           </div>
       );
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
              // Skip rendering if deleted for the current user
              if (message.deletedFor?.includes(currentUser._id)) {
                return null;
              }

              const senderInfo = getUserInfo(message.sender);
              const isCurrentUser = message.sender === currentUser._id;
              const senderName = senderInfo.firstName || senderInfo.lastName ? `${senderInfo.firstName || ''} ${senderInfo.lastName || ''}`.trim() : senderInfo.email ?? 'User';
              const senderInitials = getInitials(senderInfo.firstName, senderInfo.lastName);
              const replyParent = message.replyTo ? messages.find(m => m._id === message.replyTo) : null;
              const replyParentSenderInfo = replyParent ? getUserInfo(replyParent.sender) : null;
              const replyParentSenderName = replyParentSenderInfo?.firstName || replyParentSenderInfo?.lastName ? `${replyParentSenderInfo.firstName || ''} ${replyParentSenderInfo.lastName || ''}`.trim() : replyParentSenderInfo?.email ?? 'User';


              return (
                 <div
                    key={message._id}
                    className={cn(
                        'flex items-end space-x-2 group relative', // Added relative positioning for actions
                        isCurrentUser ? 'justify-end' : 'justify-start'
                    )}
                 >
                     {/* Message Actions (Appear on Hover) */}
                     <div className={cn(
                         "absolute top-0 -mt-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-muted rounded-full p-1 shadow",
                         isCurrentUser ? "right-10" : "left-10" // Position near avatar
                     )}>
                         <Popover>
                             <PopoverTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="React">
                                     <Smile className="h-4 w-4" />
                                 </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0">
                                 <EmojiPicker onSelectEmoji={(emoji) => handleReactToMessage(message._id, emoji)} />
                             </PopoverContent>
                         </Popover>

                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(message)} aria-label="Reply">
                             <CornerDownLeft className="h-4 w-4" />
                         </Button>

                          {/* Edit Button (Placeholder) */}
                         {/* {isCurrentUser && (
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => console.log("Edit TBD")} aria-label="Edit">
                                 <Edit className="h-4 w-4" />
                             </Button>
                         )} */}

                         {isCurrentUser && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" aria-label="Delete">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will remove the message only for you. Other participants will still see it. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className={buttonVariants({ variant: "destructive" })}
                                            onClick={() => handleDeleteMessage(message._id)}
                                        >
                                            Delete for Me
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         )}
                     </div>


                     {/* Avatar (Sender) */}
                    {!isCurrentUser && (
                    <Avatar className="h-8 w-8 self-end mb-1"> {/* Align avatar bottom */}
                        <AvatarImage src={senderInfo.profilePicture || `https://picsum.photos/seed/${message.sender}/40/40`} alt={senderName} />
                        <AvatarFallback>{senderInitials}</AvatarFallback>
                    </Avatar>
                    )}

                     {/* Message Bubble */}
                    <div
                        className={cn(
                            'max-w-xs lg:max-w-md p-3 rounded-lg shadow-sm relative', // Added relative for reactions
                            isCurrentUser
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-muted rounded-bl-none'
                        )}
                    >
                        {/* Reply Context */}
                        {replyParent && (
                             <div className={cn(
                                 "text-xs opacity-80 border-l-2 pl-2 mb-1",
                                 isCurrentUser ? "border-primary-foreground/50" : "border-primary/50"
                                 )}>
                                 Replying to {replyParentSenderInfo?._id === currentUser._id ? "yourself" : replyParentSenderName}:{' '}
                                 <span className="italic truncate block">{replyParent.content || `(${replyParent.messageType})`}</span>
                             </div>
                         )}

                        {/* Message Content */}
                        <p className="text-sm break-words">{message.content}</p>
                        <p className={cn(
                            "text-xs mt-1 opacity-70",
                            isCurrentUser ? 'text-primary-foreground text-right' : 'text-muted-foreground text-left'
                        )}>
                            {format(parseISO(message.timestamp), 'p')}
                            {isCurrentUser && message.status && message.status !== 'sent' && ( // Show status ticks for own messages
                                <span className="ml-1">{message.status === 'read' ? '✓✓' : '✓'}</span>
                            )}
                        </p>

                        {/* Reactions Display */}
                        {message.reactions && message.reactions.length > 0 && (
                            <div className={cn(
                                "absolute -bottom-3 flex space-x-1 p-0.5 bg-card border rounded-full shadow-sm",
                                isCurrentUser ? "right-1" : "left-1"
                            )}>
                                {message.reactions.slice(0, 3).map((reaction, index) => ( // Show max 3 reactions inline
                                    <span key={`${reaction.user}-${reaction.emoji}-${index}`} className="text-xs cursor-default" title={getUserInfo(reaction.user).firstName || 'User'}>
                                        {reaction.emoji}
                                    </span>
                                ))}
                                {message.reactions.length > 3 && (
                                    <span className="text-xs px-1 text-muted-foreground">+{message.reactions.length - 3}</span>
                                )}
                            </div>
                        )}

                    </div>

                     {/* Avatar (Current User) */}
                    {isCurrentUser && (
                    <Avatar className="h-8 w-8 self-end mb-1"> {/* Align avatar bottom */}
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

      {/* Reply Indicator */}
       {replyingTo && (
          <div className="p-2 border-t bg-muted/50 text-sm text-muted-foreground flex justify-between items-center">
             <div className="truncate">
                Replying to <span className="font-medium">{getUserInfo(replyingTo.sender).firstName || 'User'}</span>:
                 <span className="italic ml-1">{replyingTo.content || `(${replyingTo.messageType})`}</span>
             </div>
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
                 <Trash2 className="h-4 w-4" /> {/* Using Trash2 for 'cancel' */}
             </Button>
          </div>
       )}


      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessageOrReply} className="flex space-x-2">
          <Input
            type="text"
            placeholder={isConnected ? (replyingTo ? "Type your reply..." : "Type your message...") : "Connecting..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
             disabled={authLoading || !isConnected || !currentUser || loading}
            className="flex-1"
            aria-label="Chat message input"
          />
          <Button type="submit"
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
