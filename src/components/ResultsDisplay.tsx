import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import type { OptimizedImage } from '@/hooks/useImageOptimizer'; // Import the type

interface ResultsDisplayProps {
  optimizedImages: OptimizedImage[];
  totalOriginalSize: number;
  totalOptimizedSize: number;
  totalReduction: number;
  onDownloadAll: () => void;
  canDownload: boolean;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  optimizedImages,
  totalOriginalSize,
  totalOptimizedSize,
  totalReduction,
  onDownloadAll,
  canDownload
}) => {
  if (optimizedImages.length === 0) {
    return null; // Don't render anything if there are no results yet
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Optimization Results</CardTitle>
        <CardDescription>
          Total Reduction: {formatBytes(totalOriginalSize)} -&gt; {formatBytes(totalOptimizedSize)} ({totalReduction.toFixed(1)}%)
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {optimizedImages.map((imgData, index) => (
          <Card key={index}>
            <CardHeader className="p-2">
              {/* Ensure previewUrl is valid before rendering */}
              {imgData.previewUrl ? (
                 <img src={imgData.previewUrl} alt={`Optimized ${imgData.file.name}`} className="rounded-md object-contain h-32 w-full" />
              ) : (
                <div className="rounded-md bg-muted h-32 w-full flex items-center justify-center text-muted-foreground text-sm">
                  Preview unavailable
                </div>
              )}
            </CardHeader>
            <CardContent className="p-3 text-xs space-y-1">
              <p className="font-medium truncate" title={imgData.file.name}>{imgData.file.name}</p>
              <p>Original: {formatBytes(imgData.originalSize)}</p>
              <p>Optimized: {formatBytes(imgData.optimizedSize)}</p>
              <p>Reduction: {(( (imgData.originalSize - imgData.optimizedSize) / imgData.originalSize ) * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
        ))}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onDownloadAll} variant="secondary" disabled={!canDownload}>
          Download All (.zip)
        </Button>
      </CardFooter>
    </Card>
  );
};