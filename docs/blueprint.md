# **App Name**: CollabFlow Frontend

## Core Features:

- Data Presentation: Display tasks, chat and notifications fetched from the CollabFlow API. Implement a responsive design for different screen sizes.
- Interactive UI Elements: Implement user interface components for task creation, chat messaging, and notification management.
- API Integration: Integrate with the CollabFlow API (https://github.com/uwais68/realcollab) to fetch and update data in real-time using web sockets.

## Style Guidelines:

- Primary color: White or light gray for the background to ensure readability.
- Secondary color: Dark gray or black for text to provide a strong contrast.
- Accent: Teal (#008080) for interactive elements and highlights.
- Use a grid-based layout for consistent spacing and alignment.
- Use a consistent set of icons for tasks, chat, and notifications.

## Original User Request:
Can you create a frontend app integrating the API from the 
https://github.com/uwais68/realcollab
repository please
This app is a RealTime collaborative workspace for organisations where they can add tasks and have chat feature using websocket
this is 

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";

// ✅ Import Routes (Ensure filenames match exactly)
import connectDB from "./src/config/db.js"; // ✅ Ensure correct path
import authRoutes from "./src/routes/authRoutes.js";
import taskRoutes from "./src/routes/taskRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import protectedRoutes from "./src/routes/protected.js"; // Import the protected routes
import userRoutes from "./src/routes/userRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js"; // Add Notification Routes
import milestoneRoutes from "./src/routes/milestoneRoutes.js";
import timeLogRoutes from "./src/routes/timeLogRoutes.js";
import otpRoutes from "./src/routes/otpRoutes.js"; // Import OTP routes
import fileRoutes from "./src/routes/fileRoutes.js"; // Import file routes
import sendOTP from "./src/services/otpService.js";
import errorHandler from "./middleware/errorHandler.js";
import messageRoutes from "./routes/messageRoutes.js";

// Load environment variables
dotenv.config();

// Initialize App
const app = express();
const PORT = process.env.PORT || 3000; 
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Change this to your frontend URL
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json()); // ✅ Ensure JSON parsing is enabled
// ✅ Security Middlewares
app.use(helmet()); // Protects HTTP headers
app.use(mongoSanitize()); // Prevents NoSQL injection attacks
app.use(xss()); // Prevents Cross-Site Scripting (XSS)

// Connect to MongoDB
connectDB();

// ✅ Use Routes
app.use("/api/task", taskRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/protected", protectedRoutes); // Use the protected routes
app.use("/api/otp", sendOTP);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes); // Register Notification Routes
app.use("/api/milestone", milestoneRoutes);
app.use("/api/timelog", timeLogRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/messages", messageRoutes);


// ✅ Basic Test Route
app.get("/", (req, res) => {
  res.send("Server is running...");
});

// Test route to check if the server is working
app.put("/test", (req, res) => {
  res.json({ message: "Test route working!" });
});

// ✅ WebSocket Connection Handling
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Listen for messages
  socket.on("sendMessage", (data) => {
    io.to(data.chatRoom).emit("receiveMessage", data);
    io.to(data.chatRoom).emit("receiveNotification", {
      user: data.receiverId,
      message: `${data.senderName} sent a message`,
      type: "chat",
    });
  });

  // Join a chat room
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // Leave a chat room
  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room: ${roomId}`);
  });

  // Handle task update notifications
  socket.on("taskUpdated", (data) => {
    io.emit("receiveNotification", {
      user: data.user,
      message: `Task '${data.taskTitle}' has been updated`,
      type: "task",
      relatedId: data.taskId,
    });
  });

  // Handle file sharing notifications
  socket.on("fileUploaded", (data) => {
    io.emit("receiveNotification", {
      user: data.user,
      message: `A new file '${data.fileName}' has been uploaded`,
      type: "file",
      relatedId: data.fileId,
    });
  });

  // Disconnect event
  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

// error handler as the last middleware
app.use(errorHandler); // Catches any errors from routes or other middlewares

// Start the server
const serverInstance = server.listen(PORT, () => {
  console.log(`Server running on port ${serverInstance.address().port}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Port ${PORT} is in use. Trying another port...`);
    app.listen(0, () => console.log(`Server started on a new port`));
  } else {
    console.error("Server error:", err);
  }
});
  