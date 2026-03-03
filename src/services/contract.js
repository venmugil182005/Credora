import { ethers } from 'ethers';
import BlueCarbonRegistryABI from '../abi/BlueCarbonRegistry.json';

// Contract configuration
export const CONTRACT_ADDRESS = '0x9ec8132D3aF28319094051b90A2eFD642d1a8647';
export const CONTRACT_ABI = BlueCarbonRegistryABI.abi;

// Get provider (read-only)
export const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  // Fallback to Sepolia RPC for read-only operations
  return new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY');
};

// Get signer (for transactions)
export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

// Get contract instance (read-only)
export const getContract = async (withSigner = false) => {
  try {
    if (withSigner) {
      const signer = await getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    } else {
      const provider = getProvider();
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    }
  } catch (error) {
    console.error('Error creating contract instance:', error);
    throw error;
  }
};

// Helper function to handle transaction
const handleTransaction = async (contractCall) => {
  try {
    const tx = await contractCall;
    console.log('Transaction sent:', tx.hash);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);
    
    return {
      success: true,
      hash: tx.hash,
      receipt: receipt
    };
  } catch (error) {
    console.error('Transaction failed:', error);
    
    let errorMessage = 'Transaction failed';
    if (error.reason) {
      errorMessage = error.reason;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Contract method implementations

// Submit a new project
export const submitProject = async (projectData) => {
  try {
    const contract = await getContract(true);
    
    const {
      projectName,
      developerName,
      description,
      geographicCoordinates,
      siteAddress,
      projectArea,
      ecosystemType,
      startDate,
      expectedProjectDuration,
      restorationMethods,
      baselineCarbonStock,
      estimatedCarbonSequestration,
      supportingDocsHash,
      contactDetails
    } = projectData;

    const contractCall = contract.submitProject(
      projectName,
      developerName,
      description,
      geographicCoordinates,
      siteAddress,
      projectArea,
      ecosystemType,
      startDate,
      expectedProjectDuration,
      restorationMethods,
      baselineCarbonStock,
      estimatedCarbonSequestration,
      supportingDocsHash,
      contactDetails
    );

    return await handleTransaction(contractCall);
  } catch (error) {
    console.error('Error submitting project:', error);
    throw error;
  }
};

// Approve a project (Admin only)
export const approveProject = async (projectId) => {
  try {
    const contract = await getContract(true);
    const contractCall = contract.approveProject(projectId);
    return await handleTransaction(contractCall);
  } catch (error) {
    console.error('Error approving project:', error);
    throw error;
  }
};

// Reject a project (Admin only)
export const rejectProject = async (projectId) => {
  try {
    const contract = await getContract(true);
    const contractCall = contract.rejectProject(projectId);
    return await handleTransaction(contractCall);
  } catch (error) {
    console.error('Error rejecting project:', error);
    throw error;
  }
};

// Mint carbon credits (Admin only)
export const mintCarbonCredit = async (projectId, receiverAddress, amount) => {
  try {
    const contract = await getContract(true);
    const contractCall = contract.mintCarbonCredit(projectId, receiverAddress, amount);
    return await handleTransaction(contractCall);
  } catch (error) {
    console.error('Error minting carbon credit:', error);
    throw error;
  }
};

// Add a developer (Admin only)
export const addDeveloper = async (developerAddress) => {
  try {
    const contract = await getContract(true);
    const contractCall = contract.addDeveloper(developerAddress);
    return await handleTransaction(contractCall);
  } catch (error) {
    console.error('Error adding developer:', error);
    throw error;
  }
};

// Get projects by developer
export const getDeveloperProjects = async (developerAddress) => {
  try {
    const contract = await getContract();
    const projectIds = await contract.getDeveloperProjects(developerAddress);
    
    // Get full project details for each project ID
    const projects = [];
    for (const projectId of projectIds) {
      const project = await getProjectDetails(Number(projectId));
      projects.push(project);
    }
    
    return projects;
  } catch (error) {
    console.error('Error getting developer projects:', error);
    throw error;
  }
};

// Get project details by ID
export const getProjectDetails = async (projectId) => {
  try {
    const contract = await getContract();
    const project = await contract.projects(projectId);
    
    return {
      id: Number(project.id),
      developer: project.developer,
      projectName: project.projectName,
      developerName: project.developerName,
      description: project.description,
      geographicCoordinates: project.geographicCoordinates,
      siteAddress: project.siteAddress,
      projectArea: project.projectArea,
      ecosystemType: project.ecosystemType,
      startDate: Number(project.startDate),
      expectedProjectDuration: project.expectedProjectDuration,
      restorationMethods: project.restorationMethods,
      baselineCarbonStock: project.baselineCarbonStock,
      estimatedCarbonSequestration: project.estimatedCarbonSequestration,
      supportingDocsHash: project.supportingDocsHash,
      contactDetails: project.contactDetails,
      status: Number(project.status) // 0: Pending, 1: Approved, 2: Rejected
    };
  } catch (error) {
    console.error('Error getting project details:', error);
    throw error;
  }
};

// Get tokens for a project
export const getProjectTokens = async (projectId) => {
  try {
    const contract = await getContract();
    const tokenIds = await contract.getProjectTokens(projectId);
    return tokenIds.map(id => Number(id));
  } catch (error) {
    console.error('Error getting project tokens:', error);
    throw error;
  }
};

// Get all projects with pagination
export const getAllProjects = async (startId = 1, endId = null) => {
  try {
    const contract = await getContract();
    const projectCounter = await contract.projectCounter();
    const maxId = endId || Number(projectCounter);
    
    const projects = [];
    for (let i = startId; i <= maxId; i++) {
      try {
        const project = await getProjectDetails(i);
        projects.push(project);
      } catch (error) {
        // Skip if project doesn't exist
        console.warn(`Project ${i} not found:`, error.message);
      }
    }
    
    return projects;
  } catch (error) {
    console.error('Error getting all projects:', error);
    throw error;
  }
};

// Get projects by status
export const getProjectsByStatus = async (status) => {
  try {
    const allProjects = await getAllProjects();
    return allProjects.filter(project => project.status === status);
  } catch (error) {
    console.error('Error getting projects by status:', error);
    throw error;
  }
};

// Get pending projects (status = 0)
export const getPendingProjects = async () => {
  return await getProjectsByStatus(0);
};

// Get approved projects (status = 1)
export const getApprovedProjects = async () => {
  return await getProjectsByStatus(1);
};

// Get rejected projects (status = 2)
export const getRejectedProjects = async () => {
  return await getProjectsByStatus(2);
};

// Get minted credits for a project
export const getMintedCredits = async (projectId) => {
  try {
    const contract = await getContract();
    const mintedCredits = await contract.mintedCredits(projectId);
    return Number(mintedCredits);
  } catch (error) {
    console.error('Error getting minted credits:', error);
    throw error;
  }
};

// Get total project and token counters
export const getCounters = async () => {
  try {
    const contract = await getContract();
    const projectCounter = await contract.projectCounter();
    const tokenCounter = await contract.tokenCounter();
    
    return {
      projectCounter: Number(projectCounter),
      tokenCounter: Number(tokenCounter)
    };
  } catch (error) {
    console.error('Error getting counters:', error);
    throw error;
  }
};

// Check if user has role
export const hasRole = async (role, address) => {
  try {
    const contract = await getContract();
    return await contract.hasRole(role, address);
  } catch (error) {
    console.error('Error checking role:', error);
    throw error;
  }
};

// Get role constants
export const getRoles = async () => {
  try {
    const contract = await getContract();
    const ADMIN_ROLE = await contract.ADMIN_ROLE();
    const PROJECT_DEVELOPER_ROLE = await contract.PROJECT_DEVELOPER_ROLE();
    
    return {
      ADMIN_ROLE,
      PROJECT_DEVELOPER_ROLE
    };
  } catch (error) {
    console.error('Error getting roles:', error);
    throw error;
  }
};

// Listen to contract events
export const listenToEvents = (eventName, callback) => {
  try {
    const contract = getContract();
    contract.on(eventName, callback);
    
    return () => {
      contract.off(eventName, callback);
    };
  } catch (error) {
    console.error('Error setting up event listener:', error);
    throw error;
  }
};

// Status mappings for better readability
export const STATUS_LABELS = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected'
};

export const STATUS_COLORS = {
  0: '#FFA500', // Amber
  1: '#28A745', // Green
  2: '#DC3545'  // Red
};