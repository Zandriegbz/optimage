import React from 'react';
import { Loader2, Files } from "lucide-react";
import ImageGrid from './ImageGrid'; // Import the grid component

// Re-define types or import
interface ImageFileState {
  id: string;
  originalFile: File;
  originalImageUrl: string;
  originalSize: number;
  originalType: string;
  compressedImageUrl: string | null;
  compressedSize: number | null;
  status: 'pending' | 'loading_dims' | 'compressing' | 'done' | 'error';
  error: string | null;
}
interface FileTypeInfo {
    label: string;
    badgeClassName: string;
}

interface ImageProcessingDisplayProps {
  isProcessing: boolean;
  imageFiles: ImageFileState[];
  getFileTypeInfo: (mimeType: string) => FileTypeInfo;
  formatBytes: (bytes: number | null, decimals?: number) => string;
  onRemoveFile: (id: string) => void;
}

const ImageProcessingDisplay: React.FC<ImageProcessingDisplayProps> = ({
  isProcessing,
  imageFiles,
  getFileTypeInfo,
  formatBytes,
  onRemoveFile
}) => {
  const totalFiles = imageFiles.length;

  return (
    <div className="border-t pt-6 space-y-4">
      <h3 className="text-lg font-semibold flex items-center justify-center gap-2"><Files className="w-5 h-5" /> 3. Files ({totalFiles})</h3>
      {isProcessing ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-lg font-medium">Processing Images...</p>
          <p>Please wait, this may take a moment.</p>
        </div>
      ) : (
        <ImageGrid
          imageFiles={imageFiles}
          getFileTypeInfo={getFileTypeInfo}
          formatBytes={formatBytes}
          onRemoveFile={onRemoveFile}
          isProcessing={isProcessing} // Pass isProcessing to disable remove buttons in cards
        />
      )}
    </div>
  );
};

export default ImageProcessingDisplay;