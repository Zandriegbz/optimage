"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Download, Image as ImageIcon, FileWarning, Settings2, Ruler, Files, XCircle, CheckCircle2, Loader2, FileArchive } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import JSZip from 'jszip';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components

// --- Constants ---
const DEFAULT_MAX_DIMENSION = 1920;
const MAX_SLIDER_DIMENSION = 4000;

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

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise((resolve) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => resolve(func(...args)), waitFor);
    });
  };
};

// Function to get file type label AND color classes
const getFileTypeInfo = (mimeType: string): { label: string; badgeClassName: string; controlClassName: string; tabTriggerClassName: string } => {
   const subtype = mimeType?.split('/')[1] || 'unknown';
   // Define base classes for tabs
   const baseTabTrigger = "data-[state=active]:shadow-sm";
   switch (subtype) {
      // Define badge colors, control text/border colors, and active tab colors
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
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Settings State
  const [jpegQuality, setJpegQuality] = useState<number>(0.7);
  const [enableResizingLossy, setEnableResizingLossy] = useState<boolean>(false);
  const [pngMaxDimension, setPngMaxDimension] = useState<number>(DEFAULT_MAX_DIMENSION);
  const [maxSizeTarget, setMaxSizeTarget] = useState<number>(1);

  // Refs
  const objectUrlRefs = useRef<Record<string, { original: string | null, compressed: string | null }>>({});

  // --- Core Logic (Callbacks and Effects remain largely the same) ---
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
        const needsResize = originalDimensions && (originalDimensions.width > pngMaxDimension || originalDimensions.height > pngMaxDimension);
        options = { ...options, maxWidthOrHeight: (pngMaxDimension < MAX_SLIDER_DIMENSION && needsResize) ? pngMaxDimension : undefined };
      }

      const activeOptions = Object.entries(options).reduce((acc, [key, value]) => { if (value !== undefined) acc[key] = value; return acc; }, {} as imageCompression.Options);
      console.log(`Compressing ${originalFile.name} with options:`, activeOptions);
      const compressedFile = await imageCompression(originalFile, activeOptions);

      if (objectUrlRefs.current[id]?.compressed) URL.revokeObjectURL(objectUrlRefs.current[id].compressed!);
      const compressedObjectUrl = URL.createObjectURL(compressedFile);
      objectUrlRefs.current[id] = { ...objectUrlRefs.current[id], compressed: compressedObjectUrl };

      const compDims = await getImageDimensions(compressedObjectUrl);
      console.log(`Compressed ${originalFile.name}: Size: ${compressedFile.size / 1024} KB, Type: ${compressedFile.type}, Dims: ${compDims.width}x${compDims.height}`);

      return { compressedFile, compressedImageUrl: compressedObjectUrl, compressedSize: compressedFile.size, compressedType: compressedFile.type, compressedDimensions: compDims, status: 'done', error: null };
    } catch (err) {
      console.error(`Compression error for ${originalFile.name}:`, err);
      return { status: 'error', error: err instanceof Error ? err.message : String(err), compressedFile: null, compressedImageUrl: null, compressedSize: null, compressedType: null, compressedDimensions: null };
    }
  };

  const processFiles = useCallback(async (filesToProcess: ImageFileState[]) => {
    if (filesToProcess.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const promises = filesToProcess.map(async (fileState) => {
      let currentDims = fileState.originalDimensions;
      if (!currentDims) {
        try {
          updateFileState(fileState.id, { status: 'loading_dims' });
          currentDims = await getImageDimensions(fileState.originalImageUrl);
          updateFileState(fileState.id, { originalDimensions: currentDims });
        } catch (dimError) {
          console.error(`Dimension loading error for ${fileState.originalFile.name}:`, dimError);
          updateFileState(fileState.id, { status: 'error', error: 'Failed to load image dimensions.' }); return;
        }
      }
      const updates = await runCompressionOnFile({ ...fileState, originalDimensions: currentDims });
      updateFileState(fileState.id, updates);
    });

    await Promise.allSettled(promises);
    setIsProcessing(false);
  }, [enableResizingLossy, jpegQuality, maxSizeTarget, pngMaxDimension, isProcessing]);

  const debouncedProcessAllFiles = useCallback(debounce(() => {
      const applicableFiles = imageFiles.filter(f => f.status !== 'error');
      if (applicableFiles.length > 0) { console.log("Settings changed, reprocessing..."); processFiles(applicableFiles); }
  }, 500), [imageFiles, processFiles]);

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
    await processFiles(newImageFiles);
    event.target.value = '';
  }, [processFiles]);

  const handleQualityChange = (value: number[]) => { setJpegQuality(value[0]); debouncedProcessAllFiles(); };
  const handleResizingChangeLossy = (checked: boolean) => {
    setEnableResizingLossy(checked);
    const applicableFiles = imageFiles.filter(f => f.status !== 'error' && (f.originalType === 'image/jpeg' || f.originalType === 'image/webp'));
    if (applicableFiles.length > 0) { console.log("Lossy resize setting changed..."); processFiles(applicableFiles); }
  };
  const handlePngDimensionChange = (value: number[]) => { setPngMaxDimension(value[0]); debouncedProcessAllFiles(); };

  const handleDownloadZip = async () => {
    const filesToZip = imageFiles.filter(f => f.status === 'done' && f.compressedFile);
    if (filesToZip.length === 0) { alert("No successfully compressed files."); return; }
    setIsZipping(true); setZipProgress(0); const zip = new JSZip();
    filesToZip.forEach((fileState) => zip.file(fileState.originalFile.name, fileState.compressedFile!));
    try {
      const zipBlob = await zip.generateAsync({ type: "blob", streamFiles: true }, (metadata) => setZipProgress(metadata.percent));
      saveAs(zipBlob, "compressed_images.zip");
    } catch (err) { console.error("ZIP Error:", err); setError("Failed to create ZIP."); }
    finally { setIsZipping(false); setZipProgress(0); }
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
  const canDownload = completedFiles > 0 && !isProcessing && !isZipping;

  // Get color classes for controls/tabs
  const lossyFileTypeInfo = getFileTypeInfo('image/jpeg');
  const pngFileTypeInfo = getFileTypeInfo('image/png');

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Bulk Image Optimizer</CardTitle>
          <CardDescription>Upload multiple JPG, PNG, or WEBP images. Adjust settings and download as ZIP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input */}
          <div className="grid w-full max-w-md items-center gap-1.5 mx-auto">
            <Label htmlFor="picture" className="text-center">1. Upload Images</Label>
            <Input id="picture" type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} multiple disabled={isProcessing || isZipping} className="h-12 text-center cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
            <p className="text-xs text-muted-foreground text-center">Select one or more files.</p>
          </div>

          {/* Settings */}
          {totalFiles > 0 && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2"><Settings2 className="w-5 h-5" /> 2. Global Settings</h3>

              {/* Tabs Container */}
              <Tabs defaultValue="lossy" className="w-full max-w-xl mx-auto">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="lossy" className={lossyFileTypeInfo.tabTriggerClassName}>JPEG / WEBP</TabsTrigger>
                  <TabsTrigger value="png" className={pngFileTypeInfo.tabTriggerClassName}>PNG</TabsTrigger>
                </TabsList>

                {/* Lossy Settings Tab */}
                <TabsContent value="lossy" className="mt-4 border rounded-md p-4 space-y-4">
                   {/* <p className={cn("font-semibold text-center text-sm mb-2", lossyFileTypeInfo.controlClassName)}>JPEG / WEBP Settings</p> */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="space-y-2">
                         <Label htmlFor="quality-slider" className={cn(lossyFileTypeInfo.controlClassName)}>Quality: {Math.round(jpegQuality * 100)}%</Label>
                         <Slider id="quality-slider" min={0.05} max={1} step={0.05} value={[jpegQuality]} onValueChange={handleQualityChange} disabled={isProcessing || isZipping} />
                      </div>
                      <div className="flex items-center justify-center space-x-2 pt-5 sm:pt-0">
                         <Switch id="resizing-switch-lossy" checked={enableResizingLossy} onCheckedChange={handleResizingChangeLossy} disabled={isProcessing || isZipping} />
                         <Label htmlFor="resizing-switch-lossy" className={cn(lossyFileTypeInfo.controlClassName)}>Resize if &gt; {DEFAULT_MAX_DIMENSION}px</Label>
                      </div>
                   </div>
                </TabsContent>

                {/* PNG Settings Tab */}
                <TabsContent value="png" className="mt-4 border rounded-md p-4 space-y-2">
                   {/* <p className={cn("font-semibold text-center text-sm mb-2", pngFileTypeInfo.controlClassName)}>PNG Settings</p> */}
                   <Label htmlFor="dimension-slider-png" className={cn("flex items-center gap-1 justify-center", pngFileTypeInfo.controlClassName)}>
                      <Ruler className="w-4 h-4" /> Max Dimension: {pngMaxDimension < MAX_SLIDER_DIMENSION ? `${pngMaxDimension}px` : 'Original'}
                   </Label>
                   <Slider id="dimension-slider-png" min={320} max={MAX_SLIDER_DIMENSION} step={10} value={[pngMaxDimension]} onValueChange={handlePngDimensionChange} disabled={isProcessing || isZipping} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Status Indicators */}
          {isProcessing && ( <div className="flex items-center justify-center space-x-2 pt-4 text-blue-600"><Loader2 className="h-5 w-5 animate-spin" /><span>Processing {processingFilesCount} of {totalFiles}...</span></div> )}
          {isZipping && ( <div className="flex flex-col items-center justify-center space-y-2 pt-4 text-green-600"><FileArchive className="h-5 w-5 animate-pulse" /><span>Creating ZIP...</span><Progress value={zipProgress} className="w-1/2 h-2" /></div> )}

          {/* Image List */}
          {totalFiles > 0 && (
            <div className="border-t pt-6 space-y-4">
               <h3 className="text-lg font-semibold flex items-center justify-center gap-2"><Files className="w-5 h-5" /> 3. Files ({totalFiles})</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imageFiles.map((file) => {
                     const fileTypeInfo = getFileTypeInfo(file.originalType); // Get label and classes
                     return (
                        <Card key={file.id} className="relative overflow-hidden group">
                           <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 z-10 bg-background/50 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImageFile(file.id)} disabled={isProcessing || isZipping} aria-label="Remove file">
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
                              <div className="text-xs text-muted-foreground flex justify-between items-center">
                                 <span>{formatBytes(file.originalSize)}</span>
                                 {file.status === 'done' && file.compressedSize !== null && (<span className="text-green-600 font-semibold">{formatBytes(file.compressedSize)}</span>)}
                                 {file.status === 'error' && (<span className="text-red-600 font-semibold">Error</span>)}
                                 {(file.status === 'compressing' || file.status === 'loading_dims') && (<Loader2 className="h-3 w-3 animate-spin text-blue-500" />)}
                                 {file.status === 'pending' && (<span className="text-gray-500">Pending</span>)}
                              </div>
                              {file.status === 'error' && file.error && (<p className="text-xs text-red-600 truncate" title={file.error}>{file.error}</p>)}
                           </CardContent>
                        </Card>
                     );
                  })}
               </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center pt-6 border-t space-y-2">
           {totalFiles > 0 && (<p className="text-sm text-muted-foreground">{completedFiles} completed, {errorFiles} errors.</p>)}
          <Button onClick={handleDownloadZip} disabled={!canDownload}>
            <Download className="mr-2 h-4 w-4" /> Download {completedFiles > 0 ? `${completedFiles} File(s)` : 'Files'} as ZIP
          </Button>
        </CardFooter>
      </Card>

       <Alert className="max-w-3xl">
        <Terminal className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          Upload multiple images. Use the global settings to control compression. Download all successfully compressed images as a ZIP file. All processing happens in your browser.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default Index;