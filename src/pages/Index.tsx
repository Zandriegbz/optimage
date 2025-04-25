import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useImageOptimizer } from "@/hooks/useImageOptimizer";
import { ImageUploader } from "@/components/ImageUploader";
import { OptimizationSettings } from "@/components/OptimizationSettings";
import { OptimizationControls } from "@/components/OptimizationControls";
import { ResultsDisplay } from "@/components/ResultsDisplay";

const Index = () => {
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

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload & Configure</CardTitle>
          <CardDescription>Select images and set optimization options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploader
            onFileChange={handleFileChange}
            fileCount={files.length}
            isOptimizing={isOptimizing}
          />
          <OptimizationSettings
            quality={quality}
            setQuality={setQuality}
            maxWidthOrHeight={maxWidthOrHeight}
            setMaxWidthOrHeight={setMaxWidthOrHeight}
            isOptimizing={isOptimizing}
          />
        </CardContent>
        {/* OptimizationControls includes the CardFooter and progress */}
        <OptimizationControls
          onOptimize={handleOptimize}
          isOptimizing={isOptimizing}
          progress={progress}
          canOptimize={canOptimize}
        />
      </Card>

      {/* ResultsDisplay handles its own visibility based on optimizedImages */}
      {!isOptimizing && (
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