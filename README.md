# Live Polling System

A real-time interactive polling system built with React, Vite, Tailwind CSS, Express.js, and Socket.IO. This application allows teachers to create polls and students to submit answers in real-time, with features like live results, chat functionality, and participant management.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Component Structure](#component-structure)
- [State Management](#state-management)
- [Socket.IO Events](#socketio-events)
- [Firebase Integration](#firebase-integration)
- [Modal System](#modal-system)

## Features

### Core Features

#### Teacher Features
- Create new polls with custom questions and multiple options
- Set custom timer duration for each poll (15s to 120s)
- View live poll results in real-time with percentage bars
- End polls manually or wait for automatic timeout
- View poll history from previous sessions
- Kick students out of the session with confirmation dialog
- View real-time list of connected participants
- Chat with students in real-time

#### Student Features
- Join with a unique name (session-based)
- Answer polls within the specified time limit
- View countdown timer synchronized with server
- View live poll results after submission or timeout
- Persistent name across page refreshes (same tab)
- Chat with teachers and other students
- Receive notification when kicked out

### Logic & State Management
- Proper poll state management (active/inactive)
- Student answers are tracked and re-submissions prevented
- Answers are counted and displayed in real-time bar charts
- Timer resets correctly for each new question
- New browser tabs require new student names

## Tech Stack

### Frontend
- **React**: UI library for building component-based interfaces
- **Vite**: Modern build tool for faster development
- **TypeScript**: Type-safe JavaScript
- **Redux Toolkit**: State management with simplified Redux patterns
- **React Router**: Navigation and routing
- **Tailwind CSS**: Utility-first CSS framework for styling
- **React Icons**: Icon library for UI elements
- **Socket.IO Client**: Real-time bidirectional communication

### Backend
- **Express.js**: Web server framework
- **Socket.IO**: Real-time bidirectional event-based communication
- **Firebase/Firestore**: Cloud database for storing polls and responses

## Architecture

### System Overview
The application follows a client-server architecture with real-time communication:

1. **Frontend (React/Vite)**: Provides separate interfaces for teachers and students
2. **Backend (Express/Socket.IO)**: Manages real-time communication and session state
3. **Database (Firebase)**: Stores polls, responses, and historical data

### Data Flow
1. Teacher creates a poll through the UI
2. Poll is saved to Firebase and broadcast via Socket.IO to all connected students
3. Students receive the poll and submit answers within the time limit
4. Answers are processed by the server and broadcast to all clients
5. Results are displayed in real-time and stored in Firebase

## Installation

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Firebase account (for database)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd react-vite-tailwind
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Set up Firestore database
   - Add your Firebase configuration to `src/services/firebaseConfig.ts`

4. **Start the development server**
   ```bash
   # Start the frontend
   npm run dev
   # or
   yarn dev
   
   # In a separate terminal, start the backend
   node server/index.js
   ```

5. **Access the application**
   - Teacher interface: http://localhost:5173/teacher
   - Student interface: http://localhost:5173/

## Usage

### Teacher Flow
1. Navigate to `/teacher`
2. Create a new poll by entering a question and options
3. Set a timer duration (15s to 120s)
4. Submit the poll to broadcast it to students
5. View live results as students submit answers
6. End the poll manually or wait for the timer to expire
7. Create a new poll or view poll history

### Student Flow
1. Navigate to the root URL `/`
2. Enter a name to join the session
3. Wait for the teacher to create a poll
4. Answer the poll within the time limit
5. View the results after submission or timeout
6. Participate in chat with teachers and other students

## Component Structure

### Main Pages
- **Home.tsx**: Landing page with student name entry
- **StudentName.tsx**: Student name registration
- **StudentPoll.tsx**: Student poll interface
- **Teacher.tsx**: Teacher poll creation interface
- **ActivePoll.tsx**: Active poll monitoring for teachers
- **PollHistory.tsx**: Historical poll results

### Key Components
- **Modal.tsx**: Reusable modal component for dialogs
- **ChatParticipantsButton.tsx**: Chat and participant management
- **PollOption.tsx**: Individual poll option rendering
- **PollResults.tsx**: Results visualization with percentage bars

## State Management

### Redux Store
- **pollsSlice.ts**: Manages poll state, options, results, and student submissions
- **Actions**: createPollAsync, submitAnswerAsync, fetchPolls, endPollAsync
- **Selectors**: Access current poll, results, and submission status

### Socket Service
- **socketService.ts**: Manages Socket.IO connections and event handlers
- **Events**: poll_created, submit_answer, poll_results, timer_update, chat_message

## Socket.IO Events

### Server Events (Emitted)
- **poll_created**: Broadcasts new poll to all clients
- **poll_results**: Updates poll results in real-time
- **timer_update**: Synchronizes countdown timer
- **poll_timeout**: Notifies when poll time expires
- **chat_message**: Broadcasts chat messages
- **students_update**: Updates connected students list
- **student_kicked**: Notifies when a student is removed

### Client Events (Received)
- **join_teacher**: Teacher connects to session
- **join_student**: Student joins with name
- **create_poll**: Teacher creates a new poll
- **submit_answer**: Student submits an answer
- **end_poll**: Teacher manually ends a poll
- **send_chat**: Client sends a chat message
- **kick_student**: Teacher removes a student

## Firebase Integration

### Data Structure
- **polls**: Collection of all polls
  - **id**: Unique identifier
  - **question**: Poll question text
  - **options**: Array of options with votes
  - **timer**: Duration in seconds
  - **isActive**: Current status
  - **createdAt**: Timestamp
  - **correctOptionId**: Optional correct answer

### Services
- **firebaseService.ts**: Handles all Firestore operations
- **Methods**: createPoll, submitAnswer, fetchPolls, endPoll

## Modal System

The application uses a custom modal system for improved user experience:

### Features
- Reusable Modal component with customizable content
- Confirmation dialogs for critical actions (e.g., kicking students)
- Notification modals for important events
- Backdrop click to dismiss
- Consistent styling with Tailwind CSS

### Implementation
- **Modal.tsx**: Core modal component with props for title, content, and actions
- Used for kick confirmation, notifications, and error messages
- Replaces native browser alerts and confirms for better UX

---

## License

MIT

## Contributors

- [Your Name]

- **Frontend**: React with TypeScript, Redux for state management, Tailwind CSS for styling
- **Backend**: Express.js with Socket.IO for real-time communication
- **Session Management**: Browser's sessionStorage for student name persistence

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone the repository

```bash
git clone <repository-url>
cd react-vite-tailwind
```

2. Install frontend dependencies

```bash
npm install
```

3. Install backend dependencies

```bash
cd server
npm install
cd ..
```

## Running the Application

### Start the Backend Server

```bash
cd server
npm start
```

The server will run on http://localhost:3001

### Start the Frontend Development Server

In a new terminal:

```bash
npm run dev
```

The frontend will run on http://localhost:5173

## Usage

1. Open http://localhost:5173 in your browser
2. Choose either "Teacher" or "Student" role
3. If you're a teacher, you can create polls and monitor student responses
4. If you're a student, enter your name and answer polls as they come in

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
