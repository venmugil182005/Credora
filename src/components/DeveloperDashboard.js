import React, { useState, useEffect, useCallback } from 'react';
import { 
  submitProject, 
  getDeveloperProjects, 
  getProjectTokens 
} from '../services/contract';
import { disconnectWallet } from '../services/wallet';
import ProjectCard from './common/ProjectCard';
import LoadingSpinner from './common/LoadingSpinner';
import WalletSwitcher from './common/WalletSwitcher';
import FileUploader from './common/FileUploader';
import IPFSService from '../services/ipfs';
import './DeveloperDashboard.css';

const DeveloperDashboard = ({ user, showNotification, onLogout }) => {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({ isUploading: false, message: '' });
  const [projectForm, setProjectForm] = useState({
    projectName: '',
    developerName: '',
    description: '',
    geographicCoordinates: '',
    siteAddress: '',
    projectArea: '',
    ecosystemType: '',
    startDate: '',
    expectedProjectDuration: '',
    restorationMethods: '',
    baselineCarbonStock: '',
    estimatedCarbonSequestration: '',
    supportingDocsHash: '',
    contactDetails: ''
  });

  const loadDeveloperProjects = useCallback(async () => {
    if (!user.account) return;
    
    setIsLoading(true);
    try {
      const developerProjects = await getDeveloperProjects(user.account);
      
      // Load token counts for each project
      const projectsWithTokens = await Promise.all(
        developerProjects.map(async (project) => {
          try {
            const tokens = await getProjectTokens(project.id);
            return { ...project, tokenCount: tokens.length };
          } catch (error) {
            console.error(`Error loading tokens for project ${project.id}:`, error);
            return { ...project, tokenCount: 0 };
          }
        })
      );
      
      setProjects(projectsWithTokens);
    } catch (error) {
      console.error('Error loading developer projects:', error);
      showNotification('Error loading projects', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user.account, showNotification]);

  useEffect(() => {
    loadDeveloperProjects();
  }, [loadDeveloperProjects]);

  const handleLogout = () => {
    try {
      disconnectWallet();
      showNotification('Logged out successfully', 'success');
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Error during logout:', error);
      showNotification('Error during logout', 'error');
    }
  };

  const handleFormChange = (e) => {
    setProjectForm({
      ...projectForm,
      [e.target.name]: e.target.value
    });
  };

  const handleFilesChange = (files) => {
    setUploadedFiles(files);
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = [
      'projectName', 'developerName', 'description', 'geographicCoordinates',
      'siteAddress', 'projectArea', 'ecosystemType', 'expectedProjectDuration',
      'restorationMethods', 'baselineCarbonStock', 'estimatedCarbonSequestration',
      'contactDetails'
    ];
    
    const missingFields = requiredFields.filter(field => !projectForm[field].trim());
    
    if (missingFields.length > 0) {
      showNotification(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    // Validate start date
    if (projectForm.startDate) {
      const startDate = new Date(projectForm.startDate);
      if (isNaN(startDate.getTime())) {
        showNotification('Please enter a valid start date', 'error');
        return;
      }
    }

    // Validate estimated carbon sequestration is a number
    const estimatedCredits = parseInt(projectForm.estimatedCarbonSequestration);
    if (isNaN(estimatedCredits) || estimatedCredits <= 0) {
      showNotification('Please enter a valid number for estimated carbon sequestration', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      // Upload files to IPFS if any files are selected
      let ipfsHashes = [];
      if (uploadedFiles.length > 0) {
        setUploadStatus({ isUploading: true, message: `Uploading ${uploadedFiles.length} file(s) to IPFS...` });
        
        const uploadResult = await IPFSService.uploadMultipleFiles(uploadedFiles);
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload files to IPFS');
        }
        
        ipfsHashes = uploadResult.results.map(result => result.hash);
        setUploadStatus({ isUploading: false, message: `Successfully uploaded ${ipfsHashes.length} file(s) to IPFS` });
        
        showNotification(`Files uploaded to IPFS successfully`, 'success');
      }
      
      // Convert start date to timestamp
      const startDateTimestamp = projectForm.startDate ? 
        Math.floor(new Date(projectForm.startDate).getTime() / 1000) : 0;

      const projectData = {
        ...projectForm,
        startDate: startDateTimestamp,
        supportingDocsHash: ipfsHashes.length > 0 ? JSON.stringify(ipfsHashes) : projectForm.supportingDocsHash
      };

      const result = await submitProject(projectData);
      
      if (result.success) {
        showNotification('Project submitted successfully!', 'success');
        setShowSubmitForm(false);
        resetForm();
        await loadDeveloperProjects(); // Reload projects
      } else {
        showNotification(result.error || 'Failed to submit project', 'error');
      }
    } catch (error) {
      console.error('Error submitting project:', error);
      showNotification('Error submitting project', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setProjectForm({
      projectName: '',
      developerName: '',
      description: '',
      geographicCoordinates: '',
      siteAddress: '',
      projectArea: '',
      ecosystemType: '',
      startDate: '',
      expectedProjectDuration: '',
      restorationMethods: '',
      baselineCarbonStock: '',
      estimatedCarbonSequestration: '',
      supportingDocsHash: '',
      contactDetails: ''
    });
    setUploadedFiles([]);
    setUploadStatus({ isUploading: false, message: '' });
  };

  const getProjectStats = () => {
    const pending = projects.filter(p => p.status === 0).length;
    const approved = projects.filter(p => p.status === 1).length;
    const rejected = projects.filter(p => p.status === 2).length;
    const totalTokens = projects.reduce((sum, p) => sum + (p.tokenCount || 0), 0);
    
    return { pending, approved, rejected, totalTokens };
  };

  const stats = getProjectStats();

  return (
    <div className="developer-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Developer Dashboard</h1>
          <div className="user-info">
            <span>Welcome, Developer</span>
            <WalletSwitcher 
              currentUser={user}
              showNotification={showNotification}
            />
            <button 
              className="btn btn-warning logout-btn"
              onClick={handleLogout}
              title="Disconnect wallet and logout"
            >
              Logout
            </button>
          </div>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{projects.length}</div>
            <div className="stat-label">Total Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-number pending">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number approved">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-number rejected">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalTokens}</div>
            <div className="stat-label">Credits Minted</div>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowSubmitForm(true)}
          >
            Submit New Project
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-tabs">
          <button
            className={`tab-button ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            My Projects
          </button>
          <button
            className={`tab-button ${activeTab === 'tokens' ? 'active' : ''}`}
            onClick={() => setActiveTab('tokens')}
          >
            Token Details
          </button>
        </div>

        <div className="tab-content">
          {isLoading && <LoadingSpinner message="Loading..." />}

          {activeTab === 'projects' && (
            <div className="projects-section">
              {projects.length === 0 && !isLoading ? (
                <div className="empty-state">
                  <h3>No Projects Yet</h3>
                  <p>Submit your first blue carbon project to get started!</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowSubmitForm(true)}
                  >
                    Submit Project
                  </button>
                </div>
              ) : (
                <div className="projects-grid">
                  {projects.map(project => (
                    <div key={project.id} className="project-wrapper">
                      <ProjectCard project={project} />
                      {project.tokenCount > 0 && (
                        <div className="token-info">
                          <strong>Credits Minted:</strong> {project.tokenCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tokens' && (
            <div className="tokens-section">
              <h3>Token Details by Project</h3>
              {projects.filter(p => p.tokenCount > 0).length === 0 ? (
                <p>No tokens minted yet.</p>
              ) : (
                <div className="tokens-list">
                  {projects.filter(p => p.tokenCount > 0).map(project => (
                    <div key={project.id} className="token-project">
                      <h4>{project.projectName}</h4>
                      <p><strong>Status:</strong> {project.status === 1 ? 'Approved' : 'Pending'}</p>
                      <p><strong>Credits Minted:</strong> {project.tokenCount}</p>
                      <p><strong>Estimated Total:</strong> {project.estimatedCarbonSequestration}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit Project Modal */}
      {showSubmitForm && (
        <div className="modal-overlay" onClick={() => setShowSubmitForm(false)}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit New Project</h3>
              <button className="modal-close" onClick={() => setShowSubmitForm(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmitProject}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Project Name *</label>
                    <input
                      type="text"
                      name="projectName"
                      value={projectForm.projectName}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Developer Name *</label>
                    <input
                      type="text"
                      name="developerName"
                      value={projectForm.developerName}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Description *</label>
                    <textarea
                      name="description"
                      value={projectForm.description}
                      onChange={handleFormChange}
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Geographic Coordinates *</label>
                    <input
                      type="text"
                      name="geographicCoordinates"
                      value={projectForm.geographicCoordinates}
                      onChange={handleFormChange}
                      placeholder="e.g., 40.7128° N, 74.0060° W"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Site Address *</label>
                    <input
                      type="text"
                      name="siteAddress"
                      value={projectForm.siteAddress}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Project Area *</label>
                    <input
                      type="text"
                      name="projectArea"
                      value={projectForm.projectArea}
                      onChange={handleFormChange}
                      placeholder="e.g., 100 hectares"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Ecosystem Type *</label>
                    <select
                      name="ecosystemType"
                      value={projectForm.ecosystemType}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select ecosystem type</option>
                      <option value="Mangrove">Mangrove</option>
                      <option value="Salt Marsh">Salt Marsh</option>
                      <option value="Seagrass">Seagrass</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={projectForm.startDate}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Expected Duration *</label>
                    <input
                      type="text"
                      name="expectedProjectDuration"
                      value={projectForm.expectedProjectDuration}
                      onChange={handleFormChange}
                      placeholder="e.g., 10 years"
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Restoration Methods *</label>
                    <textarea
                      name="restorationMethods"
                      value={projectForm.restorationMethods}
                      onChange={handleFormChange}
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Baseline Carbon Stock *</label>
                    <input
                      type="text"
                      name="baselineCarbonStock"
                      value={projectForm.baselineCarbonStock}
                      onChange={handleFormChange}
                      placeholder="e.g., 50 tCO2/ha"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Estimated Carbon Sequestration * (total credits)</label>
                    <input
                      type="number"
                      name="estimatedCarbonSequestration"
                      value={projectForm.estimatedCarbonSequestration}
                      onChange={handleFormChange}
                      placeholder="e.g., 1000"
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <FileUploader 
                      onFilesChange={handleFilesChange}
                      maxFiles={10}
                    />
                    {uploadStatus.isUploading && (
                      <div className="upload-status uploading">
                        <LoadingSpinner size="small" />
                        <span>{uploadStatus.message}</span>
                      </div>
                    )}
                    {uploadStatus.message && !uploadStatus.isUploading && (
                      <div className="upload-status success">
                        ✅ {uploadStatus.message}
                      </div>
                    )}
                    <div className="manual-hash-input">
                      <label>Or enter IPFS hash manually:</label>
                      <input
                        type="text"
                        name="supportingDocsHash"
                        value={projectForm.supportingDocsHash}
                        onChange={handleFormChange}
                        placeholder="IPFS hash or document reference"
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Contact Details *</label>
                    <textarea
                      name="contactDetails"
                      value={projectForm.contactDetails}
                      onChange={handleFormChange}
                      rows="2"
                      placeholder="Email, phone, address"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowSubmitForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperDashboard;