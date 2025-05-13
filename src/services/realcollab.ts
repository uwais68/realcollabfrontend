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
 * Aligned with backend's MessageSchema and chatController.js responses.
 */
export interface ChatMessage {
  _id: MessageId;
  chatRoom: ChatRoomId;
  sender: UserId | { _id: UserId, firstName?: string, lastName?: string, email?: string }; // Can be populated
  content?: string;
  messageType: 'text' | 'image' | 'file' | 'voice';
  fileUrl?: string;
  replyTo?: MessageId | { _id: MessageId, content?: string, sender?: UserId, messageType?: string }; // Can be populated
  reactions: {
    user: UserId;
    emoji: string;
    _id?: string; // _id for reaction subdocument if present
  }[];
  status: 'sent' | 'delivered' | 'read';
  deletedFor: UserId[];
  timestamp: string; // Provided by backend, usually createdAt
  createdAt: string;
  updatedAt: string;
  // Frontend specific or from socket enhancements
  senderName?: string; // Can be derived or sent via socket
  receiverId?: string; // Used for socket notifications, mostly for DMs
  deletedForCurrentUser?: boolean; // Frontend helper
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
    let errorData: { message?: string, error?: string } = { message: `Failed to ${context} (${status})` };
    try {
        const jsonData = await response.json();
        // Use errorData.error if backend sends { "error": "..." }
        // Use errorData.message if backend sends { "message": "..." }
        errorData = { message: jsonData.error || jsonData.message || `Failed to ${context} (${status})`};
    } catch (e) {
        // Ignore if response is not JSON or empty
    }
    console.error(`API Error (${context}):`, status, errorData.message);
    if (status === 401 || status === 403) {
        throw new Error(`Unauthorized: Cannot ${context}. Please log in.`);
    }
    throw new Error(errorData.message);
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
  // Backend returns tasks directly as an array, or nested under data.tasks (check based on actual backend)
  // Assuming direct array based on previous observations. If nested, use data.tasks || []
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
  // Backend's taskController.createTask returns the new task directly
  const responseData = await response.json();
  return responseData as Task; // Assuming responseData is the task object
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
   // Backend's taskController.updateTask returns the updated task
   if (responseData && responseData._id) {
     return responseData as Task;
   } else if (responseData.task && responseData.task._id) { // If nested under 'task' key
     return responseData.task as Task;
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

// --- Chat API Calls (using /api/chat/*) ---

export type SendMessageAPIData = Pick<ChatMessage, 'chatRoom' | 'content' | 'messageType' | 'fileUrl' | 'replyTo'>;

export async function sendMessage(messageData: SendMessageAPIData): Promise<ChatMessage> {
    console.log(`Sending message to room ${messageData.chatRoom} via API /api/chat/send`);
    const response = await fetch(`${API_BASE_URL}/chat/send`, { // Updated endpoint
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(messageData),
    });
    if (!response.ok) return handleApiError(response, `send message to room ${messageData.chatRoom}`);
    const data = await response.json();
    
    // chatController.sendMessage returns { message: "Message sent!", data: message }
    return data.data as ChatMessage; // Assuming data.data is the new message object
}

export async function getAllMessages(chatRoomId: ChatRoomId): Promise<ChatMessage[]> {
   console.log(`Fetching messages for room: ${chatRoomId} via API /api/chat/:chatRoomId/messages`);
   // Backend route is /api/chat/:chatRoom/messages
   const response = await fetch(`${API_BASE_URL}/chat/${chatRoomId}/messages`, { // Updated endpoint
       method: 'GET',
       headers: getHeaders(),
   });
   if (!response.ok) return handleApiError(response, `fetch messages for room ${chatRoomId}`);
   const data = await response.json();
   console.log(data)
   // chatController.getMessages returns messages directly as an array
   return data as ChatMessage[];
}

export async function markMessageAsRead(messageId: MessageId): Promise<{ message: string }> {
    console.log(`Marking message ${messageId} as read via API /api/chat/mark-as-read`);
    const response = await fetch(`${API_BASE_URL}/chat/mark-as-read`, { // Updated endpoint
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ messageId }), // Backend expects messageId in body
    });
    if (!response.ok) return handleApiError(response, `mark message ${messageId} as read`);
    return response.json();
}

export async function updateUserTypingStatus(isTyping: boolean): Promise<{ message: string }> {
    console.log(`Updating typing status to ${isTyping} via API /api/chat/typing-status`);
    const response = await fetch(`${API_BASE_URL}/chat/typing-status`, { // Updated endpoint
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ isTyping }), // Backend expects isTyping in body
    });
    if (!response.ok) return handleApiError(response, `update typing status`);
    return response.json();
}

export async function getUserLastSeen(userId: UserId): Promise<{ lastSeen?: string }> {
    console.log(`Fetching last seen for user ${userId} via API /api/chat/:userId/last-seen`);
    const response = await fetch(`${API_BASE_URL}/chat/${userId}/last-seen`, { // Updated endpoint
        method: 'GET',
        headers: getHeaders(),
    });
    if (!response.ok) return handleApiError(response, `fetch last seen for user ${userId}`);
    return response.json(); // Expects { lastSeen: "ISO_DATE_STRING" } or {}
}


// --- Chat Room API Calls ---

/**
 * Gets or creates a direct message (DM) chat room with a peer user.
 * Requires authentication.
 * NOTE: This function uses /api/chatrooms/dm which might be separate from /api/chat routes.
 * Confirm backend structure if this is still the intended way to get/create DM rooms.
 * The provided /api/chat routes do not include room management.
 * @param peerUserId The ID of the other user in the DM chat.
 * @returns A promise that resolves to an object containing the `_id` of the ChatRoom.
 * @throws Throws an error if the operation fails.
 */
export async function getOrCreateDmChatRoom(peerUserId: UserId): Promise<{ _id: ChatRoomId, participants: UserId[], isGroup: boolean, lastMessage?: MessageId, createdAt: string, updatedAt: string }> {
  console.log(`Getting or creating DM chat room with user: ${peerUserId} via API /chatrooms/dm`);
  const response = await fetch(`${API_BASE_URL}/chatrooms/dm`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ peerUserId }),
  });

  if (!response.ok) {
    return handleApiError(response, `get or create DM chat room with ${peerUserId}`);
  }
  return response.json(); // Expects response like { _id: "...", participants: [...], ... }
}


// --- User API Calls ---

 export async function getUserById(userId: UserId): Promise<Partial<User>> {
    console.log(`Fetching user details for ID: ${userId}`);
    const idToFetch = typeof userId === 'string' ? userId : (userId as any)?._id;
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