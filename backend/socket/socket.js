const User = require('../models/User');
const Message = require('../models/Message');

const onlineUsers = new Map(); // userId -> Set of socketId

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    // Setup user connection and add to online map
    socket.on('setup', async (userData) => {
      if (!userData || !userData._id) return;
      socket.userId = userData._id;
      socket.join(userData._id);
      if (!onlineUsers.has(userData._id)) {
        onlineUsers.set(userData._id, new Set());
      }
      onlineUsers.get(userData._id).add(socket.id);

      // Update online status in DB
      try {
        await User.findByIdAndUpdate(userData._id, { isOnline: true });
      } catch (err) {
        console.error('Error updating user online status:', err.message);
      }

      // Broadcast user online to everyone
      io.emit('user_status_change', {
        userId: userData._id,
        isOnline: true,
        onlineUserIds: Array.from(onlineUsers.keys()),
      });
      
      socket.emit('connected');
    });

    // Join specific conversation room
    socket.on('join_chat', (room) => {
      socket.join(room);
      console.log(`User ${socket.userId} joined chat room: ${room}`);
    });

    // Leave conversation room
    socket.on('leave_chat', (room) => {
      socket.leave(room);
      console.log(`User ${socket.userId} left chat room: ${room}`);
    });

    // Typing indicators
    socket.on('typing', ({ room, user }) => {
      socket.in(room).emit('typing', { room, user });
    });

    socket.on('stop_typing', ({ room, user }) => {
      socket.in(room).emit('stop_typing', { room, user });
    });

    // New Message event
    socket.on('send_message', (newMessageReceived) => {
      const conversation = newMessageReceived.conversationId;

      if (!conversation || !conversation.participants) {
        return console.log('Conversation or participants not defined');
      }

      const senderId = typeof newMessageReceived.sender === 'object'
        ? newMessageReceived.sender._id
        : newMessageReceived.sender;

      // Emit to each participant in the conversation
      conversation.participants.forEach((participant) => {
        const pId = typeof participant === 'object' ? participant._id : participant;
        if (pId && senderId && pId.toString() === senderId.toString()) return;

        socket.in(pId.toString()).emit('message_received', newMessageReceived);
      });
    });

    // Mark messages as read
    socket.on('mark_as_read', async ({ conversationId, userId, messageIds }) => {
      try {
        if (messageIds && messageIds.length > 0) {
          await Message.updateMany(
            { _id: { $in: messageIds }, 'readBy.user': { $ne: userId } },
            { $push: { readBy: { user: userId, readAt: new Date() } } }
          );
        }

        io.in(conversationId).emit('messages_read', {
          conversationId,
          userId,
          messageIds,
        });
      } catch (err) {
        console.error('Error marking messages as read:', err.message);
      }
    });

    // Handle reaction updates
    socket.on('send_reaction', ({ room, message }) => {
      socket.in(room).emit('message_reaction_updated', message);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: ${socket.id}`);
      if (socket.userId) {
        const userSockets = onlineUsers.get(socket.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          
          if (userSockets.size === 0) {
            onlineUsers.delete(socket.userId);
            
            try {
              await User.findByIdAndUpdate(socket.userId, {
                isOnline: false,
                lastSeen: new Date(),
              });
            } catch (err) {
              console.error('Error updating user offline status:', err.message);
            }

            io.emit('user_status_change', {
              userId: socket.userId,
              isOnline: false,
              lastSeen: new Date(),
              onlineUserIds: Array.from(onlineUsers.keys()),
            });
          }
        }
      }
    });
  });
};

module.exports = socketHandler;
