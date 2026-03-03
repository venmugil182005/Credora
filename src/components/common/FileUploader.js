import React, { useState, useRef } from 'react';
import './FileUploader.css';

const FileUploader = ({ 
  onFilesChange, 
  maxFiles = 5, 
  maxSize = 100 * 1024 * 1024, // 100MB
  acceptedTypes = [
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
    'image/webp'
  ]
}) => {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeLabel = (type) => {
    const typeMap = {
      'application/pdf': 'PDF',
      'application/msword': 'Word Doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Doc',
      'application/vnd.ms-excel': 'Excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'text/plain': 'Text',
      'text/csv': 'CSV',
      'image/jpeg': 'JPEG Image',
      'image/png': 'PNG Image',
      'image/gif': 'GIF Image',
      'image/webp': 'WebP Image'
    };
    return typeMap[type] || 'Unknown';
  };

  const validateFiles = (fileList) => {
    const newErrors = [];
    const validFiles = [];

    Array.from(fileList).forEach((file, index) => {
      // Check file size
      if (file.size > maxSize) {
        newErrors.push(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}`);
        return;
      }

      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        newErrors.push(`File "${file.name}" has unsupported type. Accepted types: PDF, Word, Excel, Text, Images`);
        return;
      }

      // Check for duplicates
      if (files.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
        newErrors.push(`File "${file.name}" is already added`);
        return;
      }

      validFiles.push(file);
    });

    // Check total file count
    if (files.length + validFiles.length > maxFiles) {
      newErrors.push(`Cannot add more files. Maximum ${maxFiles} files allowed`);
      return { validFiles: [], errors: newErrors };
    }

    return { validFiles, errors: newErrors };
  };

  const addFiles = (newFiles) => {
    const { validFiles, errors } = validateFiles(newFiles);
    
    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    setErrors([]);
    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    setErrors([]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const clearAll = () => {
    setFiles([]);
    setErrors([]);
    onFilesChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-uploader">
      <div className="upload-header">
        <label className="upload-label">Supporting Documents</label>
        <div className="upload-info">
          {files.length > 0 && (
            <span className="file-count">{files.length}/{maxFiles} files selected</span>
          )}
        </div>
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        accept={acceptedTypes.join(',')}
        style={{ display: 'none' }}
      />

      {/* Drop Zone */}
      <div
        className={`drop-zone ${dragActive ? 'drag-active' : ''} ${files.length > 0 ? 'has-files' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="drop-zone-content">
          <div className="upload-icon">📁</div>
          <div className="drop-text">
            <strong>Drop files here</strong> or <span className="browse-link">browse</span>
          </div>
          <div className="upload-hint">
            Supported: PDF, Word, Excel, Text, Images | Max {formatFileSize(maxSize)} per file
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="upload-errors">
          {errors.map((error, index) => (
            <div key={index} className="error-message">
              ⚠️ {error}
            </div>
          ))}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <span>Selected Files</span>
            <button 
              type="button" 
              className="clear-all-btn"
              onClick={clearAll}
              title="Remove all files"
            >
              Clear All
            </button>
          </div>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="file-item">
              <div className="file-info">
                <div className="file-icon">📄</div>
                <div className="file-details">
                  <div className="file-name" title={file.name}>
                    {file.name}
                  </div>
                  <div className="file-meta">
                    {getFileTypeLabel(file.type)} • {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="remove-file-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                title="Remove file"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Instructions */}
      <div className="upload-instructions">
        <p><strong>Document Requirements:</strong></p>
        <ul>
          <li>Project proposal and technical specifications</li>
          <li>Environmental impact assessment</li>
          <li>Site maps and geographic data</li>
          <li>Baseline studies and monitoring plans</li>
          <li>Legal permits and regulatory approvals</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploader;