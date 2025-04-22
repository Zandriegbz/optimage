"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Download, Image as ImageIcon, FileWarning } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';

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

  // Refs should be declared at the top level
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

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Revoke previous URLs before creating new ones
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (compressedUrlRef.current) URL.revokeObjectURL(compressedUrlRef.current);

    // Reset state for new upload
    setOriginalFile(file);
    const objectUrl = URL.createObjectURL(file);
    setOriginalImageUrl(objectUrl); // Set state immediately
    originalUrlRef.current = objectUrl; // Update ref immediately

    setCompressedImageUrl(null);
    compressedUrlRef.current = null; // Reset compressed ref

    setCompressedFileForDownload(null);
    setError(null);
    setOriginalSize(file.size);
    setCompressedSize(null);
    setOriginalType(file.type);
    setCompressedType(null);
    setOriginalDimensions(null);
    setCompressedDimensions(null);
    setLoading(true);

    try {
      // Get original dimensions
      const origDims = await getImageDimensions(objectUrl);
      setOriginalDimensions(origDims);
      console.log(`Original file: ${file.name}, Size: ${file.size / 1024} KB, Type: ${file.type}, Dims: ${origDims.width}x${origDims.height}`);

      const options = {
        maxSizeMB: 1,
        // maxWidthOrHeight: 1920, // Dimension constraint removed
        useWebWorker: true,
        initialQuality: (file.type === 'image/jpeg' || file.type === 'image/webp') ? 0.7 : undefined,
        // alwaysKeepResolution: true, // This option can sometimes help
      };

      // Remove undefined keys
      const activeOptions = Object.entries(options).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as imageCompression.Options);

      console.log('Using compression options:', activeOptions);

      const compressedFile = await imageCompression(file, activeOptions);
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
      // Clean up the original URL if compression fails
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      setOriginalImageUrl(null);
      originalUrlRef.current = null;
      setOriginalFile(null);
      setOriginalSize(null);
      setOriginalType(null);
      setOriginalDimensions(null);
    } finally {
      setLoading(false);
    }
  }, []); // Removed dependencies as refs handle the URL cleanup logic now

  const handleDownload = () => {
    if (compressedFileForDownload) {
      saveAs(compressedFileForDownload, `compressed_${originalFile?.name ?? 'image'}`);
    }
  };

  // Clean up object URLs on component unmount
  useEffect(() => {
    // The refs contain the latest URLs that need cleanup.
    // This cleanup runs only once when the component unmounts.
    return () => {
      if (originalUrlRef.current) {
        console.log("Unmounting: Revoking original URL", originalUrlRef.current);
        URL.revokeObjectURL(originalUrlRef.current);
      }
      if (compressedUrlRef.current) {
        console.log("Unmounting: Revoking compressed URL", compressedUrlRef.current);
        URL.revokeObjectURL(compressedUrlRef.current);
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  const formatBytes = (bytes: number | null, decimals = 2) => {
    if (bytes === null || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const compressionRatio = originalSize && compressedSize ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Image Optimizer</CardTitle>
          <CardDescription>Upload an image (JPG, PNG, WEBP) to compress it without changing dimensions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
            <Label htmlFor="picture">Upload Image</Label>
            <Input id="picture" type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} disabled={loading} />
          </div>

          {loading && (
            <div className="flex items-center justify-center space-x-2 pt-4">
              <Progress value={undefined} className="w-1/2 h-2 animate-pulse" />
              <span>Compressing...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="max-w-xl mx-auto">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Use state for rendering, refs for cleanup */}
          {(originalImageUrl || compressedImageUrl) && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-4">
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
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center pt-4">
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
          Images are compressed directly in your browser using the{' '}
          <code className="font-mono text-sm">browser-image-compression</code> library.
          JPEGs/WEBPs use lossy compression (quality adjusted), while PNGs use lossless compression.
          The image dimensions are preserved. The target max output size is ~1MB. No data is sent to any server.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default Index;