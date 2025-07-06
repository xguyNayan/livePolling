import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { AppDispatch } from '../store';
import { fetchActivePoll, endPollAsync, updatePollResults } from '../store/slices/pollsSlice';
import type { PollOption } from '../store/slices/pollsSlice';
import socketService from '../services/socketService';
import { calculatePercentage } from '../utils/sessionUtils';
import { BsEye } from "react-icons/bs";
import ChatParticipantsButton from '../components/ChatParticipantsButton';

const ActivePoll = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { currentPoll } = useSelector((state: RootState) => state.polls);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [students, setStudents] = useState<Array<{id: string, name: string}>>([]);

  // Fetch active poll on component mount
  useEffect(() => {
    dispatch(fetchActivePoll());
  }, [dispatch]);

  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Track previous poll options for smooth transitions
  const prevOptionsRef = useRef<PollOption[]>([]);
  
  // Setup polling interval for frequent updates
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Optimized update handler with debouncing
  const updatePollResultsHandler = useCallback((updatedOptions: PollOption[]) => {
    if (!isMounted.current || !currentPoll) return;
    
    // Store previous options for animation comparison
    prevOptionsRef.current = currentPoll.options;
    
    // Update the current poll with new vote counts
    dispatch(updatePollResults({
      pollId: currentPoll.id,
      options: updatedOptions
    }));
  }, [dispatch, currentPoll]);
  
  // Setup socket connection and event listeners with optimizations
  useEffect(() => {
    // Mark component as mounted
    isMounted.current = true;
    
    // Initialize socket connection
    socketService.initialize();
    socketService.joinTeacher();
    
    // Register callback for poll timeout events
    socketService.onPollTimeout((pollId) => {
      if (!isMounted.current) return;
      
      if (currentPoll && currentPoll.id === pollId) {
        // Automatically end the poll when timer reaches zero
        dispatch(endPollAsync(pollId));
      }
    });
    
    // Setup socket event listener for real-time poll results updates
    const socket = socketService.getSocket();
    
    if (socket) {
      // Listen for poll results updates with optimized handler
      socket.on('poll_results', updatePollResultsHandler);
      
      // Listen for timer updates with smooth transitions
      socket.on('timer_update', (remaining: number) => {
        if (!isMounted.current) return;
        
        // Use requestAnimationFrame for smoother UI updates
        requestAnimationFrame(() => {
          // Only update timer if poll is still active
          if (currentPoll?.isActive) {
            setTimeRemaining(remaining);
            
            // Auto-end poll when timer reaches zero
            if (remaining === 0) {
              dispatch(endPollAsync(currentPoll.id));
            }
          } else {
            // If poll is no longer active, force timer to 0
            setTimeRemaining(0);
          }
        });
      });
      
      // Listen for student join events
      socket.on('student_joined', (student: {id: string, name: string}) => {
        if (!isMounted.current) return;
        setStudents(prev => [...prev, student]);
      });
      
      // Listen for student kick events
      socket.on('student_kicked', (studentId: string) => {
        if (!isMounted.current) return;
        setStudents(prev => prev.filter(student => student.id !== studentId));
      });
    }
    
    // Setup high-frequency polling for near-instant updates
    if (currentPoll?.isActive) {
      // Primary polling at 500ms for extremely fast updates
      pollIntervalRef.current = setInterval(() => {
        if (currentPoll?.id) {
          // Use silent refresh to avoid any loading indicators
          dispatch(fetchActivePoll());
        }
      }, 500); // Poll every 500ms for near-instant updates
    }
    
    // Cleanup function to remove event listeners and intervals
    return () => {
      isMounted.current = false;
      
      if (socket) {
        socket.off('poll_results');
        socket.off('timer_update');
        socket.off('student_joined');
        socket.off('student_kicked');
      }
      
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [dispatch, currentPoll, updatePollResultsHandler]);
  
  // No need for this useEffect as loading state is managed by Redux
  
  const handleEndPoll = () => {
    if (currentPoll) {
      // Immediately set the timer to 0 to indicate poll has ended
      setTimeRemaining(0);
      
      // Cancel any existing timer updates
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      // End the poll in the backend
      dispatch(endPollAsync(currentPoll.id));
    }
  };
  
  const handleCreateNewPoll = () => {
    navigate('/teacher');
  };
  
  const handleViewPollHistory = () => {
    navigate('/poll-history');
  };

  // Skip loading state completely - always render the current data
  // This prevents any loading indicators from showing during updates

  if (!currentPoll) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary flex items-center">
            <span className="mr-2">Intervue Poll</span>
          </h1>
          <div className="flex space-x-4">
            <button
              onClick={handleViewPollHistory}
              className="bg-[#7765DA] text-white px-4 py-2 rounded-md hover:bg-primary-dark transition"
            >
              Poll History
            </button>
          </div>
        </div>
        
        {/* No active polls message with create new poll button */}
        <div className="text-center py-12 flex flex-col items-center">
          <div className="mb-8">
            <img 
              src="/assets/no-polls.svg" 
              alt="No active polls" 
              className="w-48 h-48 mx-auto mb-4 opacity-70"
              onError={(e) => {
                // Fallback if image doesn't exist
                e.currentTarget.style.display = 'none';
              }}
            />
            <p className="text-xl text-gray-600 font-medium mb-2">No active polls found</p>
            <p className="text-gray-500">Create a new poll to get started</p>
          </div>
          
          <button
            onClick={handleCreateNewPoll}
            className="bg-[#7765DA] text-white px-6 py-3 rounded-full hover:bg-primary-dark transition text-sm font-medium flex items-center"
          >
            <span className="mr-1">+</span> Ask a question
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex justify-end items-center mb-6 ">
        <div className="flex space-x-4">
          <button
            onClick={handleViewPollHistory}
            className="flex items-center text-primary hover:text-primary-dark transition"
          >
            <BsEye className="mr-1" /> View Poll history
          </button>
          <ChatParticipantsButton 
            students={students}
            isTeacher={true}
            userName="Teacher"
          />
        </div>
      </div>

      {/* Question Heading */}
      <h3 className="text-xl font-medium mb-3 mt-20">Question</h3>
      
      {/* Poll Display - Styled based on Figma design */}
      <div className="border border-primary rounded-lg mb-6 ">
        {/* Question Header with Gradient Background */}
        <div className="bg-gradient-to-r from-[#333333] to-[#666666] text-white p-4 rounded-t-lg">
          <h2 className="text-lg font-medium">{currentPoll.question}</h2>
        </div>
        
        {/* Options Container */}
        <div className="p-4 space-y-3">
          {currentPoll.options.map((option: PollOption, index: number) => {
            const totalVotes = currentPoll.options.reduce((sum: number, opt: PollOption) => sum + opt.votes, 0);
            const percentage = calculatePercentage(option.votes, totalVotes);
            
            // Calculate if this option's percentage has changed
            const prevOption = prevOptionsRef.current?.find(opt => opt.id === option.id);
            const prevPercentage = prevOption ? 
              calculatePercentage(prevOption.votes, prevOptionsRef.current.reduce((sum, opt) => sum + opt.votes, 0)) : 0;
            const hasChanged = prevPercentage !== percentage;
            
            return (
              <div 
                key={option.id} 
                className={`relative h-[55px] rounded-md overflow-hidden bg-[#f7f7f7] transition-all duration-500 ${hasChanged ? 'animate-pulse-once' : ''}`}
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
        
        {/* Poll Stats */}
        <div className="flex justify-between items-center p-4">
          <div className="text-gray-600">
            Time remaining: <span className="font-semibold">{timeRemaining}</span> seconds
          </div>
          <div className="text-gray-600">
            <span className="font-semibold">{currentPoll.options.reduce((sum: number, option: PollOption) => sum + option.votes, 0)}</span> responses
          </div>
        </div>
      </div>

      {/* End Poll Button (only shown if poll is active and time remaining > 0) */}
      {currentPoll.isActive && timeRemaining > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleEndPoll}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
          >
            End Poll
          </button>
        </div>
      )}
      
      {/* Poll ended message and Ask a new question button */}
      {(!currentPoll.isActive || timeRemaining === 0) && (
        <>
          <div className="flex justify-end">
            <button
              onClick={handleCreateNewPoll}
              className="bg-[#7765DA] text-white px-6 py-3 rounded-full hover:bg-primary-dark transition text-sm font-medium"
            >
              + Ask a new question
            </button>
          </div>

          <div className="text-center mb-4 mt-8">
            <p className="text-lg font-medium text-primary">Poll has ended</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivePoll;
