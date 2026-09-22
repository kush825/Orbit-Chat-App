import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { getConversations, addToGroup, removeFromGroup, muteConversations, deleteConversations, pinConversations, togglePinMessage } from '../services/conversationService';
import { fetchMessages, sendMessageApi, editMessageApi, deleteMessageApi, reactToMessageApi, clearChatApi } from '../services/messageService';
import { playNotificationSound } from '../utils/sound';
import { useToast } from './ToastContext';
import { useConfirm } from './ConfirmContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const confirm = useConfirm();

  const [conversations, setConversations] = useState([]);
  const [selectedChat, _setSelectedChat] = useState(null);

  // Wrap setSelectedChat to integrate with HTML5 History API for swipe-to-back gestures
  const setSelectedChat = useCallback((chat) => {
    if (chat && !selectedChat) {
      window.history.pushState({ chatOpen: true }, '');
    } else if (!chat && selectedChat) {
      if (window.history.state && window.history.state.chatOpen) {
        window.history.back(); 
        return; 
      }
    }
    _setSelectedChat(chat);
  }, [selectedChat]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (!event.state || !event.state.chatOpen) {
        _setSelectedChat(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // chatRoom -> username
  const [replyTo, setReplyTo] = useState(null);
  const [messageToForward, setMessageToForward] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Unread badge counts per conversation ID: { [conversationId]: number }
  const [unreadCounts, setUnreadCounts] = useState({});
  // Floating Toast notification state
  const [notificationToast, setNotificationToast] = useState(null);

  // Helper to extract string ID from string or object
  const getConvId = (conv) => {
    if (!conv) return null;
    if (typeof conv === 'string') return conv;
    if (typeof conv === 'object') return conv._id || conv.id || null;
    return null;
  };

  // Request browser desktop notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Update document title with total unread messages count
  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + (c || 0), 0);
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Orbit - Real-Time`;
    } else {
      document.title = 'Orbit - Real-Time';
    }
  }, [unreadCounts]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getConversations();
      setConversations(data);

      // Join all chat rooms in the background so we receive typing events globally
      if (socket) {
        data.forEach(c => {
          socket.emit('join_chat', c._id);
        });
      }

      // Compute initial unread counts from loaded conversations
      const initialUnreads = {};
      data.forEach((c) => {
        if (c.lastMessage && c.lastMessage.sender) {
          const senderId = typeof c.lastMessage.sender === 'object' ? c.lastMessage.sender._id : c.lastMessage.sender;
          const isRead = c.lastMessage.readBy && c.lastMessage.readBy.some((r) => {
            const rId = typeof r.user === 'object' ? r.user._id : r.user;
            return String(rId) === String(user._id);
          });
          if (String(senderId) !== String(user._id) && !isRead) {
            initialUnreads[c._id] = 1;
          }
        }
      });
      setUnreadCounts((prev) => ({ ...initialUnreads, ...prev }));

      // Restore selected chat from localStorage
      const lastSelectedChatId = localStorage.getItem('lastSelectedChatId');
      if (lastSelectedChatId) {
        setSelectedChat((prev) => {
          if (prev) return prev; // Do not override if user already selected a chat
          return data.find(c => String(c._id) === lastSelectedChatId) || null;
        });
      }
      
      setConversationsLoaded(true);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('chat_user');
        window.location.reload();
      }
    } finally {
      setConversationsLoaded(true);
    }
  }, [user, socket]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Persist selected chat ID
  useEffect(() => {
    if (!conversationsLoaded) return;
    
    if (selectedChat) {
      const id = getConvId(selectedChat);
      if (id) localStorage.setItem('lastSelectedChatId', id);
    } else {
      localStorage.removeItem('lastSelectedChatId');
    }
  }, [selectedChat, conversationsLoaded]);

  // Load messages when selectedChat changes
  useEffect(() => {
    if (!selectedChat) return;

    const chatRoomId = getConvId(selectedChat);
    if (!chatRoomId) return;

    // Clear unread count for this selected chat
    setUnreadCounts((prev) => {
      const updated = { ...prev };
      delete updated[chatRoomId];
      return updated;
    });

    const loadChatMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await fetchMessages(chatRoomId);
        setMessages(data);

        if (socket) {
          socket.emit('join_chat', chatRoomId);

          // Mark unread messages as read
          const unreadIds = data
            .filter((m) => {
              const senderId = typeof m.sender === 'object' ? m.sender._id : m.sender;
              return String(senderId) !== String(user._id) && !m.readBy.some((r) => {
                const rId = typeof r.user === 'object' ? r.user._id : r.user;
                return String(rId) === String(user._id);
              });
            })
            .map((m) => m._id);

          // Only send read receipts if privacy setting allows it
          if (unreadIds.length > 0 && user?.settings?.privacy?.readReceipts !== false) {
            socket.emit('mark_as_read', {
              conversationId: chatRoomId,
              userId: user._id,
              messageIds: unreadIds,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadChatMessages();
    setReplyTo(null);

    return () => {
      if (socket && chatRoomId) {
        socket.emit('leave_chat', chatRoomId);
      }
    };
  }, [selectedChat?._id, socket, user?._id]);

  // Socket event listeners for real-time messages & notifications
  useEffect(() => {
    if (!socket) return;

    // Helper to play a modern, pleasant 'double chime' web audio API sound
    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const playTone = (freq, startTime, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          // Use a mix of sine and triangle for a more 'bell' like tone
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        // Play double chime: ding-ding
        playTone(659.25, ctx.currentTime, 0.4); // E5
        playTone(830.61, ctx.currentTime + 0.15, 0.5); // G#5

      } catch (err) {
        console.log('Audio playback failed', err);
      }
    };

    const handleMessageReceived = (newMessage) => {
      const targetConvId = getConvId(newMessage.conversationId);
      const activeConvId = getConvId(selectedChat);

      const senderName = newMessage.sender?.name || 'Friend';
      const senderAvatar = newMessage.sender?.profileImage;
      const textPreview = newMessage.text || (newMessage.file ? '📎 Attachment' : 'New Message');
      
      const targetConv = conversations.find(c => String(c._id) === String(targetConvId));
      const isGroupMessage = targetConv ? targetConv.isGroupChat : false;
      const isSentByMe = String(newMessage.sender?._id || newMessage.sender) === String(user?._id);

      // Notification Logic
      if (!isSentByMe) {
        const notifs = user?.settings?.notifications || {};
        let shouldNotify = isGroupMessage ? notifs.groups !== false : notifs.messages !== false;
        
        if (targetConv && targetConv.mutedBy) {
          const muteRecord = targetConv.mutedBy.find(m => {
            const mUser = typeof m.user === 'object' ? m.user._id : m.user;
            return String(mUser) === String(user?._id);
          });
          if (muteRecord) {
            const until = new Date(muteRecord.until);
            if (until > new Date()) {
              shouldNotify = false;
            }
          }
        }
        
        if (shouldNotify) {
          if (notifs.sound !== false) {
             playNotificationSound();
          }
          
          if ((activeConvId !== targetConvId || document.hidden) && notifs.desktop !== false && 'Notification' in window) {
            if (Notification.permission === 'granted') {
               const notificationBody = notifs.preview !== false ? textPreview : 'New Message';
               const n = new Notification(`Message from ${senderName}`, {
                 body: notificationBody,
                 icon: senderAvatar ? `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${senderAvatar}` : '/vite.svg',
                 silent: true
               });
               n.onclick = () => {
                 window.focus();
                 if (targetConv) setSelectedChat(targetConv);
                 n.close();
               };
            }
          }
          
          if (activeConvId !== targetConvId) {
            setNotificationToast({
              id: Date.now(),
              senderName,
              senderAvatar,
              text: notifs.preview !== false ? textPreview : 'New Message',
              conversationId: targetConvId,
            });
          }
        }
      }

      if (activeConvId && activeConvId === targetConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });

        // Auto mark as read if currently open and privacy setting allows it
        if (user?.settings?.privacy?.readReceipts !== false) {
          socket.emit('mark_as_read', {
            conversationId: targetConvId,
            userId: user._id,
            messageIds: [newMessage._id],
          });
        }
      } else {
        // Increment unread count for non-active conversation
        setUnreadCounts((prev) => ({
          ...prev,
          [targetConvId]: (prev[targetConvId] || 0) + 1,
        }));
      }

      // Update conversations list preview and move to top
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === targetConvId);
        if (!exists) {
          loadConversations();
          return prev;
        }
        const updated = prev.map((c) =>
          c._id === targetConvId
            ? { ...c, lastMessage: newMessage, updatedAt: new Date().toISOString() }
            : c
        );
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    const handleTyping = ({ room, user: typingUser }) => {
      setTypingUsers((prev) => ({ ...prev, [room]: typingUser }));
    };

    const handleStopTyping = ({ room }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[room];
        return updated;
      });
    };

    const handleMessagesRead = ({ conversationId, userId }) => {
      const activeConvId = getConvId(selectedChat);
      if (activeConvId && activeConvId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            const senderId = typeof m.sender === 'object' ? m.sender._id : m.sender;
            if (String(senderId) === String(user._id) && !m.readBy.some((r) => (typeof r.user === 'object' ? r.user._id : r.user) === userId)) {
              return {
                ...m,
                readBy: [...m.readBy, { user: { _id: userId }, readAt: new Date() }],
              };
            }
            return m;
          })
        );
      }
    };

    const handleReactionUpdated = (updatedMsg) => {
      const activeConvId = getConvId(selectedChat);
      const targetConvId = getConvId(updatedMsg.conversationId);
      if (activeConvId && activeConvId === targetConvId) {
        setMessages((prev) =>
          prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
        );
      }
    };

    const handleConversationUpdated = (updatedConv) => {
      const targetConvId = getConvId(updatedConv);
      const activeConvId = getConvId(selectedChat);
      
      setConversations((prev) =>
        prev.map((c) => (c._id === targetConvId ? { ...c, ...updatedConv, lastMessage: c.lastMessage } : c))
      );
      
      if (activeConvId === targetConvId) {
        setSelectedChat(prev => ({ ...prev, ...updatedConv }));
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_reaction_updated', handleReactionUpdated);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_reaction_updated', handleReactionUpdated);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [socket, selectedChat, user, loadConversations, conversations]);

  // Auto dismiss toast after 4 seconds
  useEffect(() => {
    if (!notificationToast) return;
    const timer = setTimeout(() => {
      setNotificationToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [notificationToast]);

  const dismissToast = () => setNotificationToast(null);

  const selectChatById = (convId) => {
    const target = conversations.find((c) => c._id === convId);
    if (target) {
      setSelectedChat(target);
    }
  };

  const sendMessage = async (text, files) => {
    if (!selectedChat) return;

    const activeConvId = getConvId(selectedChat);
    const formData = new FormData();
    formData.append('conversationId', activeConvId);
    if (text) formData.append('text', text);
    
    if (files) {
      if (Array.isArray(files)) {
        files.forEach(f => formData.append('files', f));
      } else {
        formData.append('files', files); // Fallback for single file
      }
    }
    
    if (replyTo) {
      formData.append('replyTo', replyTo._id);
      if (replyTo.specificAttachmentUrl) {
        formData.append('replyToAttachmentUrl', replyTo.specificAttachmentUrl);
      }
    }

    try {
      const newMsg = await sendMessageApi(formData);
      setMessages((prev) => [...prev, newMsg]);
      setReplyTo(null);

      // Emit via socket
      if (socket) {
        socket.emit('send_message', newMsg);
      }

      // Update conversations list preview and move to top
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c._id === activeConvId
            ? { ...c, lastMessage: newMsg, updatedAt: new Date().toISOString() }
            : c
        );
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    } catch (err) {
      console.error('Send message failed:', err);
      toast.error(err.response?.data?.message || 'Failed to send message. File might be too large.');
    }
  };

  // Forward messages
  const forwardMessage = async (messagesArray, targetConvIds) => {
    if (!targetConvIds || targetConvIds.length === 0) return;
    if (!messagesArray || messagesArray.length === 0) return;
    
    try {
      for (const convId of targetConvIds) {
        for (const originalMessage of messagesArray) {
          const formData = new FormData();
          formData.append('conversationId', convId);
          formData.append('text', originalMessage.text || '');
          formData.append('isForwarded', 'true');
          
          if (originalMessage.file) {
            formData.append('existingFileUrl', originalMessage.file);
            formData.append('existingFileName', originalMessage.fileName || '');
            formData.append('existingFileType', originalMessage.fileType || '');
            formData.append('existingMessageType', originalMessage.messageType || 'text');
          }

          if (originalMessage.attachments && originalMessage.attachments.length > 0) {
            formData.append('existingAttachments', JSON.stringify(originalMessage.attachments));
          }

        const newMsg = await sendMessageApi(formData);
        
        // If we forwarded to the currently open chat, show it
        const activeConvId = getConvId(selectedChat);
        if (activeConvId === convId) {
          setMessages((prev) => [...prev, newMsg]);
        }

        // Emit via socket
        if (socket) {
          socket.emit('send_message', newMsg);
        }

        // Update conversation list preview
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c._id === convId
              ? { ...c, lastMessage: newMsg, updatedAt: new Date().toISOString() }
              : c
          );
          return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        });
        }
      }
      
      // Clear forward state
      setMessageToForward(null);
    } catch (err) {
      console.error('Forward message failed:', err);
    }
  };

  // Toggle Reaction
  const toggleReaction = async (messageId, emoji) => {
    try {
      const updated = await reactToMessageApi(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? updated : m))
      );
      if (socket && selectedChat) {
        socket.emit('send_reaction', { room: getConvId(selectedChat), message: updated });
      }
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  };

  // Delete message
  const deleteMessage = async (messageId, type = 'for_everyone') => {
    try {
      const updated = await deleteMessageApi(messageId, type);
      if (updated.deletedForMe) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      } else {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? updated : m))
        );
      }
      
      // Update the sidebar conversation preview dynamically
      setTimeout(() => loadConversations(), 100);
    } catch (err) {
      console.error('Delete message failed:', err);
    }
  };

  // Clear all messages in the conversation
  const clearChat = async () => {
    if (!selectedChat) return;
    const activeConvId = getConvId(selectedChat);
    if (!await confirm('Are you sure you want to clear all messages in this chat? This cannot be undone.')) return;

    try {
      await clearChatApi(activeConvId);
      setMessages([]);
      loadConversations();
    } catch (err) {
      toast.error('Failed to clear chat');
    }
  };

  const handleAddGroupMember = async (conversationId, userId) => {
    try {
      const updatedChat = await addToGroup(conversationId, userId);
      setSelectedChat(updatedChat);
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveGroupMember = async (conversationId, userId) => {
    try {
      const updatedChat = await removeFromGroup(conversationId, userId);
      if (userId === user._id) {
        setSelectedChat(null);
      } else {
        setSelectedChat(updatedChat);
      }
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const addReaction = (messageId, emoji) => {
    if (socket) {
      socket.emit('add_reaction', {
        messageId,
        emoji,
        userId: user._id,
        conversationId: getConvId(selectedChat),
      });
    }
  };

  const handleMuteChats = async (conversationIds, duration) => {
    try {
      await muteConversations(conversationIds, duration);
      // Optimistically update the UI
      setConversations(prev => prev.map(c => {
        if (conversationIds.includes(c._id)) {
          let until = null;
          if (duration === '8_hours') until = new Date(Date.now() + 8 * 60 * 60 * 1000);
          else if (duration === '1_week') until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          else if (duration === 'always') until = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);

          const newMutedBy = c.mutedBy ? c.mutedBy.filter(m => String(m.user?._id || m.user) !== String(user?._id)) : [];
          if (duration !== 'unmute') {
            newMutedBy.push({ user: user._id, until });
          }
          return { ...c, mutedBy: newMutedBy };
        }
        return c;
      }));
    } catch (error) {
      console.error('Failed to mute chats', error);
    }
  };

  const handleDeleteChats = async (conversationIds) => {
    try {
      await deleteConversations(conversationIds);
      // Optimistically remove them
      setConversations(prev => prev.filter(c => !conversationIds.some(id => String(id) === String(c._id))));
      if (selectedChat && conversationIds.some(id => String(id) === String(selectedChat._id))) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Failed to delete chats', error);
    }
  };

  const handlePinChats = async (conversationIds) => {
    try {
      await pinConversations(conversationIds);
      // Immediately update local state
      setConversations(prev => prev.map(c => {
        if (conversationIds.includes(c._id)) {
          const isPinned = c.pinnedBy?.includes(user._id);
          if (isPinned) {
            return { ...c, pinnedBy: c.pinnedBy.filter(id => id !== user._id) };
          } else {
            const newPinnedBy = c.pinnedBy || [];
            return { ...c, pinnedBy: [...newPinnedBy, user._id] };
          }
        }
        return c;
      }));
    } catch (error) {
      console.error('Failed to pin chats', error);
    }
  };

  const handleTogglePinMessage = async (conversationId, msgId) => {
    try {
      const updatedPinnedMessages = await togglePinMessage(conversationId, msgId);
      
      // Update the local conversation state
      setConversations(prev => prev.map(c => {
        if (c._id === conversationId) {
          return { ...c, pinnedMessages: updatedPinnedMessages };
        }
        return c;
      }));

      if (selectedChat?._id === conversationId) {
        setSelectedChat(prev => ({ ...prev, pinnedMessages: updatedPinnedMessages }));
      }
    } catch (error) {
      console.error('Failed to toggle pin message', error);
      toast.error('Failed to pin/unpin message');
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        setConversations,
        selectedChat,
        setSelectedChat,
        messages,
        setMessages,
        loadingMessages,
        conversationsLoaded,
        typingUsers,
        replyTo,
        setReplyTo,
        messageToForward,
        setMessageToForward,
        searchQuery,
        setSearchQuery,
        unreadCounts,
        notificationToast,
        dismissToast,
        selectChatById,
        loadConversations,
        sendMessage,
        forwardMessage,
        toggleReaction,
        deleteMessage,
        clearChat,
        handleAddGroupMember,
        handleRemoveGroupMember,
        addReaction,
        handleMuteChats,
        handleDeleteChats,
        handlePinChats,
        handleTogglePinMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
