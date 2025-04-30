import { type User } from '@/context/AuthContext'; // Import User type if needed

/**
 * Represents a User ID (string representation of ObjectId).
 */
type UserId = string;

/**
 * Represents a Task ID (string representation of ObjectId).
 */
type TaskId = string;

/**
 * Represents a Message ID (string representation of ObjectId).
 */
type MessageId = string;

/**
 * Represents a Chat Room ID (string representation of ObjectId).
 */
type ChatRoomId = string;


/**
 * Represents a Task based on the Mongoose schema.
 */
export interface Task {
  /**
   * The ID of the task.
   */
  _id: TaskId;
  /**
   * The title of the task.
   */
  title: string;
  /**
   * The description of the task.
   */
  description?: string; // Optional description
  /**
   * The status of the task.
   */
  status: 'Pending' | 'In Progress' | 'Completed'; // Updated statuses
  /**
   * The ID of the assigned user.
   */
  assignedTo?: UserId; // Optional assigned user ID
   /**
   * The ID of the user who created the task.
   */
  createdBy: UserId; // Required creator user ID
  /**
   * The due date of the task (ISO string format).
   */
  dueDate?: string; // Optional due date
  /**
   * Timestamp when the task was created.
   */
  createdAt: string;
  /**
   * Timestamp when the task was last updated.
   */
  updatedAt: string;
}

/**
 * Represents a chat message based on the Mongoose schema.
 */
export interface ChatMessage {
  /**
   * The ID of the message.
   */
  _id: MessageId;
  /**
   * The ID of the chat room.
   */
  chatRoom: ChatRoomId;
  /**
   * The ID of the sender.
   */
  sender: UserId;
   /**
   * Sender details (populated from backend).
   */
  // senderDetails?: Pick<User, 'firstName' | 'lastName'>; // Example if backend populates
  /**
   * The content of the message (for text type).
   */
  content?: string;
  /**
   * The type of the message.
   */
  messageType: 'text' | 'image' | 'file' | 'voice';
  /**
   * URL for non-text message types.
   */
  fileUrl?: string;
  /**
   * The ID of the message being replied to.
   */
  replyTo?: MessageId;
  /**
   * Reactions to the message.
   */
  reactions?: {
    user: UserId;
    emoji: string;
    _id?: string; // _id might be added by Mongoose subdocuments
  }[];
  /**
   * The delivery status of the message.
   */
  status?: 'sent' | 'delivered' | 'read';
  /**
   * Array of user IDs for whom the message is deleted.
   */
  deletedFor?: UserId[];
  /**
   * The timestamp of the message (ISO string format).
   */
  timestamp: string; // Provided by backend's { timestamps: true }
  createdAt: string;
  updatedAt: string;

  // --- Frontend-specific additions (optional) ---
  /**
   * Sender's name (potentially added client-side for socket messages).
   */
  senderName?: string;
  /**
   * Receiver's ID (potentially added client-side for socket messages).
   */
  receiverId?: string;
}


/**
 * Represents a notification.
 */
export interface Notification {
  /**
   * The ID of the notification.
   */
  _id: string;
  /**
   * The user ID the notification is for.
   */
  user: UserId; // Assuming this is a user ID
  /**
   * The message of the notification.
   */
  message: string;
  /**
   * The type of the notification (e.g., 'task', 'chat', 'file', 'mention').
   */
  type: string;
  /**
   * The related ID (e.g., task ID, chat ID, file ID).
   */
  relatedId?: string; // Optional related ID
  /**
   * The timestamp of when the notification was generated (ISO string format).
   */
  timestamp: string;
  /**
   * Read status
   */
   read?: boolean; // Optional read status
}


// --- API Interaction Functions ---

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN_COOKIE_NAME = 'authToken'; // Consistent cookie name

