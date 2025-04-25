import { useState, useCallback, useMemo, useEffect } from "react"; // Added useEffect for potential cleanup logging
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
  console.log("useImageOptimizer: Hook initializing..."); // Log hook start

  const [files, setFiles] = useState<File[]>([]);
  const [optimizedImages, setOptimizedImages] = useState<OptimizedImage[]>([]);
  const [quality, setQuality] = useState(0.6);
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState(1920);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  console.log("useImageOptimizer: Initial state set"); // Log after state init

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("useImageOptimizer: handleFileChange triggered");
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
      setOptimizedImages([]);
      setProgress(0);
      event.target.value = '';
      console.log("useImageOptimizer: Files set, count:", event.target.files.length);
    }
  }, []);

  const handleOptimize = useCallback(async () => {
    console.log("useImageOptimizer: handleOptimize triggered");
    if (files.length === 0) {
      toast.error("Please select files first.");
      return;
    }

    // Revoke previous URLs before starting new optimization
    console.log("useImageOptimizer: Revoking old preview URLs...");
    optimizedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    console.log("useImageOptimizer: Old URLs revoked.");


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

    console.log(`useImageOptimizer: Starting optimization for ${totalFiles} files with options:`, options);

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const currentProgress = Math.round(((i + 1) / totalFiles) * 100);
      try {
        console.log(`useImageOptimizer: Optimizing ${file.name}...`);
        const compressedFile = await imageCompression(file, options);
        const previewUrl = URL.createObjectURL(compressedFile);
        console.log(`useImageOptimizer: Optimized ${file.name}. Original: ${file.size}, Compressed: ${compressedFile.size}`);

        optimizedResults.push({
          file: new File([compressedFile], file.name, { type: compressedFile.type }),
          originalSize: file.size,
          optimizedSize: compressedFile.size,
          previewUrl: previewUrl,
        });

      } catch (error) {
        console.error(`useImageOptimizer: Error compressing file ${file.name}:`, error);
        toast.error(`Failed to optimize ${file.name}. Skipping.`);
      } finally {
         setProgress(currentProgress); // Update progress
         console.log(`useImageOptimizer: Progress updated to ${currentProgress}%`);
      }
    }

    setOptimizedImages(optimizedResults);
    setIsOptimizing(false);
    console.log("useImageOptimizer: Optimization finished. Results count:", optimizedResults.length);

    if (optimizedResults.length > 0) {
      toast.success(`Optimization complete for ${optimizedResults.length} image(s).`);
    } else if (files.length > 0) {
       toast.error("Optimization failed for all images.");
    }
  }, [files, quality, maxWidthOrHeight, optimizedImages]); // Keep optimizedImages dependency for cleanup

  const handleDownloadAll = useCallback(() => {
    console.log("useImageOptimizer: handleDownloadAll triggered");
    if (optimizedImages.length === 0) {
      toast.error("No optimized images to download.");
      return;
    }

    const zip = new JSZip();
    optimizedImages.forEach((imgData) => {
      zip.file(imgData.file.name, imgData.file);
    });

    toast.info("Creating zip file...");
    console.log("useImageOptimizer: Generating zip file...");

    zip.generateAsync({ type: "blob" })
      .then((content) => {
        saveAs(content, "optimized_images.zip");
        toast.success("Downloading zip file...");
        console.log("useImageOptimizer: Zip file download initiated.");
      })
      .catch(err => {
        console.error("useImageOptimizer: Error creating zip file:", err);
        toast.error("Failed to create zip file.");
      });
  }, [optimizedImages]);

  const totalOriginalSize = useMemo(() => optimizedImages.reduce((acc, curr) => acc + curr.originalSize, 0), [optimizedImages]);
  const totalOptimizedSize = useMemo(() => optimizedImages.reduce((acc, curr) => acc + curr.optimizedSize, 0), [optimizedImages]);
  const totalReduction = useMemo(() => totalOriginalSize > 0 ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100 : 0, [totalOriginalSize, totalOptimizedSize]);

  // Log hook return values
  const returnValues = {
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
  console.log("useImageOptimizer: Returning values:", returnValues);

  // Optional: Add effect for cleanup logging if needed
  useEffect(() => {
    console.log("useImageOptimizer: Effect triggered (mount/update)");
    return () => {
      console.log("useImageOptimizer: Cleanup effect triggered (unmount/before update)");
      // It's crucial to revoke URLs here if the component unmounts unexpectedly
      // optimizedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      // Be cautious with cleanup here - revoking in handleOptimize might be safer
    };
  }, []); // Run only on mount/unmount

  return returnValues;
}