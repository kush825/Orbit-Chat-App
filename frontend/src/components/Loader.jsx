import React from 'react';

const Loader = ({ text = "Loading...", size = "medium", fullScreen = false, variant = "spinner" }) => {
  const containerStyle = fullScreen ? {
    height: '100vh',
    width: '100vw',
    position: 'fixed',
    top: 0,
    left: 0,
    background: 'var(--bg-main)',
    zIndex: 9999
  } : {};

  return (
    <div className="spinner-container" style={containerStyle}>
      {variant === 'profile' ? (
        <div className="profile-skeleton">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-lines">
            <div className="skeleton-line title"></div>
            <div className="skeleton-line text"></div>
            <div className="skeleton-line text short"></div>
          </div>
        </div>
      ) : variant === 'orbit' ? (
        <div className={`orbit-loader ${size}`}>
          <div className="orbit-planet"></div>
          <div className="orbit-ring"></div>
          <div className="orbit-moon"></div>
        </div>
      ) : (
        <div className={`spinner ${size}`}></div>
      )}
      {text && variant !== 'profile' && <div className="spinner-text">{text}</div>}
    </div>
  );
};

export default Loader;
