/**
 * IPFS Service for uploading and managing documents
 * Uses Pinata as the IPFS gateway service
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud';

class IPFSService {
  constructor() {
    this.apiKey = process.env.REACT_APP_PINATA_API_KEY;
    this.apiSecret = process.env.REACT_APP_PINATA_SECRET_API_KEY;
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('IPFS Service: Pinata API keys not found in environment variables');
    }
  }

  /**
   * Upload a single file to IPFS via Pinata
   * @param {File} file - The file to upload
   * @param {string} name - Optional name for the file
   * @returns {Promise<{success: boolean, hash?: string, error?: string}>}
   */
  async uploadFile(file, name = null) {
    try {
      if (!this.apiKey || !this.apiSecret) {
        throw new Error('Pinata API credentials not configured');
      }

      if (!file) {
        throw new Error('No file provided');
      }

      // Check file size (Pinata free tier has 1GB limit per file)
      const maxSize = 100 * 1024 * 1024; // 100MB limit for safety
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 100MB');
      }

      const formData = new FormData();
      formData.append('file', file);

      // Add metadata
      const metadata = {
        name: name || file.name,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          fileSize: file.size.toString(),
          fileType: file.type
        }
      };
      formData.append('pinataMetadata', JSON.stringify(metadata));

      // Add pinning options
      const options = {
        cidVersion: 0,
        customPinPolicy: {
          regions: [
            {
              id: 'FRA1',
              desiredReplicationCount: 1
            },
            {
              id: 'NYC1', 
              desiredReplicationCount: 1
            }
          ]
        }
      };
      formData.append('pinataOptions', JSON.stringify(options));

      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'pinata_api_key': this.apiKey,
          'pinata_secret_api_key': this.apiSecret,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        hash: result.IpfsHash,
        size: result.PinSize,
        timestamp: result.Timestamp
      };

    } catch (error) {
      console.error('IPFS upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload multiple files to IPFS
   * @param {File[]} files - Array of files to upload
   * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
   */
  async uploadMultipleFiles(files) {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      // Upload all files in parallel
      const uploadPromises = files.map((file, index) => 
        this.uploadFile(file, `document_${index + 1}_${file.name}`)
      );

      const results = await Promise.all(uploadPromises);
      
      // Check if any uploads failed
      const failures = results.filter(result => !result.success);
      if (failures.length > 0) {
        return {
          success: false,
          error: `Failed to upload ${failures.length} file(s): ${failures.map(f => f.error).join(', ')}`
        };
      }

      return {
        success: true,
        results: results.map(result => ({
          hash: result.hash,
          size: result.size,
          timestamp: result.timestamp
        }))
      };

    } catch (error) {
      console.error('Multiple file upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the public URL for an IPFS hash
   * @param {string} hash - The IPFS hash
   * @returns {string} Public URL
   */
  getPublicURL(hash) {
    return `${PINATA_GATEWAY_URL}/ipfs/${hash}`;
  }

  /**
   * Get file metadata from Pinata
   * @param {string} hash - The IPFS hash
   * @returns {Promise<{success: boolean, metadata?: object, error?: string}>}
   */
  async getFileMetadata(hash) {
    try {
      if (!this.apiKey || !this.apiSecret) {
        throw new Error('Pinata API credentials not configured');
      }

      const response = await fetch(
        `${PINATA_API_URL}/data/pinList?hashContains=${hash}&status=pinned`,
        {
          method: 'GET',
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.rows && data.rows.length > 0) {
        return {
          success: true,
          metadata: data.rows[0]
        };
      } else {
        return {
          success: false,
          error: 'File not found'
        };
      }

    } catch (error) {
      console.error('Get metadata error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test the IPFS service connection
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async testConnection() {
    try {
      if (!this.apiKey || !this.apiSecret) {
        return {
          success: false,
          error: 'API credentials not configured'
        };
      }

      const response = await fetch(`${PINATA_API_URL}/data/testAuthentication`, {
        method: 'GET',
        headers: {
          'pinata_api_key': this.apiKey,
          'pinata_secret_api_key': this.apiSecret,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: result.message
      };

    } catch (error) {
      console.error('IPFS connection test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if file type is supported
   * @param {File} file - The file to check
   * @returns {boolean} Whether the file type is supported
   */
  isSupportedFileType(file) {
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/json'
    ];
    
    return supportedTypes.includes(file.type);
  }
}

// Export singleton instance
export default new IPFSService();