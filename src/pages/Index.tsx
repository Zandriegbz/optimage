"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Download, Image as ImageIcon, FileWarning, Settings2, Ruler } from "lucide-react"; // Added Ruler icon
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const DEFAULT_MAX_DIMENSION = 1920; // Default max dimension for resizing
const MAX_SLIDER_DIMENSION = 4000; // Max value for the PNG dimension slider

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

  // --- State for Controls ---
  const [jpegQuality, setJpegQuality] = useState<number>(0.7); // Quality for JPEG/WEBP
  const [enableResizingLossy, setEnableResizingLossy] = useState<boolean>(false); // Resizing toggle for JPEG/WEBP
  const [pngMaxDimension, setPngMaxDimension] = useState<number>(DEFAULT_MAX_DIMENSION); // Max dimension for PNG slider
  const [maxSizeTarget, setMaxSizeTarget] = useState<number>(1); // Target size for JPEG/WEBP

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

  // Debounce function
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> => {
      return new Promise((resolve) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => resolve(func(...args)), waitFor);
      });
    };
  };

  // Function to re-run compression with current settings
  const runCompression = useCallback(async (fileToCompress: File) => {
    if (!fileToCompress) return;

    setLoading(true);
    setError(null);
    if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);
    setCompressedImageUrl(null);
    compressedUrlRef.current = null;
    setCompressedFileForDownload(null);
    setCompressedSize(null);
    setCompressedType(null);
    setCompressedDimensions(null);

    try {
      const isLossyFormat = fileToCompress.type === 'image/jpeg' || fileToCompress.type === 'image/webp';
      const isPngFormat = fileToCompress.type === 'image/png';

      let options: imageCompression.Options = {
         useWebWorker: true,
      };

      if (isLossyFormat) {
        options = {
          ...options,
          maxSizeMB: maxSizeTarget,
          maxWidthOrHeight: enableResizingLossy ? DEFAULT_MAX_DIMENSION : undefined,
          initialQuality: jpegQuality,
        };
      } else if (isPngFormat) {
         // For PNG, only apply dimension constraint from slider
         // Check if original dimensions are available and larger than target
         const needsResize = originalDimensions && (originalDimensions.width > pngMaxDimension || originalDimensions.height > pngMaxDimension);
         options = {
           ...options,
           // Apply resizing only if needed and dimension is not max (effectively disabling resize)
           maxWidthOrHeight: (pngMaxDimension < MAX_SLIDER_DIMENSION && needsResize) ? pngMaxDimension : undefined,
           // No quality or maxSizeMB for PNG
         };
      }

      // Remove undefined keys before passing to the library
      const activeOptions = Object.entries(options).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as imageCompression.Options);

      console.log('Using compression options:', activeOptions);

      const compressedFile = await imageCompression(fileToCompress, activeOptions);
      const compressedObjectUrl = URL.createObjectURL(compressedFile);

      const compDims = await getImageDimensions(compressedObjectUrl);
      setCompressedDimensions(compDims);

      console.log(`Compressed file size: ${compressedFile.size / 1024} KB, Type: ${compressedFile.type}, Dims: ${compDims.width}x${compDims.height}`);

      setCompressedSize(compressedFile.size);
      setCompressedType(compressedFile.type);
      setCompressedImageUrl(compressedObjectUrl);
      compressedUrlRef.current = compressedObjectUrl;
      setCompressedFileForDownload(compressedFile);

    } catch (err) {
      console.error('Compression error:', err);
      setError(`Compression failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [enableResizingLossy, jpegQuality, maxSizeTarget, pngMaxDimension, originalDimensions]); // Added pngMaxDimension and originalDimensions

  // Debounced versions for sliders
  const debouncedRunCompression = useCallback(debounce(runCompression, 300), [runCompression]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);

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
    setOriginalDimensions(null); // Reset dimensions until loaded
    setCompressedDimensions(null);

    setLoading(true);

    try {
      const origDims = await getImageDimensions(objectUrl);
      setOriginalDimensions(origDims); // Set dimensions BEFORE first compression run
      console.log(`Original file: ${file.name}, Size: ${file.size / 1024} KB, Type: ${file.type}, Dims: ${origDims.width}x${origDims.height}`);

      // Set initial PNG slider value based on original dimensions if it's a PNG
      if (file.type === 'image/png') {
         const largestDim = Math.max(origDims.width, origDims.height);
         // Set slider to original dimension or max slider value, whichever is smaller
         // Or keep default if original is smaller than default
         setPngMaxDimension(Math.min(Math.max(largestDim, DEFAULT_MAX_DIMENSION), MAX_SLIDER_DIMENSION));
      }

      await runCompression(file); // Pass file, runCompression will use state including updated originalDimensions

    } catch (err) {
       console.error('Initial processing error:', err);
       setError(`Failed to process image: ${err instanceof Error ? err.message : String(err)}`);
       if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
       setOriginalImageUrl(null);
       originalUrlRef.current = null;
       setOriginalFile(null);
       setOriginalSize(null);
       setOriginalType(null);
       setOriginalDimensions(null);
       setLoading(false);
    }
  }, [runCompression]); // runCompression dependency is correct

  // Handlers for controls
  const handleQualityChange = (value: number[]) => {
    setJpegQuality(value[0]);
    if (originalFile && (originalType === 'image/jpeg' || originalType === 'image/webp')) {
      debouncedRunCompression(originalFile);
    }
  };

  const handleResizingChangeLossy = (checked: boolean) => {
    setEnableResizingLossy(checked);
    if (originalFile && (originalType === 'image/jpeg' || originalType === 'image/webp')) {
      runCompression(originalFile);
    }
  };

  const handlePngDimensionChange = (value: number[]) => {
     setPngMaxDimension(value[0]);
     if (originalFile && originalType === 'image/png') {
       debouncedRunCompression(originalFile);
     }
  };

  const handleDownload = () => {
    if (compressedFileForDownload) {
      saveAs(compressedFileForDownload, `compressed_${originalFile?.name ?? 'image'}`);
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);
    };
  }, []);

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
  const isPng = originalType === 'image/png';

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Image Optimizer</CardTitle>
          <CardDescription>Upload JPG, PNG, or WEBP. Adjust settings below to optimize.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* --- File Input --- */}
          <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
            <Label htmlFor="picture">1. Upload Image</Label>
            <Input id="picture" type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} disabled={loading} />
          </div>

          {/* --- Options Section --- */}
          {originalFile && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2"><Settings2 className="w-5 h-5" /> 2. Optimization Settings</h3>

              {/* --- JPEG/WEBP Controls --- */}
              {isLossy && (
                <>
                  {/* Resizing Option (Lossy) */}
                  <div className="flex items-center justify-between max-w-md mx-auto">
                    <Label htmlFor="resizing-switch-lossy" className="flex flex-col space-y-1">
                      <span>Resize Image</span>
                      <span className="font-normal leading-snug text-muted-foreground text-sm">
                        Scale down if larger than {DEFAULT_MAX_DIMENSION}px.
                      </span>
                    </Label>
                    <Switch
                      id="resizing-switch-lossy"
                      checked={enableResizingLossy}
                      onCheckedChange={handleResizingChangeLossy}
                      disabled={loading}
                    />
                  </div>

                  {/* Quality Slider (Lossy) */}
                  <div className="space-y-2 max-w-md mx-auto">
                    <Label htmlFor="quality-slider">Quality: {Math.round(jpegQuality * 100)}%</Label>
                    <Slider
                      id="quality-slider"
                      min={0.05} max={1} step={0.05}
                      value={[jpegQuality]}
                      onValueChange={handleQualityChange}
                      disabled={loading}
                    />
                    <p className="text-sm text-muted-foreground">Lower quality means smaller file size.</p>
                  </div>
                </>
              )}

              {/* --- PNG Controls --- */}
              {isPng && (
                 <div className="space-y-2 max-w-md mx-auto">
                    <Label htmlFor="dimension-slider-png" className="flex items-center gap-1">
                       <Ruler className="w-4 h-4" /> Max Dimension (PNG): {pngMaxDimension < MAX_SLIDER_DIMENSION ? `${pngMaxDimension}px` : 'Original'}
                    </Label>
                    <Slider
                      id="dimension-slider-png"
                      // Sensible range, e.g., 320px up to a large value + 1 step for "Original"
                      min={320}
                      max={MAX_SLIDER_DIMENSION} // Use max value to represent "Original"
                      step={10} // Adjust step as needed
                      value={[pngMaxDimension]}
                      onValueChange={handlePngDimensionChange}
                      disabled={loading || !originalDimensions} // Disable until original dimensions are known
                    />
                    <p className="text-sm text-muted-foreground">
                       Controls the maximum width or height. Set to {MAX_SLIDER_DIMENSION}px to keep original dimensions. Uses lossless compression.
                    </p>
                 </div>
              )}
            </div>
          )}

          {/* --- Loading Indicator --- */}
          {loading && ( /* ... */ )}
          {/* --- Error Display --- */}
          {error && ( /* ... */ )}
          {/* --- Image Previews --- */}
          {(originalImageUrl || compressedImageUrl) && !error && ( /* ... */ )}

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
          Images are compressed in your browser. JPEG/WEBP uses quality/resizing controls. PNG uses a dimension control with lossless compression. No data is sent to any server.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default Index;