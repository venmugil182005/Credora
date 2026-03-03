import React, { useState, useEffect } from 'react';
import { 
  getPendingProjects, 
  getAllProjects, 
  approveProject, 
  rejectProject, 
  mintCarbonCredit, 
  addDeveloper,
  getMintedCredits
} from '../services/contract';
import { api } from '../services/api';
import { disconnectWallet } from '../services/wallet';
import ProjectCard from './common/ProjectCard';
import LoadingSpinner from './common/LoadingSpinner';
import WalletSwitcher from './common/WalletSwitcher';
import './AdminDashboard.css';

const AdminDashboard = ({ user, showNotification, onLogout }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [buyerRequests, setBuyerRequests] = useState([]);
  const [projectCredits, setProjectCredits] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [mintModal, setMintModal] = useState({ show: false, project: null });
  const [mintForm, setMintForm] = useState({ address: '', amount: '' });
  const [addDevModal, setAddDevModal] = useState(false);
  const [devAddress, setDevAddress] = useState('');

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

  useEffect(() => {
    loadProjects();
    loadBuyerRequests();
  }, []);

  const loadBuyerRequests = async () => {
    try {
      const requests = await api.getBuyerRequests();
      setBuyerRequests(requests);
    } catch (error) {
      console.error('Error loading buyer requests:', error);
      showNotification('Error loading buyer requests', 'error');
    }
  };

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const [pendingProjects, allProjectsData] = await Promise.all([
        getPendingProjects(),
        getAllProjects()
      ]);
      setProjects(pendingProjects);
      setAllProjects(allProjectsData);
      
      // Load minted credits for all projects
      await loadMintedCredits(allProjectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      showNotification('Error loading projects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMintedCredits = async (projectsList) => {
    try {
      const creditsData = {};
      
      // Fetch minted credits for each project
      await Promise.all(
        projectsList.map(async (project) => {
          try {
            const mintedAmount = await getMintedCredits(project.id);
            creditsData[project.id] = mintedAmount;
          } catch (error) {
            console.error(`Error loading credits for project ${project.id}:`, error);
            creditsData[project.id] = 0; // Default to 0 if error
          }
        })
      );
      
      setProjectCredits(creditsData);
    } catch (error) {
      console.error('Error loading minted credits:', error);
    }
  };

  const handleApprove = async (projectId) => {
    try {
      setIsLoading(true);
      const result = await approveProject(projectId);
      
      if (result.success) {
        showNotification('Project approved successfully!', 'success');
        await loadProjects(); // Reload projects
      } else {
        showNotification(result.error || 'Failed to approve project', 'error');
      }
    } catch (error) {
      console.error('Error approving project:', error);
      showNotification('Error approving project', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (projectId) => {
    try {
      setIsLoading(true);
      const result = await rejectProject(projectId);
      
      if (result.success) {
        showNotification('Project rejected', 'success');
        await loadProjects(); // Reload projects
      } else {
        showNotification(result.error || 'Failed to reject project', 'error');
      }
    } catch (error) {
      console.error('Error rejecting project:', error);
      showNotification('Error rejecting project', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMintCredits = async () => {
    try {
      if (!mintForm.address || !mintForm.amount) {
        showNotification('Please fill in all fields', 'error');
        return;
      }

      const amount = parseInt(mintForm.amount);
      if (isNaN(amount) || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
      }

      setIsLoading(true);
      const result = await mintCarbonCredit(mintModal.project.id, mintForm.address, amount);
      
      if (result.success) {
        showNotification(`Successfully minted ${amount} carbon credits!`, 'success');
        setMintModal({ show: false, project: null });
        setMintForm({ address: '', amount: '' });
        
        // Refresh minted credits for this project
        try {
          const updatedCredits = await getMintedCredits(mintModal.project.id);
          setProjectCredits(prev => ({
            ...prev,
            [mintModal.project.id]: updatedCredits
          }));
        } catch (error) {
          console.error('Error refreshing credits:', error);
        }
      } else {
        showNotification(result.error || 'Failed to mint credits', 'error');
      }
    } catch (error) {
      console.error('Error minting credits:', error);
      showNotification('Error minting credits', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDeveloper = async () => {
    try {
      if (!devAddress) {
        showNotification('Please enter a developer address', 'error');
        return;
      }

      setIsLoading(true);
      const result = await addDeveloper(devAddress);
      
      if (result.success) {
        showNotification('Developer added successfully!', 'success');
        setAddDevModal(false);
        setDevAddress('');
      } else {
        showNotification(result.error || 'Failed to add developer', 'error');
      }
    } catch (error) {
      console.error('Error adding developer:', error);
      showNotification('Error adding developer', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openMintModal = (project) => {
    setMintModal({ show: true, project });
    // Automatically set the developer's address as the receiver
    setMintForm({ address: project.developer || '', amount: '' });
  };

  const closeMintModal = () => {
    setMintModal({ show: false, project: null });
    setMintForm({ address: '', amount: '' });
  };

  const getProjectsToDisplay = () => {
    switch (activeTab) {
      case 'pending':
        return projects;
      case 'all':
        return allProjects;
      case 'approved':
        return allProjects.filter(p => p.status === 1);
      default:
        return [];
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            <span>Welcome, Admin</span>
            <WalletSwitcher 
              currentUser={user}
              showNotification={showNotification}
            />
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setAddDevModal(true)}
          >
            Add Developer
          </button>
          <button 
            className="btn btn-warning"
            onClick={handleLogout}
            title="Disconnect wallet and logout"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-tabs">
          <button
            className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Projects ({projects.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved Projects
          </button>
          <button
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Projects ({allProjects.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'buyers' ? 'active' : ''}`}
            onClick={() => setActiveTab('buyers')}
          >
            Buyer Requests ({buyerRequests.length})
          </button>
        </div>

        {/* Credits Summary Section */}
        {activeTab !== 'buyers' && (
          <div className="credits-summary">
            <h3>Carbon Credits Overview</h3>
            <div className="credits-stats">
              <div className="stat-card">
                <h4>Total Projects</h4>
                <span className="stat-number">{allProjects.length}</span>
              </div>
              <div className="stat-card">
                <h4>Total Credits Minted</h4>
                <span className="stat-number">
                  {Object.values(projectCredits).reduce((sum, credits) => sum + credits, 0)}
                </span>
              </div>
              <div className="stat-card">
                <h4>Active Projects</h4>
                <span className="stat-number">
                  {allProjects.filter(p => p.status === 1).length}
                </span>
              </div>
              <div className="stat-card">
                <h4>Pending Approval</h4>
                <span className="stat-number">{projects.length}</span>
              </div>
            </div>
          </div>
        )}

        <div className="tab-content">
          {isLoading && <LoadingSpinner message="Loading..." />}

          {activeTab === 'buyers' && (
            <div className="buyer-requests">
              <h3>Buyer Access Requests</h3>
              {buyerRequests.length === 0 ? (
                <p>No buyer requests found.</p>
              ) : (
                <div className="buyer-requests-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Organization</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>Request Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyerRequests.map(request => (
                        <tr key={request.id}>
                          <td>{request.name}</td>
                          <td>{request.organization}</td>
                          <td>{request.email}</td>
                          <td>{request.phone}</td>
                          <td>{request.address}</td>
                          <td>{request.requestDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab !== 'buyers' && (
            <div className="projects-section">
              {getProjectsToDisplay().length === 0 && !isLoading ? (
                <p>No projects found.</p>
              ) : (
                <div className="projects-grid">
                  {getProjectsToDisplay().map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      mintedCredits={projectCredits[project.id] || 0}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onMint={openMintModal}
                      showActions={activeTab === 'pending'}
                      showMintAction={activeTab === 'approved'}
                      isAdmin={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mint Credits Modal */}
      {mintModal.show && (
        <div className="modal-overlay" onClick={closeMintModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mint Carbon Credits</h3>
              <button className="modal-close" onClick={closeMintModal}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Project:</strong> {mintModal.project.projectName}</p>
              <p><strong>Estimated Credits:</strong> {mintModal.project.estimatedCarbonSequestration}</p>
              <p><strong>Currently Minted:</strong> 
                <span className="current-minted">
                  {projectCredits[mintModal.project.id] || 0}
                </span>
              </p>
              
              <div className="form-group">
                <label>Receiver Address (Project Developer)</label>
                <input
                  type="text"
                  value={mintForm.address}
                  onChange={(e) => setMintForm({...mintForm, address: e.target.value})}
                  placeholder="0x..."
                />
                <small className="form-note">
                  {mintModal.project.developer ? 
                    'Automatically filled with the project developer\'s address' : 
                    'Enter the receiver\'s wallet address'
                  }
                </small>
              </div>
              
              <div className="form-group">
                <label>Amount to Mint</label>
                <input
                  type="number"
                  value={mintForm.amount}
                  onChange={(e) => setMintForm({...mintForm, amount: e.target.value})}
                  placeholder="Enter amount"
                  min="1"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeMintModal}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleMintCredits}>
                Mint Credits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Developer Modal */}
      {addDevModal && (
        <div className="modal-overlay" onClick={() => setAddDevModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Project Developer</h3>
              <button className="modal-close" onClick={() => setAddDevModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Developer Wallet Address</label>
                <input
                  type="text"
                  value={devAddress}
                  onChange={(e) => setDevAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddDevModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddDeveloper}>
                Add Developer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;