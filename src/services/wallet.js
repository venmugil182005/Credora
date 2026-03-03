// Ethers not currently used - commented out to avoid linting warnings
// import { ethers } from 'ethers';
import { getContract } from './contract';

// Check if MetaMask is installed
export const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

// Connect to MetaMask wallet
export const connectWallet = async () => {
  try {
    if (!isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts.length === 0) {
      throw new Error('No accounts found. Please connect your MetaMask wallet.');
    }

    // Check if we're on Sepolia testnet (chain ID: 11155111)
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const sepoliaChainId = '0xaa36a7'; // 11155111 in hex

    if (chainId !== sepoliaChainId) {
      try {
        // Request to switch to Sepolia
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: sepoliaChainId }],
        });
      } catch (switchError) {
        // If Sepolia is not added to MetaMask, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: sepoliaChainId,
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            }],
          });
        } else {
          throw switchError;
        }
      }
    }

    return accounts[0];
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

// Get current connected account
export const getCurrentAccount = async () => {
  try {
    if (!isMetaMaskInstalled()) {
      return null;
    }

    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });

    return accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error('Error getting current account:', error);
    return null;
  }
};

// Check user role in the smart contract
export const checkUserRole = async (address) => {
  try {
    const contract = await getContract();
    
    // Check if user has admin role
    const ADMIN_ROLE = await contract.ADMIN_ROLE();
    const isAdmin = await contract.hasRole(ADMIN_ROLE, address);
    
    if (isAdmin) {
      return 'admin';
    }

    // Check if user has developer role
    const PROJECT_DEVELOPER_ROLE = await contract.PROJECT_DEVELOPER_ROLE();
    const isDeveloper = await contract.hasRole(PROJECT_DEVELOPER_ROLE, address);
    
    if (isDeveloper) {
      return 'developer';
    }

    // For accounts without specific roles, return 'unregistered'
    // They can still access buyer features but with limited permissions
    return 'unregistered';
  } catch (error) {
    console.error('Error checking user role:', error);
    throw error;
  }
};

// Listen for account changes
export const onAccountsChanged = (callback) => {
  if (isMetaMaskInstalled()) {
    window.ethereum.on('accountsChanged', callback);
  }
};

// Listen for network changes
export const onChainChanged = (callback) => {
  if (isMetaMaskInstalled()) {
    window.ethereum.on('chainChanged', callback);
  }
};

// Remove event listeners
export const removeAllListeners = () => {
  if (isMetaMaskInstalled()) {
    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
  }
};

// Get current network
export const getCurrentNetwork = async () => {
  try {
    if (!isMetaMaskInstalled()) {
      return null;
    }

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  } catch (error) {
    console.error('Error getting current network:', error);
    return null;
  }
};

// Disconnect wallet (clear local state)
export const disconnectWallet = () => {
  removeAllListeners();
  // Note: MetaMask doesn't have a programmatic disconnect method
  // This function is mainly for clearing local state
};

// Get all available accounts from MetaMask
export const getAllAccounts = async () => {
  try {
    if (!isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });

    return accounts;
  } catch (error) {
    console.error('Error getting accounts:', error);
    return [];
  }
};

// Switch to a specific account (request user to switch in MetaMask)
export const requestAccountSwitch = async () => {
  try {
    if (!isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    // This will open MetaMask and show account selection
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    return accounts[0];
  } catch (error) {
    console.error('Error requesting account switch:', error);
    throw error;
  }
};

// Get account info with role
export const getAccountInfo = async (address) => {
  try {
    const role = await checkUserRole(address);
    return {
      address,
      role,
      shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`
    };
  } catch (error) {
    console.error('Error getting account info:', error);
    return {
      address,
      role: 'buyer',
      shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`
    };
  }
};