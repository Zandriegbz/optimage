"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, PartyPopper, ArrowRight } from "lucide-react"; // Keep necessary icons
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Import Child Components
import ImageUploadInput from '@/components/ImageUploadInput';
import SettingsTabs from '@/components/SettingsTabs';
import ImageProcessingDisplay from '@/components/ImageProcessingDisplay';
import ActionButtons from '@/components/ActionButtons';

// --- Constants ---
const DEFAULT_MAX_DIMENSION = 1920;
const MAX_SLIDER_DIMENSION = 4000; // Represents "Original" dimension

// --- Interfaces (Keep here or move to types file) ---
interface ImageFileState {
  id: string;
  originalFile: File;
  originalImageUrl: string;
  originalSize: number;
  originalType: string;
  originalDimensions: { width: number; height: number } | null;
  compressedFile: File | null;
  compressedImageUrl: string | null;
  compressedSize: number | null;
  compressedType: string | null;
  compressedDimensions: { width: number; height: number } | null;
  status: 'pending' | 'loading_dims' | 'compressing' | 'done' | 'error';
  error: string | null;
}

// --- Helper Functions (Keep here or move to utils) ---
const formatBytes = (bytes: number | null, decimals = 2) => {
  if (bytes === null || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getImageDimensions = (fileUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = (err) => reject(new Error("Could not load image to get dimensions."));
    img.src = fileUrl;
  });
};

const getFileTypeInfo = (mimeType: string): { label: string; badgeClassName: string; controlClassName: string; tabTriggerClassName: string } => {
   const subtype = mimeType?.split('/')[1] || 'unknown';
   const baseTabTrigger = "data-[state=active]:shadow-sm";
   switch (subtype) {
      case 'jpeg': return { label: 'JPG', badgeClassName: 'bg-orange-100 text-orange-800 border-orange-200', controlClassName: 'text-orange-700 border-orange-300', tabTriggerClassName: cn(baseTabTrigger, 'data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900') };
      case 'png': return { label: 'PNG', badgeClassName: 'bg-blue-100 text-blue-800 border-blue-200', controlClassName: 'text-blue-700 border-blue-300', tabTriggerClassName: cn(baseTabTrigger, 'data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900') };
      case 'webp': return { label: 'WEBP', badgeClassName: 'bg-green-100 text-green-800 border-green-200', controlClassName: 'text-green-700 border-green-300', tabTriggerClassName: cn(baseTabTrigger, 'data-[state=active]:bg-green-100 data-[state=active]:text-green-900') };
      case 'gif': return { label: 'GIF', badgeClassName: 'bg-purple-100 text-purple-800 border-purple-200', controlClassName: 'text-purple-700 border-purple-300', tabTriggerClassName: cn(baseTabTrigger, 'data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900') };
      default: return { label: subtype.toUpperCase(), badgeClassName: 'bg-gray-100 text-gray-800 border-gray-200', controlClassName: 'text-gray-700 border-gray-300', tabTriggerClassName: cn(baseTabTrigger, 'data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900') };
   }
};


