# IPFS Document Upload Setup Guide

## Overview

This implementation allows developers to upload supporting documents directly through the Developer Dashboard. Files are uploaded to IPFS via Pinata service and the IPFS Content Identifiers (CIDs) are stored in the smart contract on the blockchain.

## Setup Instructions

### 1. Pinata Account Setup

1. Go to [Pinata.cloud](https://pinata.cloud/) and create a free account
2. Navigate to your dashboard and click on "API Keys" in the left sidebar
3. Create a new API key with the following permissions:
   - `pinFileToIPFS`
   - `pinning/pinFileToIPFS`
   - `data/pinList`
   - `data/testAuthentication`
4. Copy your API Key and Secret API Key

### 2. Environment Configuration

1. Copy `.env.example` to `.env` in the project root
2. Add your Pinata credentials:
   ```
   REACT_APP_PINATA_API_KEY=your_actual_api_key_here
   REACT_APP_PINATA_SECRET_API_KEY=your_actual_secret_key_here
   ```

### 3. Install Dependencies

The implementation uses built-in browser APIs and doesn't require additional packages.

## How It Works

### File Upload Process

1. **File Selection**: Developer selects documents through the file uploader
2. **Validation**: Files are validated for:
   - Supported file types (PDF, Word, Excel, Images, etc.)
   - File size limits (100MB per file)
   - Maximum number of files (10 per project)
3. **IPFS Upload**: Files are uploaded to IPFS via Pinata API
4. **CID Storage**: IPFS Content Identifiers are stored in the smart contract
5. **Blockchain Transaction**: Project data with IPFS CIDs is stored on blockchain

### Supported File Types

- **Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
- **Images**: JPEG, PNG, GIF, WebP
- **Data**: JSON files

### File Structure

The uploaded CIDs are stored as a JSON array in the `supportingDocsHash` field:

```json
["QmXx1...abc123", "QmYy2...def456", "QmZz3...ghi789"]
```

## Features

### Multiple File Upload

- Drag and drop support
- Browse file selection
- Multiple file selection
- Real-time file validation
- Progress indicators

### File Management

- File list with metadata
- Individual file removal
- Clear all files option
- File type and size display

### Error Handling

- Connection testing
- Upload failure recovery
- Detailed error messages
- Validation feedback

## Accessing Uploaded Files

Files can be accessed using their IPFS CIDs through any IPFS gateway:

- **Pinata Gateway**: `https://gateway.pinata.cloud/ipfs/{CID}`
- **Public IPFS Gateway**: `https://ipfs.io/ipfs/{CID}`
- **Cloudflare IPFS**: `https://cloudflare-ipfs.com/ipfs/{CID}`

## Usage Example

```javascript
// In your component
import IPFSService from "../services/ipfs";

// Upload files
const uploadResult = await IPFSService.uploadMultipleFiles(files);
if (uploadResult.success) {
  const cids = uploadResult.results.map((r) => r.hash);
  // Store CIDs in smart contract
}

// Access file
const fileUrl = IPFSService.getPublicURL("QmXx1...abc123");
```

## Troubleshooting

### Common Issues

1. **Upload Failures**

   - Check API credentials in `.env` file
   - Verify file size limits
   - Test internet connection

2. **File Access Issues**

   - IPFS propagation may take a few minutes
   - Try different IPFS gateways
   - Check CID validity

3. **API Errors**
   - Verify Pinata account limits
   - Check API key permissions
   - Monitor Pinata service status

### Testing Connection

The IPFS service includes a connection test function:

```javascript
const testResult = await IPFSService.testConnection();
console.log(testResult.success ? "Connected" : testResult.error);
```

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **File Content**: Uploaded files are publicly accessible via IPFS
3. **File Validation**: Only upload necessary documents
4. **Size Limits**: Respect Pinata account limits

## Future Enhancements

- File encryption before upload
- Private IPFS networks
- Document versioning
- Bulk download functionality
- Advanced file preview

## Support

For issues related to:

- **Pinata Service**: Check [Pinata Documentation](https://docs.pinata.cloud/)
- **IPFS Protocol**: Visit [IPFS Documentation](https://docs.ipfs.io/)
- **Implementation**: Review the code in `src/services/ipfs.js`
