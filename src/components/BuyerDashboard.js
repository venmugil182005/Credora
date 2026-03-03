import React, { useState, useEffect, useCallback } from 'react';
import { getApprovedProjects } from '../services/contract';
import { api } from '../services/api';
import { disconnectWallet } from '../services/wallet';
import ProjectCard from './common/ProjectCard';
import LoadingSpinner from './common/LoadingSpinner';
import WalletSwitcher from './common/WalletSwitcher';
import './BuyerDashboard.css';

const BuyerDashboard = ({ user, showNotification, onLogout }) => {
  const [activeTab, setActiveTab] = useState('marketplace');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [requestForm, setRequestForm] = useState({
    projectId: '',
    projectName: '',
    buyerName: '',
    organization: '',
    email: '',
    phone: '',
    requestedCredits: '',
    useCase: '',
    targetPrice: '',
    urgency: 'medium',
    additionalNotes: ''
  });

  const loadApprovedProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const approvedProjects = await getApprovedProjects();
      setProjects(approvedProjects);
    } catch (error) {
      console.error('Error loading approved projects:', error);
      showNotification('Error loading marketplace projects', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadApprovedProjects();
  }, [loadApprovedProjects]);

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

  const handleRequestCredits = (project) => {
    setSelectedProject(project);
    setRequestForm(prev => ({
      ...prev,
      projectId: project.id.toString(),
      projectName: project.projectName
    }));
    setShowRequestForm(true);
  };

  const handleFormChange = (e) => {
    setRequestForm({
      ...requestForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = [
      'buyerName', 'organization', 'email', 'phone', 
      'requestedCredits', 'useCase'
    ];
    
    const missingFields = requiredFields.filter(field => !requestForm[field].trim());
    
    if (missingFields.length > 0) {
      showNotification(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestForm.email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    // Validate requested credits
    const credits = parseInt(requestForm.requestedCredits);
    if (isNaN(credits) || credits <= 0) {
      showNotification('Please enter a valid number of credits', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      // Submit to backend API
      const requestData = {
        ...requestForm,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      const response = await api.submitCreditRequest(requestData);
      
      if (response.success) {
        showNotification(
          `Your carbon credit request has been submitted successfully! Request ID: ${response.requestId}. Our team will contact you within 24 hours.`,
          'success'
        );
        
        // Send email notification to admin
        await api.sendEmailNotification({
          to: 'admin@credora.com',
          subject: 'New Carbon Credit Request',
          message: `New credit request submitted by ${requestForm.buyerName} for ${requestForm.requestedCredits} credits.`
        });
        
        setShowRequestForm(false);
        resetForm();
      } else {
        showNotification('Error submitting request. Please try again.', 'error');
      }
      
    } catch (error) {
      console.error('Error submitting request:', error);
      showNotification('Error submitting request. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setRequestForm({
      projectId: '',
      projectName: '',
      buyerName: '',
      organization: '',
      email: '',
      phone: '',
      requestedCredits: '',
      useCase: '',
      targetPrice: '',
      urgency: 'medium',
      additionalNotes: ''
    });
    setSelectedProject(null);
  };

  const getProjectsByEcosystem = () => {
    const ecosystems = {};
    projects.forEach(project => {
      const ecosystem = project.ecosystemType || 'Other';
      if (!ecosystems[ecosystem]) {
        ecosystems[ecosystem] = [];
      }
      ecosystems[ecosystem].push(project);
    });
    return ecosystems;
  };

  const ecosystemProjects = getProjectsByEcosystem();

  return (
    <div className="buyer-dashboard">
      {user.role === 'unregistered' && (
        <div className="unregistered-banner">
          <div className="banner-content">
            <span className="banner-icon">⚠️</span>
            <div className="banner-text">
              <strong>Unregistered Account</strong>
              <p>You can browse projects, but some features may be limited. Contact an administrator to get proper access roles.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => showNotification('Please contact admin@credora.com for role assignment', 'info')}>
              Get Access
            </button>
          </div>
        </div>
      )}
      
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Carbon Credit Marketplace</h1>
          <div className="user-info">
            <span>Welcome to Credora</span>
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
        
        <div className="marketplace-stats">
          <div className="stat-card">
            <div className="stat-number">{projects.length}</div>
            <div className="stat-label">Available Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {projects.reduce((sum, p) => sum + parseInt(p.estimatedCarbonSequestration || 0), 0)}
            </div>
            <div className="stat-label">Total Credits Available</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{Object.keys(ecosystemProjects).length}</div>
            <div className="stat-label">Ecosystem Types</div>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-tabs">
          <button
            className={`tab-button ${activeTab === 'marketplace' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketplace')}
          >
            Marketplace
          </button>
          <button
            className={`tab-button ${activeTab === 'ecosystems' ? 'active' : ''}`}
            onClick={() => setActiveTab('ecosystems')}
          >
            By Ecosystem
          </button>
          <button
            className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About Blue Carbon
          </button>
          <button
            className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Become a Buyer
          </button>
        </div>

        <div className="tab-content">
          {isLoading && <LoadingSpinner message="Loading marketplace..." />}

          {activeTab === 'marketplace' && (
            <div className="marketplace-section">
              <div className="section-header">
                <h3>Available Carbon Credit Projects</h3>
                <p>Browse verified blue carbon projects and request carbon credits for your sustainability goals.</p>
              </div>
              
              {projects.length === 0 && !isLoading ? (
                <div className="empty-state">
                  <h3>No Projects Available</h3>
                  <p>Check back later for approved carbon credit projects.</p>
                </div>
              ) : (
                <div className="projects-grid">
                  {projects.map(project => (
                    <div key={project.id} className="marketplace-project">
                      <ProjectCard project={project} />
                      <div className="project-actions">
                        <button 
                          className="btn btn-primary"
                          onClick={() => handleRequestCredits(project)}
                        >
                          Request Credits
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ecosystems' && (
            <div className="ecosystems-section">
              <div className="section-header">
                <h3>Projects by Ecosystem Type</h3>
                <p>Explore projects organized by blue carbon ecosystem types.</p>
              </div>
              
              {Object.keys(ecosystemProjects).map(ecosystem => (
                <div key={ecosystem} className="ecosystem-group">
                  <h4 className="ecosystem-title">{ecosystem} Projects ({ecosystemProjects[ecosystem].length})</h4>
                  <div className="projects-grid">
                    {ecosystemProjects[ecosystem].map(project => (
                      <div key={project.id} className="marketplace-project">
                        <ProjectCard project={project} />
                        <div className="project-actions">
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleRequestCredits(project)}
                          >
                            Request Credits
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="about-section">
              <h3>About Blue Carbon Credits</h3>
              
              <div className="info-grid">
                <div className="info-card">
                  <h4>What is Blue Carbon?</h4>
                  <p>
                    Blue carbon refers to the carbon captured and stored by marine and coastal ecosystems, 
                    including mangroves, salt marshes, and seagrass beds. These ecosystems are among the 
                    most effective carbon sinks on Earth.
                  </p>
                </div>
                
                <div className="info-card">
                  <h4>Environmental Impact</h4>
                  <p>
                    Blue carbon ecosystems store carbon at rates up to 10 times higher than terrestrial forests. 
                    They also provide critical habitat for marine life and protect coastlines from erosion and storms.
                  </p>
                </div>
                
                <div className="info-card">
                  <h4>Carbon Credits</h4>
                  <p>
                    Each carbon credit represents one metric ton of CO2 equivalent removed from the atmosphere 
                    through blue carbon restoration and conservation projects verified on our blockchain platform.
                  </p>
                </div>
                
                <div className="info-card">
                  <h4>Verification Process</h4>
                  <p>
                    All projects undergo rigorous scientific review and are tracked on the Ethereum blockchain 
                    for transparency. Credits are minted only after project approval and verification of carbon storage.
                  </p>
                </div>
              </div>
              
              <div className="contact-info">
                <h4>Need Help?</h4>
                <p>Contact our team for assistance with carbon credit purchases or project information.</p>
                <p><strong>Email:</strong> marketplace@credora.com</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="register-section">
              <h3>Become a Registered Buyer</h3>
              <p>Register your organization to access exclusive features, bulk purchasing options, and priority support.</p>
              
              <div className="registration-benefits">
                <h4>Benefits of Registration:</h4>
                <ul>
                  <li>🏢 Verified organization status</li>
                  <li>💰 Access to bulk pricing discounts</li>
                  <li>📊 Detailed carbon offset reporting</li>
                  <li>🔔 Priority notifications for new projects</li>
                  <li>🤝 Direct communication with project developers</li>
                  <li>📋 Customized carbon offset solutions</li>
                </ul>
              </div>

              <div className="buyer-registration-form">
                <h4>Registration Form</h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const registrationData = {
                    name: formData.get('name'),
                    organization: formData.get('organization'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    address: formData.get('address'),
                    organizationType: formData.get('organizationType'),
                    website: formData.get('website'),
                    annualEmissions: formData.get('annualEmissions'),
                    sustainabilityGoals: formData.get('sustainabilityGoals'),
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                  };

                  try {
                    setIsLoading(true);
                    const response = await api.submitBuyerRequest(registrationData);
                    if (response.success) {
                      showNotification('Registration submitted successfully! We will review your application and contact you within 2-3 business days.', 'success');
                      e.target.reset();
                    } else {
                      showNotification('Error submitting registration. Please try again.', 'error');
                    }
                  } catch (error) {
                    console.error('Registration error:', error);
                    showNotification('Error submitting registration. Please try again.', 'error');
                  } finally {
                    setIsLoading(false);
                  }
                }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Contact Name *</label>
                      <input type="text" name="name" required />
                    </div>
                    
                    <div className="form-group">
                      <label>Organization Name *</label>
                      <input type="text" name="organization" required />
                    </div>
                    
                    <div className="form-group">
                      <label>Email Address *</label>
                      <input type="email" name="email" required />
                    </div>
                    
                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input type="tel" name="phone" required />
                    </div>
                    
                    <div className="form-group">
                      <label>Organization Type *</label>
                      <select name="organizationType" required>
                        <option value="">Select type</option>
                        <option value="corporation">Corporation</option>
                        <option value="nonprofit">Non-profit</option>
                        <option value="government">Government Entity</option>
                        <option value="university">University/Research</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Website</label>
                      <input type="url" name="website" placeholder="https://..." />
                    </div>
                    
                    <div className="form-group full-width">
                      <label>Business Address *</label>
                      <textarea name="address" required rows="2" placeholder="Full business address"></textarea>
                    </div>
                    
                    <div className="form-group">
                      <label>Annual CO2 Emissions (tons)</label>
                      <input type="number" name="annualEmissions" placeholder="Estimated annual emissions" />
                    </div>
                    
                    <div className="form-group full-width">
                      <label>Sustainability Goals</label>
                      <textarea name="sustainabilityGoals" rows="3" placeholder="Describe your organization's sustainability goals and how carbon credits fit into your strategy"></textarea>
                    </div>
                  </div>
                  
                  <div className="form-footer">
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                      {isLoading ? 'Submitting...' : 'Submit Registration'}
                    </button>
                  </div>
                </form>
              </div>
              
              <div className="registration-info">
                <h4>What Happens Next?</h4>
                <ol>
                  <li>We review your registration within 2-3 business days</li>
                  <li>Our team may contact you for additional verification</li>
                  <li>Once approved, you'll receive buyer credentials and access to exclusive features</li>
                  <li>You can then access bulk pricing and custom carbon offset solutions</li>
                </ol>
                
                <div className="contact-support">
                  <p><strong>Questions about registration?</strong></p>
                  <p>Contact our buyer relations team at <strong>buyers@credora.com</strong> or <strong>+1 (555) 123-4567</strong></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credit Request Modal */}
      {showRequestForm && (
        <div className="modal-overlay" onClick={() => setShowRequestForm(false)}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Carbon Credits</h3>
              <button className="modal-close" onClick={() => setShowRequestForm(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmitRequest}>
              <div className="modal-body">
                <div className="selected-project-info">
                  <h4>Selected Project: {selectedProject?.projectName}</h4>
                  <p><strong>Developer:</strong> {selectedProject?.developerName}</p>
                  <p><strong>Available Credits:</strong> {selectedProject?.estimatedCarbonSequestration}</p>
                  <p><strong>Ecosystem:</strong> {selectedProject?.ecosystemType}</p>
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Your Name *</label>
                    <input
                      type="text"
                      name="buyerName"
                      value={requestForm.buyerName}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Organization *</label>
                    <input
                      type="text"
                      name="organization"
                      value={requestForm.organization}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={requestForm.email}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={requestForm.phone}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Requested Credits *</label>
                    <input
                      type="number"
                      name="requestedCredits"
                      value={requestForm.requestedCredits}
                      onChange={handleFormChange}
                      min="1"
                      max={selectedProject?.estimatedCarbonSequestration}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Urgency</label>
                    <select
                      name="urgency"
                      value={requestForm.urgency}
                      onChange={handleFormChange}
                    >
                      <option value="low">Low - Within 3 months</option>
                      <option value="medium">Medium - Within 1 month</option>
                      <option value="high">High - Within 2 weeks</option>
                      <option value="urgent">Urgent - Within 1 week</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Use Case / Purpose *</label>
                    <textarea
                      name="useCase"
                      value={requestForm.useCase}
                      onChange={handleFormChange}
                      rows="3"
                      placeholder="Describe how you plan to use these carbon credits (e.g., carbon offsetting, sustainability goals, compliance)"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Price (USD per credit)</label>
                    <input
                      type="number"
                      name="targetPrice"
                      value={requestForm.targetPrice}
                      onChange={handleFormChange}
                      placeholder="Optional"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Additional Notes</label>
                    <textarea
                      name="additionalNotes"
                      value={requestForm.additionalNotes}
                      onChange={handleFormChange}
                      rows="3"
                      placeholder="Any additional information or special requirements"
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRequestForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerDashboard;