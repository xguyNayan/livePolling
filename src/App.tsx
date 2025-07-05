import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';

// Pages
import Home from './pages/Home';
import StudentName from './pages/StudentName';
import StudentPoll from './pages/StudentPoll';
import Teacher from './pages/Teacher';
import PollHistory from './pages/PollHistory';
import ActivePoll from './pages/ActivePoll';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-white font-sora">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/student" element={<StudentName />} />
            <Route path="/student/poll" element={<StudentPoll />} />
            <Route path="/teacher" element={<Teacher />} />
            <Route path="/active-poll" element={<ActivePoll />} />
            <Route path="/poll-history" element={<PollHistory />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
