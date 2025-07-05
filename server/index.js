const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite's default port
    methods: ["GET", "POST"]
  }
});

// In-memory data store
const students = new Map(); // studentId -> { id, name, hasSubmitted }
const activePoll = {
  data: null,
  timer: null
};
const chatMessages = []; // Store recent chat messages

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Teacher events
  socket.on('join_teacher', () => {
    console.log(`Teacher joined: ${socket.id}`);
    socket.join('teachers');
    
    // Send current students list to the teacher
    const studentsList = Array.from(students.values());
    socket.emit('students_update', studentsList);
    
    // Also broadcast to all clients for consistency
    io.emit('students_update', studentsList);
    
    // Send active poll if exists
    if (activePoll.data) {
      socket.emit('poll_created', activePoll.data);
    }
  });

  socket.on('create_poll', (pollData) => {
    console.log('New poll created:', pollData);
    
    // Clear previous timer if exists
    if (activePoll.timer) {
      clearInterval(activePoll.timer);
    }
    
    // Create new poll with unique ID
    const poll = {
      id: generateId(),
      question: pollData.question,
      options: pollData.options.map(opt => ({ ...opt, votes: 0 })),
      timer: pollData.timer,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    activePoll.data = poll;
    
    // Reset student submission status
    for (const [id, student] of students.entries()) {
      students.set(id, { ...student, hasSubmitted: false });
    }
    
    // Broadcast poll to all clients
    io.emit('poll_created', poll);
    
    // Start timer
    let timeRemaining = poll.timer;
    io.emit('timer_update', timeRemaining);
    
    activePoll.timer = setInterval(() => {
      timeRemaining -= 1;
      io.emit('timer_update', timeRemaining);
      
      if (timeRemaining <= 0) {
        clearInterval(activePoll.timer);
        activePoll.timer = null;
        activePoll.data.isActive = false;
        io.emit('poll_timeout');
      }
    }, 1000);
  });

  // Handle ending a poll manually
  socket.on('end_poll', (pollId) => {
    console.log(`Poll ended manually by teacher: ${pollId}`);
    
    if (activePoll.data && activePoll.data.id === pollId) {
      // Clear the timer
      if (activePoll.timer) {
        clearInterval(activePoll.timer);
        activePoll.timer = null;
      }
      
      // Mark poll as inactive
      activePoll.data.isActive = false;
      
      // Broadcast to all clients that poll has ended
      io.emit('poll_ended', pollId);
    }
  });

  socket.on('kick_student', (studentId) => {
    console.log(`Kicking student: ${studentId}`);
    
    if (students.has(studentId)) {
      const student = students.get(studentId);
      students.delete(studentId);
      
      // Notify all clients that student was kicked
      io.emit('student_kicked', studentId);
      
      // Broadcast updated students list
      const updatedStudentsList = Array.from(students.values());
      io.emit('students_update', updatedStudentsList);
      
      // Find and disconnect the student's socket
      const studentSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.data && s.data.studentId === studentId);
      
      if (studentSocket) {
        // Send a final message to the student before disconnecting
        studentSocket.emit('you_were_kicked');
        // Disconnect after a short delay to ensure the message is received
        setTimeout(() => {
          studentSocket.disconnect(true);
        }, 500);
      }
    }
  });
  
  // Chat message handling
  socket.on('send_chat_message', (messageData) => {
    const { text, sender, isTeacher } = messageData;
    
    if (!text || !sender) return;
    
    const message = {
      id: generateId(),
      text,
      sender,
      isTeacher,
      timestamp: new Date().toISOString()
    };
    
    // Store message
    chatMessages.push(message);
    if (chatMessages.length > 100) chatMessages.shift(); // Keep only last 100 messages
    
    // Broadcast to all clients
    io.emit('chat_message', message);
    console.log(`Chat message from ${sender}: ${text}`);
  });

  // Student events
  socket.on('join_student', (data) => {
    const { name } = data;
    console.log(`Student joined: ${name} (${socket.id})`);
    
    const studentId = socket.id;
    socket.data.studentId = studentId;
    
    const student = {
      id: studentId,
      name,
      hasSubmitted: false
    };
    
    students.set(studentId, student);
    socket.join('students');
    
    // Notify all teachers about new student
    io.to('teachers').emit('student_joined', student);
    
    // Broadcast updated students list to all clients
    const updatedStudentsList = Array.from(students.values());
    io.emit('students_update', updatedStudentsList);
    
    // Send active poll if exists
    if (activePoll.data) {
      socket.emit('poll_created', activePoll.data);
      
      if (activePoll.timer) {
        const timeRemaining = activePoll.data.timer - Math.floor((Date.now() - new Date(activePoll.data.createdAt).getTime()) / 1000);
        socket.emit('timer_update', Math.max(0, timeRemaining));
      }
    }
  });

  socket.on('submit_answer', (data) => {
    const { pollId, optionId } = data;
    console.log(`Answer submitted by ${socket.id}: ${optionId}`);
    
    if (activePoll.data && activePoll.data.id === pollId && activePoll.data.isActive) {
      // Update option votes
      const option = activePoll.data.options.find(opt => opt.id === optionId);
      if (option) {
        option.votes += 1;
      }
      
      // Mark student as submitted
      if (students.has(socket.id)) {
        const student = students.get(socket.id);
        students.set(socket.id, { ...student, hasSubmitted: true });
      }
      
      // Broadcast updated results to all clients
      io.emit('poll_results', activePoll.data.options);
      
      // Check if all students have submitted
      const allSubmitted = Array.from(students.values()).every(student => student.hasSubmitted);
      if (allSubmitted && students.size > 0) {
        console.log('All students have submitted, ending poll');
        if (activePoll.timer) {
          clearInterval(activePoll.timer);
          activePoll.timer = null;
        }
        activePoll.data.isActive = false;
        io.emit('poll_timeout');
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // If this was a student, remove them from the students list
    if (socket.data && socket.data.studentId) {
      const studentId = socket.data.studentId;
      if (students.has(studentId)) {
        students.delete(studentId);
        
        // Notify all teachers about student leaving
        io.to('teachers').emit('student_left', studentId);
        
        // Broadcast updated students list
        const updatedStudentsList = Array.from(students.values());
        io.emit('students_update', updatedStudentsList);
      }
    }
  });
});

// Helper function to generate unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
