import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.PROD_FRONTEND,
        methods: ["GET", "POST"],
    },
});

app.use(cors( {
    origin: process.env.PROD_FRONTEND,
    methods: ["GET", "POST"],
    credentials: true
    
}));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join room
  socket.on("join-room", (roomId) => {
    const usersInRoom = io.sockets.adapter.rooms.get(roomId);
    const userCount = usersInRoom ? usersInRoom.size : 0;
    
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}. Total users: ${userCount + 1}`);

    // Send list of existing users to the new user
    const existingUsers = Array.from(usersInRoom || []).filter(id => id !== socket.id);
    socket.emit("existing-users", existingUsers);

    // Notify others that a new user joined
    socket.to(roomId).emit("user-joined", socket.id);
  });

  // Offer (send to specific user)
  socket.on("offer", ({ roomId, offer, to }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  // Answer (send to specific user)
  socket.on("answer", ({ roomId, answer, to }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  // ICE candidate (send to specific user)
  socket.on("ice-candidate", ({ roomId, candidate, to }) => {
    if (to) {
      io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    }
  });

  // Notify user disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    socket.broadcast.emit("user-disconnected", socket.id);
  });
});

const PORT = process.env.PORT 

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})