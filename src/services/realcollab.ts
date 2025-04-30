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
 * Represents a Milestone ID (string representation of ObjectId).
 */
type MilestoneId = string;

/**
 * Represents a Timelog ID (string representation of ObjectId).
 */
type TimelogId = string;


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
  /**
   * Password field removed as it's not relevant for frontend Task interface
   */
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
   /**
   * Indicates if the message is deleted for the current user (client-side check).
   */
    deletedForCurrentUser?: boolean;
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

/**
 * Represents a Milestone based on the Mongoose schema.
 */
export interface Milestone {
  _id: MilestoneId;
  task: TaskId;
  milestoneName: string;
  dueDate: string; // ISO string date
  completionDate?: string; // ISO string date
  isAchieved: boolean;
  priority?: 'Low' | 'Medium' | 'High';
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a Timelog based on the Mongoose schema.
 */
export interface Timelog {
  _id: TimelogId;
  task: TaskId;
  user: UserId; // User who logged the time
  timeSpent: number; // Time in minutes
  description?: string; // Optional description of work done
  dateLogged: string; // ISO string date, defaults to now on backend
  endDate?: string; // Optional ISO string date for when work finished
  createdAt: string;
  updatedAt: string;
}


// --- API Interaction Functions ---

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN_COOKIE_NAME = 'authToken'; // Consistent cookie name

// Get the auth token from cookies (client-side)
const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') {
      // console.warn("Attempted to get auth token outside of client-side context.");
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

// Helper to handle API errors
const handleApiError = async (response: Response, context: string): Promise<never> => {
    const status = response.status;
    let errorData = { message: `Failed to ${context} (${status})` };
    try {
        errorData = await response.json();
    } catch (e) {
        // Ignore JSON parsing error if response body is empty or not JSON
    }

    console.error(`API Error (${context}):`, status, errorData);

    if (status === 401 || status === 403) {
        throw new Error(`Unauthorized: Cannot ${context}. Please log in.`);
    }

    throw new Error(errorData.message || `Failed to ${context} (${status})`);
};

// --- Authentication API Calls ---

/** Data needed for user registration. */
export type RegisterData = Omit<User, '_id' | 'profilePicture'> & { password?: string, role?: 'User' | 'Admin' }; // Exclude generated/optional fields

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
    return handleApiError(response, "register user");
  }
  return response.json();
}


/** Data needed for user login. */
export type LoginData = Pick<User, 'email' > & { password?: string };


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
     return handleApiError(response, "log in");
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
     return handleApiError(response, "fetch tasks");
  }

  const data = await response.json();
  // Based on API routes, /all returns the array directly.
  // Adjust if the backend wraps it, e.g., { tasks: [...] }
  const tasks = Array.isArray(data) ? data : (data.tasks || []);
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
      return handleApiError(response, "create task");
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
      return handleApiError(response, `update task ${taskId}`);
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
     return handleApiError(response, `delete task ${taskId}`);
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
    return handleApiError(response, "fetch notifications");
   }

   const data = await response.json();
   // The API likely returns an array directly: GET /api/notifications/my
   return data as Notification[];
}

// --- Message API Calls (/api/messages) ---

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
        return handleApiError(response, `send message to room ${messageData.chatRoom}`);
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
        return handleApiError(response, `fetch messages for room ${chatRoomId}`);
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
        return handleApiError(response, `delete message ${messageId}`);
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
        return handleApiError(response, `update message ${messageId} status`);
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
        return handleApiError(response, `react to message ${messageId}`);
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
        return handleApiError(response, `reply to message ${originalMessageId}`);
     }
     return response.json();
 }


