import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Services
import { connectWallet, getCurrentAccount, checkUserRole, onAccountsChanged, onChainChanged } from './services/wallet';

// Components
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import DeveloperDashboard from './components/DeveloperDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import Notification from './components/common/Notification';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {
  const [user, setUser] = useState({
    account: null,
    role: null,
    isLoading: true,
    isAuthenticated: false
  });
  const [notification, setNotification] = useState(null);

  // Show notification helper
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  // Clear notification
  const clearNotification = () => {
    setNotification(null);
  };

  // Connect wallet and check role
  const handleWalletConnection = async () => {
    try {
      setUser(prev => ({ ...prev, isLoading: true }));
      
      const account = await connectWallet();
      const role = await checkUserRole(account);
      
      setUser({
        account,
        role,
        isLoading: false,
        isAuthenticated: true
      });
      
      showNotification(`Connected as ${role}`, 'success');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setUser(prev => ({ ...prev, isLoading: false }));
      showNotification(error.message, 'error');
    }
  };

  // Handle account change
  const handleAccountChange = useCallback(async (accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      setUser({
        account: null,
        role: null,
        isLoading: false,
        isAuthenticated: false
      });
      showNotification('Wallet disconnected', 'info');
    } else {
      // Account changed
      try {
        const newAccount = accounts[0];
        const role = await checkUserRole(newAccount);
        
        setUser({
          account: newAccount,
          role,
          isLoading: false,
          isAuthenticated: true
        });
        
        showNotification(`Account changed to ${role}`, 'info');
      } catch (error) {
        console.error('Error checking new account role:', error);
        showNotification('Error checking account role', 'error');
      }
    }
  }, [showNotification]);

  // Handle logout
  const handleLogout = () => {
    setUser({
      account: null,
      role: null,
      isLoading: false,
      isAuthenticated: false
    });
    showNotification('Successfully logged out', 'success');
  };

  // Handle network change
  const handleNetworkChange = () => {
    // Reload the page when network changes
    window.location.reload();
  };

  // Check for existing connection on app load
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const account = await getCurrentAccount();
        if (account) {
          const role = await checkUserRole(account);
          setUser({
            account,
            role,
            isLoading: false,
            isAuthenticated: true
          });
        } else {
          setUser(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
        setUser(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkExistingConnection();

    // Set up event listeners
    onAccountsChanged(handleAccountChange);
    onChainChanged(handleNetworkChange);

    // Cleanup function
    return () => {
      // Event listeners are cleaned up in wallet service
    };
  }, [handleAccountChange]);

  // Protected route component
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (user.isLoading) {
      return <LoadingSpinner />;
    }

    if (!user.isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  if (user.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="App">
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={clearNotification}
          />
        )}
        
        <Routes>
          <Route 
            path="/login" 
            element={
              user.isAuthenticated ? (
                <Navigate to={`/${user.role === 'unregistered' ? 'buyer' : user.role}-dashboard`} replace />
              ) : (
                <LoginPage 
                  onWalletConnect={handleWalletConnection}
                  showNotification={showNotification}
                />
              )
            } 
          />
          
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard 
                  user={user} 
                  showNotification={showNotification}
                  onLogout={handleLogout}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/developer-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['developer']}>
                <DeveloperDashboard 
                  user={user} 
                  showNotification={showNotification}
                  onLogout={handleLogout}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/buyer-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['buyer', 'unregistered']}>
                <BuyerDashboard 
                  user={user} 
                  showNotification={showNotification}
                  onLogout={handleLogout}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/" 
            element={
              user.isAuthenticated ? (
                <Navigate to={`/${user.role === 'unregistered' ? 'buyer' : user.role}-dashboard`} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
