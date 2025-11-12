// src/hooks/usePreviewState.js
import { useState, useRef } from 'react';

const UseStates = () => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedJobForPreview, setSelectedJobForPreview] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);
  const [showEvaluationDetails, setShowEvaluationDetails] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentPreviewFileType, setCurrentPreviewFileType] = useState(null);
  const [useCJKMode, setUseCJKMode] = useState(false);
  const [showJurisdictionDropdown, setShowJurisdictionDropdown] = useState(false);
  const docxPreviewRef = useRef(null);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(null);
  const [showPromptSection, setShowPromptSection] = useState(false);
  const [showOptionsSection, setShowOptionsSection] = useState(false);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [convertingToPdf, setConvertingToPdf] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  return {
    numPages,
    setNumPages,
    pageNumber,
    setPageNumber,
    selectedJobForPreview,
    setSelectedJobForPreview,
    previewingFile,
    setPreviewingFile,
    showEvaluationDetails,
    setShowEvaluationDetails,
    previewUrl,
    setPreviewUrl,
    currentPreviewFileType,
    setCurrentPreviewFileType,
    useCJKMode,
    setUseCJKMode,
    showJurisdictionDropdown,
    setShowJurisdictionDropdown,
    docxPreviewRef,
    selectedJurisdiction,
    setSelectedJurisdiction,
    showPromptSection,
    setShowPromptSection,
    showOptionsSection,
    setShowOptionsSection,
    showFileSelector,
    setShowFileSelector,
    convertingToPdf,
    setConvertingToPdf,
    hoveredItem,
    setHoveredItem,
  };
};

export default UseStates;
