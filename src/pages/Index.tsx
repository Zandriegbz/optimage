import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useImageOptimizer } from "@/hooks/useImageOptimizer";
import { ImageUploader } from "@/components/ImageUploader";
import { OptimizationSettings } from "@/components/OptimizationSettings";
import { OptimizationControls } from "@/components/OptimizationControls";
import { ResultsDisplay } from "@/components/ResultsDisplay";

const Index = () => {
  // Destructure values from the hook
  const {
    files,
    optimizedImages,
    quality,
    setQuality,
    maxWidthOrHeight,
    setMaxWidthOrHeight,
    isOptimizing,
    progress,
    handleFileChange,
    handleOptimize,
    handleDownloadAll,
    totalOriginalSize,
    totalOptimizedSize,
    totalReduction,
    canOptimize,
    canDownload,
  } = useImageOptimizer();

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6">
      <h1 className="text-3xl font-bold">Bulk Image Optimizer</h1>
      <p className="text-muted-foreground">Optimize your images locally in your browser.</p>

      {/* Configuration Card */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload & Configure</CardTitle>
          <CardDescription>Select images and set optimization options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Uploader Component */}
          <ImageUploader
            onFileChange={handleFileChange}
            fileCount={files.length}
            isOptimizing={isOptimizing}
          />
          {/* Optimization Settings Component */}
          <OptimizationSettings
            quality={quality}
            setQuality={setQuality}
            maxWidthOrHeight={maxWidthOrHeight}
            setMaxWidthOrHeight={setMaxWidthOrHeight}
            isOptimizing={isOptimizing}
          />
        </CardContent>
        {/* Optimization Controls (Button & Progress) Component */}
        <OptimizationControls
          onOptimize={handleOptimize}
          isOptimizing={isOptimizing}
          progress={progress}
          canOptimize={canOptimize}
        />
      </Card>

      {/* Results Display Component - Render only when not optimizing and results exist */}
      {!isOptimizing && optimizedImages.length > 0 && (
         <ResultsDisplay
            optimizedImages={optimizedImages}
            totalOriginalSize={totalOriginalSize}
            totalOptimizedSize={totalOptimizedSize}
            totalReduction={totalReduction}
            onDownloadAll={handleDownloadAll}
            canDownload={canDownload}
          />
      )}
    </div>
  );
};

export default Index;