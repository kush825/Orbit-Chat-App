import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Download, X, ChevronLeft, ChevronRight, Reply, Forward, Smile, Plus, DownloadCloud } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { getAvatarUrl } from '../utils/getAvatarUrl';

const ImageViewer = ({ images, initialIndex = 0, onClose, sender, timestamp, onReply, onForward, onReact }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [showReactions, setShowReactions] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      if (transformRef.current) transformRef.current.resetTransform();
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
      if (transformRef.current) transformRef.current.resetTransform();
    }
  };

  const transformRef = useRef(null);

  const handleZoomIn = () => {
    if (transformRef.current) transformRef.current.zoomIn(0.5);
  };
  
  const handleZoomOut = () => {
    if (transformRef.current) transformRef.current.zoomOut(0.5);
  };

  const triggerDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank'); // Fallback
    }
  };

  const getValidFilename = (name, index) => {
    let validName = name || `photo_${index + 1}`;
    if (!validName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      validName += '.jpg';
    }
    return validName;
  };

  const handleDownload = () => {
    triggerDownload(images[currentIndex].url, getValidFilename(images[currentIndex].name, currentIndex));
  };

  const handleDownloadAll = () => {
    images.forEach((img, idx) => {
      setTimeout(() => {
        triggerDownload(img.url, getValidFilename(img.name, idx));
      }, idx * 500); // 500ms stagger to prevent browsers from blocking multiple downloads
    });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}
    >
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        {/* Sender Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', overflow: 'hidden' }}>
          {sender && (
            <>
              {sender.profileImage ? (
                <img src={getAvatarUrl(sender.profileImage, sender.name)} alt={sender.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                  {sender.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sender.name}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {new Date(timestamp).toLocaleString()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#fff', flexShrink: 0 }}>
          <button className="icon-btn desktop-only" onClick={handleZoomIn} title="Zoom In" style={{ color: '#fff' }}>
            <ZoomIn size={24} />
          </button>
          <button className="icon-btn desktop-only" onClick={handleZoomOut} title="Zoom Out" style={{ color: '#fff' }}>
            <ZoomOut size={24} />
          </button>
          <button className="icon-btn" onClick={onClose} title="Close" style={{ color: '#fff', marginLeft: '8px' }}>
            <X size={28} />
          </button>
        </div>
      </div>

      {/* Main Image Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {images.length > 1 && currentIndex > 0 && (
          <button 
            className="icon-btn"
            onClick={handlePrev}
            style={{ position: 'absolute', left: '20px', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', padding: '12px', borderRadius: '50%' }}
          >
            <ChevronLeft size={32} />
          </button>
        )}

        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit={true}
          >
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <img 
                src={images[currentIndex].url} 
                alt="View" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  objectFit: 'contain',
                }} 
              />
            </TransformComponent>
          </TransformWrapper>
        </div>

        {images.length > 1 && currentIndex < images.length - 1 && (
          <button 
            className="icon-btn"
            onClick={handleNext}
            style={{ position: 'absolute', right: '20px', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', padding: '12px', borderRadius: '50%' }}
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      {/* Action Bar (Bottom) */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 'clamp(16px, 5vw, 40px)',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        position: 'relative'
      }}>
        {/* Reaction Popup */}
        {showReactions && (
          <div style={{
            position: 'absolute',
            bottom: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-glass)',
            borderRadius: '24px',
            padding: '6px 12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000
          }}>
            {quickEmojis.map(emoji => (
              <span 
                key={emoji} 
                style={{ fontSize: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => {
                  onReact && onReact(emoji);
                  setShowReactions(false);
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                {emoji}
              </span>
            ))}
            <div 
              onClick={() => { setShowFullPicker(!showFullPicker); setShowReactions(false); }}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Plus size={16} color="#fff" />
            </div>
          </div>
        )}

        {showFullPicker && (
          <div style={{ position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} onClick={() => setShowFullPicker(false)} />
            <EmojiPicker 
              theme="dark"
              onEmojiClick={(e) => {
                onReact && onReact(e.emoji);
                setShowFullPicker(false);
              }}
            />
          </div>
        )}

        <button className="icon-btn" onClick={() => { setShowReactions(!showReactions); setShowFullPicker(false); }} title="React" style={{ color: '#fff' }}>
          <Smile size={24} />
        </button>
        <button className="icon-btn" onClick={() => onReply && onReply(images[currentIndex].url)} title="Reply" style={{ color: '#fff' }}>
          <Reply size={24} />
        </button>
        <button className="icon-btn" onClick={onForward} title="Forward" style={{ color: '#fff' }}>
          <Forward size={24} />
        </button>
        <button className="icon-btn" onClick={handleDownload} title="Download Current" style={{ color: '#fff' }}>
          <Download size={24} />
        </button>
        {images.length > 1 && (
          <button className="icon-btn" onClick={handleDownloadAll} title="Download All" style={{ color: '#fff' }}>
            <DownloadCloud size={24} />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails */}
      {images.length > 1 && (
        <div style={{ 
          height: '100px', 
          backgroundColor: 'rgba(0, 0, 0, 0.7)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '12px',
          padding: '0 24px',
          overflowX: 'auto'
        }}>
          {images.map((img, idx) => (
            <div 
              key={idx}
              onClick={() => { 
                setCurrentIndex(idx); 
                if (transformRef.current) transformRef.current.resetTransform(); 
              }}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: currentIndex === idx ? '3px solid var(--accent-primary)' : '2px solid transparent',
                opacity: currentIndex === idx ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
            >
              <img 
                src={img.url} 
                alt={`Thumbnail ${idx}`} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
