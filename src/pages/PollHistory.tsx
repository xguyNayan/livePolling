import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { calculatePercentage } from '../utils/sessionUtils';
import ChatParticipantsButton from '../components/ChatParticipantsButton';
import { fetchPolls } from '../store/slices/pollsSlice';
import type { AppDispatch, RootState } from '../store';
import socketService from '../services/socketService';
import type { Student } from '../services/socketService';

// Define the poll type
interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdAt: string;
  correctOptionId?: string | null;
}

const PollHistory = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { polls, loading, error } = useSelector((state: RootState) => state.polls);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [connectedStudents, setConnectedStudents] = useState<Student[]>([]);

  // Fetch real polls from Firestore via Redux
  useEffect(() => {
    // Fetch polls on component mount
    dispatch(fetchPolls());
    
    // Set up listener for students update
    const handleStudentsUpdate = (students: Student[]) => {
      setConnectedStudents(students);
    };
    
    socketService.onStudentsUpdate(handleStudentsUpdate);
    
    // Clean up socket listeners when component unmounts
    return () => {
      socketService.offStudentsUpdate(handleStudentsUpdate);
    };
  }, [dispatch]);
  
  // Set the selected poll when polls are loaded
  useEffect(() => {
    if (polls.length > 0 && !selectedPoll) {
      // Sort polls by creation date (newest first) before selecting
      const sortedPolls = [...polls].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSelectedPoll(sortedPolls[0]);
    }
  }, [polls, selectedPoll]);

  const handleAskNewQuestion = () => {
    navigate('/teacher');
  };

  // Calculate total votes for a poll
  const calculateTotalVotes = (options: PollOption[]) => {
    return options.reduce((sum, option) => sum + option.votes, 0);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading polls...</div>;
  }
  
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-red-500 mb-4">Error loading polls: {error}</p>
        <button 
          onClick={() => dispatch(fetchPolls())}
          className="px-4 py-2 bg-[#7765DA] text-white rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!selectedPoll && polls.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="mb-4">No polls found. Create your first poll!</p>
        <button 
          onClick={() => navigate('/teacher')}
          className="px-4 py-2 bg-[#7765DA] text-white rounded-md"
        >
          Create Poll
        </button>
      </div>
    );
  }
  
  if (!selectedPoll && polls.length > 0) {
    return <div className="flex justify-center items-center h-screen">Selecting poll...</div>;
  }

  // Sort polls by creation date (newest first)
  const sortedPolls = [...polls].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] rounded-full px-4 py-1.5 flex items-center gap-2 self-start">
          <span className="text-white font-medium text-sm">
            Intervue Poll
          </span>
        </div>
        <button 
          className="flex items-center gap-2 bg-[#7765DA] hover:bg-[#6A58C5] text-white font-medium py-2 px-4 rounded-full text-sm"
          onClick={() => navigate('/teacher')}
        >
          <span>Back to Teacher</span>
        </button>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2"><span className="font-sora font-medium">Poll</span> History</h1>
        <p className="text-[#6E6E6E]">
          View all previous polls and their results in one place.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        
        <div className="space-y-8">
          {sortedPolls.map(poll => {
            const pollTotalVotes = calculateTotalVotes(poll.options);
            
            return (
              <div key={poll.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-[#333333] to-[#666666] text-white p-4">
                  <h3 className="text-xl font-medium">{poll.question}</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Created on: {new Date(poll.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div className="p-4 space-y-3">
                  {poll.options.map((option, index) => {
                    const percentage = calculatePercentage(option.votes, pollTotalVotes);
                    
                    return (
                      <div 
                        key={option.id} 
                        className="relative h-[55px] rounded-md overflow-hidden bg-[#f7f7f7] transition-all duration-500"
                        style={{
                          border: '1px solid rgba(142,99,225,0.19)'
                        }}
                      >
                        {/* Background color div that fills based on percentage with smooth transition */}
                        <div 
                          className="absolute top-0 left-0 h-full z-0 transition-all duration-700 ease-out" 
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: 'rgba(103, 102, 213, 1)'
                          }}
                        ></div>
                        
                        {/* Black text (visible on light background) */}
                        <div className="flex items-center h-full px-6 relative z-10">
                          {/* Number circle - always white background with purple text */}
                          <div className="flex-shrink-0 bg-white rounded-full w-8 h-8 flex items-center justify-center mr-4">
                            <span className="text-[#6766d5] text-sm">{index + 1}</span>
                          </div>
                          
                          {/* Black text for option */}
                          <span className="font-medium text-black">{option.text}</span>
                          
                          {/* Black text for percentage - only shown when percentage is less than 100% */}
                          {percentage < 100 && (
                            <div className="ml-auto font-bold text-black">
                              {percentage}%
                              <span className="text-sm text-gray-500 ml-2 font-normal">({option.votes} votes)</span>
                            </div>
                          )}
                        </div>
                        
                        {/* White text (only visible on colored background) */}
                        <div 
                          className="absolute top-0 left-0 h-full z-10 flex items-center px-6 overflow-hidden"
                          style={{ width: `${percentage}%` }}
                        >
                          {/* Invisible spacer for number circle */}
                          <div className="invisible flex-shrink-0 w-8 h-8 mr-4"></div>
                          
                          {/* White text for option */}
                          <span className="font-medium text-white whitespace-nowrap">{option.text}</span>
                          
                          {/* White text for percentage (only shows when percentage is high enough) */}
                          {percentage > 90 && (
                            <div className="absolute right-6 font-bold text-white">
                              {percentage}%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleAskNewQuestion}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] text-white font-medium text-sm hover:opacity-90"
          >
            + Ask a new question
          </button>
        </div>
      </div>
      
      {/* Chat/Participants Button */}
      <ChatParticipantsButton 
        students={connectedStudents}
        isTeacher={true}
        userName="Teacher"
      />
    </div>
  );
};

export default PollHistory;
