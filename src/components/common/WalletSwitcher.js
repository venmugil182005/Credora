import React, { useState, useEffect, useRef } from 'react';
import { getAllAccounts, getAccountInfo, requestAccountSwitch } from '../../services/wallet';
import './WalletSwitcher.css';

const WalletSwitcher = ({ currentUser, onAccountChange, showNotification }) => {
  const [accounts, setAccounts] = useState([]);
  const [accountsInfo, setAccountsInfo] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const allAccounts = await getAllAccounts();
      setAccounts(allAccounts);

      // Get role info for each account
      const accountsWithInfo = await Promise.all(
        allAccounts.map(account => getAccountInfo(account))
      );
      setAccountsInfo(accountsWithInfo);
    } catch (error) {
      console.error('Error loading accounts:', error);
      showNotification('Error loading accounts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSelect = async (selectedAccount) => {
    try {
      if (selectedAccount === currentUser.account) {
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      setShowDropdown(false);
      
      // Request MetaMask to switch to the selected account
      await requestAccountSwitch();
      
      showNotification('Please select the desired account in MetaMask', 'info');
    } catch (error) {
      console.error('Error switching account:', error);
      showNotification('Error switching account. Please try manually in MetaMask.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchWallet = async () => {
    try {
      setIsLoading(true);
      await requestAccountSwitch();
      showNotification('Please select an account in MetaMask', 'info');
    } catch (error) {
      console.error('Error opening account selector:', error);
      showNotification('Error opening account selector', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentAccountInfo = () => {
    return accountsInfo.find(acc => acc.address === currentUser.account) || {
      address: currentUser.account,
      role: currentUser.role,
      shortAddress: currentUser.account ? `${currentUser.account.slice(0, 6)}...${currentUser.account.slice(-4)}` : ''
    };
  };

  const currentAccountInfo = getCurrentAccountInfo();

  return (
    <div className="wallet-switcher">
      <div className="current-account">
        <div className="account-info">
          <span className="account-address">{currentAccountInfo.shortAddress}</span>
          <span className={`account-role role-${currentAccountInfo.role}`}>
            {currentAccountInfo.role}
          </span>
        </div>
        
        {accounts.length > 1 ? (
          <div className="account-dropdown" ref={dropdownRef}>
            <button 
              className="btn btn-secondary account-dropdown-btn"
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={isLoading}
            >
              Switch Account {showDropdown ? '▲' : '▼'}
            </button>
            
            {showDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <span>Available Accounts</span>
                  <button 
                    className="btn btn-link refresh-btn"
                    onClick={loadAccounts}
                    disabled={isLoading}
                  >
                    ↻
                  </button>
                </div>
                
                {accountsInfo.map((account, index) => (
                  <button
                    key={account.address}
                    className={`dropdown-item ${account.address === currentUser.account ? 'active' : ''}`}
                    onClick={() => handleAccountSelect(account.address)}
                    disabled={isLoading}
                  >
                    <div className="account-item">
                      <span className="account-address">{account.shortAddress}</span>
                      <span className={`account-role role-${account.role}`}>
                        {account.role}
                      </span>
                      {account.address === currentUser.account && (
                        <span className="current-indicator">✓</span>
                      )}
                    </div>
                  </button>
                ))}
                
                <div className="dropdown-footer">
                  <button 
                    className="btn btn-primary"
                    onClick={handleSwitchWallet}
                    disabled={isLoading}
                  >
                    Open MetaMask
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button 
            className="btn btn-secondary"
            onClick={handleSwitchWallet}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Switch Wallet'}
          </button>
        )}
      </div>
    </div>
  );
};

export default WalletSwitcher;