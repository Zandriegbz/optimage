import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Download, ArrowRight, Loader2 } from 'lucide-react';

// Helper function to format bytes
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const Index: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [optimizedSize, setOptimizedSize] = useState<number | null>(null);
  const [optimizedDataUrl, setOptimizedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [quality] = useState<number>(0.7); // JPEG quality (0 to 1)

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Invalid file type. Please upload a JPEG or PNG image.');
        resetState();
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear the input
        }
        return;
      }
      setOriginalFile(file);
      setOriginalSize(file.size);
      setOptimizedBlob(null);
      setOptimizedSize(null);
      setOptimizedDataUrl(null);
      console.log("Original file selected:", file.name, file.size);
    }
  };

  const resetState = () => {
    setOriginalFile(null);
    setOriginalSize(null);
    setOptimizedBlob(null);
    setOptimizedSize(null);
    setOptimizedDataUrl(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the input visually
    }
  }

  const optimizeImage = useCallback(() => {
    if (!originalFile) return;

    setIsProcessing(true);
    setOptimizedBlob(null);
    setOptimizedSize(null);
    setOptimizedDataUrl(null);
    console.log("Starting optimization for:", originalFile.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        console.log("Image loaded into memory");
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            toast.error("Could not get canvas context.");
            setIsProcessing(false);
            return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        console.log("Image drawn on canvas");

        const mimeType = originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const qualityArg = mimeType === 'image/jpeg' ? quality : undefined;

        canvas.toBlob((blob) => {
          if (blob) {
            console.log("Optimized blob created:", blob.size);
            setOptimizedBlob(blob);
            setOptimizedSize(blob.size);

            // Create data URL for preview (optional, but good for display)
            const dataUrlReader = new FileReader();
            dataUrlReader.onloadend = () => {
                setOptimizedDataUrl(dataUrlReader.result as string);
                setIsProcessing(false);
                toast.success("Image optimized successfully!");
            }
            dataUrlReader.readAsDataURL(blob);

          } else {
            toast.error("Failed to create optimized blob.");
            setIsProcessing(false);
            console.error("Canvas toBlob returned null");
          }
        }, mimeType, qualityArg); // Pass quality only for JPEG
      };
      img.onerror = () => {
        toast.error("Failed to load image for optimization.");
        setIsProcessing(false);
        console.error("Image load error");
      }
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
        toast.error("Failed to read file.");
        setIsProcessing(false);
        console.error("FileReader error");
    }
    reader.readAsDataURL(originalFile);
  }, [originalFile, quality]);

  const handleDownload = () => {
    if (!optimizedBlob || !originalFile) return;

    const url = URL.createObjectURL(optimizedBlob);
    const link = document.createElement('a');
    link.href = url;
    const nameParts = originalFile.name.split('.');
    const extension = nameParts.pop();
    const baseName = nameParts.join('.');
    link.download = `${baseName}-optimized.${optimizedBlob.type === 'image/png' ? 'png' : 'jpg'}`; // Ensure correct extension
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log("Optimized image download initiated:", link.download);
  };

  const savedPercentage = originalSize && optimizedSize ? Math.round(((originalSize - optimizedSize) / originalSize) * 100) : 0;

  return (
    <div className="container mx-auto p-4 flex flex-col items-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Image Size Reducer</CardTitle>
          <CardDescription className="text-center">
            Upload a JPEG or PNG image to reduce its file size.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="picture">Upload Image</Label>
            <Input
              id="picture"
              type="file"
              accept="image/jpeg, image/png"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
             {originalFile && !isProcessing && (
                 <Button variant="outline" size="sm" onClick={resetState} className="mt-2 w-fit">Clear Selection</Button>
             )}
          </div>

          {originalFile && (
            <div className="flex justify-center">
              <Button onClick={optimizeImage} disabled={isProcessing || !!optimizedBlob}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Optimize Image
                  </>
                )}
              </Button>
            </div>
          )}

          {originalSize !== null && (
            <div className="text-center text-sm text-muted-foreground">
              Original Size: {formatBytes(originalSize)}
            </div>
          )}

          {optimizedSize !== null && (
            <Card className="mt-4 bg-secondary">
              <CardHeader>
                <CardTitle className="text-lg text-center">Optimization Results</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                {optimizedDataUrl && (
                    <div className="flex justify-center max-h-60 overflow-hidden rounded-md border">
                        <img src={optimizedDataUrl} alt="Optimized preview" className="max-w-full max-h-full object-contain" />
                    </div>
                )}
                <p>New Size: <span className="font-semibold">{formatBytes(optimizedSize)}</span></p>
                {originalSize && optimizedSize && originalSize > optimizedSize && (
                  <p className="text-green-600 font-medium">
                    Saved: {formatBytes(originalSize - optimizedSize)} ({savedPercentage}%)
                  </p>
                )}
                 {originalSize && optimizedSize && originalSize <= optimizedSize && (
                  <p className="text-orange-600 font-medium">
                    File size did not decrease. Original size might already be optimized.
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={handleDownload} disabled={!optimizedBlob}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Optimized Image
                </Button>
              </CardFooter>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;