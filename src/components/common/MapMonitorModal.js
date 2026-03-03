import React, { useState, useEffect, useRef } from 'react';
import './MapMonitorModal.css';

const MapMonitorModal = ({ coordinates, projectName, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isMapServerRunning, setIsMapServerRunning] = useState(false);
  const iframeRef = useRef(null);
  const modalRef = useRef(null);

  // Check if map server is running
  const checkMapServer = async () => {
    try {
      const response = await fetch('http://localhost:3000/', { 
        method: 'GET',
        mode: 'no-cors' // This will help bypass CORS for basic connectivity check
      });
      setIsMapServerRunning(true);
    } catch (error) {
      console.log('Map server not running on localhost:3000');
      setIsMapServerRunning(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkMapServer();
    
    // Handle clicks outside the modal
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    // Auto-populate coordinates in the iframe when it loads
    if (coordinates.lat && coordinates.lon && isMapServerRunning) {
      const timer = setTimeout(() => {
        try {
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow) {
            // Try to communicate with iframe to set coordinates
            const message = {
              type: 'SET_COORDINATES',
              lat: coordinates.lat,
              lon: coordinates.lon
            };
            iframe.contentWindow.postMessage(message, 'http://localhost:3000');
          }
        } catch (error) {
          console.log('Could not auto-populate coordinates:', error);
        }
      }, 2000); // Wait 2 seconds for iframe to fully load

      return () => clearTimeout(timer);
    }
  }, [coordinates, isMapServerRunning]);

  const startMapServer = () => {
    alert('Please start the map server by running "node server.js" in the map_ui directory.');
  };

  if (isLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal-container" ref={modalRef}>
          <div className="modal-header">
            <h3>Map Monitor - {projectName}</h3>
            <button className="close-button" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Checking map server...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isMapServerRunning) {
    return (
      <div className="modal-overlay">
        <div className="modal-container" ref={modalRef}>
          <div className="modal-header">
            <h3>Map Monitor - {projectName}</h3>
            <button className="close-button" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="error-container">
              <h4>Map Server Not Running</h4>
              <p>The map monitoring system requires the map server to be running.</p>
              <p><strong>Coordinates:</strong> {coordinates.lat}, {coordinates.lon}</p>
              <div className="instructions">
                <h5>To start the map server:</h5>
                <ol>
                  <li>Open a terminal/command prompt</li>
                  <li>Navigate to the map_ui directory: <code>cd d:\credoraV1\map_ui</code></li>
                  <li>Run: <code>node server.js</code></li>
                  <li>Wait for "Server running on port 3000" message</li>
                  <li>Click "Try Again" below</li>
                </ol>
              </div>
              <div className="action-buttons">
                <button className="btn btn-primary" onClick={startMapServer}>
                  Start Server Instructions
                </button>
                <button className="btn btn-secondary" onClick={checkMapServer}>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container large-modal" ref={modalRef}>
        <div className="modal-header">
          <h3>Map Monitor - {projectName}</h3>
          <div className="coordinates-info">
            <span>Coordinates: {coordinates.lat}, {coordinates.lon}</span>
          </div>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="iframe-container">
            <iframe
              ref={iframeRef}
              src="http://localhost:3000"
              title="Map Monitor"
              className="map-iframe"
              onLoad={() => {
                console.log('Map iframe loaded');
              }}
            />
          </div>
          <div className="monitor-info">
            <p><strong>Project:</strong> {projectName}</p>
            <p><strong>Location:</strong> {coordinates.lat}°N, {coordinates.lon}°E</p>
            <p><em>The map interface will automatically load with the project coordinates. You can analyze the satellite imagery and vegetation data for this location.</em></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapMonitorModal;