// --- User API Calls ---

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
         // Handle 404 specifically if needed
         if (response.status === 404) {
            console.warn(`User with ID ${userId} not found.`);
             return { _id: userId, firstName: 'Unknown', lastName: 'User', email: '' }; // Return placeholder
         }
         return handleApiError(response, `fetch user ${userId}`);
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
        return handleApiError(response, "fetch all users");
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
        return handleApiError(response, "fetch current user");
     }

     const data = await response.json();
     // Return only safe, necessary data
     const { password, otp, otpExpires, ...safeUserData } = data;
     return safeUserData as Partial<User>;
 }


 // --- Milestone API Calls ---

 /**
  * Type for creating a new milestone. Excludes fields generated by the backend.
  */
 export type CreateMilestoneData = Pick<Milestone, 'task' | 'milestoneName' | 'dueDate' | 'priority' | 'comments'>;

 /**
  * Creates a new milestone for a task via the API.
  * Requires authentication.
  * @param milestoneData The data for the new milestone.
  * @returns A promise that resolves to the created Milestone object.
  * @throws Throws an error if the creation fails or if not authenticated.
  */
 export async function createMilestone(milestoneData: CreateMilestoneData): Promise<{ message: string; newMilestone: Milestone }> {
    console.log('Creating milestone for task:', milestoneData.task);
    const response = await fetch(`${API_BASE_URL}/milestone/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(milestoneData),
    });

    if (!response.ok) {
       return handleApiError(response, `create milestone for task ${milestoneData.task}`);
    }
    return response.json(); // Backend returns { message: "...", newMilestone: {...} }
 }


 /**
  * Retrieves all milestones for a specific task via the API.
  * Requires authentication.
  * @param taskId The ID of the task whose milestones are to be fetched.
  * @returns A promise that resolves to an array of Milestone objects.
  * @throws Throws an error if fetching fails or if not authenticated.
  */
 export async function getMilestonesForTask(taskId: TaskId): Promise<Milestone[]> {
    console.log(`Fetching milestones for task: ${taskId}...`);
    const response = await fetch(`${API_BASE_URL}/milestone/${taskId}`, {
        method: 'GET',
        headers: getHeaders(),
    });

    if (!response.ok) {
        return handleApiError(response, `fetch milestones for task ${taskId}`);
    }

    const data = await response.json();
    // Backend returns { milestones: [...] }
    return data.milestones as Milestone[];
 }

 /**
  * Marks a milestone as achieved via the API.
  * Requires authentication.
  * @param milestoneId The ID of the milestone to mark as achieved.
  * @returns A promise that resolves to the updated Milestone object.
  * @throws Throws an error if the update fails or if not authenticated.
  */
 export async function markMilestoneAchieved(milestoneId: MilestoneId): Promise<{ message: string; milestone: Milestone }> {
    console.log(`Marking milestone ${milestoneId} as achieved...`);
    const response = await fetch(`${API_BASE_URL}/milestone/${milestoneId}/achieved`, {
        method: 'PUT',
        headers: getHeaders(),
        // No body needed for this specific action as per the route
    });

    if (!response.ok) {
       return handleApiError(response, `mark milestone ${milestoneId} achieved`);
    }
    return response.json(); // Backend returns { message: "...", milestone: {...} }
 }


 // --- Timelog API Calls ---

/**
 * Type for creating a new timelog. Excludes fields generated by the backend.
 * Requires task ID, time spent in minutes, optional description and endDate.
 * User ID is added automatically by the backend based on authentication.
 */
 export type CreateTimelogData = Pick<Timelog, 'task' | 'timeSpent' | 'description' | 'endDate'>;

/**
 * Creates a new timelog for a task via the API.
 * Requires authentication. User ID is added by the backend.
 * @param timelogData The data for the new timelog.
 * @returns A promise that resolves to the created Timelog object.
 * @throws Throws an error if creation fails or if not authenticated.
 */
 export async function createTimelog(timelogData: CreateTimelogData): Promise<{ message: string; newTimelog: Timelog }> {
    console.log('Creating timelog for task:', timelogData.task);
    const response = await fetch(`${API_BASE_URL}/timelog/create`, { // Use the correct API endpoint
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(timelogData),
    });

    if (!response.ok) {
        return handleApiError(response, `create timelog for task ${timelogData.task}`);
    }
    return response.json(); // Backend returns { message: "...", newTimelog: {...} }
 }

 /**
  * Retrieves all timelogs for a specific task via the API.
  * Requires authentication.
  * @param taskId The ID of the task whose timelogs are to be fetched.
  * @returns A promise that resolves to an array of Timelog objects.
  * @throws Throws an error if fetching fails or if not authenticated.
  */
 export async function getTimelogsForTask(taskId: TaskId): Promise<Timelog[]> {
    console.log(`Fetching timelogs for task: ${taskId}...`);
    const response = await fetch(`${API_BASE_URL}/timelog/${taskId}`, { // Use the correct API endpoint
        method: 'GET',
        headers: getHeaders(),
    });

    if (!response.ok) {
        return handleApiError(response, `fetch timelogs for task ${taskId}`);
    }

    const data = await response.json();
     // Backend returns { timeLogs: [...] }
     return data.timeLogs as Timelog[];
 }

// --- Removed Timelog APIs (Not provided in backend routes) ---
// export async function getTimelogsForUser(userId: UserId): Promise<Timelog[]> { ... }
// export async function updateTimelog(timelogId: TimelogId, timelogData: UpdateTimelogData): Promise<{ message: string; updatedTimelog: Timelog }> { ... }
// export async function deleteTimelog(timelogId: TimelogId): Promise<{ message: string }> { ... }
