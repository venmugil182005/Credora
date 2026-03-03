import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const getSpinnerClass = () => {
    return `loading-spinner ${size}`;
  };

  return (
    <div className="loading-container">
      <div className={getSpinnerClass()}>
        <div className="spinner"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;