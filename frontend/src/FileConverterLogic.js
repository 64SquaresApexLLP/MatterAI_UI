import { useState, useRef } from 'react';

export const useFileConverter = () => {
  const [conversionFile, setConversionFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState(null);
  const [conversionSuccess, setConversionSuccess] = useState(null);
  const conversionFileInputRef = useRef(null);

  const handleConversionFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    const isValidType = validTypes.includes(file.type) || 
                       file.name.match(/\.(pdf|docx?|doc)$/i);

    if (!isValidType) {
      setConversionError('Please upload only PDF or DOCX files for conversion.');
      return;
    }

    setConversionFile(file);
    setConversionError(null);
    setConversionSuccess(null);
  };

  const handleConversionDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    const isValidType = validTypes.includes(file.type) || 
                       file.name.match(/\.(pdf|docx?|doc)$/i);

    if (!isValidType) {
      setConversionError('Please upload only PDF or DOCX files for conversion.');
      return;
    }

    setConversionFile(file);
    setConversionError(null);
    setConversionSuccess(null);
  };

  const removeConversionFile = () => {
    setConversionFile(null);
    setConversionError(null);
    setConversionSuccess(null);
    if (conversionFileInputRef.current) {
      conversionFileInputRef.current.value = '';
    }
  };

  /**
   * Convert file to specified target format
   * @param {string} targetFormat - 'pdf' or 'docx'
   */
  const convertFile = async (targetFormat) => {
    if (!conversionFile) {
      setConversionError('Please upload a file first.');
      return;
    }

    if (!targetFormat) {
      setConversionError('Please select a target format.');
      return;
    }

    // Validate conversion request
    const currentFileType = conversionFile.name.toLowerCase();
    const isPdf = currentFileType.endsWith('.pdf');
    const isDocx = currentFileType.match(/\.(docx?|doc)$/i);

    if ((isPdf && targetFormat === 'pdf') || (isDocx && targetFormat === 'docx')) {
      setConversionError(`File is already in ${targetFormat.toUpperCase()} format.`);
      return;
    }

    setIsConverting(true);
    setConversionError(null);
    setConversionSuccess(null);

    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('file', conversionFile);
      formData.append('target_format', targetFormat);

      // Make API request to conversion endpoint
      const response = await fetch(
        `${import.meta.env.VITE_TRANSLATION_API_URL}/convert_file/`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || 
          errorData.message || 
          `Conversion failed with status ${response.status}`
        );
      }

      // Get the converted file blob
      const blob = await response.blob();
      
      // Generate filename for converted file
      const originalName = conversionFile.name.replace(/\.[^/.]+$/, '');
      const newExtension = targetFormat === 'pdf' ? 'pdf' : 'docx';
      const convertedFileName = `${originalName}_converted.${newExtension}`;

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = convertedFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setConversionSuccess(`File successfully converted to ${targetFormat.toUpperCase()}!`);
      
      // Clear file after successful conversion
      setTimeout(() => {
        removeConversionFile();
      }, 2000);

    } catch (error) {
      console.error('Conversion error:', error);
      setConversionError(
        error.message || 
        'Failed to convert file. Please try again or contact support.'
      );
    } finally {
      setIsConverting(false);
    }
  };

  return {
    conversionFile,
    isConverting,
    conversionError,
    conversionSuccess,
    conversionFileInputRef,
    handleConversionFileSelect,
    handleConversionDrop,
    removeConversionFile,
    convertFile,
  };
};

/**
 * Utility function to detect file type
 */
export const getFileType = (fileName) => {
  const extension = fileName.toLowerCase().split('.').pop();
  
  const typeMap = {
    pdf: 'PDF',
    doc: 'Word',
    docx: 'Word',
  };

  return typeMap[extension] || 'Unknown';
};

/**
 * Utility function to get appropriate icon color
 */
export const getFileIconColor = (fileName) => {
  const extension = fileName.toLowerCase().split('.').pop();
  
  const colorMap = {
    pdf: 'text-red-500',
    doc: 'text-blue-500',
    docx: 'text-blue-500',
  };

  return colorMap[extension] || 'text-gray-500';
};

/**
 * Utility function to format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};