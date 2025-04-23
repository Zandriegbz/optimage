import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import { Download, Trash2, Check, X } from 'lucide-react';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  compressedPreview?: string;
  compressedSize?: number;
  originalSize: number;
  isSelected: boolean;
}

const Index = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const newImages: ImageFile[] = files.map(file => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        originalSize: file.size,
        isSelected: true, // Select new images by default
      }));
      setImages(prevImages => [...prevImages, ...newImages]);
      compressImages(newImages); // Compress newly added images
    }
  };

  const compressImages = async (imagesToCompress: ImageFile[]) => {
    setIsCompressing(true);
    toast.info("Compressing images...", { id: "compressing-toast" });

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    const compressionPromises = imagesToCompress.map(async (image) => {
      try {
        console.log(`Compressing image: ${image.file.name}`);
        const compressedFile = await imageCompression(image.file, options);
        console.log(`Compressed ${image.file.name} from ${image.originalSize / 1024} KB to ${compressedFile.size / 1024} KB`);
        const compressedPreview = URL.createObjectURL(compressedFile);
        return {
          ...image,
          compressedPreview: compressedPreview,
          compressedSize: compressedFile.size,
        };
      } catch (error) {
        console.error(`Error compressing image ${image.file.name}:`, error);
        toast.error(`Failed to compress ${image.file.name}`);
        return image; // Return original image data if compression fails
      }
    });

    const compressedResults = await Promise.all(compressionPromises);

    setImages(prevImages => {
      const updatedImages = [...prevImages];
      compressedResults.forEach(compressedImage => {
        const index = updatedImages.findIndex(img => img.id === compressedImage.id);
        if (index !== -1) {
          updatedImages[index] = compressedImage;
        }
      });
      return updatedImages;
    });

    toast.dismiss("compressing-toast");
    toast.success("Image compression complete!");
    setIsCompressing(false);
  };

  const handleSelectImage = (id: string) => {
    setImages(prevImages =>
      prevImages.map(image =>
        image.id === id ? { ...image, isSelected: !image.isSelected } : image
      )
    );
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setImages(prevImages =>
      prevImages.map(image => ({ ...image, isSelected: !!checked }))
    );
  };

  const handleDeleteSelected = () => {
    const selectedIds = images.filter(img => img.isSelected).map(img => img.id);
    if (selectedIds.length === 0) {
      toast.warning("No images selected to delete.");
      return;
    }
    setImages(prevImages => prevImages.filter(image => !image.isSelected));
    toast.success(`${selectedIds.length} image(s) deleted.`);
  };

  const handleDownload = async () => {
    const selectedImages = images.filter(img => img.isSelected && img.compressedPreview);

    if (selectedImages.length === 0) {
      toast.warning("No compressed images selected to download.");
      return;
    }

    toast.info(`Starting download for ${selectedImages.length} image(s)...`);

    for (const image of selectedImages) {
      if (image.compressedPreview) {
        try {
          // Fetch the blob data for the compressed preview URL
          const response = await fetch(image.compressedPreview);
          const blob = await response.blob();
          // Use file-saver to trigger download
          saveAs(blob, `compressed_${image.file.name}`);
          console.log(`Downloading: compressed_${image.file.name}`);
          // Add a small delay between downloads to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error downloading image ${image.file.name}:`, error);
          toast.error(`Failed to download ${image.file.name}`);
        }
      }
    }
    toast.success("Downloads initiated!");
  };


  const selectedCount = images.filter(img => img.isSelected).length;
  const allSelected = images.length > 0 && selectedCount === images.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < images.length;

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Image Compressor & Downloader</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            Upload images, compress them, and download the results individually.
          </p>
          <Input
            id="picture"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            disabled={isCompressing}
          />
        </CardContent>
      </Card>

      {images.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={allSelected || isIndeterminate}
                onCheckedChange={handleSelectAll}
                aria-label="Select all images"
              />
              <Label htmlFor="select-all">
                Select All ({selectedCount}/{images.length})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={selectedCount === 0 || isCompressing}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Selected ({selectedCount})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedCount === 0 || isCompressing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedCount})
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="relative overflow-hidden">
                <CardContent className="p-0">
                  <img
                    src={image.compressedPreview || image.preview}
                    alt={`Preview of ${image.file.name}`}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={image.isSelected}
                      onCheckedChange={() => handleSelectImage(image.id)}
                      aria-label={`Select image ${image.file.name}`}
                      className="bg-white/80 hover:bg-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                  </div>
                </CardContent>
                <CardFooter className="p-2 text-xs bg-muted/50">
                  <div className="w-full">
                    <p className="truncate font-medium" title={image.file.name}>{image.file.name}</p>
                    <p>
                      Original: {(image.originalSize / 1024).toFixed(1)} KB
                    </p>
                    {image.compressedSize !== undefined ? (
                      <p className="text-green-600 flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        Compressed: {(image.compressedSize / 1024).toFixed(1)} KB
                        ({(((image.originalSize - image.compressedSize) / image.originalSize) * 100).toFixed(0)}% smaller)
                      </p>
                    ) : isCompressing ? (
                       <p className="text-blue-600">Compressing...</p>
                    ) : (
                      <p className="text-red-600 flex items-center">
                        <X className="h-3 w-3 mr-1" />
                        Not compressed
                      </p>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Index;