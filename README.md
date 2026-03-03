# Credora - Blue Carbon Registry

## Setup Instructions

### Google Earth Engine Credentials

This application requires Google Earth Engine service account credentials to function. Follow these steps to set up the credentials:

1. **Create or obtain a Google Earth Engine service account**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Earth Engine API
   - Create a service account and download the JSON credentials file

2. **Set up the credentials file**:
   - Copy `map_ui/bluecarbon-credentials-template.json` to `map_ui/bluecarbon-472509-323c9f30a13f.json`
   - Replace the placeholder values with your actual credentials from the downloaded JSON file

3. **Important Security Note**:
   - The credentials file (`bluecarbon-472509-323c9f30a13f.json`) is excluded from Git tracking for security reasons
   - Never commit this file to version control
   - Keep your credentials secure and do not share them publicly

## Installation

1. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   cd ../map_ui && npm install
   ```

2. Set up your Google Earth Engine credentials (see above)

3. Start the applications:
   ```bash
   # Start the main frontend
   npm start
   
   # Start the backend (in another terminal)
   cd backend && npm start
   
   # Start the map UI service (in another terminal)
   cd map_ui && npm start
   ```

## Project Structure

- `/src` - Main React application
- `/backend` - Backend API server
- `/map_ui` - Google Earth Engine map service
- `/contract` - Blockchain smart contracts
- `/public` - Static assets

## Features

- Blue Carbon Registry management
- Satellite imagery analysis
- Mangrove monitoring
- NFT integration for carbon credits
- Administrative dashboard
