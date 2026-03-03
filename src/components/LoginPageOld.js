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
    
    // Validate form
    const requiredFields = ['name', 'organization', 'email', 'phone', 'address'];
    const missingFields = requiredFields.filter(field => !buyerForm[field].trim());
    
    if (missingFields.length > 0) {
      showNotification(`Please fill in all fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerForm.email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    // Submit buyer form
    onBuyerAuth(buyerForm);
  };

  const handleAdminDevChange = (e) => {
    setAdminDevForm({
      ...adminDevForm,
      [e.target.name]: e.target.value
    });
  };

  const handleBuyerChange = (e) => {
    setBuyerForm({
      ...buyerForm,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="app-title">Credora</h1>
          <p className="app-subtitle">Blue Carbon Registry Platform</p>
        </div>

        <div className="login-tabs">
          <button
            className={`tab-button ${activeTab === 'admin-dev' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin-dev')}
          >
            Admin / Developer
          </button>
          <button
            className={`tab-button ${activeTab === 'buyer' ? 'active' : ''}`}
            onClick={() => setActiveTab('buyer')}
          >
            Buyer Access
          </button>
        </div>

        <div className="login-content">
          {activeTab === 'admin-dev' && (
            <div className="login-form-container">
              <h2>Admin / Developer Login</h2>
              <p className="form-description">
                Enter your credentials and connect your MetaMask wallet to verify your role.
              </p>
              
              <form onSubmit={handleAdminDevSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={adminDevForm.username}
                    onChange={handleAdminDevChange}
                    required
                    placeholder="Enter your username"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={adminDevForm.password}
                    onChange={handleAdminDevChange}
                    required
                    placeholder="Enter your password"
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Connecting...' : 'Connect Wallet & Login'}
                </button>
              </form>

              <div className="demo-credentials">
                <h4>Demo Credentials:</h4>
                <p><strong>Admin:</strong> username: admin, password: admin123</p>
                <p><strong>Developer:</strong> username: developer, password: dev123</p>
              </div>
            </div>
          )}

          {activeTab === 'buyer' && (
            <div className="login-form-container">
              <h2>Buyer Access Request</h2>
              <p className="form-description">
                Fill out the contact form below to get access to the carbon credit marketplace.
              </p>
              
              <form onSubmit={handleBuyerSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={buyerForm.name}
                    onChange={handleBuyerChange}
                    required
                    placeholder="Your full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="organization">Organization *</label>
                  <input
                    type="text"
                    id="organization"
                    name="organization"
                    value={buyerForm.organization}
                    onChange={handleBuyerChange}
                    required
                    placeholder="Your organization name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={buyerForm.email}
                    onChange={handleBuyerChange}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={buyerForm.phone}
                    onChange={handleBuyerChange}
                    required
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="address">Address *</label>
                  <textarea
                    id="address"
                    name="address"
                    value={buyerForm.address}
                    onChange={handleBuyerChange}
                    required
                    placeholder="Your full address"
                    rows="3"
                  />
                </div>

                <button type="submit" className="btn btn-secondary">
                  Request Marketplace Access
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;