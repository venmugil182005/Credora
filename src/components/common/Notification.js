import React, { useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type = 'info', onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getNotificationClass = () => {
    switch (type) {
      case 'success':
        return 'notification notification-success';
      case 'error':
        return 'notification notification-error';
      case 'warning':
        return 'notification notification-warning';
      default:
        return 'notification notification-info';
    }
  };

  return (
    <div className={getNotificationClass()}>
      <div className="notification-content">
        <span className="notification-message">{message}</span>
        <button 
          className="notification-close"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;