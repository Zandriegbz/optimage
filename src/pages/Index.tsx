import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils"; // Assuming utils file exists

interface OptimizedImage {
  file: File;
  originalSize: number;
  optimizedSize: number;
  previewUrl: string;
}

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [optimizedImages, setOptimizedImages] = useState<OptimizedImage[]>([]);
  const [quality, setQuality] = useState(0.6); // Default quality
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState(1920); // Default max dimension
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
      setOptimizedImages([]); // Reset optimized images when new files are selected
      setProgress(0); // Reset progress
    }
  };

  const handleOptimize = async () => {
    if (files.length === 0) {
      toast.error("Please select files first.");
      return;
    }

    setIsOptimizing(true);
    setOptimizedImages([]);
    setProgress(0);
    const optimizedResults: OptimizedImage[] = [];
    const totalFiles = files.length;

    const options = {
      maxSizeMB: 1, // This will be overridden by quality, but is required
      maxWidthOrHeight: maxWidthOrHeight,
      useWebWorker: true,
      initialQuality: quality,
      onProgress: (p: number) => {
        // This progress is per file, we need to calculate overall progress
        // console.log(`Compression progress for one file: ${p}%`);
      },
    };

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      try {
        console.log(`Optimizing ${file.name} with quality ${quality} and max dimension ${maxWidthOrHeight}`);
        const compressedFile = await imageCompression(file, options);
        console.log(`Original size: ${formatBytes(file.size)}`);
        console.log(`Compressed size: ${formatBytes(compressedFile.size)}`);

        const previewUrl = URL.createObjectURL(compressedFile);

        optimizedResults.push({
          file: new File([compressedFile], file.name, { type: compressedFile.type }),
          originalSize: file.size,
          optimizedSize: compressedFile.size,
          previewUrl: previewUrl,
        });

        // Update overall progress
        setProgress(Math.round(((i + 1) / totalFiles) * 100));

      } catch (error) {
        console.error(`Error compressing file ${file.name}:`, error);
        toast.error(`Failed to optimize ${file.name}. Skipping.`);
        // Update progress even if a file fails
        setProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
    }

    setOptimizedImages(optimizedResults);
    setIsOptimizing(false);
    if (optimizedResults.length > 0) {
      toast.success(`Optimization complete for ${optimizedResults.length} image(s).`);
    } else {
      toast.error("Optimization failed for all images.");
    }
  };

  const handleDownloadAll = () => {
    if (optimizedImages.length === 0) {
      toast.error("No optimized images to download.");
      return;
    }

    const zip = new JSZip();
    optimizedImages.forEach((imgData) => {
      zip.file(imgData.file.name, imgData.file);
    });

    zip.generateAsync({ type: "blob" })
      .then((content) => {
        saveAs(content, "optimized_images.zip");
        toast.success("Downloading zip file...");
      })
      .catch(err => {
        console.error("Error creating zip file:", err);
        toast.error("Failed to create zip file.");
      });
  };

  const totalOriginalSize = optimizedImages.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalOptimizedSize = optimizedImages.reduce((acc, curr) => acc + curr.optimizedSize, 0);
  const totalReduction = totalOriginalSize > 0 ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100 : 0;

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
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="picture">Select Images</Label>
            {/* Apply button styling to the label acting as the button */}
            <Label
              htmlFor="picture-input"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer"
            >
              Choose Files ({files.length} selected)
            </Label>
            <Input
              id="picture-input"
              type="file"
              multiple
              accept="image/png, image/jpeg, image/webp, image/gif"
              onChange={handleFileChange}
              className="hidden" // Hide the default input
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quality">Quality (0.1 = Max Compression, 1 = Best Quality)</Label>
            <div className="flex items-center space-x-4">
              <Slider
                id="quality"
                min={0.1}
                max={1}
                step={0.05}
                value={[quality]}
                onValueChange={(value) => setQuality(value[0])}
                disabled={isOptimizing}
                className="flex-grow"
              />
              <span className="font-mono text-sm w-12 text-right">{quality.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-dimension">Max Width/Height (pixels)</Label>
             <div className="flex items-center space-x-4">
              <Slider
                id="max-dimension"
                min={320}
                max={4096}
                step={10}
                value={[maxWidthOrHeight]}
                onValueChange={(value) => setMaxWidthOrHeight(value[0])}
                disabled={isOptimizing}
                className="flex-grow"
              />
              <span className="font-mono text-sm w-16 text-right">{maxWidthOrHeight} px</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleOptimize} disabled={isOptimizing || files.length === 0}>
            {isOptimizing ? "Optimizing..." : "Optimize Images"}
          </Button>
        </CardFooter>
      </Card>

      {isOptimizing && (
        <div className="w-full max-w-2xl space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-center text-muted-foreground">{progress}% Complete</p>
        </div>
      )}

      {optimizedImages.length > 0 && !isOptimizing && (
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
                   <img src={imgData.previewUrl} alt={`Optimized ${imgData.file.name}`} className="rounded-md object-contain h-32 w-full" />
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
             <Button onClick={handleDownloadAll} variant="secondary">
               Download All (.zip)
             </Button>
           </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default Index;