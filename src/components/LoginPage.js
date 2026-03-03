import React, { useState } from 'react';
import './LoginPage.css';

const LoginPage = ({ onWalletConnect, showNotification }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleWalletConnect = async () => {
    setIsLoading(true);
    try {
      await onWalletConnect();
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="app-title">Credora</h1>
          <p className="app-subtitle">Blue Carbon Registry Platform</p>
        </div>

        <div className="login-content">
          <div className="wallet-login-container">
            <h2>Connect Your Wallet</h2>
            <p className="form-description">
              Connect your MetaMask wallet to access the Credora platform. Your role will be automatically detected based on your wallet permissions.
            </p>
            
            <div className="roles-info">
              <h3>Available Roles:</h3>
              <div className="role-cards">
                <div className="role-card admin">
                  <div className="role-icon">🔴</div>
                  <h4>Admin</h4>
                  <p>Full system access, project approval, and user management</p>
                </div>
                <div className="role-card developer">
                  <div className="role-icon">🔵</div>
                  <h4>Developer</h4>
                  <p>Submit and manage blue carbon restoration projects</p>
                </div>
                <div className="role-card buyer">
                  <div className="role-icon">🟢</div>
                  <h4>Buyer/Guest</h4>
                  <p>Browse marketplace and request carbon credits</p>
                </div>
              </div>
            </div>

            <div className="wallet-connect-section">
              <button 
                className="btn btn-primary wallet-connect-btn"
                onClick={handleWalletConnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Connecting...
                  </>
                ) : (
                  <>
                    <span className="metamask-icon">🦊</span>
                    Connect MetaMask Wallet
                  </>
                )}
              </button>
              
              <p className="connect-note">
                Don't have the required role? Contact an administrator for access.
              </p>
            </div>

            <div className="network-info">
              <h3>Network Requirements:</h3>
              <ul>
                <li>Sepolia Testnet (Chain ID: 11155111)</li>
                <li>MetaMask browser extension installed</li>
                <li>Test ETH for transactions</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p>&copy; 2025 Credora - Blue Carbon Registry Platform</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;