// Get the auth token from cookies (client-side)
const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') {
      console.warn("Attempted to get auth token outside of client-side context.");
      return null; // Not running in a browser
  }
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    // Does this cookie string begin with the name we want?
    if (cookie.startsWith(AUTH_TOKEN_COOKIE_NAME + '=')) {
      return decodeURIComponent(cookie.substring(AUTH_TOKEN_COOKIE_NAME.length + 1));
    }
  }
  return null;
};

// Helper to create standard headers, including Authorization if token exists
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
     // console.log("Attaching token to headers:", token.substring(0, 10) + "..."); // Log truncated token
  } else {
      // console.log("No auth token found for headers.");
  }
  return headers;
};

// --- Authentication API Calls ---

/** Data needed for user registration. */
export type RegisterData = Pick<User, 'firstName' | 'lastName' | 'email' | 'password'> & { role?: 'User' | 'Admin' }; // Role is optional here

/**
 * Registers a new user via the API.
 * @param userData The user registration data.
 * @returns A promise that resolves to the success message.
 * @throws Throws an error if registration fails.
 */
export async function registerUser(userData: RegisterData): Promise<{ message: string }> {
  console.log('Registering user:', userData.email);
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // No auth token needed for register
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to register user' }));
    console.error('API Error (Register):', response.status, errorData);
    throw new Error(errorData.error || errorData.message || `Failed to register (${response.status})`);
  }
  return response.json();
}


/** Data needed for user login. */
export type LoginData = Pick<User, 'email' | 'password'>;

/**
 * Logs in a user via the API.
 * @param credentials The user login credentials (email, password).
 * @returns A promise that resolves to the login response containing the JWT token.
 * @throws Throws an error if login fails.
 */
export async function loginUser(credentials: LoginData): Promise<{ token: string; message: string }> {
  console.log('Logging in user:', credentials.email);
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // No auth token needed for login
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to log in' }));
    console.error('API Error (Login):', response.status, errorData);
    // Use 'error' field from backend response if available
    throw new Error(errorData.error || errorData.message || `Login failed (${response.status})`);
  }
  return response.json();
}


// --- Task API Calls ---

/**
 * Asynchronously retrieves all tasks from the API.
 * Requires authentication.
 * @returns A promise that resolves to an array of Task objects.
 * @throws Throws an error if the fetch operation fails or if not authenticated.
 */
export async function getAllTasks(): Promise<Task[]> {
  console.log('Fetching tasks from API...');
  const response = await fetch(`${API_BASE_URL}/task/all`, {
     method: 'GET',
     headers: getHeaders(), // Includes auth token if available
  });

  if (!response.ok) {
     if (response.status === 401 || response.status === 403) {
       throw new Error("Unauthorized: Please log in.");
     }
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch tasks' }));
    console.error('API Error (Get Tasks):', response.status, errorData);
    throw new Error(errorData.message || `Failed to fetch tasks (${response.status})`);
  }

  const data = await response.json();
  // Backend might return tasks directly or nested, adjust if necessary
  // Check if data has a 'tasks' property or if it's the array itself
  // Based on API routes, /all returns the array directly.
  const tasks = Array.isArray(data) ? data : [];
  console.log(`Fetched ${tasks.length} tasks.`);
  return tasks as Task[];
}


/**
 * Type for creating a new task. Excludes fields generated by the backend.
 */
 export type CreateTaskData = Omit<Task, '_id' | 'createdBy' | 'createdAt' | 'updatedAt'> & {
     // createdBy will be added by the backend based on the auth token
     // Make assignedTo optional if it's not always required at creation
      assignedTo?: UserId | null; // Allow null for unassigned
 };

/**
 * Creates a new task via the API.
 * Requires authentication.
 * @param taskData The data for the new task.
 * @returns A promise that resolves to the created Task object.
 * @throws Throws an error if the creation fails or if not authenticated.
 */
