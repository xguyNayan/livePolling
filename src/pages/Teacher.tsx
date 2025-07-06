import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch } from '../store';
import { createPollAsync, fetchPolls, fetchActivePoll } from '../store/slices/pollsSlice';
import socketService from '../services/socketService';
import { generateId } from '../utils/sessionUtils';
import { BsEye } from "react-icons/bs";
import ChatParticipantsButton from '../components/ChatParticipantsButton';
const Teacher = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([
    { id: '1', text: '', isCorrect: false },
    { id: '2', text: '', isCorrect: false }
  ]);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [connectedStudents, setConnectedStudents] = useState<Array<{id: string, name: string}>>([]);
  const userName = 'Teacher'; // Fixed value for teacher
  
  // Fetch polls for history but don't auto-redirect
  useEffect(() => {
    // Fetch all polls for history
    dispatch(fetchPolls());
    
    // fetch active poll to have it in state, but don't redirect
    dispatch(fetchActivePoll())
      .catch((error) => {
        console.error('Error fetching active poll:', error);
      });
  }, [dispatch]);

  useEffect(() => {
    socketService.initialize();
    socketService.joinTeacher();
    
    // Listen for connected students updates
    const handleStudentsUpdate = (students: Array<{id: string, name: string}>) => {
      setConnectedStudents(students);
    };
    
    socketService.onStudentsUpdate(handleStudentsUpdate);
    
    return () => {
      socketService.offStudentsUpdate(handleStudentsUpdate);
    };
  }, []);

  const handleAddOption = () => {
    if (options.length < 4) {
      setOptions([...options, { id: (options.length + 1).toString(), text: '', isCorrect: false }]);
    }
  };

  const handleOptionChange = (id: string, value: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, text: value } : option
    ));
  };

  const handleCorrectOptionChange = (id: string | null) => {
    setOptions(options.map(option => 
      ({ ...option, isCorrect: option.id === id })
    ));
  };

  const handleCreatePoll = async () => {
    if (question.trim() && options.every(option => option.text.trim())) {
      setLoading(true);
      const newPoll = {
        id: generateId(),
        question,
        options: options.map(option => ({ ...option, votes: 0 })),
        timer,
        isActive: true,
        createdAt: new Date().toISOString(),
        correctOptionId: options.find(opt => opt.isCorrect)?.id || null
      };
      
      try {
        // Create poll in Firestore and emit socket event
        await dispatch(createPollAsync(newPoll));
        socketService.createPoll(newPoll);
        
        // Reset form
        setQuestion('');
        setOptions([
          { id: '1', text: '', isCorrect: false },
          { id: '2', text: '', isCorrect: false }
        ]);
        setTimer(30);
        
        // Redirect to active poll page
        navigate('/active-poll');
      } catch (error) {
        console.error('Error creating poll:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewPollHistory = () => {
    navigate('/poll-history');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
      <div className="flex flex-col py-4 sm:py-6 md:py-8 max-w-3xl mx-0 sm:mx-auto">
        {/* Header with Intervue Poll Badge and View History Button */}
        <div className="flex justify-between items-center w-full mb-6">
          <div className="flex items-center">
            <div className="bg-[#7765DA] text-white px-3 py-1 rounded-md flex items-center">
              <span className="font-medium">Intervue Poll</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleViewPollHistory}
              className="flex items-center text-[#7765DA] hover:underline"
            >
              <BsEye className="mr-1" />
              <span>View Poll history</span>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2"><span className="font-sora font-medium">Let's Get</span> Started</h1>
          <p className="text-[#6E6E6E]">
            You'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.
          </p>
        </div>

        <div className="flex flex-col space-y-6">
          <div className="md:col-span-2">
            {/* Create Poll Form */}
            <div className="mb-6">
              <div className="flex flex-row justify-between items-center mb-3">
                <label htmlFor="question" className="block text-sm sm:text-base font-medium">
                  Enter your question
                </label>
                <div className="relative">
                  <select
                    value={timer}
                    onChange={(e) => setTimer(Number(e.target.value))}
                    className="appearance-none bg-white pl-3 pr-8 sm:pl-4 sm:pr-10 py-1 sm:py-2 text-sm sm:text-base rounded-lg border border-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#7765DA]"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={90}>90 seconds</option>
                    <option value={120}>120 seconds</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="relative">
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full p-3 sm:p-4 rounded-lg bg-[#F2F2F2] border border-[#D9D9D9] focus:outline-none focus:ring-2 focus:ring-[#7765DA] h-20 sm:h-24"
                  placeholder="Type your question here"
                  maxLength={100}
                />
                <div className="absolute bottom-2 right-3 text-xs text-[#6E6E6E]">
                  {question.length}/100
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="mb-6">
              {/* Headers in the same row */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium">Edit Options</h3>
                <h3 className="text-md font-medium mr-8">Is it Correct?</h3>
              </div>
              
              <div className="space-y-4">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center mb-4">
                    {/* Option with number circle and input field */}
                    <div className="flex-grow mr-6">
                      <div className="flex items-center bg-[#F2F2F2] rounded-md p-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#7765DA] text-white mr-3">
                          <span className="text-sm">{index + 1}</span>
                        </div>
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(option.id, e.target.value)}
                          className="flex-grow bg-transparent border-none focus:outline-none"
                          placeholder={`Option ${index + 1}`}
                        />
                      </div>
                    </div>
                    
                    {/* Yes/No radio buttons */}
                    <div className="flex items-center space-x-8">
                      {/* Yes radio button */}
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id={`correct-yes-${option.id}`}
                          name="correct-option"
                          checked={option.isCorrect}
                          onChange={() => handleCorrectOptionChange(option.id)}
                          className="hidden"
                        />
                        <label 
                          htmlFor={`correct-yes-${option.id}`}
                          className={`flex items-center justify-center w-6 h-6 rounded-full border ${option.isCorrect ? 'bg-[#7765DA] border-[#7765DA]' : 'bg-gray-300 border-gray-300'} cursor-pointer mr-2`}
                        >
                          {option.isCorrect && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </label>
                        <span className="text-base">Yes</span>
                      </div>
                      
                      {/* No radio button */}
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id={`correct-no-${option.id}`}
                          name="correct-option"
                          checked={!option.isCorrect}
                          onChange={() => handleCorrectOptionChange(null)}
                          className="hidden"
                        />
                        <label 
                          htmlFor={`correct-no-${option.id}`}
                          className={`flex items-center justify-center w-6 h-6 rounded-full border ${!option.isCorrect ? 'bg-[#7765DA] border-[#7765DA]' : 'bg-gray-300 border-gray-300'} cursor-pointer mr-2`}
                        >
                          {!option.isCorrect && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </label>
                        <span className="text-base">No</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Option Button */}
            {options.length < 4 && (
              <button
                onClick={handleAddOption}
                className="flex items-center text-[#7765DA] hover:text-[#4F0DCE] mt-3 sm:mt-2 border border-[#7765DA] rounded-full px-4 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm w-fit"
              >
                <span className="text-base sm:text-lg mr-1">+</span>
                Add More option
              </button>
            )}

            {/* Horizontal line */}
            <hr className="mt-5 mb-5 sm:my-6 border-t border-[#D9D9D9]" />
            
            {/* Ask Question Button */}
            <div className="flex justify-end">
              <button
                onClick={handleCreatePoll}
                disabled={!question.trim() || !options.every(option => option.text.trim())}
                className={`px-5 sm:px-8 h-9 sm:h-12 text-sm sm:text-base rounded-full bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] text-white font-semibold ${!question.trim() || !options.every(option => option.text.trim()) ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
              >
                {loading ? 'Creating...' : 'Ask Question'}
              </button>
            </div>
          </div>
        </div>
        <ChatParticipantsButton 
          students={connectedStudents} 
          isTeacher={true} 
          userName={userName}
        />
      </div>
    </div>
  );
};

export default Teacher;
