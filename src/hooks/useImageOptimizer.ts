import { useState, useCallback, useMemo, useEffect } from "react";
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils"; // Ensure this import works now

export interface OptimizedImage {
  file: File;
  originalSize: number;
  optimizedSize: number;
  previewUrl: string;
}

export function useImageOptimizer() {
  const [files, setFiles] = useState<File[]>([]);
  const [optimizedImages, setOptimizedImages] = useState<OptimizedImage[]>([]);
  const [quality, setQuality] = useState(0.6);
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState(1920);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // Revoke previous URLs when new files are selected
      optimizedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setFiles(Array.from(event.target.files));
      setOptimizedImages([]);
      setProgress(0);
      event.target.value = ''; // Allow re-selecting same files
    }
  }, [optimizedImages]); // Add optimizedImages dependency for cleanup

  const handleOptimize = useCallback(async () => {
    if (files.length === 0) {
      toast.error("Please select files first.");
      return;
    }

    // Revoke previous URLs before starting new optimization
    optimizedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));

    setIsOptimizing(true);
    setOptimizedImages([]); // Clear previous results immediately
    setProgress(0);
    const optimizedResults: OptimizedImage[] = [];
    const totalFiles = files.length;

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: maxWidthOrHeight,
      useWebWorker: true,
      initialQuality: quality,
    };

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const currentProgress = Math.round(((i + 1) / totalFiles) * 100);
      try {
        const compressedFile = await imageCompression(file, options);
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
         setProgress(currentProgress); // Update progress
      }
    }

    setOptimizedImages(optimizedResults);
    setIsOptimizing(false);

    if (optimizedResults.length > 0) {
      toast.success(`Optimization complete for ${optimizedResults.length} image(s).`);
    } else if (files.length > 0) {
       toast.error("Optimization failed for all images.");
    }
  }, [files, quality, maxWidthOrHeight, optimizedImages]); // Keep optimizedImages dependency

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

  // Cleanup effect: Revoke object URLs when the component unmounts or optimizedImages changes
  useEffect(() => {
    // This function will run when the component unmounts or before the effect runs again
    return () => {
      optimizedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, [optimizedImages]); // Dependency array ensures cleanup runs when images change

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