export async function createTask(taskData: CreateTaskData): Promise<Task> {
   console.log('Creating task:', taskData);
  const response = await fetch(`${API_BASE_URL}/task/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
         throw new Error("Unauthorized: Cannot create task.");
       }
     const errorData = await response.json().catch(() => ({ message: 'Failed to create task' }));
     console.error('API Error (Create Task):', response.status, errorData);
    throw new Error(errorData.message || `Failed to create task (${response.status})`);
  }
   // Backend returns the created task object directly.
  return response.json();
}

/**
 * Type for updating an existing task. All fields are optional.
 */
 export type UpdateTaskData = Partial<Omit<Task, '_id' | 'createdBy' | 'createdAt' | 'updatedAt'>>;


/**
 * Updates an existing task via the API.
 * Requires authentication.
 * @param taskId The ID of the task to update.
 * @param taskData The data to update the task with.
 * @returns A promise that resolves to the updated Task object.
 * @throws Throws an error if the update fails or if not authenticated.
 */
export async function updateTask(taskId: TaskId, taskData: UpdateTaskData): Promise<Task> {
  console.log(`Updating task ${taskId}:`, taskData);
  const response = await fetch(`${API_BASE_URL}/task/update/${taskId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
         throw new Error("Unauthorized: Cannot update task.");
       }
     const errorData = await response.json().catch(() => ({ message: 'Failed to update task' }));
     console.error('API Error (Update Task):', response.status, errorData);
    throw new Error(errorData.message || `Failed to update task (${response.status})`);
  }
  // Backend returns the updated task object.
  return response.json();
}

/**
 * Deletes a task via the API.
 * Requires authentication.
 * @param taskId The ID of the task to delete.
 * @returns A promise that resolves when the deletion is successful.
 * @throws Throws an error if the deletion fails or if not authenticated.
 */
