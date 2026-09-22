import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useChat } from '../context/ChatContext';

const Chat = () => {
  const { selectedChat } = useChat();

  return (
    <div className="app-container">
      <Navbar />
      <div className={`chat-layout ${selectedChat ? 'chat-active' : ''}`}>
          <Sidebar />
          <ChatWindow />
      </div>
    </div>
  );
};

export default Chat;
