// API service for backend interactions with MongoDB
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data;
};

// API service object
export const api = {
  // Submit buyer registration to MongoDB
  submitBuyerRequest: async (requestData) => {
    try {
      console.log('Submitting buyer registration to MongoDB:', requestData);
      
      const response = await fetch(`${API_BASE_URL}/api/buyer-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      return await handleResponse(response);
      
    } catch (error) {
      console.error('Error submitting buyer registration:', error);
      throw error;
    }
  },

  // Get buyer registrations from MongoDB (Admin)
  getBuyerRequests: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/buyer-registrations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      return await handleResponse(response);
      
    } catch (error) {
      console.error('Error fetching buyer registrations:', error);
      // Return empty array as fallback
      return [];
    }
  },

  // Submit carbon credit request to MongoDB
  submitCreditRequest: async (requestData) => {
    try {
      console.log('Submitting credit request to MongoDB:', requestData);
      
      const response = await fetch(`${API_BASE_URL}/api/credit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      return await handleResponse(response);
      
    } catch (error) {
      console.error('Error submitting credit request:', error);
      throw error;
    }
  },

  // Get credit requests from MongoDB (Admin)
  getCreditRequests: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/credit-requests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      return await handleResponse(response);
      
    } catch (error) {
      console.error('Error fetching credit requests:', error);
      return [];
    }
  },

  // Update buyer registration status (Admin)
  updateBuyerRegistrationStatus: async (registrationId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/buyer-registration/${registrationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      
      return await handleResponse(response);
      
    } catch (error) {
      console.error('Error updating registration status:', error);
      throw error;
    }
  },

  // Update credit request status (Admin)
  updateCreditRequestStatus: async (requestId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/credit-request/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      
      return await handleResponse(response);
      
    } catch (error) {
      console.error('Error updating credit request status:', error);
      throw error;
    }
  },

  // Get registration statistics (Admin)
  getRegistrationStats: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats/registrations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      return await handleResponse(response);
      
    } catch (error) {
      console.error('Error fetching registration stats:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        organizationTypes: []
      };
    }
  },

  // Check backend health
  checkHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      return await handleResponse(response);
      
    } catch (error) {
      console.error('Backend health check failed:', error);
      return { status: 'ERROR', message: 'Backend not available' };
    }
  },

  // Send email notification (placeholder for future implementation)
  sendEmailNotification: async (emailData) => {
    console.log('Email notification would be sent:', emailData);
    
    // TODO: Implement email service integration (SendGrid, Mailgun, etc.)
    return {
      success: true,
      message: 'Email notification logged (not actually sent)'
    };
  }
};

export default api;