import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { selectOption, submitAnswer, fetchActivePoll, fetchActivePolls, submitAnswerAsync, fetchPolls } from '../store/slices/pollsSlice';
import type { AppDispatch } from '../store';
import socketService from '../services/socketService';
import type { Student } from '../services/socketService';
import Modal from '../components/Modal';
import { BsStars } from "react-icons/bs";
// Firebase service is used indirectly through the async thunks
import { getStudentName } from '../utils/sessionUtils';
import { calculatePercentage } from '../utils/sessionUtils';
import { BsStopwatch } from "react-icons/bs";
import { BiErrorCircle } from "react-icons/bi";
import ChatParticipantsButton from '../components/ChatParticipantsButton';
import type { Poll } from '../store/slices/pollsSlice';

const StudentPoll = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentPoll, selectedOption, showResults, studentName, polls, loading } = useSelector(
    (state: RootState) => state.polls
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(currentPoll?.timer || 30);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [answeredPolls, setAnsweredPolls] = useState<string[]>([]);
  const [activePolls, setActivePolls] = useState<Poll[]>([]);
  const [connectedStudents, setConnectedStudents] = useState<Student[]>([]);
  const [showKickedModal, setShowKickedModal] = useState(false);
  const [kickedMessage, setKickedMessage] = useState('');
  
  // Handle kicked modal close
  const handleKickedModalClose = () => {
    setShowKickedModal(false);
    // Navigate to home page with a message after modal is closed
    navigate('/', { state: { kicked: true, message: 'You have been removed from the session by the teacher.' } });
  };

  useEffect(() => {
    // Check if student name exists
    const name = getStudentName();
    if (!name) {
      navigate('/student');
    } else {
      // Initialize socket connection if not already
      socketService.initialize();
      socketService.joinStudent(name);
      
      // Fetch active polls and all polls from Firebase
      dispatch(fetchActivePoll()); // For backward compatibility
      dispatch(fetchActivePolls()); // Get all active polls
      dispatch(fetchPolls());
      
      // Set up socket listener for new polls
      const handlePollCreated = () => {
        
        // Reset any previous submission state
        setHasSubmitted(false);
        setSubmissionError(null);
        // Fetch the latest active polls
        dispatch(fetchActivePoll()); // For backward compatibility
        dispatch(fetchActivePolls()); // Get all active polls
        // Also update all polls to get the new one
        dispatch(fetchPolls());
      };
      
      // Set up listener for being kicked out
      const handleKicked = () => {
        
        setKickedMessage('You have been removed from the session by the teacher.');
        setShowKickedModal(true);
      };
      
      // Set up socket listener for poll ended events
      const handlePollEnded = () => {
        
        // Fetch the latest polls
        dispatch(fetchActivePoll()); // For backward compatibility
        dispatch(fetchActivePolls()); // Get all active polls
        dispatch(fetchPolls());
      };
      
      // Set up listener for students update
      const handleStudentsUpdate = (students: Student[]) => {
        setConnectedStudents(students);
      };
      
      // Register for events
      socketService.onPollCreated(handlePollCreated);
      socketService.onPollEnded(handlePollEnded);
      socketService.onStudentKicked(handleKicked);
      socketService.onStudentsUpdate(handleStudentsUpdate);
      
      // Clean up socket listeners when component unmounts
      return () => {
        socketService.offPollCreated(handlePollCreated);
        socketService.offPollEnded(handlePollEnded);
        socketService.offStudentKicked(handleKicked);
        socketService.offStudentsUpdate(handleStudentsUpdate);
      };
    }
  }, [dispatch, navigate]);

  // Countdown timer effect - synchronized with server time
  useEffect(() => {
    if (!currentPoll || showResults) return;
    
    // Calculate remaining time based on poll creation time and timer duration
    const pollCreatedAt = new Date(currentPoll.createdAt).getTime();
    const currentTime = new Date().getTime();
    const elapsedSeconds = Math.floor((currentTime - pollCreatedAt) / 1000);
    const remainingSeconds = Math.max(0, currentPoll.timer - elapsedSeconds);
    
    // Initialize timer with the calculated remaining time
    setTimeRemaining(remainingSeconds);
    
    // Only start the countdown if there's time remaining
    if (remainingSeconds > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [currentPoll, showResults]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (optionId: string) => {
    if (!hasSubmitted && currentPoll) {
      dispatch(selectOption(optionId));
    }
  };

  const handleSubmit = async () => {
    if (currentPoll && selectedOption) {
      setSubmissionError(null);
      try {
        // Submit answer to Redux and Firebase
        await dispatch(submitAnswerAsync({ pollId: currentPoll.id, optionId: selectedOption })).unwrap();
        setHasSubmitted(true);
        socketService.submitAnswer(currentPoll.id, selectedOption);
      } catch (error) {
        setSubmissionError((error as Error).message || 'Failed to submit answer');
        console.error('Error submitting answer:', error);
      }
    }
  };

  // Update activePolls when polls or currentPoll changes
  useEffect(() => {
    if (polls.length > 0) {
      // Get all completed polls (previous polls)
      const previousPolls = [...polls]
        .filter(poll => !poll.isActive && poll.id !== currentPoll?.id) // Only include inactive polls that aren't the current one
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5); // Show last 5 previous polls
      setActivePolls(previousPolls);
    }
  }, [polls, currentPoll]);
  
  // Auto-submit when timer ends if not already submitted
  useEffect(() => {
    if (timeRemaining === 0 && currentPoll && !hasSubmitted) {
      if (selectedOption) {
        handleSubmit();
      } else {
        // If no option selected, just show results
        dispatch(submitAnswer());
        setHasSubmitted(true);
        // Add to answered polls list
        setAnsweredPolls(prev => [...prev, currentPoll.id]);
      }
    }
  }, [timeRemaining, currentPoll, hasSubmitted, selectedOption]);
  
  // Load answered polls from localStorage on component mount
  useEffect(() => {
    const savedAnsweredPolls = localStorage.getItem('answeredPolls');
    if (savedAnsweredPolls) {
      try {
        const parsedPolls = JSON.parse(savedAnsweredPolls);
        if (Array.isArray(parsedPolls)) {
          setAnsweredPolls(parsedPolls);
        }
      } catch (error) {
        console.error('Error parsing answered polls from localStorage:', error);
      }
    }
  }, []);
  
  // Update answeredPolls when submitting an answer and save to localStorage
  useEffect(() => {
    if (currentPoll && hasSubmitted && !answeredPolls.includes(currentPoll.id)) {
      const updatedPolls = [...answeredPolls, currentPoll.id];
      setAnsweredPolls(updatedPolls);
      localStorage.setItem('answeredPolls', JSON.stringify(updatedPolls));
    }
  }, [currentPoll, hasSubmitted, answeredPolls]);
  
  // Calculate total votes
  const totalVotes = currentPoll?.options.reduce((sum, option) => sum + option.votes, 0) || 0;

  if (!currentPoll) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="bg-[#7765DA] rounded-full px-6 py-2.5 flex items-center gap-2 mb-6 mx-auto w-fit">
            <BsStopwatch className="text-white" />
            <span className="text-white font-medium">
              Intervue Poll
            </span>
          </div>
          <h2 className="text-2xl font-semibold mb-4">Waiting for teacher to start a poll...</h2>
          <p className="text-[#6E6E6E]">You're logged in as <span className="font-semibold">{studentName}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Current Active Poll */}
        {currentPoll && (
          <div className="mb-10">
            {/* Question and Timer Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Active Question</h2>
              <div className="flex items-center gap-1">
                <BsStopwatch className="text-red-500" />
                <span className="text-red-500 font-bold">{formatTime(timeRemaining)}</span>
              </div>
            </div>
            
            {/* Question Card */}
            <div className="w-full mb-8 border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-700 text-white p-5">
                <h2 className="text-xl">{currentPoll.question}</h2>
              </div>

              {/* Options */}
              <div className="p-6 space-y-4">
                {currentPoll.options.map((option) => {
                  const percentage = calculatePercentage(option.votes, totalVotes);
                  // Check if this option is the correct answer and if we should show it (poll has ended)
                  const isCorrectAnswer = showResults && timeRemaining === 0 && currentPoll.correctOptionId && currentPoll.correctOptionId === option.id;
                  return (
                    <div key={option.id} className="relative overflow-hidden rounded-lg">
                      <div 
                        className={`flex items-center p-4 rounded-lg cursor-pointer border-2 transition-all ${
                          selectedOption === option.id && !showResults 
                            ? 'border-[#7765DA]' 
                            : isCorrectAnswer 
                              ? 'border-green-500' 
                              : 'border-gray-200'
                        } ${showResults ? 'z-10 bg-transparent' : ''}`}
                        onClick={() => handleOptionSelect(option.id)}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 ${
                          isCorrectAnswer 
                            ? 'bg-green-500' 
                            : selectedOption === option.id || (showResults && percentage > 0) 
                              ? 'bg-[#7765DA]' 
                              : 'bg-gray-200'
                        } text-white`}>
                          {option.id}
                        </div>
                        <span className={`font-medium ${isCorrectAnswer ? 'text-green-600' : ''}`}>
                          {option.text}
                          {isCorrectAnswer && <span className="ml-2 text-green-600">(Correct Answer)</span>}
                        </span>
                        
                        {showResults && (
                          <div className="ml-auto font-medium">
                            {percentage}%
                          </div>
                        )}
                      </div>
                      
                      {/* Progress bar for results */}
                      {showResults && (
                        <div 
                          className="absolute left-0 top-0 h-full bg-[#7765DA] opacity-20" 
                          style={{ width: `${percentage}%` }} 
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Submit Button for current poll */}
            {!showResults ? (
              <div className="flex justify-end mb-8">
                <button
                  className={`px-10 py-3 rounded-lg bg-[#7765DA] text-white font-medium transition-opacity ${
                    !selectedOption || hasSubmitted || loading ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                  onClick={handleSubmit}
                  disabled={!selectedOption || hasSubmitted || loading}
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            ) : null}
          </div>
        )}
        
        {/* Previous Polls Section */}
        {activePolls.length > 0 && (
          <div className="w-full">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">Previous Questions</h3>
            
            {activePolls
              .map(poll => {
                const pollTotalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
                const isAnswered = answeredPolls.includes(poll.id);
                
                return (
                  <div key={poll.id} className="w-full mb-8 border border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-gray-600 text-white p-4">
                      <h2 className="text-lg">{poll.question}</h2>
                      <div className="text-sm text-gray-300 mt-1">
                        {new Date(poll.createdAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {poll.options.map((option) => {
                        const percentage = calculatePercentage(option.votes, pollTotalVotes);
                        const isCorrectAnswer = poll.correctOptionId === option.id;
                        return (
                          <div key={option.id} className="relative overflow-hidden rounded-lg">
                            <div className={`flex items-center p-3 rounded-lg border ${isCorrectAnswer ? 'border-green-500' : 'border-gray-200'} z-10 bg-transparent`}>
                              <div className={`flex items-center justify-center w-6 h-6 rounded-full mr-2 ${isCorrectAnswer ? 'bg-green-500' : 'bg-gray-400'} text-white text-sm`}>
                                {option.id}
                              </div>
                              <span className={`font-medium text-sm ${isCorrectAnswer ? 'text-green-600' : ''}`}>
                                {option.text}
                                {isCorrectAnswer && <span className="ml-2 text-green-600 text-xs">(Correct)</span>}
                              </span>
                              <div className="ml-auto font-medium text-sm">{percentage}%</div>
                            </div>
                            
                            <div 
                              className={`absolute left-0 top-0 h-full ${isCorrectAnswer ? 'bg-green-100' : 'bg-gray-200'}`} 
                              style={{ width: `${percentage}%`, zIndex: -1 }} 
                            />
                          </div>
                        );
                      })}
                    </div>
                    
                    {isAnswered && (
                      <div className="p-2 bg-green-50 border-t border-green-100 text-center text-sm text-green-600">
                        You answered this question
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        )}
      
        {/* Error Message */}
        {submissionError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
            <BiErrorCircle className="mr-2 text-xl" />
            <span>{submissionError}</span>
          </div>
        )}
        
        {/* Wait Message when no polls */}
        {!currentPoll && (
          <div className="mt-12 text-center bg-white rounded-xl border border-[#D9D9D9] p-8 shadow-sm">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-[#7765DA] bg-opacity-10 rounded-full flex items-center justify-center mb-4">
                <BsStopwatch className="text-[#7765DA] text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Active Polls</h3>
              <p className="text-gray-600">Waiting for the teacher to start a new poll...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Chat/Participants Button */}
      <ChatParticipantsButton 
        students={connectedStudents}
        isTeacher={false}
        userName={studentName || ''}
      />
      
      {/* Kicked Modal */}
      <Modal
        isOpen={showKickedModal}
        onClose={handleKickedModalClose}
        title=""
        showCloseButton={false}
        actions={null}
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col items-center py-12 px-6">
          {/* App Name Badge */}
          <div className="bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] rounded-full px-4 py-1.5 flex items-center gap-2 mb-8">
            <BsStars className="text-white" />
            <span className="text-white font-medium text-sm">
              Intervue Poll
            </span>
          </div>
          
          {/* Content Container */}
          <div className="w-full max-w-3xl text-center">
            {/* Heading */}
            <h2 className="text-4xl font-bold mb-4 text-black">You've been Kicked out !</h2>
            
            {/* Message */}
            <p className="text-black text-opacity-50 text-lg max-w-2xl mx-auto">
              Looks like the teacher had removed you from the poll system. Please Try again sometime.
            </p>
            
            {/* Okay Button */}
            <button
              onClick={() => {
                handleKickedModalClose();
                navigate('/');
              }}
              className="mt-10 px-10 py-2.5 text-sm font-medium text-white bg-[#7565D9] rounded-md hover:bg-[#6754C8] transition-colors"
            >
              Okay
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentPoll;
