"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Download, Image as ImageIcon, FileWarning, Settings2, Ruler, Files, XCircle, CheckCircle2, Loader2, FileArchive, ArrowRight, RotateCcw, PartyPopper } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
// import JSZip from 'jszip'; // Removed JSZip import
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
// Confetti removed due to install error
// import Confetti from 'react-confetti';
// import useWindowSize from '@/hooks/useWindowSize';

// --- Constants ---
const DEFAULT_MAX_DIMENSION = 1920;
const MAX_SLIDER_DIMENSION = 4000; // Represents "Original" dimension

// --- Interfaces ---
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

// --- Helper Functions ---
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

// Function to get file type label AND color classes
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


// --- Component ---
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

    const promises = filesToProcess.map(async (fileState) => {
      if (fileState.status === 'error') return;

      let currentDims = fileState.originalDimensions;
      if (!currentDims) {
        try {
          updateFileState(fileState.id, { status: 'loading_dims' });
          currentDims = await getImageDimensions(fileState.originalImageUrl);
          updateFileState(fileState.id, { originalDimensions: currentDims });
        } catch (dimError) {
          console.error(`Dimension loading error for ${fileState.originalFile.name} (${fileState.id}):`, dimError);
          updateFileState(fileState.id, { status: 'error', error: 'Failed to load image dimensions.' }); return;
        }
      }
      const updates = await runCompressionOnFile({ ...fileState, originalDimensions: currentDims });
      updateFileState(fileState.id, updates);
    });

    await Promise.allSettled(promises);
    setIsProcessing(false);
  }, [enableResizingLossy, jpegQuality, maxSizeTarget, pngMaxDimension, isProcessing]);


  const triggerReprocessing = useCallback(() => {
      const applicableFiles = imageFiles.filter(f => f.status === 'pending' || f.status === 'done');
      if (applicableFiles.length > 0 && !isProcessing) {
          processFiles(applicableFiles);
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

  const handleQualityChange = (value: number[]) => { setJpegQuality(value[0]); };
  const handlePngDimensionChange = (value: number[]) => { setPngMaxDimension(value[0]); };

  const handleResizingChangeLossy = (checked: boolean) => {
    setEnableResizingLossy(checked);
    triggerReprocessing();
  };


  const handleDownloadAll = () => {
    const filesToDownload = imageFiles.filter(f => f.status === 'done' && f.compressedFile);
    if (filesToDownload.length === 0) {
      toast.error("No successfully compressed files to download.");
      return;
    }

    console.log(`Downloading ${filesToDownload.length} files individually...`);
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    filesToDownload.forEach((fileState, index) => {
      totalOriginalSize += fileState.originalSize;
      totalCompressedSize += fileState.compressedSize!;

      setTimeout(() => {
        try {
          saveAs(fileState.compressedFile!, `compressed_${fileState.originalFile.name}`);
        } catch (err) {
          console.error(`Error downloading ${fileState.originalFile.name}:`, err);
          toast.error(`Failed to download ${fileState.originalFile.name}`);
        }
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
                <span className={cn(
                    "font-bold",
                    isReduction && "text-green-600",
                    isIncrease && "text-red-600"
                )}>
                    {formatBytes(totalCompressedSize)}
                </span>
                {reductionPercent !== 0 && (
                    <span className={cn(
                        "ml-1",
                        isReduction && "text-green-600",
                        isIncrease && "text-red-600"
                    )}>
                        ({isReduction ? 'saved' : 'increased'} {Math.abs(reductionPercent).toFixed(1)}%)
                    </span>
                )}
            </p>
        </div>
    );

    toast.custom(() => <ToastContent />, {
        duration: 8000,
    });
  };

  const handleReset = () => {
      console.log("Resetting application state...");
      Object.values(objectUrlRefs.current).forEach(({ original, compressed }) => {
          if (original) URL.revokeObjectURL(original);
          if (compressed) URL.revokeObjectURL(compressed);
      });
      objectUrlRefs.current = {};
      setImageFiles([]);
      toast.info("Ready for new images!");
  };


  useEffect(() => {
    return () => {
      console.log("Unmounting...");
      Object.values(objectUrlRefs.current).forEach(({ original, compressed }) => { if (original) URL.revokeObjectURL(original); if (compressed) URL.revokeObjectURL(compressed); });
      objectUrlRefs.current = {};
    };
  }, []);

  const removeImageFile = (id: string) => {
      const urls = objectUrlRefs.current[id];
      if (urls) { if (urls.original) URL.revokeObjectURL(urls.original); if (urls.compressed) URL.revokeObjectURL(urls.compressed); delete objectUrlRefs.current[id]; }
      setImageFiles(current => current.filter(file => file.id !== id));
  };

  const totalFiles = imageFiles.length;
  const completedFiles = imageFiles.filter(f => f.status === 'done').length;
  const errorFiles = imageFiles.filter(f => f.status === 'error').length;
  const processingFilesCount = imageFiles.filter(f => f.status === 'compressing' || f.status === 'loading_dims').length;
  const isActuallyProcessing = processingFilesCount > 0;

  const canDownload = completedFiles > 0 && !isActuallyProcessing;
  const canReset = totalFiles > 0 && !isActuallyProcessing;

  const lossyFileTypeInfo = getFileTypeInfo('image/jpeg');
  const pngFileTypeInfo = getFileTypeInfo('image/png');

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6 pb-24">
       {/* Comment moved inside the main div */}
       {/* Removed relative positioning from outer div */}
       {/* Removed Confetti component */}

         <Card className="w-full max-w-4xl">
           <CardHeader>
             <CardTitle>Bulk Image Optimizer</CardTitle>
             <CardDescription>Upload multiple JPG, PNG, or WEBP images. Adjust settings and download individually.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
             {/* Input */}
             <div className="grid w-full max-w-md items-center gap-1.5 mx-auto">
               <Label htmlFor="picture" className="text-center">1. Upload Images</Label>
               <Input id="picture" type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} multiple disabled={isActuallyProcessing} className="h-12 text-center cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
               <p className="text-xs text-muted-foreground text-center">Select one or more files.</p>
             </div>

             {/* Settings */}
             {totalFiles > 0 && (
               <div className="border-t pt-4 space-y-4">
                 <h3 className="text-lg font-semibold flex items-center justify-center gap-2"><Settings2 className="w-5 h-5" /> 2. Global Settings</h3>
                 <Tabs defaultValue="lossy" className="w-full max-w-xl mx-auto">
                   <TabsList className="grid w-full grid-cols-2">
                     <TabsTrigger value="lossy" className={lossyFileTypeInfo.tabTriggerClassName}>JPEG / WEBP</TabsTrigger>
                     <TabsTrigger value="png" className={pngFileTypeInfo.tabTriggerClassName}>PNG</TabsTrigger>
                   </TabsList>
                   <TabsContent value="lossy" className="mt-4 border rounded-md p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                         <div className="space-y-2">
                            <Label htmlFor="quality-slider" className={cn(lossyFileTypeInfo.controlClassName)}>Quality: {Math.round(jpegQuality * 100)}%</Label>
                            <Slider
                               id="quality-slider"
                               min={0.05} max={1} step={0.05}
                               value={[jpegQuality]}
                               onValueChange={handleQualityChange}
                               onValueCommit={triggerReprocessing}
                               disabled={isActuallyProcessing}
                            />
                         </div>
                         <div className="flex items-center justify-center space-x-2 pt-5 sm:pt-0">
                            <Switch id="resizing-switch-lossy" checked={enableResizingLossy} onCheckedChange={handleResizingChangeLossy} disabled={isActuallyProcessing} />
                            <Label htmlFor="resizing-switch-lossy" className={cn(lossyFileTypeInfo.controlClassName)}>Resize if &gt; {DEFAULT_MAX_DIMENSION}px</Label>
                         </div>
                      </div>
                   </TabsContent>
                   <TabsContent value="png" className="mt-4 border rounded-md p-4 space-y-2">
                      <Label htmlFor="dimension-slider-png" className={cn("flex items-center gap-1 justify-center", pngFileTypeInfo.controlClassName)}>
                         <Ruler className="w-4 h-4" /> Max Dimension: {pngMaxDimension < MAX_SLIDER_DIMENSION ? `${pngMaxDimension}px` : 'Original'}
                      </Label>
                      <Slider
                         id="dimension-slider-png"
                         min={320} max={MAX_SLIDER_DIMENSION} step={10}
                         value={[pngMaxDimension]}
                         onValueChange={handlePngDimensionChange}
                         onValueCommit={triggerReprocessing}
                         disabled={isActuallyProcessing}
                      />
                   </TabsContent>
                 </Tabs>
               </div>
             )}

             {/* Image List Area */}
             {totalFiles > 0 && (
               <div className="border-t pt-6 space-y-4">
                  <h3 className="text-lg font-semibold flex items-center justify-center gap-2"><Files className="w-5 h-5" /> 3. Files ({totalFiles})</h3>
                  {isActuallyProcessing ? (
                     <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                        <p className="text-lg font-medium">Processing Images...</p>
                        <p>Please wait, this may take a moment.</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {imageFiles.map((file) => {
                           const fileTypeInfo = getFileTypeInfo(file.originalType);
                           const isDone = file.status === 'done' && file.compressedSize !== null;
                           const sizeReduced = isDone && file.compressedSize! < file.originalSize;
                           const sizeIncreased = isDone && file.compressedSize! > file.originalSize;

                           return (
                              <Card key={file.id} className="relative overflow-hidden group">
                                 <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 z-10 bg-background/50 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImageFile(file.id)} disabled={isActuallyProcessing} aria-label="Remove file">
                                    <XCircle className="h-4 w-4" />
                                 </Button>
                                 <CardContent className="p-3 space-y-2">
                                    <div className="flex justify-center items-center h-32 bg-muted rounded-md overflow-hidden">
                                       <img src={file.compressedImageUrl ?? file.originalImageUrl} alt={file.originalFile.name} className="max-h-full max-w-full object-contain" />
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
                                          {file.status === 'pending' && (<span className="text-xs text-gray-500">...</span>)}
                                       </div>
                                       <span className={cn(
                                           "flex-shrink-0 font-semibold",
                                           isDone && sizeReduced && "text-green-600",
                                           isDone && sizeIncreased && "text-red-600",
                                           isDone && !sizeReduced && !sizeIncreased && "text-gray-500",
                                           file.status === 'error' && "text-red-600",
                                           (file.status === 'compressing' || file.status === 'loading_dims') && "text-transparent",
                                           (file.status === 'pending') && "text-gray-500"
                                       )}>
                                           {isDone ? formatBytes(file.compressedSize) : file.status === 'error' ? 'Error' : '...'}
                                       </span>
                                    </div>
                                    {file.status === 'error' && file.error && (<p className="text-xs text-red-600 truncate" title={file.error}>{file.error}</p>)}
                                 </CardContent>
                              </Card>
                           );
                        })}
                     </div>
                  )}
               </div>
             )}
           </CardContent>
           <CardFooter className="flex flex-col items-center justify-center pt-6 border-t space-y-4">
              {totalFiles > 0 && (<p className="text-sm text-muted-foreground">{completedFiles} completed, {errorFiles} errors.</p>)}
              <div className="flex flex-wrap justify-center gap-4">
                 <Button onClick={handleDownloadAll} disabled={!canDownload}>
                   <Download className="mr-2 h-4 w-4" /> Download {completedFiles > 0 ? `${completedFiles} File(s)` : 'Files'}
                 </Button>
                 <Button variant="outline" onClick={handleReset} disabled={!canReset}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset
                 </Button>
              </div>
           </CardFooter>
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