// --- Main Page Component ---
const Index: React.FC = () => {
  // --- State ---
  const [imageFiles, setImageFiles] = useState<ImageFileState[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Settings State
  const [jpegQuality, setJpegQuality] = useState<number>(0.7);
  const [enableResizingLossy, setEnableResizingLossy] = useState<boolean>(false);
  const [pngMaxDimension, setPngMaxDimension] = useState<number>(DEFAULT_MAX_DIMENSION);
  const [maxSizeTarget, setMaxSizeTarget] = useState<number>(1);

  // Refs
  const objectUrlRefs = useRef<Record<string, { original: string | null, compressed: string | null }>>({});

  // --- Core Logic ---
  const updateFileState = (id: string, updates: Partial<ImageFileState>) => {
    setImageFiles(currentFiles =>
      currentFiles.map(file =>
        file.id === id ? { ...file, ...updates } : file
      )
    );
  };

  const runCompressionOnFile = async (fileState: ImageFileState): Promise<Partial<ImageFileState>> => {
    const { id, originalFile, originalDimensions, originalType } = fileState;
    updateFileState(id, { status: 'compressing', error: null });

    try {
      const isLossyFormat = originalType === 'image/jpeg' || originalType === 'image/webp';
      const isPngFormat = originalType === 'image/png';
      let options: imageCompression.Options = { useWebWorker: true };

      if (isLossyFormat) {
        options = { ...options, maxSizeMB: maxSizeTarget, maxWidthOrHeight: enableResizingLossy ? DEFAULT_MAX_DIMENSION : undefined, initialQuality: jpegQuality };
      } else if (isPngFormat) {
        options = { ...options, maxWidthOrHeight: pngMaxDimension < MAX_SLIDER_DIMENSION ? pngMaxDimension : undefined };
      }

      const activeOptions = Object.entries(options).reduce((acc, [key, value]) => { if (value !== undefined) acc[key] = value; return acc; }, {} as imageCompression.Options);
      const compressedFile = await imageCompression(originalFile, activeOptions);

      if (objectUrlRefs.current[id]?.compressed) URL.revokeObjectURL(objectUrlRefs.current[id].compressed!);
      const compressedObjectUrl = URL.createObjectURL(compressedFile);
      objectUrlRefs.current[id] = { ...objectUrlRefs.current[id], compressed: compressedObjectUrl };

      const compDims = await getImageDimensions(compressedObjectUrl);

      return { compressedFile, compressedImageUrl: compressedObjectUrl, compressedSize: compressedFile.size, compressedType: compressedFile.type, compressedDimensions: compDims, status: 'done', error: null };
    } catch (err) {
      console.error(`Compression error for ${originalFile.name} (${id}):`, err);
      return { status: 'error', error: err instanceof Error ? err.message : String(err), compressedFile: null, compressedImageUrl: null, compressedSize: null, compressedType: null, compressedDimensions: null };
    }
  };

  const processFiles = useCallback(async (filesToProcess: ImageFileState[]) => {
    if (filesToProcess.length === 0 || isProcessing) return;
    setIsProcessing(true);

    for (const fileState of filesToProcess) {
      if (fileState.status === 'error') continue;

      let currentDims = fileState.originalDimensions;
      if (!currentDims) {
        try {
          updateFileState(fileState.id, { status: 'loading_dims' });
          currentDims = await getImageDimensions(fileState.originalImageUrl);
          updateFileState(fileState.id, { originalDimensions: currentDims });
        } catch (dimError) {
          console.error(`Dimension loading error for ${fileState.originalFile.name} (${fileState.id}):`, dimError);
          updateFileState(fileState.id, { status: 'error', error: 'Failed to load image dimensions.' }); continue;
        }
      }
      const updates = await runCompressionOnFile({ ...fileState, originalDimensions: currentDims });
      updateFileState(fileState.id, updates);
    }

    setIsProcessing(false);
  }, [enableResizingLossy, jpegQuality, maxSizeTarget, pngMaxDimension, isProcessing]);


  const triggerReprocessing = useCallback(() => {
      const applicableFiles = imageFiles.filter(f => f.status === 'pending' || f.status === 'done');
      if (applicableFiles.length > 0 && !isProcessing) {
          const filesToReprocess = applicableFiles.map(f => {
              if (f.status === 'done') {
                  if (objectUrlRefs.current[f.id]?.compressed) {
                      URL.revokeObjectURL(objectUrlRefs.current[f.id].compressed!);
                      objectUrlRefs.current[f.id].compressed = null;
                  }
                  return { ...f, status: 'pending', compressedFile: null, compressedImageUrl: null, compressedSize: null, compressedType: null, compressedDimensions: null, error: null } as ImageFileState;
              }
              return f;
          });
          setImageFiles(current => current.map(cf => {
              const updatedFile = filesToReprocess.find(uf => uf.id === cf.id);
              return updatedFile || cf;
          }));
          setTimeout(() => { processFiles(filesToReprocess); }, 0);
      } else if (isProcessing) {
          console.log("Settings committed, but processing is ongoing. Skipping reprocess.");
      }
  }, [imageFiles, isProcessing, processFiles]);


  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files; if (!files || files.length === 0) return;
    const newImageFiles: ImageFileState[] = [];

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) { console.warn(`Skipping non-image file: ${file.name}`); return; }
      const id = `${file.name}-${file.lastModified}-${Math.random()}`;
      const originalImageUrl = URL.createObjectURL(file);
      objectUrlRefs.current[id] = { original: originalImageUrl, compressed: null };
      newImageFiles.push({ id, originalFile: file, originalImageUrl, originalSize: file.size, originalType: file.type, originalDimensions: null, compressedFile: null, compressedImageUrl: null, compressedSize: null, compressedType: null, compressedDimensions: null, status: 'pending', error: null });
    });

    if (newImageFiles.length === 0) { event.target.value = ''; return; }
    setImageFiles(current => [...current, ...newImageFiles]);
    await new Promise(resolve => setTimeout(resolve, 0));
    await processFiles(newImageFiles);
    event.target.value = '';
  }, [processFiles]);

  // --- Settings Handlers ---
  const handleQualityChange = (value: number[]) => { setJpegQuality(value[0]); };
  const handlePngDimensionChange = (value: number[]) => { setPngMaxDimension(value[0]); };
  const handleResizingChangeLossy = (checked: boolean) => {
    setEnableResizingLossy(checked);
    triggerReprocessing();
  };

  // --- Action Handlers ---
  const handleDownloadAll = () => {
    const filesToDownload = imageFiles.filter(f => f.status === 'done' && f.compressedFile);
    if (filesToDownload.length === 0) {
      toast.error("No successfully compressed files to download.");
      return;
    }

    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    filesToDownload.forEach((fileState, index) => {
      totalOriginalSize += fileState.originalSize;
      totalCompressedSize += fileState.compressedSize!;
      setTimeout(() => {
        try { saveAs(fileState.compressedFile!, `compressed_${fileState.originalFile.name}`); }
        catch (err) { toast.error(`Failed to download ${fileState.originalFile.name}`); }
      }, index * 300);
    });

    const reduction = totalOriginalSize - totalCompressedSize;
    const reductionPercent = totalOriginalSize > 0 ? (reduction / totalOriginalSize) * 100 : 0;
    const isReduction = reductionPercent > 0;
    const isIncrease = reductionPercent < 0;

    const ToastContent = () => (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">Downloads Started!</span>
            </div>
            <p className="text-sm text-muted-foreground">
                {filesToDownload.length} file(s): {formatBytes(totalOriginalSize)}
                <ArrowRight className="inline h-3 w-3 mx-1 text-gray-400" />
                <strong className={cn(
                    isReduction && "text-green-600",
                    isIncrease && "text-red-600"
                )}>
                    {formatBytes(totalCompressedSize)}
                </strong>
                {reductionPercent !== 0 && (
                    <span className={cn(
                        "ml-1 font-medium",
                        isReduction && "text-green-600",
                        isIncrease && "text-red-600"
                    )}>
                        ({isReduction ? 'saved' : 'increased'} {Math.abs(reductionPercent).toFixed(1)}%)
                    </span>
                )}
            </p>
        </div>
    );
    toast.custom(() => <ToastContent />, { duration: 8000 });
  };

  const handleReset = () => {
      Object.values(objectUrlRefs.current).forEach(({ original, compressed }) => {
          if (original) URL.revokeObjectURL(original);
          if (compressed) URL.revokeObjectURL(compressed);
      });
      objectUrlRefs.current = {};
      setImageFiles([]);
      toast.info("Ready for new images!");
  };

  const removeImageFile = (id: string) => {
      const urls = objectUrlRefs.current[id];
      if (urls) { if (urls.original) URL.revokeObjectURL(urls.original); if (urls.compressed) URL.revokeObjectURL(urls.compressed); delete objectUrlRefs.current[id]; }
      setImageFiles(current => current.filter(file => file.id !== id));
  };

  // --- Cleanup Effect ---
  useEffect(() => {
    return () => {
      Object.values(objectUrlRefs.current).forEach(({ original, compressed }) => { if (original) URL.revokeObjectURL(original); if (compressed) URL.revokeObjectURL(compressed); });
      objectUrlRefs.current = {};
    };
  }, []);

  // --- Derived State ---
  const totalFiles = imageFiles.length;
  const completedFiles = imageFiles.filter(f => f.status === 'done').length;
  const errorFiles = imageFiles.filter(f => f.status === 'error').length;
  const isActuallyProcessing = isProcessing;
  const canDownload = completedFiles > 0 && !isActuallyProcessing;
  const canReset = totalFiles > 0 && !isActuallyProcessing;

  // Get color classes for controls/tabs
  const lossyFileTypeInfo = getFileTypeInfo('image/jpeg');
  const pngFileTypeInfo = getFileTypeInfo('image/png');

  // --- Render ---
  // Carefully check this return statement
  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6 pb-24">
         <Card className="w-full max-w-4xl">
           <CardHeader>
             <CardTitle>Bulk Image Optimizer</CardTitle>
             <CardDescription>Upload multiple JPG, PNG, or WEBP images. Adjust settings and download individually.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
             <ImageUploadInput
                onFilesSelected={handleImageUpload}
                disabled={isActuallyProcessing}
             />

             {totalFiles > 0 && (
               <SettingsTabs
                  jpegQuality={jpegQuality}
                  enableResizingLossy={enableResizingLossy}
                  pngMaxDimension={pngMaxDimension}
                  onJpegQualityChange={handleQualityChange}
                  onEnableResizingLossyChange={handleResizingChangeLossy}
                  onPngDimensionChange={handlePngDimensionChange}
                  onSettingsCommit={triggerReprocessing}
                  disabled={isActuallyProcessing}
                  lossyControlClassName={lossyFileTypeInfo.controlClassName}
                  pngControlClassName={pngFileTypeInfo.controlClassName}
                  lossyTabTriggerClassName={lossyFileTypeInfo.tabTriggerClassName}
                  pngTabTriggerClassName={pngFileTypeInfo.tabTriggerClassName}
                  defaultMaxDimension={DEFAULT_MAX_DIMENSION}
                  maxSliderDimension={MAX_SLIDER_DIMENSION}
               />
             )}

             {totalFiles > 0 && (
                <ImageProcessingDisplay
                    isProcessing={isActuallyProcessing}
                    imageFiles={imageFiles}
                    getFileTypeInfo={getFileTypeInfo}
                    formatBytes={formatBytes}
                    onRemoveFile={removeImageFile}
                />
             )}
           </CardContent>

           <ActionButtons
              completedFiles={completedFiles}
              errorFiles={errorFiles}
              totalFiles={totalFiles}
              canDownload={canDownload}
              canReset={canReset}
              onDownload={handleDownloadAll}
              onReset={handleReset}
           />

         </Card>

          <Alert className="max-w-3xl">
           <Terminal className="h-4 w-4" />
           <AlertTitle>How it works</AlertTitle>
           <AlertDescription>
             Upload multiple images. Use the global settings to control compression. Download all successfully compressed images individually. All processing happens in your browser.
           </AlertDescription>
         </Alert>
       </div>
    </div>
  );
};

export default Index;