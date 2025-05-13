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
   * The ID of the chat room this message belongs to.
   */
  chatRoom: ChatRoomId;
  /**
   * The ID of the sender.
   */
  sender: UserId;
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
    _id?: string;
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
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  senderName?: string;
  receiverId?: string;
  deletedForCurrentUser?: boolean;
}


/**
 * Represents a notification.
 */
export interface Notification {
  _id: string;
  user: UserId;
  message: string;
  type: string;
  relatedId?: string;
  timestamp: string;
  read?: boolean;
}

/**
 * Represents a Milestone based on the Mongoose schema.
 */
export interface Milestone {
  _id: MilestoneId;
  task: TaskId;
  milestoneName: string;
  dueDate: string;
  completionDate?: string;
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
  user: UserId;
  timeSpent: number;
  description?: string;
  dateLogged: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}


// --- API Interaction Functions ---

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const AUTH_TOKEN_COOKIE_NAME = 'authToken';

const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') {
      return null;
  }
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.startsWith(AUTH_TOKEN_COOKIE_NAME + '=')) {
      return decodeURIComponent(cookie.substring(AUTH_TOKEN_COOKIE_NAME.length + 1));
    }
  }
  return null;
};

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleApiError = async (response: Response, context: string): Promise<never> => {
    const status = response.status;
    let errorData = { message: `Failed to ${context} (${status})` };
    try {
        errorData = await response.json();
    } catch (e) {
        // Ignore
    }
    console.error(`API Error (${context}):`, status, errorData);
    if (status === 401 || status === 403) {
        throw new Error(`Unauthorized: Cannot ${context}. Please log in.`);
    }
    throw new Error(errorData.message || `Failed to ${context} (${status})`);
};

// --- Authentication API Calls ---

export type RegisterData = Omit<User, '_id' | 'profilePicture'> & { password?: string, role?: 'User' | 'Admin' };

export async function registerUser(userData: RegisterData): Promise<{ message: string }> {
  console.log('Registering user:', userData.email);
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!response.ok) return handleApiError(response, "register user");
  return response.json();
}

export type LoginData = Pick<User, 'email' > & { password?: string };

export async function loginUser(credentials: LoginData): Promise<{ token: string; message: string }> {
  console.log('Logging in user:', credentials.email);
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) return handleApiError(response, "log in");
  return response.json();
}

// --- Task API Calls ---

export async function getAllTasks(): Promise<Task[]> {
  console.log('Fetching tasks from API...');
  const response = await fetch(`${API_BASE_URL}/task/all`, {
     method: 'GET',
     headers: getHeaders(),
  });
  if (!response.ok) return handleApiError(response, "fetch tasks");
  const data = await response.json();
  const tasks = Array.isArray(data) ? data : (data.tasks || []);
  console.log(`Fetched ${tasks.length} tasks.`);
  return tasks as Task[];
}

 export type CreateTaskData = Omit<Task, '_id' | 'createdBy' | 'createdAt' | 'updatedAt'> & {
      assignedTo?: UserId | null;
 };

export async function createTask(taskData: CreateTaskData): Promise<Task> {
   console.log('Creating task:', taskData);
  const response = await fetch(`${API_BASE_URL}/task/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(taskData),
  });
  if (!response.ok) return handleApiError(response, "create task");
  const responseData = await response.json();
  return responseData as Task;
}

 export type UpdateTaskData = Partial<Omit<Task, '_id' | 'createdBy' | 'createdAt' | 'updatedAt'>>;

export async function updateTask(taskId: TaskId, taskData: UpdateTaskData): Promise<Task> {
  console.log(`Updating task ${taskId}:`, taskData);
  const response = await fetch(`${API_BASE_URL}/task/update/${taskId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(taskData),
  });
  if (!response.ok) return handleApiError(response, `update task ${taskId}`);
   const responseData = await response.json();
   if (responseData && responseData._id) {
     return responseData as Task;
   } else {
     throw new Error("Invalid response structure after updating task.");
   }
}

