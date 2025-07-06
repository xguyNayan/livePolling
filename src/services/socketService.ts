import { io, Socket } from 'socket.io-client';
import type { Poll, PollOption } from '../store/slices/pollsSlice';

// Configure socket.io with optimized settings for real-time performance
const socketOptions = {
  transports: ['websocket'],  // Force WebSocket transport for faster communication
  forceNew: true,            // Create a new connection
  reconnectionAttempts: Infinity, // Always try to reconnect
  timeout: 10000,           // Connection timeout
  reconnectionDelay: 1000,  // Start with a 1sec delay
  reconnectionDelayMax: 5000, // Max 5sec delay
};

// Define Student type locally since it's no longer in pollsSlice
export interface Student {
  id: string;
  name: string;
};

// Define ChatMessage type
export type ChatMessage = {
  id?: string;
  sender: string;
  text: string;
  timestamp?: string;
  isTeacher: boolean;
};

// Use environment variable for the socket server URL, fallback to the deployed Render URL
const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'https://livepolling-gpjh.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private initialized = false;
  private pollTimeoutCallback: ((pollId: string) => void) | null = null;
  private pollCreatedCallbacks: ((poll: any) => void)[] = [];
  private pollEndedCallbacks: ((pollId: string) => void)[] = [];
  private chatMessageCallbacks: ((message: ChatMessage) => void)[] = [];
  private studentKickedCallbacks: ((studentId: string) => void)[] = [];
  private studentsUpdateCallbacks: ((students: Student[]) => void)[] = [];

  initialize() {
    if (this.initialized) return;
    
    // Use optimized socket options for better performance
    this.socket = io(SOCKET_SERVER_URL, socketOptions);
    
    // Set up listeners with optimized event handling
    this.setupListeners();
    this.initialized = true;
    
    // Set up automatic reconnection with exponential backoff
    this.setupReconnection();
  }
  
  // Handle reconnection with exponential backoff
  private setupReconnection() {
    if (!this.socket) return;
    
    this.socket.io.on('reconnect_attempt', () => {
      console.log('Attempting to reconnect to socket server...');
    });
    
    this.socket.io.on('reconnect', () => {
      console.log('Reconnected to socket server');
      // Re-join appropriate rooms after reconnection
      if (this.socket) {
        this.socket.emit('rejoin_rooms');
      }
    });
  }

  setupListeners() {
    if (!this.socket) return;

    // Poll events
    this.socket.on('poll_created', (poll: Poll) => {
      // Instead of using setPoll, we now use Firebase
      // We'll handle this through our async thunks
      console.log('Poll created via socket:', poll);
      
      // Notify all registered callbacks
      this.pollCreatedCallbacks.forEach(callback => {
        try {
          callback(poll);
        } catch (error) {
          console.error('Error in poll created callback:', error);
        }
      });
    });

    this.socket.on('poll_results', (options: PollOption[]) => {
      // Use requestAnimationFrame for smoother UI updates
      requestAnimationFrame(() => {
        // Results are now handled through Firebase
        console.log('Poll results updated via socket:', options);
      });
    });

    this.socket.on('poll_timeout', (pollId: string) => {
      // We no longer automatically reset the poll on timeout
      // Instead, we'll just mark it as inactive in Firestore
      console.log('Poll timed out:', pollId);
      
      // Call the registered callback if it exists
      if (this.pollTimeoutCallback) {
        this.pollTimeoutCallback(pollId);
      }
    });
    
    // Add event listener for poll_ended event
    this.socket.on('poll_ended', (pollId: string) => {
      console.log('Poll ended by teacher:', pollId);
      
      // Notify all registered callbacks
      this.pollEndedCallbacks.forEach(callback => {
        try {
          callback(pollId);
        } catch (error) {
          console.error('Error in poll ended callback:', error);
        }
      });
    });

    // Student events
    this.socket.on('student_joined', (student: Student) => {
      // Student management is now handled locally
      console.log('Student joined:', student);
    });
    
    // Students update event
    this.socket.on('students_update', (students: Student[]) => {
      console.log('Students updated:', students);
      
      // Notify all registered callbacks
      this.studentsUpdateCallbacks.forEach(callback => {
        try {
          callback(students);
        } catch (error) {
          console.error('Error in students update callback:', error);
        }
      });
    });

    // Chat events
    this.socket.on('chat_message', (message: ChatMessage) => {
      console.log('Chat message received:', message);
      
      // Notify all registered callbacks
      this.chatMessageCallbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in chat message callback:', error);
        }
      });
    });

    // Student kicked event
    this.socket.on('student_kicked', (studentId: string) => {
      console.log('Student kicked:', studentId);
      
      // Notify all registered callbacks
      this.studentKickedCallbacks.forEach(callback => {
        try {
          callback(studentId);
        } catch (error) {
          console.error('Error in student kicked callback:', error);
        }
      });
    });

    // Timer events with optimized performance
    this.socket.on('timer_update', (timeRemaining: number) => {
      // Use requestAnimationFrame for smoother UI updates
      requestAnimationFrame(() => {
        // Timer updates are now handled locally
        console.log('Timer update:', timeRemaining);
      });
    });
    
    // Set up ping/pong for connection health monitoring
    setInterval(() => {
      if (this.socket && this.socket.connected) {
        const start = performance.now();
        this.socket.emit('ping', () => {
          const latency = performance.now() - start;
          console.debug(`Socket latency: ${latency.toFixed(2)}ms`);
        });
      }
    }, 30000); // Check every 30 seconds
  }

  // Teacher events
  joinTeacher() {
    if (!this.socket) return;
    this.socket.emit('join_teacher');
  }

  createPoll(poll: Omit<Poll, 'id' | 'createdAt' | 'isActive'>) {
    if (!this.socket) return;
    this.socket.emit('create_poll', poll);
  }

  // Student events
  joinStudent(name: string) {
    if (!this.socket) return;
    this.socket.emit('join_student', { name });
  }
  
  // Chat methods
  sendChatMessage(message: { text: string, sender: string, isTeacher: boolean }) {
    if (!this.socket) return;
    this.socket.emit('send_chat_message', message);
  }
  
  onChatMessage(callback: (message: ChatMessage) => void) {
    this.chatMessageCallbacks.push(callback);
  }
  
  offChatMessage(callback: (message: ChatMessage) => void) {
    this.chatMessageCallbacks = this.chatMessageCallbacks.filter(cb => cb !== callback);
  }
  
  // Kick student methods
  kickStudent(studentId: string) {
    if (!this.socket) return;
    this.socket.emit('kick_student', studentId);
  }
  
  onStudentKicked(callback: (studentId: string) => void) {
    this.studentKickedCallbacks.push(callback);
  }
  
  offStudentKicked(callback: (studentId: string) => void) {
    this.studentKickedCallbacks = this.studentKickedCallbacks.filter(cb => cb !== callback);
  }
  
  // Students update methods
  onStudentsUpdate(callback: (students: Student[]) => void) {
    this.studentsUpdateCallbacks.push(callback);
  }
  
  offStudentsUpdate(callback: (students: Student[]) => void) {
    this.studentsUpdateCallbacks = this.studentsUpdateCallbacks.filter(cb => cb !== callback);
  }

  submitAnswer(pollId: string, optionId: string) {
    if (!this.socket) return;
    this.socket.emit('submit_answer', { pollId, optionId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.initialized = false;
    }
  }
  
  // Method to get the socket instance
  getSocket(): Socket | null {
    return this.socket;
  }
  
  // Method to register a callback for poll timeout events
  onPollTimeout(callback: (pollId: string) => void) {
    this.pollTimeoutCallback = callback;
  }
  
  // Method to register a callback for poll creation events
  onPollCreated(callback: (poll: any) => void) {
    this.pollCreatedCallbacks.push(callback);
  }
  
  // Method to remove a callback for poll creation events
  offPollCreated(callback: (poll: any) => void) {
    this.pollCreatedCallbacks = this.pollCreatedCallbacks.filter(cb => cb !== callback);
  }
  
  // Method to register a callback for poll ended events
  onPollEnded(callback: (pollId: string) => void) {
    this.pollEndedCallbacks.push(callback);
  }
  
  // Method to remove a callback for poll ended events
  offPollEnded(callback: (pollId: string) => void) {
    this.pollEndedCallbacks = this.pollEndedCallbacks.filter(cb => cb !== callback);
  }
}

export const socketService = new SocketService();
export default socketService;
