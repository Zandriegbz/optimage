import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XCircle, FileWarning, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Re-define minimal types needed here or import from Index/types file
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

interface ImageCardDisplayProps {
  file: ImageFileState;
  fileTypeInfo: FileTypeInfo;
  formatBytes: (bytes: number | null, decimals?: number) => string;
  onRemove: (id: string) => void;
  disabled: boolean; // To disable remove button during processing
}

const ImageCardDisplay: React.FC<ImageCardDisplayProps> = ({
  file,
  fileTypeInfo,
  formatBytes,
  onRemove,
  disabled
}) => {
  const isDone = file.status === 'done' && file.compressedSize !== null;
  const sizeReduced = isDone && file.compressedSize! < file.originalSize;
  const sizeIncreased = isDone && file.compressedSize! > file.originalSize;

  return (
    <Card key={file.id} className="relative overflow-hidden group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 z-10 bg-background/50 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(file.id)}
        disabled={disabled}
        aria-label="Remove file"
      >
        <XCircle className="h-4 w-4" />
      </Button>
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-center items-center h-32 bg-muted rounded-md overflow-hidden">
          <img
            src={file.compressedImageUrl ?? file.originalImageUrl}
            alt={file.originalFile.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium truncate flex-1" title={file.originalFile.name}>{file.originalFile.name}</p>
          <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5 border", fileTypeInfo.badgeClassName)}>
            {fileTypeInfo.label}
          </Badge>
        </div>
        {/* Size and Status Row */}
        <div className="text-xs text-muted-foreground flex justify-between items-center">
          <span className="flex-shrink-0">{formatBytes(file.originalSize)}</span>
          <div className="flex-grow flex justify-center items-center px-1">
            {isDone && <ArrowRight className={cn("h-3 w-3", sizeReduced ? "text-green-500" : sizeIncreased ? "text-red-500" : "text-gray-400")} />}
            {file.status === 'error' && (<FileWarning className="h-3 w-3 text-red-500" />)}
            {/* Individual status icons removed as global loader is used */}
            {/* {(file.status === 'compressing' || file.status === 'loading_dims') && (<Loader2 className="h-3 w-3 animate-spin text-blue-500" />)} */}
            {file.status === 'pending' && (<span className="text-xs text-gray-500">...</span>)}
          </div>
          <span className={cn(
              "flex-shrink-0 font-semibold",
              isDone && sizeReduced && "text-green-600",
              isDone && sizeIncreased && "text-red-600",
              isDone && !sizeReduced && !sizeIncreased && "text-gray-500",
              file.status === 'error' && "text-red-600",
              // Hide placeholder only if actively compressing/loading dims (covered by global loader)
              (file.status === 'compressing' || file.status === 'loading_dims') && "text-transparent",
              (file.status === 'pending') && "text-gray-500" // Show placeholder if pending
          )}>
              {isDone ? formatBytes(file.compressedSize) : file.status === 'error' ? 'Error' : '...'}
          </span>
        </div>
        {file.status === 'error' && file.error && (<p className="text-xs text-red-600 truncate" title={file.error}>{file.error}</p>)}
      </CardContent>
    </Card>
  );
};

export default ImageCardDisplay;