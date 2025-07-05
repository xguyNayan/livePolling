import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setStudentName } from '../store/slices/pollsSlice';
import { saveStudentName, getStudentName } from '../utils/sessionUtils';
import socketService from '../services/socketService';
import type { Student } from '../services/socketService';
import { BsStars } from "react-icons/bs";
import ChatParticipantsButton from '../components/ChatParticipantsButton';

const StudentName = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [connectedStudents, setConnectedStudents] = useState<Student[]>([]);

  useEffect(() => {
    // Check if name already exists in session storage
    const storedName = getStudentName();
    if (storedName) {
      setName(storedName);
      setIsValid(true);
    }
    
    // Set up listener for students update
    const handleStudentsUpdate = (students: Student[]) => {
      setConnectedStudents(students);
    };
    
    socketService.onStudentsUpdate(handleStudentsUpdate);
    
    // Clean up socket listeners when component unmounts
    return () => {
      socketService.offStudentsUpdate(handleStudentsUpdate);
    };
  }, []);

  useEffect(() => {
    setIsValid(name.trim().length > 0);
  }, [name]);

  const handleContinue = () => {
    if (isValid) {
      dispatch(setStudentName(name));
      saveStudentName(name);
      socketService.initialize();
      socketService.joinStudent(name);
      navigate('/student/poll');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleContinue();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-screen flex items-center justify-center">
      <div className="flex flex-col items-center py-4 sm:py-6 md:py-8 max-w-xl w-full">
        {/* Header with Intervue Poll Badge */}
        <div className="mb-8">
          <div className="bg-[#7765DA] rounded-full px-6 py-2.5 flex items-center gap-2">
            <BsStars className="text-white" />
            <span className="text-white font-medium">
              Intervue Poll
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-medium mb-4">Let's <span className="font-bold">Get Started</span></h1>
          <p className="text-[#6E6E6E] text-lg mx-auto max-w-full">
            If you're a student, you'll be able to <span className="font-bold">submit your answers</span>, participate in live
            polls, and see how your responses compare with your classmates
          </p>
        </div>

        {/* Name Input */}
        <div className="w-full max-w-md mb-8">
          <label htmlFor="studentName" className="block text-lg font-medium mb-3 text-center">
            Enter your Name
          </label>
          <input
            id="studentName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-4 rounded-lg bg-[#F2F2F2] border border-[#EEEEEE] focus:outline-none focus:ring-1 focus:ring-[#7765DA]"
            placeholder="Enter your name"
          />
        </div>
        
        {/* Continue Button */}
        <div className="flex justify-center w-full max-w-md mt-4">
          <button
            className={`w-full py-4 rounded-full bg-[#7765DA] text-white text-lg font-medium transition-opacity ${
              !isValid ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'
            }`}
            onClick={handleContinue}
            disabled={!isValid}
          >
            Continue
          </button>
        </div>
      </div>
      <ChatParticipantsButton 
          students={connectedStudents} 
          isTeacher={false} 
          userName={name}
        />
    </div>
  );
};

export default StudentName;
