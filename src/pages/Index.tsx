"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Download, Image as ImageIcon, FileWarning, Settings2 } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import { Slider } from "@/components/ui/slider"; // Import Slider
import { Switch } from "@/components/ui/switch"; // Import Switch

const MAX_DIMENSION = 1920; // Define max dimension constant

const Index: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [compressedImageUrl, setCompressedImageUrl] = useState<string | null>(null);
  const [compressedFileForDownload, setCompressedFileForDownload] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [originalType, setOriginalType] = useState<string | null>(null);
  const [compressedType, setCompressedType] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [compressedDimensions, setCompressedDimensions] = useState<{ width: number; height: number } | null>(null);

  // --- New State for Controls ---
  const [jpegQuality, setJpegQuality] = useState<number>(0.7); // Default quality 0.7 (70%)
  const [enableResizing, setEnableResizing] = useState<boolean>(false); // Default resizing disabled
  const [maxSizeTarget, setMaxSizeTarget] = useState<number>(1); // Default 1MB target for lossy

  // Refs for URL cleanup
  const originalUrlRef = useRef<string | null>(null);
  const compressedUrlRef = useRef<string | null>(null);

  const getImageDimensions = (fileUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = fileUrl;
    });
  };

  // Debounce function to delay re-compression when slider changes
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): Promise<ReturnType<F>> => {
      return new Promise((resolve) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          resolve(func(...args));
        }, waitFor);
      });
    };
  };


  // Function to re-run compression with current settings
  const runCompression = useCallback(async (fileToCompress: File) => {
    if (!fileToCompress) return;

    setLoading(true);
    setError(null);
    // Clear previous compressed state, but keep original
    if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);
    setCompressedImageUrl(null);
    compressedUrlRef.current = null;
    setCompressedFileForDownload(null);
    setCompressedSize(null);
    setCompressedType(null);
    setCompressedDimensions(null);


    try {
      const isLossyFormat = fileToCompress.type === 'image/jpeg' || fileToCompress.type === 'image/webp';

      const options: imageCompression.Options = {
        // Apply maxSizeMB only for lossy formats
        maxSizeMB: isLossyFormat ? maxSizeTarget : undefined,
        // Apply resizing based on switch state
        maxWidthOrHeight: enableResizing ? MAX_DIMENSION : undefined,
        useWebWorker: true,
        // Apply quality only for lossy formats, using state
        initialQuality: isLossyFormat ? jpegQuality : undefined,
        // Signal to attempt preserving original format
        // fileType: fileToCompress.type, // Let library decide best output format
        // alwaysKeepResolution: !enableResizing, // Redundant if maxWidthOrHeight is undefined
      };

      // Remove undefined keys
      const activeOptions = Object.entries(options).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as imageCompression.Options);

      console.log('Using compression options:', activeOptions);

      const compressedFile = await imageCompression(fileToCompress, activeOptions);
      const compressedObjectUrl = URL.createObjectURL(compressedFile);

      // Get compressed dimensions
      const compDims = await getImageDimensions(compressedObjectUrl);
      setCompressedDimensions(compDims);

      console.log(`Compressed file size: ${compressedFile.size / 1024} KB, Type: ${compressedFile.type}, Dims: ${compDims.width}x${compDims.height}`);

      setCompressedSize(compressedFile.size);
      setCompressedType(compressedFile.type);
      setCompressedImageUrl(compressedObjectUrl); // Set state
      compressedUrlRef.current = compressedObjectUrl; // Update ref
      setCompressedFileForDownload(compressedFile);

    } catch (err) {
      console.error('Compression error:', err);
      setError(`Compression failed: ${err instanceof Error ? err.message : String(err)}`);
      // Don't clear original image on re-compression error
    } finally {
      setLoading(false);
    }
  }, [enableResizing, jpegQuality, maxSizeTarget]); // Dependencies for re-compression logic

  // Debounced version of runCompression for slider
  const debouncedRunCompression = useCallback(debounce(runCompression, 300), [runCompression]);


  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Revoke previous URLs before creating new ones
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);

    // Reset ALL state for new upload
    setOriginalFile(file);
    const objectUrl = URL.createObjectURL(file);
    setOriginalImageUrl(objectUrl);
    originalUrlRef.current = objectUrl;

    setCompressedImageUrl(null);
    compressedUrlRef.current = null;
    setCompressedFileForDownload(null);
    setError(null);
    setOriginalSize(file.size);
    setCompressedSize(null);
    setOriginalType(file.type);
    setCompressedType(null);
    setOriginalDimensions(null);
    setCompressedDimensions(null);
    // Keep existing quality/resizing settings, don't reset them on new upload

    setLoading(true); // Set loading for initial dimension check + compression

    try {
      // Get original dimensions first
      const origDims = await getImageDimensions(objectUrl);
      setOriginalDimensions(origDims);
      console.log(`Original file: ${file.name}, Size: ${file.size / 1024} KB, Type: ${file.type}, Dims: ${origDims.width}x${origDims.height}`);

      // Now run the compression with current settings
      await runCompression(file);

    } catch (err) {
       // Handle errors from initial dimension reading or first compression
       console.error('Initial processing error:', err);
       setError(`Failed to process image: ${err instanceof Error ? err.message : String(err)}`);
       if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
       setOriginalImageUrl(null);
       originalUrlRef.current = null;
       setOriginalFile(null);
       setOriginalSize(null);
       setOriginalType(null);
       setOriginalDimensions(null);
       setLoading(false); // Ensure loading is false on error
    }
    // setLoading(false) is handled within runCompression's finally block
  }, [runCompression]); // runCompression is now a dependency

  // Handlers for controls - trigger re-compression
  const handleQualityChange = (value: number[]) => {
    setJpegQuality(value[0]);
    if (originalFile && (originalType === 'image/jpeg' || originalType === 'image/webp')) {
      debouncedRunCompression(originalFile); // Use debounced version
    }
  };

  const handleResizingChange = (checked: boolean) => {
    setEnableResizing(checked);
    if (originalFile) {
      runCompression(originalFile); // Recompress immediately on switch toggle
    }
  };


  const handleDownload = () => {
    if (compressedFileForDownload) {
      saveAs(compressedFileForDownload, `compressed_${originalFile?.name ?? 'image'}`);
    }
  };

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);
    };
  }, []); // Empty dependency array

  const formatBytes = (bytes: number | null, decimals = 2) => {
    if (bytes === null || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const compressionRatio = originalSize && compressedSize ? ((originalSize - compressedSize) / originalSize) * 100 : 0;
  const isLossy = originalType === 'image/jpeg' || originalType === 'image/webp';

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Image Optimizer</CardTitle>
          <CardDescription>Upload JPG, PNG, or WEBP. Adjust settings below to optimize.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6"> {/* Increased spacing */}
          {/* --- File Input --- */}
          <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
            <Label htmlFor="picture">1. Upload Image</Label>
            <Input id="picture" type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} disabled={loading} />
          </div>

          {/* --- Options Section (only show if image is loaded) --- */}
          {originalFile && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2"><Settings2 className="w-5 h-5" /> 2. Optimization Settings</h3>

              {/* Resizing Option */}
              <div className="flex items-center justify-between max-w-md mx-auto">
                <Label htmlFor="resizing-switch" className="flex flex-col space-y-1">
                  <span>Resize Image</span>
                  <span className="font-normal leading-snug text-muted-foreground text-sm">
                    Scale down if larger than {MAX_DIMENSION}px (width or height). Preserves aspect ratio.
                  </span>
                </Label>
                <Switch
                  id="resizing-switch"
                  checked={enableResizing}
                  onCheckedChange={handleResizingChange}
                  disabled={loading}
                />
              </div>

              {/* Quality Slider (Lossy Only) */}
              {isLossy && (
                <div className="space-y-2 max-w-md mx-auto">
                  <Label htmlFor="quality-slider">Quality (JPEG/WEBP): {Math.round(jpegQuality * 100)}%</Label>
                  <Slider
                    id="quality-slider"
                    min={0.05} // Min quality slightly above 0
                    max={1}
                    step={0.05}
                    value={[jpegQuality]}
                    onValueChange={handleQualityChange} // Use the handler that debounces
                    disabled={loading}
                  />
                   <p className="text-sm text-muted-foreground">Lower quality means smaller file size, but may reduce visual clarity.</p>
                </div>
              )}

              {/* PNG Info */}
              {!isLossy && originalType === 'image/png' && (
                 <p className="text-sm text-muted-foreground text-center max-w-md mx-auto">
                   PNG uses lossless compression. Quality slider is not applicable. Only resizing affects the output.
                 </p>
              )}
            </div>
          )}


          {/* --- Loading Indicator --- */}
          {loading && (
            <div className="flex items-center justify-center space-x-2 pt-4">
              <Progress value={undefined} className="w-1/2 h-2 animate-pulse" />
              <span>Processing...</span>
            </div>
          )}

          {/* --- Error Display --- */}
          {error && (
            <Alert variant="destructive" className="max-w-xl mx-auto">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* --- Image Previews --- */}
          {(originalImageUrl || compressedImageUrl) && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-4 border-t">
              {originalImageUrl && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-center">Original</h3>
                  <img src={originalImageUrl} alt="Original" className="rounded-md border max-w-full h-auto mx-auto" style={{ maxHeight: '350px' }} />
                  <p className="text-sm text-center text-muted-foreground">
                    Size: {formatBytes(originalSize)} <br />
                    Type: {originalType} <br />
                    Dims: {originalDimensions ? `${originalDimensions.width} x ${originalDimensions.height}` : 'Loading...'}
                  </p>
                </div>
              )}
              {compressedImageUrl && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-center">Compressed</h3>
                  <img src={compressedImageUrl} alt="Compressed" className="rounded-md border max-w-full h-auto mx-auto" style={{ maxHeight: '350px' }} />
                   <p className="text-sm text-center text-muted-foreground">
                    Size: {formatBytes(compressedSize)} <br />
                    Type: {compressedType} <br />
                    Dims: {compressedDimensions ? `${compressedDimensions.width} x ${compressedDimensions.height}` : 'Loading...'} <br />
                    {compressionRatio > 0 && `(${compressionRatio.toFixed(1)}% reduction)`}
                    {compressionRatio < 0 && `(${(compressionRatio * -1).toFixed(1)}% increase)`}
                  </p>
                </div>
              )}
               {!compressedImageUrl && loading && originalImageUrl && (
                 <div className="space-y-2 flex flex-col items-center justify-center h-full">
                    {/* Placeholder or loader while compressed image is generating */}
                    <p className="text-muted-foreground">Generating preview...</p>
                 </div>
               )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center pt-4 border-t">
          {compressedFileForDownload && !loading && !error && (
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download Compressed Image
            </Button>
          )}
        </CardFooter>
      </Card>

      <Alert className="max-w-3xl">
        <Terminal className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          Images are compressed in your browser. Use the settings above to control resizing and quality (for JPEG/WEBP).
          PNGs use lossless compression. No data is sent to any server.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default Index;