import { translationAPI } from "../HomeLogic";

export const previewCJKPdf = async (downloadId, setPreviewUrl, setCurrentPreviewFileType, setUseCJKMode, setShowPreview) => {
  try {
    const response = await translationAPI.download(downloadId);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setCurrentPreviewFileType('application/pdf');
    setUseCJKMode(true);
    setShowPreview(true);
  } catch (err) {
    console.error('CJK PDF Preview fetch error', err);
  }
};