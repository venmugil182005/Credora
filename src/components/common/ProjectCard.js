import React, { useState } from 'react';
import { STATUS_LABELS, STATUS_COLORS } from '../../services/contract';
import MapMonitorModal from './MapMonitorModal';
import './ProjectCard.css';

const ProjectCard = ({ 
  project, 
  mintedCredits = 0,
  onApprove, 
  onReject, 
  onMint, 
  showActions = false, 
  showMintAction = false,
  isAdmin = false 
}) => {
  const [showMapModal, setShowMapModal] = useState(false);

  const handleApprove = () => {
    if (onApprove) onApprove(project.id);
  };

  const handleReject = () => {
    if (onReject) onReject(project.id);
  };

  const handleMint = () => {
    if (onMint) onMint(project);
  };

  const handleMonitor = () => {
    setShowMapModal(true);
  };

  const parseCoordinates = (coordString) => {
    if (!coordString) return { lat: null, lon: null };
    
    // Handle different coordinate formats
    const cleanCoord = coordString.toString().trim();
    
    // Try to match patterns like "lat, lon" or "lat,lon" or "lat lon"
    const match = cleanCoord.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
    
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lon: parseFloat(match[2])
      };
    }
    
    return { lat: null, lon: null };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusBadge = () => {
    const status = project.status;
    const label = STATUS_LABELS[status];
    const color = STATUS_COLORS[status];
    
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    );
  };

  const renderSupportingDocs = (supportingDocsHash) => {
    if (!supportingDocsHash || supportingDocsHash.trim() === '') {
      return <span className="no-docs">No documents uploaded</span>;
    }

    try {
      // Try to parse as JSON array (multiple files)
      const hashes = JSON.parse(supportingDocsHash);
      if (Array.isArray(hashes)) {
        return (
          <div className="docs-links">
            {hashes.map((hash, index) => (
              <a
                key={index}
                href={`https://gateway.pinata.cloud/ipfs/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="doc-link"
              >
                Document {index + 1}
              </a>
            ))}
          </div>
        );
      }
    } catch (e) {
      // Not JSON, treat as single hash
    }

    // Single hash or plain text
    const hash = supportingDocsHash.trim();
    if (hash.startsWith('Qm') || hash.startsWith('bafy') || hash.length === 46 || hash.length === 59) {
      // Looks like an IPFS hash
      return (
        <a
          href={`https://gateway.pinata.cloud/ipfs/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="doc-link"
        >
          View Document
        </a>
      );
    } else {
      // Not an IPFS hash, display as text
      return <span className="hash-text">{hash}</span>;
    }
  };

  return (
    <div className="project-card">
      <div className="project-card-header">
        <h3 className="project-title">{project.projectName}</h3>
        {getStatusBadge()}
      </div>
      
      <div className="project-card-body">
        <div className="project-info">
          <p><strong>Developer:</strong> {project.developerName}</p>
          <p><strong>Ecosystem:</strong> {project.ecosystemType}</p>
          <p><strong>Location:</strong> {project.siteAddress}</p>
          <p><strong>Project Area:</strong> {project.projectArea}</p>
          <p><strong>Start Date:</strong> {formatDate(project.startDate)}</p>
          <p><strong>Estimated Credits:</strong> {project.estimatedCarbonSequestration}</p>
          <div className="credits-info">
            <p><strong>Credits Minted:</strong> 
              <span className={`credits-count ${mintedCredits > 0 ? 'has-credits' : 'no-credits'}`}>
                {mintedCredits}
              </span>
            </p>
          </div>
        </div>
        
        <div className="project-description">
          <p><strong>Description:</strong></p>
          <p className="description-text">{project.description}</p>
        </div>
        
        <div className="project-details">
          <details>
            <summary>View More Details</summary>
            <div className="detailed-info">
              <div className="coordinates-row">
                <p><strong>Geographic Coordinates:</strong> {project.geographicCoordinates}</p>
                {isAdmin && project.geographicCoordinates && (
                  <button 
                    className="btn btn-monitor"
                    onClick={handleMonitor}
                    title="Monitor location on map"
                  >
                    Monitor
                  </button>
                )}
              </div>
              <p><strong>Duration:</strong> {project.expectedProjectDuration}</p>
              <p><strong>Restoration Methods:</strong> {project.restorationMethods}</p>
              <p><strong>Baseline Carbon Stock:</strong> {project.baselineCarbonStock}</p>
              <div className="supporting-docs">
                <p><strong>Supporting Docs:</strong></p>
                {renderSupportingDocs(project.supportingDocsHash)}
              </div>
              <p><strong>Contact:</strong> {project.contactDetails}</p>
              <p><strong>Developer Address:</strong> {project.developer}</p>
            </div>
          </details>
        </div>
      </div>
      
      {showActions && project.status === 0 && (
        <div className="project-card-actions">
          <button 
            className="btn btn-approve"
            onClick={handleApprove}
          >
            Approve
          </button>
          <button 
            className="btn btn-reject"
            onClick={handleReject}
          >
            Reject
          </button>
        </div>
      )}
      
      {showMintAction && project.status === 1 && (
        <div className="project-card-actions">
          <button 
            className="btn btn-primary"
            onClick={handleMint}
          >
            Mint Credits
          </button>
        </div>
      )}
      
      {showMapModal && (
        <MapMonitorModal 
          coordinates={parseCoordinates(project.geographicCoordinates)}
          projectName={project.projectName}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
};

export default ProjectCard;