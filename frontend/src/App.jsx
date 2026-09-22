import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { useAppTimer } from './hooks/useAppTimer';

import Loader from './components/Loader';

const AdminApp = () => {
  const { admin } = useAdmin();
  return admin ? <AdminDashboard /> : <AdminLogin />;
};

const App = () => {
  const { user } = useAuth();
  const [authView, setAuthView] = useState('landing'); // 'landing', 'login', 'register'
  const [isEnteringOrbit, setIsEnteringOrbit] = useState(false);
  const prevUserRef = useRef(null);

  // Run the app timer for normal users
  useAppTimer();

  // Show splash screen ONLY on explicit login (transition from null to user object)
  useEffect(() => {
    const wasLoggedOut = !prevUserRef.current;
    const isNowLoggedIn = !!user;

    // Only trigger if we went from no user to having a user
    if (wasLoggedOut && isNowLoggedIn) {
      // Don't show splash on the very first render if we loaded from localStorage
      if (prevUserRef.current !== null || authView === 'login' || authView === 'register') {
         setIsEnteringOrbit(true);
         const timer = setTimeout(() => {
           setIsEnteringOrbit(false);
         }, 1500);
         prevUserRef.current = user;
         return () => clearTimeout(timer);
      }
    }
    
    prevUserRef.current = user;
  }, [user, authView]);

  // Simple routing for admin
  if (window.location.pathname.startsWith('/admin')) {
    return (
      <AdminProvider>
        <AdminApp />
      </AdminProvider>
    );
  }

  if (!user) {
    if (authView === 'login') {
      return <Login onSwitchToRegister={() => setAuthView('register')} onBackToLanding={() => setAuthView('landing')} />;
    }
    if (authView === 'register') {
      return <Register onSwitchToLogin={() => setAuthView('login')} onBackToLanding={() => setAuthView('landing')} />;
    }
    return <LandingPage onNavigate={(view) => setAuthView(view)} />;
  }

  if (isEnteringOrbit) {
    return <Loader fullScreen={true} size="large" text="Entering Orbit..." variant="orbit" />;
  }

  return (
    <SocketProvider>
      <ChatProvider>
        <Chat />
      </ChatProvider>
    </SocketProvider>
  );
};

export default App;
