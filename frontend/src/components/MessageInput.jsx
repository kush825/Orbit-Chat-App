import React, { useState, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Image as ImageIcon, FileText, X, Smile, Paperclip, Send, Mic, Square, Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const MessageInput = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { selectedChat, sendMessage, replyTo, setReplyTo } = useChat();
  const { theme } = useTheme();
  const toast = useToast();

  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const getChatId = () => {
    if (!selectedChat) return null;
    return typeof selectedChat === 'object' ? selectedChat._id : selectedChat;
  };

  // Handle typing status emission
  const handleTextChange = (e) => {
    setText(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }

    const roomId = getChatId();
    if (!socket || !roomId) return;
    
    handleTyping(roomId);
  };

  const handleTyping = (roomId) => {
    // Check if typing indicator privacy setting is disabled
    if (user?.settings?.privacy?.typingIndicator === false) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { room: roomId, user: user.name });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { room: roomId, user: user.name });
      setIsTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e) => {
    const enterToSend = user?.settings?.chat?.enterToSend ?? true;
    
    if (e.key === 'Enter' && !e.shiftKey) {
      if (enterToSend) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;

    if (selected.length > 5) {
      toast.error('You can only select up to 5 files at a time');
      return;
    }

    setFiles(selected);
    const previews = selected.map(f => {
      if (f.type.startsWith('image/')) {
        return URL.createObjectURL(f);
      }
      return null;
    });
    setFilePreviews(previews);
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    setFilePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
    
    if (files.length <= 1) {
      const fileInput = document.getElementById('chat-file-input');
      if (fileInput) fileInput.value = '';
    }
  };

  const onEmojiClick = (emojiObject) => {
    setText((prev) => prev + emojiObject.emoji);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 48000
        } 
      });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        audioBitsPerSecond: 128000
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone permission denied", err);
      toast.error('Microphone permission denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `Voice_Message_${Date.now()}.webm`, { type: 'audio/webm' });
        
        sendMessage('', audioFile);
        
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingTime(0);
        clearInterval(timerIntervalRef.current);
      };
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingTime(0);
        clearInterval(timerIntervalRef.current);
      };
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  React.useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!text.trim() && files.length === 0) return;

    const roomId = getChatId();
    if (socket && roomId) {
      socket.emit('stop_typing', { room: roomId, user: user.name });
      setIsTyping(false);
    }

    if (files.length > 0) {
      sendMessage(text, files);
    } else {
      sendMessage(text, null);
    }

    setText('');
    setFiles([]);
    setFilePreviews([]);
    const fileInput = document.getElementById('chat-file-input');
    if (fileInput) fileInput.value = '';
    setShowEmojis(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const getReplyPreviewText = (replyMsg) => {
    if (replyMsg.text) return replyMsg.text;
    
    const PhotoLabel = () => <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={14} /> Photo</div>;
    const AlbumLabel = () => <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={14} /> Album</div>;
    const DocumentLabel = () => <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={14} /> Document</div>;

    if (replyMsg.specificAttachmentUrl) return <PhotoLabel />;
    const hasMultipleAttachments = replyMsg.attachments && replyMsg.attachments.length > 1;
    const isImage = replyMsg.attachments?.some(a => a.type?.startsWith('image/')) || replyMsg.fileType?.startsWith('image/');
    
    if (hasMultipleAttachments) return <AlbumLabel />;
    if (isImage) return <PhotoLabel />;
    if (replyMsg.file) return <DocumentLabel />;
    
    return 'Attachment';
  };

  const getReplyThumbnail = (replyMsg) => {
    if (replyMsg.specificAttachmentUrl) return replyMsg.specificAttachmentUrl;
    const firstImage = replyMsg.attachments?.find(a => a.type?.startsWith('image/'));
    if (firstImage && firstImage.url) {
      return firstImage.url.startsWith('http') ? firstImage.url : `http://${window.location.hostname}:5000${firstImage.url}`;
    }
    if (replyMsg.fileType?.startsWith('image/') && replyMsg.file) {
      return replyMsg.file.startsWith('http') ? replyMsg.file : `http://${window.location.hostname}:5000${replyMsg.file}`;
    }
    return null;
  };

  return (
    <div className="input-container">
      {/* Reply Preview Bar */}
      {replyTo && (
        <div className="reply-preview-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getReplyThumbnail(replyTo) && (
              <img src={getReplyThumbnail(replyTo)} alt="Reply preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
            )}
            <div>
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Replying to {replyTo.sender?.name}</span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{getReplyPreviewText(replyTo)}</div>
            </div>
          </div>
          <button className="icon-btn" style={{ width: '24px', height: '24px' }} onClick={() => setReplyTo(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* File Attachments Thumbnails */}
      {files.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '10px', overflowX: 'auto', marginBottom: '8px' }}>
          {files.map((f, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', flexShrink: 0 }}>
              {filePreviews[index] ? (
                <img src={filePreviews[index]} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
              ) : (
                <Paperclip size={20} color="var(--accent-primary)" />
              )}
              <span style={{ fontSize: '0.85rem', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.name}
              </span>
              <button type="button" className="icon-btn" style={{ width: '24px', height: '24px', margin: 0, padding: 0 }} onClick={() => handleRemoveFile(index)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojis && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }} 
            onClick={() => setShowEmojis(false)}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '80px',
              left: '24px',
              zIndex: 30,
              boxShadow: 'var(--shadow-lg)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <EmojiPicker 
              theme={theme === 'light' ? 'light' : 'dark'} 
              onEmojiClick={onEmojiClick} 
              searchDisabled={false}
              skinTonesDisabled={true}
            />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="input-bar">
        {isRecording ? (
          <div className="wa-recording-bar">
            <button type="button" className="wa-trash-btn" onClick={cancelRecording} title="Delete Recording">
              <Trash2 size={20} color="#fff" />
            </button>
            
            <div className="wa-recording-timer-container">
              <div className="wa-recording-pulse"></div>
              <span className="wa-recording-timer">{formatTime(recordingTime)}</span>
            </div>

            <div className="wa-input-waveform">
              {Array.from({ length: 15 }).map((_, i) => (
                <div 
                  key={i} 
                  className="wa-input-waveform-bar playing" 
                  style={{ 
                    height: `${20 + Math.random() * 80}%`,
                    animationDelay: `${(i % 5) * 0.1}s` 
                  }} 
                />
              ))}
            </div>
            
            <button type="button" className="wa-send-recording-btn" onClick={stopRecording} title="Send Voice Message">
              <Send size={18} color="#000" fill="#000" />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowEmojis(!showEmojis)}
              title="Add Emoji"
            >
              <Smile size={20} />
            </button>

            <label
              htmlFor="chat-file-input"
              className="icon-btn"
              title="Attach Image or File"
              style={{ cursor: 'pointer', margin: 0 }}
            >
              <Paperclip size={20} />
            </label>

            <input
              id="chat-file-input"
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Type a message..."
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{
                height: 'auto',
                lineHeight: '24px',
                overflowY: 'auto'
              }}
            />

            {text.trim() || files.length > 0 ? (
              <button type="submit" className="send-btn" title="Send Message">
                <Send size={18} />
              </button>
            ) : (
              <button type="button" className="send-btn" onClick={startRecording} title="Record Voice Message" style={{ background: 'var(--accent-primary)' }}>
                <Mic size={18} />
              </button>
            )}
          </>
        )}
      </form>
    </div>
  );
};

export default MessageInput;
