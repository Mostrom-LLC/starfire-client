
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Toaster } from './components/ui/sonner';
import Dashboard from './pages/dashboard';
import ChatComponent from './components/ChatComponent';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<ChatComponent />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
