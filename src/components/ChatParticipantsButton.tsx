import { useState, useEffect } from 'react';
import { BsChatDots, BsPeople, BsSend } from "react-icons/bs";
import { FaUserCircle } from "react-icons/fa";
import socketService from '../services/socketService';
import type { ChatMessage } from '../services/socketService';
import Modal from './Modal';

interface Student {
  id: string;
  name: string;
}

// Using ChatMessage type imported from socketService

interface ChatParticipantsButtonProps {
  students?: Student[];
  isTeacher?: boolean;
  userName?: string;
}

const ChatParticipantsButton = ({ students = [], isTeacher = false, userName = '' }: ChatParticipantsButtonProps) => {
  const [showPopup, setShowPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('participants');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showKickModal, setShowKickModal] = useState(false);
  const [studentToKick, setStudentToKick] = useState<Student | null>(null);
  
  // Listen for chat messages
  useEffect(() => {
    // Register for chat message events
    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };
    
    socketService.onChatMessage(handleChatMessage);
    
    // Cleanup
    return () => {
      socketService.offChatMessage(handleChatMessage);
    };
  }, []);
  
  // Handle sending a new message
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        text: newMessage.trim(),
        sender: userName,
        isTeacher: isTeacher
      };
      
      // Send message via socket
      socketService.sendChatMessage(message);
      setNewMessage('');
    }
  };
  
  // Handle kicking a student
  const openKickModal = (student: Student) => {
    setStudentToKick(student);
    setShowKickModal(true);
  };
  
  const confirmKickStudent = () => {
    if (isTeacher && studentToKick) {
      socketService.kickStudent(studentToKick.id);
      setShowKickModal(false);
      setStudentToKick(null);
    }
  };
  
  const cancelKickStudent = () => {
    setShowKickModal(false);
    setStudentToKick(null);
  };

  return (
    <div className="fixed bottom-8 sm:bottom-8 right-2 sm:right-12 z-50">
      {/* Floating Button */}
      <button 
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] text-white flex items-center justify-center shadow-lg hover:opacity-90"
        onClick={() => setShowPopup(!showPopup)}
      >
        {activeTab === 'chat' ? (
          <BsChatDots className="text-xl sm:text-2xl" />
        ) : (
          <BsPeople className="text-xl sm:text-2xl" />
        )}
      </button>

      {/* Popup */}
      {showPopup && (
        <div className="absolute bottom-16 sm:bottom-16 right-0 z-50 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-[#D9D9D9] overflow-hidden">
          <div className="flex border-b mt-2">
            <button
              className={`pb-2 px-4 ${activeTab === 'chat' ? 'border-b-2 border-[#7765DA] text-[#7765DA]' : 'text-[#6E6E6E]'}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button
              className={`pb-2 px-4 ${activeTab === 'participants' ? 'border-b-2 border-[#7765DA] text-[#7765DA]' : 'text-[#6E6E6E]'}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants
            </button>
          </div>

          {activeTab === 'chat' ? (
            <div className="flex flex-col h-80">
              {/* Chat messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-[#6E6E6E] py-4">
                    No messages yet
                  </p>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.isTeacher ? 'justify-start' : 'justify-end'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${message.isTeacher 
                          ? 'bg-[#7765DA] text-white' 
                          : 'bg-gray-100 text-gray-800'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.isTeacher && (
                            <span className="text-xs font-semibold">{message.sender} (Teacher)</span>
                          )}
                        </div>
                        <p>{message.text}</p>
                        <div className="text-xs opacity-70 text-right mt-1">
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Message input */}
              {isTeacher && (
                <div className="border-t p-3 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7765DA]"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-[#7765DA] text-white rounded-lg p-2 hover:bg-[#6754C8]"
                  >
                    <BsSend />
                  </button>
                </div>
              )}
              
              {!isTeacher && (
                <div className="border-t p-3 text-center text-sm text-gray-500">
                  Only teachers can send messages
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              {students.length === 0 ? (
                <p className="text-[#6E6E6E]">No students have joined yet.</p>
              ) : (
                students.map(student => (
                  <div key={student.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <FaUserCircle className="text-[#7765DA] text-xl" />
                      <span>{student.name}</span>
                    </div>
                    {isTeacher && (
                      <button 
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          openKickModal(student);
                        }}
                      >
                        Kick out
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Kick Confirmation Modal */}
      <Modal
        isOpen={showKickModal}
        onClose={cancelKickStudent}
        title="Remove Student"
        actions={
          <>
            <button
              onClick={cancelKickStudent}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmKickStudent}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700"
            >
              Remove
            </button>
          </>
        }
      >
        <p className="text-gray-700">
          Are you sure you want to remove <span className="font-semibold">{studentToKick?.name}</span> from this session?
        </p>
        <p className="mt-2 text-sm text-gray-500">
          This action cannot be undone. The student will be disconnected immediately.
        </p>
      </Modal>
    </div>
  );
};

export default ChatParticipantsButton;
