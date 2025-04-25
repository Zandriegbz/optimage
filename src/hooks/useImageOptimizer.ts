import { useState, useCallback, useMemo } from "react";
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";

export interface OptimizedImage {
  file: File;
  originalSize: number;
  optimizedSize: number;
  previewUrl: string;
}

export function useImageOptimizer() {
  const [files, setFiles] = useState<File[]>([]);
  const [optimizedImages, setOptimizedImages] = useState<OptimizedImage[]>([]);
  const [quality, setQuality] = useState(0.6); // Default quality
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState(1920); // Default max dimension
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
      setOptimizedImages([]); // Reset optimized images
      setProgress(0); // Reset progress
      // Clear the input value to allow selecting the same file(s) again
      event.target.value = '';
    }
  }, []);

  const handleOptimize = useCallback(async () => {
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
      maxSizeMB: 1, // Required, but initialQuality takes precedence
      maxWidthOrHeight: maxWidthOrHeight,
      useWebWorker: true,
      initialQuality: quality,
      // We don't use per-file progress here, calculate overall progress below
      // onProgress: (p: number) => {},
    };

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      try {
        console.log(`Optimizing ${file.name} with quality ${quality} and max dimension ${maxWidthOrHeight}`);
        const compressedFile = await imageCompression(file, options);
        console.log(`Original size: ${formatBytes(file.size)}`);
        console.log(`Compressed size: ${formatBytes(compressedFile.size)}`);

        // Create a preview URL that needs to be revoked later
        const previewUrl = URL.createObjectURL(compressedFile);

        optimizedResults.push({
          file: new File([compressedFile], file.name, { type: compressedFile.type }),
          originalSize: file.size,
          optimizedSize: compressedFile.size,
          previewUrl: previewUrl,
        });

      } catch (error) {
        console.error(`Error compressing file ${file.name}:`, error);
        toast.error(`Failed to optimize ${file.name}. Skipping.`);
      } finally {
         // Update overall progress regardless of success or failure
         setProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
    }

     // Revoke previous preview URLs before setting new ones
     optimizedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));

    setOptimizedImages(optimizedResults);
    setIsOptimizing(false);

    if (optimizedResults.length > 0) {
      toast.success(`Optimization complete for ${optimizedResults.length} image(s).`);
    } else if (files.length > 0) {
       toast.error("Optimization failed for all images.");
    }
  }, [files, quality, maxWidthOrHeight, optimizedImages]); // Added optimizedImages dependency for cleanup

  const handleDownloadAll = useCallback(() => {
    if (optimizedImages.length === 0) {
      toast.error("No optimized images to download.");
      return;
    }

    const zip = new JSZip();
    optimizedImages.forEach((imgData) => {
      zip.file(imgData.file.name, imgData.file);
    });

    toast.info("Creating zip file...");

    zip.generateAsync({ type: "blob" })
      .then((content) => {
        saveAs(content, "optimized_images.zip");
        toast.success("Downloading zip file...");
      })
      .catch(err => {
        console.error("Error creating zip file:", err);
        toast.error("Failed to create zip file.");
      });
  }, [optimizedImages]);

  const totalOriginalSize = useMemo(() => optimizedImages.reduce((acc, curr) => acc + curr.originalSize, 0), [optimizedImages]);
  const totalOptimizedSize = useMemo(() => optimizedImages.reduce((acc, curr) => acc + curr.optimizedSize, 0), [optimizedImages]);
  const totalReduction = useMemo(() => totalOriginalSize > 0 ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100 : 0, [totalOriginalSize, totalOptimizedSize]);

  // Cleanup object URLs on unmount or when optimizedImages change
  // Note: This cleanup runs when the component using the hook unmounts.
  // We also added cleanup within handleOptimize before setting new images.
//   useEffect(() => {
//     return () => {
//       optimizedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
//     };
//   }, [optimizedImages]);
  // Commenting out useEffect cleanup as it might revoke URLs too early if the hook instance persists across renders differently than expected. Cleanup in handleOptimize is safer.


  return {
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
    canOptimize: files.length > 0 && !isOptimizing,
    canDownload: optimizedImages.length > 0 && !isOptimizing,
  };
}