export async function deleteTask(taskId: TaskId): Promise<{ message: string }> {
   console.log(`Deleting task ${taskId}`);
  const response = await fetch(`${API_BASE_URL}/task/delete/${taskId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) return handleApiError(response, `delete task ${taskId}`);
  return response.json();
}

// --- Notification API Calls ---

export async function getAllNotifications(): Promise<Notification[]> {
   console.log(`Fetching notifications for current user...`);
    const response = await fetch(`${API_BASE_URL}/notifications/my`, {
     method: 'GET',
     headers: getHeaders(),
    });
   if (!response.ok) return handleApiError(response, "fetch notifications");
   const data = await response.json();
   return data as Notification[];
}

// --- Message API Calls (/api/messages) ---

 export type SendMessageData = Pick<ChatMessage, 'chatRoom' | 'content' | 'messageType' | 'fileUrl' | 'replyTo'>;

 export async function sendMessage(messageData: SendMessageData): Promise<ChatMessage> {
     console.log(`Sending message to room ${messageData.chatRoom}...`);
     const response = await fetch(`${API_BASE_URL}/messages/send`, {
         method: 'POST',
         headers: getHeaders(),
         body: JSON.stringify(messageData),
     });
     if (!response.ok) return handleApiError(response, `send message to room ${messageData.chatRoom}`);
     const data = await response.json();
     return data.newMessage as ChatMessage;
 }

/**
 * Retrieves all messages for a specific chat room.
 * Requires authentication. The `chatRoomId` must be a valid `ChatRoom._id`.
 * @param chatRoomId The ID of the ChatRoom document.
 * @returns A promise that resolves to an array of ChatMessage objects.
 */
export async function getAllMessages(chatRoomId: ChatRoomId): Promise<ChatMessage[]> {
   console.log(`Fetching messages for room: ${chatRoomId}...`);
   const response = await fetch(`${API_BASE_URL}/messages/${chatRoomId}`, {
       method: 'GET',
       headers: getHeaders(),
   });
   if (!response.ok) return handleApiError(response, `fetch messages for room ${chatRoomId}`);
   const data = await response.json();
   return data.messages as ChatMessage[];
}

 export async function deleteMessage(messageId: MessageId): Promise<{ message: string }> {
     console.log(`Deleting message ${messageId} for current user...`);
     const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
         method: 'DELETE',
         headers: getHeaders(),
     });
     if (!response.ok) return handleApiError(response, `delete message ${messageId}`);
     return response.json();
 }

 export async function updateMessageStatus(messageId: MessageId, status: 'delivered' | 'read'): Promise<{ message: string; updatedMessage: ChatMessage }> {
     console.log(`Updating message ${messageId} status to ${status}...`);
     const response = await fetch(`${API_BASE_URL}/messages/${messageId}/status`, {
         method: 'PUT',
         headers: getHeaders(),
         body: JSON.stringify({ status }),
     });
     if (!response.ok) return handleApiError(response, `update message ${messageId} status`);
     return response.json();
 }

 export async function reactToMessage(messageId: MessageId, emoji: string): Promise<{ message: string; updatedMessage: ChatMessage }> {
     console.log(`Reacting to message ${messageId} with ${emoji}...`);
     const response = await fetch(`${API_BASE_URL}/messages/${messageId}/react`, {
         method: 'POST',
         headers: getHeaders(),
         body: JSON.stringify({ emoji }),
     });
     if (!response.ok) return handleApiError(response, `react to message ${messageId}`);
     return response.json();
 }

 export type ReplyMessageData = Pick<ChatMessage, 'content' | 'messageType' | 'fileUrl'>;
 export async function replyToMessage(originalMessageId: MessageId, replyData: ReplyMessageData): Promise<{ message: string; replyMessage: ChatMessage }> {
     console.log(`Replying to message ${originalMessageId}...`);
     const response = await fetch(`${API_BASE_URL}/messages/${originalMessageId}/reply`, {
         method: 'POST',
         headers: getHeaders(),
         body: JSON.stringify(replyData),
     });
     if (!response.ok) return handleApiError(response, `reply to message ${originalMessageId}`);
     return response.json();
 }

// --- Chat Room API Calls ---

/**
 * Gets or creates a direct message (DM) chat room with a peer user.
 * Requires authentication.
 * @param peerUserId The ID of the other user in the DM chat.
 * @returns A promise that resolves to an object containing the `_id` of the ChatRoom.
 * @throws Throws an error if the operation fails.
 */
export async function getOrCreateDmChatRoom(peerUserId: UserId): Promise<{ _id: ChatRoomId }> {
  console.log(`Getting or creating DM chat room with user: ${peerUserId}`);
  // This assumes a backend endpoint like POST /api/chatrooms/dm or similar
  // The backend would handle finding an existing DM room or creating a new one.
  const response = await fetch(`${API_BASE_URL}/chatrooms/dm`, { // Hypothetical endpoint
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ peerUserId }),
  });

  if (!response.ok) {
    return handleApiError(response, `get or create DM chat room with ${peerUserId}`);
  }
  // Expects response like { _id: "chatroomObjectId" }
  return response.json();
}


// --- User API Calls ---

 export async function getUserById(userId: UserId): Promise<Partial<User>> {
    console.log(`Fetching user details for ID: ${userId}`); // userId might be an object if not careful
    const idToFetch = typeof userId === 'string' ? userId : (userId as any)?._id; // defensive
    if (!idToFetch) {
      console.error("Invalid userId passed to getUserById:", userId);
      throw new Error("Invalid user ID provided to getUserById");
    }
     const response = await fetch(`${API_BASE_URL}/user/${idToFetch}`, {
         method: 'GET',
         headers: getHeaders(),
     });
     if (!response.ok) {
         if (response.status === 404) {
            console.warn(`User with ID ${idToFetch} not found.`);
             return { _id: idToFetch, firstName: 'Unknown', lastName: 'User', email: '' };
         }
         return handleApiError(response, `fetch user ${idToFetch}`);
     }
     const data = await response.json();
     const { password, otp, otpExpires, ...safeUserData } = data;
     return safeUserData as Partial<User>;
 }

 export async function getAllUsers(): Promise<Partial<User>[]> {
     console.log('Fetching all users...');
     const response = await fetch(`${API_BASE_URL}/user/all`, {
         method: 'GET',
         headers: getHeaders(),
     });
     if (!response.ok) return handleApiError(response, "fetch all users");
     const data: User[] = await response.json();
     return data.map(user => ({
         _id: user._id,
         firstName: user.firstName,
         lastName: user.lastName,
         email: user.email,
         role: user.role,
         profilePicture: user.profilePicture,
     }));
 }

 export async function getCurrentUser(): Promise<Partial<User>> {
     console.log('Fetching current user info...');
     const response = await fetch(`${API_BASE_URL}/auth/me`, {
         method: 'GET',
         headers: getHeaders(),
     });
     if (!response.ok) return handleApiError(response, "fetch current user");
     const data = await response.json();
     const { password, otp, otpExpires, ...safeUserData } = data;
     return safeUserData as Partial<User>;
 }

// --- Milestone API Calls ---

 export type CreateMilestoneData = Pick<Milestone, 'task' | 'milestoneName' | 'dueDate' | 'priority' | 'comments'>;

 export async function createMilestone(milestoneData: CreateMilestoneData): Promise<{ message: string; newMilestone: Milestone }> {
    console.log('Creating milestone for task:', milestoneData.task);
    const response = await fetch(`${API_BASE_URL}/milestone/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(milestoneData),
    });
    if (!response.ok) return handleApiError(response, `create milestone for task ${milestoneData.task}`);
    return response.json();
 }

 export async function getMilestonesForTask(taskId: TaskId): Promise<Milestone[]> {
    console.log(`Fetching milestones for task: ${taskId}...`);
    const response = await fetch(`${API_BASE_URL}/milestone/${taskId}`, {
        method: 'GET',
        headers: getHeaders(),
    });
    if (!response.ok) return handleApiError(response, `fetch milestones for task ${taskId}`);
    const data = await response.json();
    return data.milestones as Milestone[];
 }

 export async function markMilestoneAchieved(milestoneId: MilestoneId): Promise<{ message: string; milestone: Milestone }> {
    console.log(`Marking milestone ${milestoneId} as achieved...`);
    const response = await fetch(`${API_BASE_URL}/milestone/${milestoneId}/achieved`, {
        method: 'PUT',
        headers: getHeaders(),
    });
    if (!response.ok) return handleApiError(response, `mark milestone ${milestoneId} achieved`);
    return response.json();
 }

// --- Timelog API Calls ---

 export type CreateTimelogData = Pick<Timelog, 'task' | 'timeSpent' | 'description' | 'endDate'>;

 export async function createTimelog(timelogData: CreateTimelogData): Promise<{ message: string; newTimelog: Timelog }> {
    console.log('Creating timelog for task:', timelogData.task);
    const response = await fetch(`${API_BASE_URL}/timelog/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(timelogData),
    });
    if (!response.ok) return handleApiError(response, `create timelog for task ${timelogData.task}`);
    return response.json();
 }

 export async function getTimelogsForTask(taskId: TaskId): Promise<Timelog[]> {
    console.log(`Fetching timelogs for task: ${taskId}...`);
    const response = await fetch(`${API_BASE_URL}/timelog/${taskId}`, {
        method: 'GET',
        headers: getHeaders(),
    });
    if (!response.ok) return handleApiError(response, `fetch timelogs for task ${taskId}`);
    const data = await response.json();
     return data.timeLogs as Timelog[];
 }