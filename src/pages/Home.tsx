import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BsStars } from "react-icons/bs";
import Modal from '../components/Modal';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | null>(null);
  const [kickedMessage, setKickedMessage] = useState<string | null>(null);
  const [showKickedModal, setShowKickedModal] = useState(false);

  const handleRoleSelect = (role: 'student' | 'teacher') => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
     
      localStorage.setItem('userRole', selectedRole);
      navigate(selectedRole === 'teacher' ? '/teacher' : '/student');
    }
  };
  
  // Check for kicked state from location
  useEffect(() => {
    if (location.state && location.state.kicked) {
      setKickedMessage(location.state.message || 'You have been removed from the session.');
      setShowKickedModal(true);
      
      // Clear the location state after displaying the message
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  const closeKickedModal = () => {
    setShowKickedModal(false);
    setKickedMessage(null);
  };

  return (
    <div className="max-w-7xl mx-auto min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="flex flex-col items-center w-full max-w-md md:max-w-2xl mx-auto">
        {/* Kicked message modal */}
        <Modal
          isOpen={showKickedModal}
          onClose={closeKickedModal}
          title="Session Ended"
          actions={
            <button
              onClick={closeKickedModal}
              className="px-4 py-2 text-sm font-medium text-white bg-[#7765DA] border border-transparent rounded-md shadow-sm hover:bg-[#6754C8]"
            >
              Okay
            </button>
          }
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-700">{kickedMessage}</p>
          </div>
        </Modal>
        {/* Intervue Poll Badge */}
        <div className="bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] rounded-full px-4 py-1.5 flex items-center gap-2 mb-8">
          <BsStars className="text-white" />
          <span className="text-white font-medium text-sm">
            Intervue Poll
          </span>
        </div>

        {/* Heading */}
        <div className="text-center mb-8 sm:mb-10 px-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4">
            <span className="font-sora font-medium">Welcome to the </span>
            <span className="font-bold">Live Polling System</span>
          </h1>
          <p className="text-gray-dark text-sm sm:text-base">
            Please select the role that best describes you to begin using the live polling system
          </p>
        </div>

        {/* Role Selection */}
        <div className="w-full flex flex-col md:flex-row justify-center items-stretch gap-4 sm:gap-6 mb-6 sm:mb-10">
          {/* Student Role */}
          <div 
            className={`w-full h-auto min-h-[120px] sm:min-h-[144px] p-4 sm:p-6 rounded-lg cursor-pointer transition-all ${
              selectedRole === 'student' 
                ? 'border-3 border-[#7765DA]' 
                : 'border border-gray-placeholder'
            }`}
            onClick={() => handleRoleSelect('student')}
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">I'm a Student</h2>
            <p className="text-gray-dark text-sm sm:text-base m-0">
              Submit answers and view live poll results in real-time.
            </p>
          </div>
          
          {/* Teacher Role */}
          <div 
            className={`w-full h-auto min-h-[120px] sm:min-h-[144px] p-4 sm:p-6 rounded-lg cursor-pointer transition-all ${
              selectedRole === 'teacher' 
                ? 'border-3 border-[#7765DA]' 
                : 'border border-gray-placeholder'
            }`}
            onClick={() => handleRoleSelect('teacher')}
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">I'm a Teacher</h2>
            <p className="text-gray-dark text-sm sm:text-base m-0">
              Create polls and monitor student responses in real-time.
            </p>
          </div>
        </div>
        
        {/* Continue Button */}
        <div className="w-full flex justify-center mt-2 sm:mt-4">
          <button
            className={`w-full max-w-[240px] h-12 sm:h-14 rounded-full bg-gradient-to-r from-[#7765DA] to-[#4F0DCE] text-white font-semibold text-base sm:text-lg transition-opacity ${
            !selectedRole ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'
          }`}
          onClick={handleContinue}
          disabled={!selectedRole}
        >
          Continue
        </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
