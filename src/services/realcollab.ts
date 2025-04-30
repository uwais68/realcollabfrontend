/**
 * Represents a task.
 */
export interface Task {
  /**
   * The ID of the task.
   */
  _id: string;
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
  status: 'Open' | 'In Progress' | 'Review' | 'Completed'; // Use specific statuses
  /**
   * The due date of the task (ISO string format).
   */
  dueDate?: string; // Optional due date
  /**
   * The ID of the assigned user.
   */
  assignedTo: string; // Assuming this is a user ID
  /**
   * The ID of the project.
   */
  project: string; // Assuming this is a project ID
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
  /**
   * The ID of the message.
   */
  _id: string;
  /**
   * The ID of the sender.
   */
  sender: string; // Assuming this is a user ID
  /**
   * The content of the message.
   */
  content: string;
  /**
   * The timestamp of the message (ISO string format).
   */
  timestamp: string;
  // Potentially add chatRoomId if not inferred from context
  // chatRoom?: string;
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
  user: string; // Assuming this is a user ID
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

// --- Mock Data Functions ---
// NOTE: These are placeholders. Replace with actual API calls.
// Consider creating a dedicated api.ts or similar for actual fetch logic.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'; // Example API URL

/**
 * Asynchronously retrieves all tasks.
 * MOCK IMPLEMENTATION.
 * @returns A promise that resolves to an array of Task objects.
 */
export async function getAllTasks(): Promise<Task[]> {
   console.log('Mock fetching tasks...');
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // TODO: Replace with actual fetch call:
  // const response = await fetch(`${API_BASE_URL}/task`);
  // if (!response.ok) {
  //   throw new Error('Failed to fetch tasks');
  // }
  // const data = await response.json();
  // return data.tasks; // Assuming the API returns { tasks: [...] }

  return [
    {
      _id: 'task_1',
      title: 'Implement User Authentication Flow',
      description: 'Set up login, registration, and password reset using JWT.',
      status: 'In Progress',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Due in 3 days
      assignedTo: 'user1',
      project: 'project1',
    },
    {
      _id: 'task_2',
      title: 'Design Database Schema for Chat',
      description: 'Define models for Chat Rooms and Messages.',
      status: 'Open',
      assignedTo: 'user2',
      project: 'project1',
    },
     {
      _id: 'task_3',
      title: 'Deploy Backend to Staging',
      status: 'Completed',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Due 2 days ago
      assignedTo: 'admin',
      project: 'internal',
    },
    {
      _id: 'task_4',
      title: 'Fix Notification Badge Count Bug',
      description: 'Badge count not updating in real-time.',
      status: 'Review',
      assignedTo: 'user1',
      project: 'internal',
       dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
    },
  ];
}

/**
 * Asynchronously retrieves all chat messages for a given chat room.
 * MOCK IMPLEMENTATION.
 * @param chatRoomId The ID of the chat room.
 * @returns A promise that resolves to an array of ChatMessage objects.
 */
export async function getAllChatMessages(chatRoomId: string): Promise<ChatMessage[]> {
   console.log(`Mock fetching messages for room: ${chatRoomId}...`);
   // Simulate API call delay
   await new Promise(resolve => setTimeout(resolve, 300));

  // TODO: Replace with actual fetch call:
  // const response = await fetch(`${API_BASE_URL}/messages/${chatRoomId}`); // Example endpoint
  // if (!response.ok) {
  //   throw new Error(`Failed to fetch messages for room ${chatRoomId}`);
  // }
  // const data = await response.json();
  // return data.messages;

  // Return different messages based on room ID for demo
  if (chatRoomId === 'project1') {
    return [
       { _id: 'p1_m1', sender: 'user1', content: 'Okay, starting work on the auth flow now.', timestamp: new Date(Date.now() - 60000 * 10).toISOString() },
       { _id: 'p1_m2', sender: 'user2', content: 'Great! I\'ll begin the schema design.', timestamp: new Date(Date.now() - 60000 * 9).toISOString() },
     ];
  } else if (chatRoomId === 'user2') {
     return [
       { _id: 'u2_m1', sender: 'currentUser', content: 'Hey Alice, quick question about the API.', timestamp: new Date(Date.now() - 60000 * 2).toISOString() },
     ];
  }

  return [ // Default for 'room1' or others
    { _id: 'gen_m1', sender: 'admin', content: 'Welcome to the general discussion!', timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString() }, // 1 hour ago
    { _id: 'gen_m2', sender: 'user1', content: 'Anyone seen the latest project update?', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() }, // 30 mins ago
  ];
}

/**
 * Asynchronously retrieves all notifications for a given user.
 * MOCK IMPLEMENTATION.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of Notification objects.
 */
export async function getAllNotifications(userId: string): Promise<Notification[]> {
   console.log(`Mock fetching notifications for user: ${userId}...`);
   // Simulate API call delay
   await new Promise(resolve => setTimeout(resolve, 400));

   // TODO: Replace with actual fetch call:
   // const response = await fetch(`${API_BASE_URL}/notifications/${userId}`); // Example endpoint
   // if (!response.ok) {
   //   throw new Error(`Failed to fetch notifications for user ${userId}`);
   // }
   // const data = await response.json();
   // return data.notifications;

  return [
    {
      _id: 'notif_1',
      user: userId,
      message: 'Task "Design Database Schema for Chat" assigned to you.',
      type: 'task',
      relatedId: 'task_2',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
      read: false,
    },
    {
      _id: 'notif_2',
      user: userId,
      message: 'Admin mentioned you in #general discussion.',
      type: 'mention', // Example new type
      relatedId: 'room1', // Link to chat room
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
      read: false,
    },
    {
      _id: 'notif_3',
      user: userId,
      message: 'New file "API_Documentation_v2.pdf" uploaded to Project Alpha.',
      type: 'file',
      relatedId: 'file_xyz', // Example file ID
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      read: true, // Example of a read notification
    },
  ];
}

// TODO: Add functions for creating/updating/deleting tasks, sending messages, etc.
// Example:
// export async function createTask(taskData: Omit<Task, '_id'>): Promise<Task> {
//   const response = await fetch(`${API_BASE_URL}/task`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', /* Add Auth header */ },
//     body: JSON.stringify(taskData),
//   });
//   if (!response.ok) {
//     throw new Error('Failed to create task');
//   }
//   return response.json();
// }
