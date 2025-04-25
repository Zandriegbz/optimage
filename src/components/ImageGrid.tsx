import React from 'react';
import ImageCardDisplay from './ImageCardDisplay'; // Import the card component

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

interface ImageGridProps {
  imageFiles: ImageFileState[];
  getFileTypeInfo: (mimeType: string) => FileTypeInfo; // Pass helper function
  formatBytes: (bytes: number | null, decimals?: number) => string; // Pass helper function
  onRemoveFile: (id: string) => void;
  isProcessing: boolean; // To disable remove buttons
}

const ImageGrid: React.FC<ImageGridProps> = ({
  imageFiles,
  getFileTypeInfo,
  formatBytes,
  onRemoveFile,
  isProcessing
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {imageFiles.map((file) => (
        <ImageCardDisplay
          key={file.id}
          file={file}
          fileTypeInfo={getFileTypeInfo(file.originalType)}
          formatBytes={formatBytes}
          onRemove={onRemoveFile}
          disabled={isProcessing}
        />
      ))}
    </div>
  );
};

export default ImageGrid;