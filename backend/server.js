const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection string
//const mongoConnectionString = <use your connection string here>;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(mongoConnectionString)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Buyer Registration Schema
const buyerRegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  organization: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  organizationType: { type: String, required: true },
  website: { type: String },
  address: { type: String, required: true },
  annualEmissions: { type: Number },
  sustainabilityGoals: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
  timestamp: { type: Date, default: Date.now },
  walletAddress: { type: String }
});

// Carbon Credit Request Schema
const creditRequestSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  projectName: { type: String, required: true },
  buyerName: { type: String, required: true },
  organization: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  requestedCredits: { type: Number, required: true },
  useCase: { type: String, required: true },
  targetPrice: { type: Number },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  additionalNotes: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected', 'fulfilled'] },
  timestamp: { type: Date, default: Date.now }
});

// Create Models
const BuyerRegistration = mongoose.model('BuyerRegistration', buyerRegistrationSchema);
const CreditRequest = mongoose.model('CreditRequest', creditRequestSchema);

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Submit buyer registration
app.post('/api/buyer-registration', async (req, res) => {
  try {
    console.log('Received buyer registration data:', req.body);
    
    // Check if email already exists
    const existingRegistration = await BuyerRegistration.findOne({ email: req.body.email });
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Registration with this email already exists'
      });
    }

    // Create new registration
    const registration = new BuyerRegistration(req.body);
    const savedRegistration = await registration.save();
    
    console.log('Buyer registration saved:', savedRegistration._id);
    
    res.json({
      success: true,
      id: savedRegistration._id,
      message: 'Registration submitted successfully'
    });
    
  } catch (error) {
    console.error('Error submitting buyer registration:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting registration',
      error: error.message
    });
  }
});

// Get all buyer registrations (for admin)
app.get('/api/buyer-registrations', async (req, res) => {
  try {
    const registrations = await BuyerRegistration.find()
      .sort({ timestamp: -1 })
      .lean();
    
    // Format data for frontend
    const formattedRegistrations = registrations.map(reg => ({
      id: reg._id,
      name: reg.name,
      organization: reg.organization,
      email: reg.email,
      phone: reg.phone,
      address: reg.address,
      organizationType: reg.organizationType,
      website: reg.website,
      annualEmissions: reg.annualEmissions,
      sustainabilityGoals: reg.sustainabilityGoals,
      status: reg.status,
      requestDate: reg.timestamp.toISOString().split('T')[0]
    }));
    
    res.json(formattedRegistrations);
    
  } catch (error) {
    console.error('Error fetching buyer registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
});

// Submit carbon credit request
app.post('/api/credit-request', async (req, res) => {
  try {
    console.log('Received credit request data:', req.body);
    
    // Create new credit request
    const creditRequest = new CreditRequest(req.body);
    const savedRequest = await creditRequest.save();
    
    console.log('Credit request saved:', savedRequest._id);
    
    // Generate request ID
    const requestId = `CR-${savedRequest._id.toString().slice(-8).toUpperCase()}`;
    
    res.json({
      success: true,
      requestId: requestId,
      id: savedRequest._id,
      message: 'Credit request submitted successfully'
    });
    
  } catch (error) {
    console.error('Error submitting credit request:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting credit request',
      error: error.message
    });
  }
});

// Get all credit requests (for admin)
app.get('/api/credit-requests', async (req, res) => {
  try {
    const requests = await CreditRequest.find()
      .sort({ timestamp: -1 })
      .lean();
    
    res.json(requests);
    
  } catch (error) {
    console.error('Error fetching credit requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching credit requests',
      error: error.message
    });
  }
});

// Update registration status (for admin)
app.patch('/api/buyer-registration/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const updatedRegistration = await BuyerRegistration.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!updatedRegistration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    res.json({
      success: true,
      message: `Registration ${status} successfully`,
      registration: updatedRegistration
    });
    
  } catch (error) {
    console.error('Error updating registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating registration status',
      error: error.message
    });
  }
});

// Update credit request status (for admin)
app.patch('/api/credit-request/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected', 'fulfilled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const updatedRequest = await CreditRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: 'Credit request not found'
      });
    }
    
    res.json({
      success: true,
      message: `Credit request ${status} successfully`,
      request: updatedRequest
    });
    
  } catch (error) {
    console.error('Error updating credit request status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating credit request status',
      error: error.message
    });
  }
});

// Get registration statistics
app.get('/api/stats/registrations', async (req, res) => {
  try {
    const totalRegistrations = await BuyerRegistration.countDocuments();
    const pendingRegistrations = await BuyerRegistration.countDocuments({ status: 'pending' });
    const approvedRegistrations = await BuyerRegistration.countDocuments({ status: 'approved' });
    const rejectedRegistrations = await BuyerRegistration.countDocuments({ status: 'rejected' });
    
    const organizationTypes = await BuyerRegistration.aggregate([
      { $group: { _id: '$organizationType', count: { $sum: 1 } } }
    ]);
    
    res.json({
      total: totalRegistrations,
      pending: pendingRegistrations,
      approved: approvedRegistrations,
      rejected: rejectedRegistrations,
      organizationTypes: organizationTypes
    });
    
  } catch (error) {
    console.error('Error fetching registration statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Credora Backend Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🌐 API endpoints available at http://localhost:${PORT}/api/`);
});

module.exports = app;
