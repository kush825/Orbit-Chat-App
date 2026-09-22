import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

const CustomAudioPlayer = ({ audioSrc, sender }) => {
  const audioRef = useRef(null);
  const waveformRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Generate static random heights for the waveform dots
  const [barHeights] = useState(() => {
    const heights = [];
    for (let i = 0; i < 35; i++) {
      heights.push(10 + Math.random() * 50);
    }
    return heights;
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  // Handle seeking via drag/touch
  const handleSeek = (clientX) => {
    if (!waveformRef.current || !audioRef.current || !audioRef.current.duration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    const handleUp = () => setIsDragging(false);
    const handleMove = (e) => {
      if (isDragging) {
        // Prevent default scrolling on mobile when dragging waveform
        if (e.cancelable) e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        handleSeek(clientX);
      }
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchend', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
    }

    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [isDragging]);

  const handleKeyDown = (e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const skipAmount = 5; // 5 seconds
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      audioRef.current.currentTime = Math.min(audioRef.current.duration, currentTime + skipAmount);
      setCurrentTime(audioRef.current.currentTime);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      audioRef.current.currentTime = Math.max(0, currentTime - skipAmount);
      setCurrentTime(audioRef.current.currentTime);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      togglePlayPause();
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const togglePlaybackRate = () => {
    const newRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const renderWaveform = () => {
    // Determine how many bars should be "colored" based on playback progress
    const progress = duration > 0 ? currentTime / duration : 0;
    const activeIndex = Math.floor(progress * barHeights.length);

    return (
      <div 
        className="wa-waveform" 
        ref={waveformRef}
        tabIndex="0"
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleSeek(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          handleSeek(e.touches[0].clientX);
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '2px', position: 'relative', height: '30px', cursor: 'pointer', flex: 1, outline: 'none' }}
      >
        {/* Playback Thumb */}
        <div 
          className="wa-waveform-thumb" 
          style={{ 
            left: `calc(${progress * 100}% - 6px)`
          }} 
        />
        
        {barHeights.map((height, i) => {
          const isPlayed = i <= activeIndex;
          return (
            <div 
              key={i} 
              className={`wa-waveform-bar ${isPlayed ? 'played' : 'unplayed'}`}
              style={{ 
                height: `${height}%`,
                width: '3px',
                borderRadius: '2px',
                opacity: isPlayed ? 1 : 0.3,
                transition: 'all 0.1s ease'
              }} 
            />
          );
        })}
      </div>
    );
  };

  const avatarUrl = sender?.profileImage 
    ? (sender.profileImage.startsWith('http') ? sender.profileImage : `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}${sender.profileImage}`)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(sender?.name || 'U')}&background=random`;

  return (
    <div className="wa-audio-player">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />
      
      <div className="wa-audio-avatar-container" style={{ position: 'relative' }}>
        {isPlaying ? (
          <button 
            onClick={togglePlaybackRate}
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: 'rgba(0,0,0,0.2)', 
              color: '#fff', 
              border: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '0.8rem', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            {playbackRate}x
          </button>
        ) : (
          <>
            <img src={avatarUrl} alt="avatar" className="wa-audio-avatar" />
            <div className="wa-mic-badge">
              <Mic size={10} color="#fff" />
            </div>
          </>
        )}
      </div>

      <div className="wa-audio-content">
        <div className="wa-audio-top-row">
          <button className="wa-play-pause-btn" onClick={togglePlayPause}>
            {isPlaying ? <Pause size={22} fill="#fff" stroke="none" /> : <Play size={22} fill="#fff" stroke="none" />}
          </button>

          <div className="wa-waveform-wrapper">
            {renderWaveform()}
          </div>
        </div>
        
        <div className="wa-audio-bottom-row">
          <span className="wa-audio-time">
            {formatTime(isPlaying ? currentTime : duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CustomAudioPlayer;
