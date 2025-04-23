import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import imageCompression from "browser-image-compression";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Image as ImageIcon, Trash2, Upload, Zap } from "lucide-react";

interface ProcessedImage {
  id: string;
  originalFile: File;
  processedUrl: string;
  processedBlob: Blob;
  originalSize: number;
  processedSize: number;
}

const Index = () => {
  const [originalImages, setOriginalImages] = useState<File[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressionOptions, setCompressionOptions] = useState({
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/jpeg", // Default to JPEG
    initialQuality: 0.8, // Default quality for JPEG/WEBP
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      // Filter out non-image files
      const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
      if (imageFiles.length !== newFiles.length) {
        toast.warning("Some non-image files were ignored.");
      }
      setOriginalImages(prev => [...prev, ...imageFiles]);
      // Reset progress and processed images when new files are added
      setProgress(0);
      setProcessedImages([]);
      // Clear the input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCompressionOptionChange = (key: keyof typeof compressionOptions, value: number | string | boolean) => {
    setCompressionOptions(prev => ({ ...prev, [key]: value }));
    // Reset processed images if options change
    setProcessedImages([]);
    setProgress(0);
  };

  const handleProcessImages = async () => {
    if (originalImages.length === 0) {
      toast.error("Please select images first.");
      return;
    }

    setIsProcessing(true);
    setProcessedImages([]);
    setProgress(0);
    const processed: ProcessedImage[] = [];
    const totalImages = originalImages.length;

    for (let i = 0; i < totalImages; i++) {
      const file = originalImages[i];
      const options = {
        ...compressionOptions,
        mimeType: compressionOptions.fileType, // Pass mimeType for specific output format
        initialQuality: compressionOptions.fileType === 'image/png' ? undefined : compressionOptions.initialQuality, // Quality only for JPEG/WEBP
        onProgress: (p: number) => {
          // Calculate overall progress
          const overallProgress = ((i + p / 100) / totalImages) * 100;
          setProgress(overallProgress);
        },
      };

      try {
        console.log(`Processing ${file.name} with options:`, options);
        const compressedBlob = await imageCompression(file, options);
        console.log(`Compressed ${file.name} successfully.`);
        const processedUrl = URL.createObjectURL(compressedBlob);
        processed.push({
          id: `${file.name}-${Date.now()}`,
          originalFile: file,
          processedUrl,
          processedBlob: compressedBlob,
          originalSize: file.size,
          processedSize: compressedBlob.size,
        });
      } catch (error) {
        console.error("Compression Error:", error);
        toast.error(`Failed to compress ${file.name}. Maybe the format is not supported or maxSizeMB is too low.`);
        // Optionally add a placeholder or skip the image
      }
    }

    setProcessedImages(processed);
    setIsProcessing(false);
    setProgress(100); // Ensure progress hits 100%
    if (processed.length > 0) {
        toast.success(`Successfully processed ${processed.length} image(s).`);
    } else if (originalImages.length > 0) {
        toast.error("No images were processed successfully.");
    }
  };

  const handleDownload = () => {
    if (processedImages.length === 0) {
      toast.error("No processed images to download.");
      return;
    }

    processedImages.forEach((img, index) => {
      const originalFileName = img.originalFile.name;
      const fileExtension = compressionOptions.fileType.split('/')[1] || 'jpg'; // Get extension from selected type
      const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
      const newFileName = `${baseName}_compressed.${fileExtension}`;

      try {
        saveAs(img.processedBlob, newFileName);
        if (index === processedImages.length - 1) {
            toast.success(`Downloading ${processedImages.length} image(s)...`);
        }
      } catch (error) {
          console.error("Download Error:", error);
          toast.error(`Failed to initiate download for ${newFileName}.`);
      }
    });
  };

  const handleClearAll = () => {
    setOriginalImages([]);
    setProcessedImages([]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input
    }
    toast.info("Cleared all images.");
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getReductionPercentage = (originalSize: number, processedSize: number) => {
    if (originalSize === 0) return 0;
    return Math.round(((originalSize - processedSize) / originalSize) * 100);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Image Compressor</CardTitle>
          <CardDescription className="text-center">
            Upload, compress, and download your images efficiently.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Input Section */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="picture">Select Images</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="picture"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="flex-grow"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Browse
              </Button>
            </div>
            {originalImages.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected {originalImages.length} image(s).
              </p>
            )}
          </div>

          {/* Compression Options Section */}
          {originalImages.length > 0 && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Options</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="mt-4 space-y-4">
                 <div>
                    <Label htmlFor="fileType">Output Format</Label>
                    <Select
                        value={compressionOptions.fileType}
                        onValueChange={(value) => handleCompressionOptionChange('fileType', value)}
                    >
                        <SelectTrigger id="fileType">
                        <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="image/jpeg">JPEG</SelectItem>
                        <SelectItem value="image/png">PNG</SelectItem>
                        <SelectItem value="image/webp">WEBP</SelectItem>
                        {/* <SelectItem value="image/gif">GIF</SelectItem>  GIF might not be well supported by the library */}
                        {/* <SelectItem value="image/bmp">BMP</SelectItem> BMP might not be well supported */}
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">Choose the desired output image format.</p>
                 </div>
                 {compressionOptions.fileType !== 'image/png' && (
                    <div>
                        <Label htmlFor="quality">Quality ({Math.round(compressionOptions.initialQuality * 100)}%)</Label>
                        <Slider
                        id="quality"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={[compressionOptions.initialQuality]}
                        onValueChange={(value) => handleCompressionOptionChange('initialQuality', value[0])}
                        />
                        <p className="text-sm text-muted-foreground mt-1">Adjust compression quality (lower value means smaller size, lower quality). Not applicable for PNG.</p>
                    </div>
                 )}
              </TabsContent>
              <TabsContent value="advanced" className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="maxSizeMB">Max Size (MB): {compressionOptions.maxSizeMB}</Label>
                  <Slider
                    id="maxSizeMB"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={[compressionOptions.maxSizeMB]}
                    onValueChange={(value) => handleCompressionOptionChange('maxSizeMB', value[0])}
                  />
                   <p className="text-sm text-muted-foreground mt-1">Target maximum file size in megabytes.</p>
                </div>
                <div>
                  <Label htmlFor="maxWidthOrHeight">Max Width/Height (px): {compressionOptions.maxWidthOrHeight}</Label>
                  <Slider
                    id="maxWidthOrHeight"
                    min={100}
                    max={4000}
                    step={100}
                    value={[compressionOptions.maxWidthOrHeight]}
                    onValueChange={(value) => handleCompressionOptionChange('maxWidthOrHeight', value[0])}
                  />
                   <p className="text-sm text-muted-foreground mt-1">Maximum dimension (width or height) for the output image.</p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Action Buttons */}
          {originalImages.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between gap-2">
              <Button onClick={handleProcessImages} disabled={isProcessing}>
                <Zap className="mr-2 h-4 w-4" /> {isProcessing ? "Processing..." : "Compress Images"}
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  disabled={processedImages.length === 0 || isProcessing}
                  variant="secondary"
                >
                  <Download className="mr-2 h-4 w-4" /> Download ({processedImages.length})
                </Button>
                 <Button onClick={handleClearAll} variant="destructive" size="icon" title="Clear All">
                    <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-1">
              <Label>Processing Progress</Label>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Processed Images Preview */}
          {processedImages.length > 0 && !isProcessing && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 text-left">Processed Images:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {processedImages.map((img) => (
                  <Card key={img.id} className="overflow-hidden">
                    <CardHeader className="p-0">
                      <img
                        src={img.processedUrl}
                        alt={`Processed ${img.originalFile.name}`}
                        className="w-full h-40 object-contain bg-muted"
                      />
                    </CardHeader>
                    <CardContent className="p-3 text-xs">
                      <p className="font-medium truncate" title={img.originalFile.name}>{img.originalFile.name}</p>
                      <p>Original: {formatBytes(img.originalSize)}</p>
                      <p>Compressed: {formatBytes(img.processedSize)}</p>
                      <p className="text-green-600 font-semibold">
                        Reduction: {getReductionPercentage(img.originalSize, img.processedSize)}%
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder when no images are processed */}
          {originalImages.length > 0 && processedImages.length === 0 && !isProcessing && (
             <div className="text-center text-muted-foreground py-8">
                <ImageIcon className="mx-auto h-12 w-12 mb-2" />
                <p>Click "Compress Images" to see the results here.</p>
            </div>
          )}

           {/* Placeholder when no images are selected */}
           {originalImages.length === 0 && (
             <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-muted rounded-lg">
                <Upload className="mx-auto h-12 w-12 mb-2" />
                <p>Select images using the button above to get started.</p>
            </div>
          )}

        </CardContent>
        <CardFooter className="text-xs text-muted-foreground text-center justify-center">
          Compression is done locally in your browser. Your images are not uploaded to any server.
        </CardFooter>
      </Card>
    </div>
  );
};

export default Index;