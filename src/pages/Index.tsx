import React, { useState, useRef, useCallback, DragEvent, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, Download, ArrowRight, Loader2, FileImage, X, CheckCircle, AlertCircle, Archive, Info } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Import Squoosh functions - dynamic import might be better for bundle size later
import { ImagePool } from '@squoosh/lib';
import os from 'os'; // Required by @squoosh/lib

// Helper function to format bytes
const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

interface ImageFileState {
    file: File;
    originalSize: number;
    optimizedBlob?: Blob;
    optimizedSize?: number;
    optimizedDataUrl?: string; // Keep for JPEG preview, maybe PNG too if needed
    status: 'pending' | 'optimizing' | 'done' | 'error' | 'no_reduction';
    error?: string;
}

// Create an ImagePool outside the component to manage concurrency
// Use half the available CPU cores, or at least 1
const threadCount = Math.max(1, Math.floor((os.cpus()?.length || 1) / 2));
let imagePool: ImagePool | null = null; // Initialize lazily

const Index: React.FC = () => {
    const [imageFiles, setImageFiles] = useState<Record<string, ImageFileState>>({});
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isInitializing, setIsInitializing] = useState<boolean>(true); // Track pool initialization
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [quality] = useState<number>(0.7); // JPEG quality (0 to 1)

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize ImagePool on mount
    useEffect(() => {
        console.log(`Initializing ImagePool with ${threadCount} threads...`);
        try {
            imagePool = new ImagePool(threadCount);
            console.log("ImagePool initialized successfully.");
            setIsInitializing(false);
        } catch (error) {
            console.error("Failed to initialize ImagePool:", error);
            toast.error("Failed to initialize image processing library. Please refresh.", { duration: Infinity });
            setIsInitializing(false); // Allow UI interaction even if pool fails
        }

        // Cleanup function to close the pool on unmount
        return () => {
            if (imagePool) {
                console.log("Closing ImagePool...");
                imagePool.close().then(() => {
                    console.log("ImagePool closed.");
                    imagePool = null;
                }).catch(err => {
                    console.error("Error closing ImagePool:", err);
                });
            }
        };
    }, []); // Run only once on mount

    const addFiles = (files: FileList | null) => {
        if (!files) return;

        const newFiles: Record<string, ImageFileState> = {};
        let addedCount = 0;
        let invalidCount = 0;

        for (const file of Array.from(files)) {
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                invalidCount++;
                continue;
            }
            if (!imageFiles[file.name]) {
                 newFiles[file.name] = {
                    file: file,
                    originalSize: file.size,
                    status: 'pending',
                };
                addedCount++;
            }
        }

        if (addedCount > 0) {
             setImageFiles(prev => ({ ...prev, ...newFiles }));
             toast.success(`${addedCount} image(s) added.`);
        }
         if (invalidCount > 0) {
            toast.error(`${invalidCount} file(s) skipped (invalid type). Only JPEG/PNG allowed.`);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        addFiles(event.target.files);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault(); event.stopPropagation(); setIsDragging(true);
    };
    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault(); event.stopPropagation(); setIsDragging(false);
    };
    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault(); event.stopPropagation(); setIsDragging(false);
        addFiles(event.dataTransfer.files);
    };

    const optimizeSingleImage = async (fileName: string): Promise<void> => {
        const fileState = imageFiles[fileName];
        if (!fileState || !['pending', 'error', 'no_reduction'].includes(fileState.status)) {
            return; // Already processed or currently optimizing
        }
        if (!imagePool && fileState.file.type === 'image/png') {
             setImageFiles(prev => ({ ...prev, [fileName]: { ...prev[fileName], status: 'error', error: 'Processing library not ready' } }));
             console.error("ImagePool not available for PNG processing");
             toast.error("Image processing library failed to load. Cannot process PNGs.", { duration: 10000 });
             return;
        }


        setImageFiles(prev => ({
            ...prev,
            [fileName]: { ...prev[fileName], status: 'optimizing', error: undefined }
        }));
        console.log(`Starting optimization for: ${fileName} (${fileState.file.type})`);

        try {
            const fileBuffer = await fileState.file.arrayBuffer();
            let optimizedBlob: Blob | null = null;
            let optimizedSize: number | undefined = undefined;

            if (fileState.file.type === 'image/png' && imagePool) {
                // --- PNG Optimization using Squoosh (OxiPNG) ---
                console.log(`Processing PNG with Squoosh/OxiPNG: ${fileName}`);
                const image = imagePool.ingestImage(fileBuffer);

                // Decode (needed for Squoosh processing)
                await image.decoded; // Wait for decoding

                // Encode with OxiPNG (lossless)
                // You can adjust the 'level' (0-6, higher is slower but potentially smaller)
                const encodeOptions = { oxipng: { level: 2 } };
                await image.encode(encodeOptions);

                const encodedResult = await image.encodedWith.oxipng; // Get the result for oxipng
                if (!encodedResult) {
                    throw new Error('OxiPNG encoding failed');
                }

                console.log(`Squoosh/OxiPNG finished for: ${fileName}, size: ${encodedResult.size}`);

                if (encodedResult.size < fileState.originalSize) {
                    optimizedBlob = new Blob([encodedResult.binary], { type: 'image/png' });
                    optimizedSize = optimizedBlob.size;
                } else {
                    console.log(`Squoosh/OxiPNG did not reduce size for: ${fileName}`);
                    setImageFiles(prev => ({
                        ...prev,
                        [fileName]: { ...prev[fileName], status: 'no_reduction', error: 'File size did not decrease' }
                    }));
                    return; // Exit early if no reduction
                }

            } else if (fileState.file.type === 'image/jpeg') {
                // --- JPEG Optimization using Canvas (as before) ---
                console.log(`Processing JPEG with Canvas: ${fileName}`);
                optimizedBlob = await new Promise<Blob | null>((resolve, reject) => {
                     const img = new Image();
                     img.onload = () => {
                         const canvas = document.createElement('canvas');
                         canvas.width = img.width;
                         canvas.height = img.height;
                         const ctx = canvas.getContext('2d');
                         if (!ctx) return reject(new Error('Canvas context error'));
                         ctx.drawImage(img, 0, 0, img.width, img.height);
                         canvas.toBlob(resolve, 'image/jpeg', quality);
                     };
                     img.onerror = () => reject(new Error('Image load failed'));
                     img.src = URL.createObjectURL(new Blob([fileBuffer])); // Create URL from buffer
                 });

                if (!optimizedBlob) {
                    throw new Error('JPEG blob creation failed');
                }
                 optimizedSize = optimizedBlob.size;
                 console.log(`Canvas/JPEG finished for: ${fileName}, size: ${optimizedSize}`);

                 // Optional: Check if JPEG size increased (less likely but possible)
                 if (optimizedSize >= fileState.originalSize) {
                     console.log(`Canvas/JPEG did not reduce size for: ${fileName}`);
                     setImageFiles(prev => ({
                         ...prev,
                         [fileName]: { ...prev[fileName], status: 'no_reduction', error: 'File size did not decrease' }
                     }));
                     return;
                 }

            } else {
                 throw new Error(`Unsupported type or missing image pool: ${fileState.file.type}`);
            }

            // --- Update state with successful optimization ---
            if (optimizedBlob && optimizedSize !== undefined) {
                 // Generate Data URL for preview (optional but nice)
                 const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(optimizedBlob!);
                 });

                 setImageFiles(prev => ({
                    ...prev,
                    [fileName]: {
                        ...prev[fileName],
                        optimizedBlob: optimizedBlob,
                        optimizedSize: optimizedSize,
                        optimizedDataUrl: dataUrl,
                        status: 'done',
                        error: undefined,
                    }
                }));
            }

        } catch (error: any) {
            console.error(`Optimization failed for ${fileName}:`, error);
            setImageFiles(prev => ({
                ...prev,
                [fileName]: { ...prev[fileName], status: 'error', error: error.message || 'Optimization failed' }
            }));
        }
    };


    const optimizeAllImages = async () => {
        if (isInitializing) {
            toast.warning("Processing library still initializing...");
            return;
        }
        const filesToProcess = Object.keys(imageFiles).filter(name => ['pending', 'error', 'no_reduction'].includes(imageFiles[name].status));
        if (filesToProcess.length === 0) {
            toast.info("No images requiring optimization.");
            return;
        }

        setIsProcessing(true);
        toast.info(`Optimizing ${filesToProcess.length} image(s)...`);

        // Process files sequentially or in limited batches if ImagePool handles concurrency internally
        // Using Promise.all might overwhelm the pool if it doesn't manage its queue well.
        // Let's try Promise.all first, assuming ImagePool handles it.
        const optimizationPromises = filesToProcess.map(fileName =>
            optimizeSingleImage(fileName).catch(error => {
                console.warn(`Optimization promise rejected for ${fileName}:`, error?.message);
                // Error is already set in state within optimizeSingleImage
                return Promise.resolve(); // Ensure Promise.all continues
            })
        );

        try {
            await Promise.all(optimizationPromises);
            toast.success("Optimization process completed.");
        } catch (error) {
            console.error("Error during batch optimization (Promise.all):", error);
            toast.error("An error occurred during batch optimization.");
        } finally {
            setIsProcessing(false);
        }
    };

     const handleDownloadAll = async () => {
        const optimizedEntries = Object.entries(imageFiles).filter(
            ([, state]) => state.status === 'done' && state.optimizedBlob
        );

        if (optimizedEntries.length === 0) {
            toast.info("No successfully optimized images to download.");
            return;
        }

        const zip = new JSZip();
        optimizedEntries.forEach(([fileName, state]) => {
            const nameParts = fileName.split('.');
            const extension = state.optimizedBlob!.type === 'image/png' ? 'png' : 'jpg';
            const baseName = nameParts.slice(0, -1).join('.');
            const optimizedFileName = `${baseName}-optimized.${extension}`;
            zip.file(optimizedFileName, state.optimizedBlob!);
        });

        try {
            toast.info("Generating zip file...");
            const zipBlob = await zip.generateAsync({ type: "blob" });
            saveAs(zipBlob, "optimized_images.zip");
            toast.success("Zip file download started.");
        } catch (error) {
            console.error("Error generating zip file:", error);
            toast.error("Failed to generate zip file.");
        }
    };

    const removeImage = (fileName: string) => {
        setImageFiles(prev => {
            const newState = { ...prev };
            delete newState[fileName];
            return newState;
        });
    };

    const clearAll = () => {
        setImageFiles({});
        setIsProcessing(false);
         if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        toast.info("Cleared all images.");
    };

    const filesToProcessCount = Object.values(imageFiles).filter(f => ['pending', 'error', 'no_reduction'].includes(f.status)).length;
    const optimizedFilesCount = Object.values(imageFiles).filter(f => f.status === 'done' && f.optimizedBlob).length;

    return (
        <div className="container mx-auto p-4 flex flex-col items-center">
            <Card className="w-full max-w-3xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Bulk Image Size Reducer</CardTitle>
                    <CardDescription className="text-center">
                        Upload or drag & drop JPEG/PNG images. Uses OxiPNG for better PNG compression.
                    </CardDescription>
                     {isInitializing && (
                        <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2 pt-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Initializing processing library...
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">
                    <div
                        className={`grid w-full items-center gap-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'} ${isInitializing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onDragOver={isInitializing ? undefined : handleDragOver}
                        onDragLeave={isInitializing ? undefined : handleDragLeave}
                        onDrop={isInitializing ? undefined : handleDrop}
                        onClick={() => !isInitializing && fileInputRef.current?.click()}
                    >
                        <Label htmlFor="picture" className={isInitializing ? 'cursor-not-allowed' : 'cursor-pointer'}>
                            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                            <span className="font-semibold">Click to upload or drag & drop</span>
                            <p className="text-xs text-muted-foreground">JPEG or PNG files</p>
                        </Label>
                        <Input
                            id="picture"
                            type="file"
                            accept="image/jpeg, image/png"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            multiple
                            className="sr-only"
                            disabled={isInitializing}
                        />
                    </div>

                    {Object.keys(imageFiles).length > 0 && (
                        <div className="space-y-4">
                             <div className="flex justify-between items-center gap-2 flex-wrap">
                                <Button onClick={optimizeAllImages} disabled={isProcessing || filesToProcessCount === 0 || isInitializing}>
                                    {isProcessing ? (
                                        <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Optimizing... </>
                                    ) : (
                                        <> <ArrowRight className="mr-2 h-4 w-4" /> Optimize {filesToProcessCount > 0 ? `${filesToProcessCount} Pending/Retry` : 'Images'} </>
                                    )}
                                </Button>
                                <div className="flex gap-2">
                                    <Button onClick={handleDownloadAll} disabled={isProcessing || optimizedFilesCount === 0 || isInitializing} variant="secondary">
                                        <Archive className="mr-2 h-4 w-4" /> Download All ({optimizedFilesCount})
                                    </Button>
                                    <Button onClick={clearAll} variant="outline" size="icon" title="Clear All" disabled={isInitializing || isProcessing}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="h-72 w-full rounded-md border p-4">
                                <div className="space-y-3">
                                    {Object.entries(imageFiles).map(([name, state]) => (
                                        <div key={name} className="flex items-center justify-between gap-2 p-2 rounded bg-secondary/50">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {/* Status Icons */}
                                                {state.status === 'optimizing' && <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 text-blue-500" />}
                                                {state.status === 'done' && !state.error && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                                                {state.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" title={state.error}/>}
                                                {state.status === 'no_reduction' && <Info className="h-4 w-4 text-orange-500 flex-shrink-0" title="No size reduction"/>}
                                                {state.status === 'pending' && <FileImage className="h-4 w-4 text-muted-foreground flex-shrink-0" />}

                                                {/* Preview Image */}
                                                {state.optimizedDataUrl && state.status === 'done' ? (
                                                    <img src={state.optimizedDataUrl} alt="preview" className="h-8 w-8 object-cover rounded flex-shrink-0 border" />
                                                ) : (
                                                     <div className="h-8 w-8 bg-muted rounded flex-shrink-0 border flex items-center justify-center">
                                                        <FileImage className="h-4 w-4 text-muted-foreground" />
                                                     </div>
                                                )}

                                                {/* File Info */}
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-sm font-medium truncate" title={name}>{name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatBytes(state.originalSize)}
                                                        {state.status === 'done' && state.optimizedSize !== undefined && (
                                                            <>
                                                                <ArrowRight className="inline h-3 w-3 mx-1" />
                                                                <span className={state.originalSize > state.optimizedSize ? 'text-green-600' : 'text-orange-600'}>
                                                                    {formatBytes(state.optimizedSize)}
                                                                    {state.originalSize > state.optimizedSize && ` (${Math.round(((state.originalSize - state.optimizedSize) / state.originalSize) * 100)}% saved)`}
                                                                </span>
                                                            </>
                                                        )}
                                                         {state.status === 'no_reduction' && <span className="text-orange-500 ml-2">(No reduction)</span>}
                                                         {state.status === 'error' && <span className="text-red-600 ml-2" title={state.error}>Error</span>}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeImage(name)} disabled={isProcessing && state.status === 'optimizing'} title="Remove">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Index;