export async function deleteTask(taskId: TaskId): Promise<{ message: string }> {
   console.log(`Deleting task ${taskId}`);
  const response = await fetch(`${API_BASE_URL}/task/delete/${taskId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
         throw new Error("Unauthorized: Cannot delete task.");
       }
     const errorData = await response.json().catch(() => ({ message: 'Failed to delete task' }));
     console.error('API Error (Delete Task):', response.status, errorData);
    throw new Error(errorData.message || `Failed to delete task (${response.status})`);
  }
  return response.json(); // Expecting { message: "Task deleted successfully" } or similar
}


// --- Notification API Calls ---

/**
 * Asynchronously retrieves all notifications for the currently authenticated user.
 * Requires authentication.
 * @returns A promise that resolves to an array of Notification objects.
 * @throws Throws an error if the fetch operation fails or if not authenticated.
 */
export async function getAllNotifications(): Promise<Notification[]> {
   console.log(`Fetching notifications for current user...`);
    const response = await fetch(`${API_BASE_URL}/notifications/my`, { // Assuming '/my' endpoint fetches for logged-in user
     method: 'GET',
     headers: getHeaders(),
    });

   if (!response.ok) {
     if (response.status === 401 || response.status === 403) {
       throw new Error("Unauthorized: Please log in to view notifications.");
     }
     const errorData = await response.json().catch(() => ({ message: 'Failed to fetch notifications' }));
     console.error('API Error (Get Notifications):', response.status, errorData);
     throw new Error(errorData.message || `Failed to fetch notifications (${response.status})`);
   }

   const data = await response.json();
   // The API likely returns an array directly: GET /api/notifications/my
   return data as Notification[];
}

// --- Chat API Calls (OLD - Keep for reference or remove if superseded by Message API) ---

// /**
//  * Sends a chat message via the API.
//  * Requires authentication.
//  * @param messageData The data for the message to send.
//  * @returns A promise resolving to the sent ChatMessage.
//  * @throws Error if sending fails.
//  */
//  export async function sendChatMessage(messageData: SendMessageData): Promise<ChatMessage> {
//     console.log(`Sending message to room ${messageData.chatRoom}...`);
//      const response = await fetch(`${API_BASE_URL}/chat/send`, { // Use the correct route path
//          method: 'POST',
//          headers: getHeaders(),
//          body: JSON.stringify(messageData),
//      });

//      if (!response.ok) {
//          if (response.status === 401 || response.status === 403) {
//              throw new Error("Unauthorized: Cannot send message.");
//          }
//          const errorData = await response.json().catch(() => ({ message: 'Failed to send message' }));
//          console.error('API Error (Send Message):', response.status, errorData);
//          throw new Error(errorData.message || `Failed to send message (${response.status})`);
//      }

//      const data = await response.json();
//      // The backend returns { message: "Message sent!", data: message }
//      return data.data as ChatMessage;
//  }


// /**
//  * Asynchronously retrieves all chat messages for a given chat room.
//  * Requires authentication.
//  * @param chatRoomId The ID of the chat room.
//  * @returns A promise that resolves to an array of ChatMessage objects.
//  * @throws Throws an error if fetching fails or if not authenticated.
//  */
// export async function getAllChatMessages(chatRoomId: ChatRoomId): Promise<ChatMessage[]> {
//    console.log(`Fetching messages for room: ${chatRoomId}...`);
//     // Ensure the API endpoint matches the route definition: /api/chat/:chatRoom/messages
//    const response = await fetch(`${API_BASE_URL}/chat/${chatRoomId}/messages`, {
//        method: 'GET',
//        headers: getHeaders(),
//    });

//    if (!response.ok) {
//        if (response.status === 401 || response.status === 403) {
//            throw new Error("Unauthorized: Please log in to view messages.");
//        }
//        const errorData = await response.json().catch(() => ({ message: `Failed to fetch messages for room ${chatRoomId}` }));
//        console.error(`API Error (Get Messages for ${chatRoomId}):`, response.status, errorData);
//        throw new Error(errorData.message || `Failed to fetch messages (${response.status})`);
//    }

//    const data = await response.json();
//    // API returns the array of messages directly
//    return data as ChatMessage[];
// }

// --- New Message API Calls (/api/messages) ---

/**
 * Data needed to send a new message.
 */
 export type SendMessageData = Pick<ChatMessage, 'chatRoom' | 'content' | 'messageType' | 'fileUrl' | 'replyTo'>;

/**
 * Sends a new message via the /api/messages/send endpoint.
 * Requires authentication.
 * @param messageData The data for the message to send.
 * @returns A promise resolving to the newly created ChatMessage.
 * @throws Error if sending fails.
 */
 export async function sendMessage(messageData: SendMessageData): Promise<ChatMessage> {
     console.log(`Sending message to room ${messageData.chatRoom}...`);
     const response = await fetch(`${API_BASE_URL}/messages/send`, {
         method: 'POST',
         headers: getHeaders(),
         body: JSON.stringify(messageData),
     });

     if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
             throw new Error("Unauthorized: Cannot send message.");
         }
         const errorData = await response.json().catch(() => ({ message: 'Failed to send message' }));
         console.error('API Error (Send Message):', response.status, errorData);
         throw new Error(errorData.message || `Failed to send message (${response.status})`);
     }
     const data = await response.json();
     // Backend returns { message: "...", newMessage: {...} }
     return data.newMessage as ChatMessage;
 }

/**
 * Retrieves all messages for a specific chat room via /api/messages/:chatRoom.
 * Requires authentication.
 * @param chatRoomId The ID of the chat room.
 * @returns A promise that resolves to an array of ChatMessage objects.
 * @throws Throws an error if fetching fails or if not authenticated.
 */
export async function getAllMessages(chatRoomId: ChatRoomId): Promise<ChatMessage[]> {
   console.log(`Fetching messages for room: ${chatRoomId}...`);
   const response = await fetch(`${API_BASE_URL}/messages/${chatRoomId}`, {
       method: 'GET',
       headers: getHeaders(),
   });

   if (!response.ok) {
       if (response.status === 401 || response.status === 403) {
           throw new Error("Unauthorized: Please log in to view messages.");
       }
       const errorData = await response.json().catch(() => ({ message: `Failed to fetch messages for room ${chatRoomId}` }));
       console.error(`API Error (Get Messages for ${chatRoomId}):`, response.status, errorData);
       throw new Error(errorData.message || `Failed to fetch messages (${response.status})`);
   }

   const data = await response.json();
   // Backend returns { messages: [...] }
   return data.messages as ChatMessage[];
}

/**
 * Soft deletes a message for the current user via /api/messages/:messageId.
 * Requires authentication.
 * @param messageId The ID of the message to delete.
 * @returns A promise resolving to the success message.
 * @throws Error if deletion fails.
 */
 export async function deleteMessage(messageId: MessageId): Promise<{ message: string }> {
     console.log(`Deleting message ${messageId} for current user...`);
     const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
         method: 'DELETE',
         headers: getHeaders(),
     });

     if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
             throw new Error("Unauthorized: Cannot delete message.");
         }
         const errorData = await response.json().catch(() => ({ message: 'Failed to delete message' }));
         console.error('API Error (Delete Message):', response.status, errorData);
         throw new Error(errorData.message || `Failed to delete message (${response.status})`);
     }
     return response.json();
 }

/**
 * Updates the status of a message via /api/messages/:messageId/status.
 * Requires authentication.
 * @param messageId The ID of the message to update.
 * @param status The new status ('delivered' or 'read').
 * @returns A promise resolving to the updated message data.
 * @throws Error if update fails.
 */
 export async function updateMessageStatus(messageId: MessageId, status: 'delivered' | 'read'): Promise<{ message: string; updatedMessage: ChatMessage }> {
     console.log(`Updating message ${messageId} status to ${status}...`);
     const response = await fetch(`${API_BASE_URL}/messages/${messageId}/status`, {
         method: 'PUT',
         headers: getHeaders(),
         body: JSON.stringify({ status }),
     });

     if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
             throw new Error("Unauthorized: Cannot update message status.");
         }
         const errorData = await response.json().catch(() => ({ message: 'Failed to update message status' }));
         console.error('API Error (Update Status):', response.status, errorData);
         throw new Error(errorData.message || `Failed to update status (${response.status})`);
     }
     return response.json();
 }

/**
 * Adds or removes a reaction to a message via /api/messages/:messageId/react.
 * Requires authentication.
 * @param messageId The ID of the message to react to.
 * @param emoji The emoji to add or remove.
 * @returns A promise resolving to the updated message data.
 * @throws Error if reacting fails.
 */
 export async function reactToMessage(messageId: MessageId, emoji: string): Promise<{ message: string; updatedMessage: ChatMessage }> {
     console.log(`Reacting to message ${messageId} with ${emoji}...`);
     const response = await fetch(`${API_BASE_URL}/messages/${messageId}/react`, {
         method: 'POST',
         headers: getHeaders(),
         body: JSON.stringify({ emoji }),
     });

     if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
             throw new Error("Unauthorized: Cannot react to message.");
         }
         const errorData = await response.json().catch(() => ({ message: 'Failed to react to message' }));
         console.error('API Error (React Message):', response.status, errorData);
         throw new Error(errorData.message || `Failed to react (${response.status})`);
     }
     return response.json();
 }

/**
 * Sends a reply to a message via /api/messages/:messageId/reply.
 * Requires authentication.
 * @param originalMessageId The ID of the message being replied to.
 * @param replyData The content and type of the reply message.
 * @returns A promise resolving to the newly created reply message.
 * @throws Error if replying fails.
 */
 export type ReplyMessageData = Pick<ChatMessage, 'content' | 'messageType' | 'fileUrl'>;
 export async function replyToMessage(originalMessageId: MessageId, replyData: ReplyMessageData): Promise<{ message: string; replyMessage: ChatMessage }> {
     console.log(`Replying to message ${originalMessageId}...`);
     const response = await fetch(`${API_BASE_URL}/messages/${originalMessageId}/reply`, {
         method: 'POST',
         headers: getHeaders(),
         // Backend expects content, messageType, fileUrl in the body
         body: JSON.stringify(replyData),
     });

     if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
             throw new Error("Unauthorized: Cannot reply to message.");
         }
         const errorData = await response.json().catch(() => ({ message: 'Failed to send reply' }));
         console.error('API Error (Reply Message):', response.status, errorData);
         throw new Error(errorData.message || `Failed to send reply (${response.status})`);
     }
     return response.json();
 }


// --- User API Calls ---

// Potentially add a function to get user details (e.g., for mapping IDs to names)
/**
 * Asynchronously retrieves details for a specific user.
 * Requires authentication.
 * @param userId The ID of the user to fetch.
 * @returns A promise that resolves to the User object (or a subset of fields).
 * @throws Throws an error if fetching fails or if not authenticated.
 */
 export async function getUserById(userId: UserId): Promise<Partial<User>> {
    console.log(`Fetching user details for ID: ${userId}`);
     const response = await fetch(`${API_BASE_URL}/user/${userId}`, { // Assuming GET /api/user/:id exists
         method: 'GET',
         headers: getHeaders(),
     });

     if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
             throw new Error("Unauthorized: Cannot fetch user details.");
         }
         // Handle 404 specifically if needed
         if (response.status === 404) {
            console.warn(`User with ID ${userId} not found.`);
             return { _id: userId, firstName: 'Unknown', lastName: 'User', email: '' }; // Return placeholder
         }
         const errorData = await response.json().catch(() => ({ message: `Failed to fetch user ${userId}` }));
         console.error(`API Error (Get User ${userId}):`, response.status, errorData);
         throw new Error(errorData.message || `Failed to fetch user (${response.status})`);
     }

     const data = await response.json();
     // Return only necessary fields, exclude sensitive data like password
     const { password, otp, otpExpires, ...safeUserData } = data;
     return safeUserData as Partial<User>;
 }


 /**
 * Asynchronously retrieves all users (consider pagination for large numbers).
 * Requires authentication (likely admin role).
 * @returns A promise that resolves to an array of User objects (or partial details).
 * @throws Throws an error if fetching fails or if not authorized.
 */
 export async function getAllUsers(): Promise<Partial<User>[]> {
     console.log('Fetching all users...');
     const response = await fetch(`${API_BASE_URL}/user/all`, { // Assuming GET /api/user/all exists
         method: 'GET',
         headers: getHeaders(),
     });

     if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
             throw new Error("Unauthorized: Cannot fetch all users.");
         }
         const errorData = await response.json().catch(() => ({ message: 'Failed to fetch users' }));
         console.error('API Error (Get All Users):', response.status, errorData);
         throw new Error(errorData.message || `Failed to fetch users (${response.status})`);
     }

     const data: User[] = await response.json();
     // Map to return only safe, necessary data (e.g., id, firstName, lastName, email, role)
     return data.map(user => ({
         _id: user._id,
         firstName: user.firstName,
         lastName: user.lastName,
         email: user.email,
         role: user.role,
         profilePicture: user.profilePicture, // Include profile picture if available
     }));
 }


 // Placeholder for getting current user's info (maybe from token or a /me endpoint)
 /**
  * Gets the current user's information (e.g., from a '/api/user/me' endpoint).
  * Requires authentication.
  * @returns A promise resolving to the current user's data (excluding sensitive info).
  * @throws Error if request fails or user not authenticated.
  */
 export async function getCurrentUser(): Promise<Partial<User>> {
     console.log('Fetching current user info...');
     const response = await fetch(`${API_BASE_URL}/user/me`, { // Requires a '/api/user/me' endpoint on backend
         method: 'GET',
         headers: getHeaders(),
     });

     if (!response.ok) {
         if (response.status === 401 || response.status === 403) {
             throw new Error("Unauthorized: Please log in.");
         }
         const errorData = await response.json().catch(() => ({ message: 'Failed to fetch current user' }));
         console.error('API Error (Get Current User):', response.status, errorData);
         throw new Error(errorData.message || `Failed to fetch current user info (${response.status})`);
     }

     const data = await response.json();
     // Return only safe, necessary data
     const { password, otp, otpExpires, ...safeUserData } = data;
     return safeUserData as Partial<User>;
 }

    
