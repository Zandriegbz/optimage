"use client";

import React, { useState, useCallback } from 'react';
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

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state for new upload
    setOriginalFile(file);
    setOriginalImageUrl(URL.createObjectURL(file));
    setCompressedImageUrl(null);
    setCompressedFileForDownload(null);
    setError(null);
    setOriginalSize(file.size);
    setCompressedSize(null);
    setOriginalType(file.type);
    setCompressedType(null);
    setLoading(true);

    console.log(`Original file: ${file.name}, Size: ${file.size / 1024} KB, Type: ${file.type}`);

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      // Only apply initialQuality for lossy formats like JPEG/WEBP
      initialQuality: (file.type === 'image/jpeg' || file.type === 'image/webp') ? 0.7 : undefined,
      // Keep the original file type if possible
      // fileType: file.type, // Let the library decide the best output format or keep original if possible without this
      // Let's log the options being used
    };

    // Remove undefined keys to avoid passing them to the library
    const activeOptions = Object.entries(options).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as imageCompression.Options);


    console.log('Using compression options:', activeOptions);

    try {
      const compressedFile = await imageCompression(file, activeOptions);
      console.log(`Compressed file size: ${compressedFile.size / 1024} KB, Type: ${compressedFile.type}`);

      setCompressedSize(compressedFile.size);
      setCompressedType(compressedFile.type); // Check if type changed
      setCompressedImageUrl(URL.createObjectURL(compressedFile));
      setCompressedFileForDownload(compressedFile);

    } catch (err) {
      console.error('Compression error:', err);
      setError(`Compression failed: ${err instanceof Error ? err.message : String(err)}`);
      // Clean up potentially created object URLs if compression fails midway
      if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
      setOriginalImageUrl(null); // Clear preview on error
      setOriginalFile(null);
      setOriginalSize(null);
      setOriginalType(null);
    } finally {
      setLoading(false);
    }
  }, [originalImageUrl]); // Dependency added

  const handleDownload = () => {
    if (compressedFileForDownload) {
      saveAs(compressedFileForDownload, `compressed_${originalFile?.name ?? 'image'}`);
    }
  };

  // Clean up object URLs on component unmount
  React.useEffect(() => {
    return () => {
      if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
      if (compressedImageUrl) URL.revokeObjectURL(compressedImageUrl);
    };
  }, [originalImageUrl, compressedImageUrl]);

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
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Image Optimizer</CardTitle>
          <CardDescription>Upload an image (JPG, PNG, WEBP) to compress it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="picture">Upload Image</Label>
            <Input id="picture" type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} disabled={loading} />
          </div>

          {loading && (
            <div className="flex items-center space-x-2">
              <Progress value={undefined} className="w-full h-2 animate-pulse" />
              <span>Compressing...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {(originalImageUrl || compressedImageUrl) && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {originalImageUrl && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-center">Original</h3>
                  <img src={originalImageUrl} alt="Original" className="rounded-md border max-w-full h-auto mx-auto" style={{ maxHeight: '300px' }} />
                  <p className="text-sm text-center text-muted-foreground">
                    Size: {formatBytes(originalSize)} <br />
                    Type: {originalType}
                  </p>
                </div>
              )}
              {compressedImageUrl && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-center">Compressed</h3>
                  <img src={compressedImageUrl} alt="Compressed" className="rounded-md border max-w-full h-auto mx-auto" style={{ maxHeight: '300px' }} />
                   <p className="text-sm text-center text-muted-foreground">
                    Size: {formatBytes(compressedSize)} <br />
                    Type: {compressedType} <br />
                    {compressionRatio > 0 && `(${compressionRatio.toFixed(1)}% reduction)`}
                    {compressionRatio < 0 && `(${(compressionRatio * -1).toFixed(1)}% increase)`}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {compressedFileForDownload && !loading && !error && (
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download Compressed Image
            </Button>
          )}
        </CardFooter>
      </Card>

      <Alert className="max-w-2xl">
        <Terminal className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          Images are compressed directly in your browser using the{' '}
          <code className="font-mono text-sm">browser-image-compression</code> library.
          JPEGs/WEBPs use lossy compression (quality adjusted), while PNGs use lossless compression.
          Max output size is ~1MB and max dimension is 1920px. No data is sent to any server.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default Index;