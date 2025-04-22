import React, { useState, useRef, useCallback, DragEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, Download, ArrowRight, Loader2, FileImage, X, CheckCircle, AlertCircle, Archive } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver'; // file-saver is often used with jszip

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
    optimizedDataUrl?: string;
    status: 'pending' | 'optimizing' | 'done' | 'error';
    error?: string;
}

const Index: React.FC = () => {
    const [imageFiles, setImageFiles] = useState<Record<string, ImageFileState>>({});
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [quality] = useState<number>(0.7); // JPEG quality (0 to 1)

    const fileInputRef = useRef<HTMLInputElement>(null);

    const addFiles = (files: FileList | null) => {
        if (!files) return;

        const newFiles: Record<string, ImageFileState> = {};
        let addedCount = 0;
        let invalidCount = 0;

        for (const file of Array.from(files)) {
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                invalidCount++;
                continue; // Skip invalid file types
            }
            // Avoid duplicates by checking name - simple check
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
        // Reset input value to allow selecting the same file(s) again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        addFiles(event.dataTransfer.files);
    };

    const optimizeSingleImage = (fileName: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const fileState = imageFiles[fileName];
            if (!fileState || fileState.status !== 'pending') {
                resolve(); // Already processed or invalid state
                return;
            }

            setImageFiles(prev => ({
                ...prev,
                [fileName]: { ...prev[fileName], status: 'optimizing' }
            }));
            console.log("Starting optimization for:", fileName);

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    console.log("Image loaded into memory:", fileName);
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        console.error("Could not get canvas context for:", fileName);
                        setImageFiles(prev => ({
                            ...prev,
                            [fileName]: { ...prev[fileName], status: 'error', error: 'Canvas context error' }
                        }));
                        reject(new Error('Canvas context error'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, img.width, img.height);
                    console.log("Image drawn on canvas:", fileName);

                    const mimeType = fileState.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                    const qualityArg = mimeType === 'image/jpeg' ? quality : undefined;

                    canvas.toBlob((blob) => {
                        if (blob) {
                            console.log("Optimized blob created:", fileName, blob.size);
                            const dataUrlReader = new FileReader();
                            dataUrlReader.onloadend = () => {
                                setImageFiles(prev => ({
                                    ...prev,
                                    [fileName]: {
                                        ...prev[fileName],
                                        optimizedBlob: blob,
                                        optimizedSize: blob.size,
                                        optimizedDataUrl: dataUrlReader.result as string,
                                        status: 'done',
                                        error: undefined,
                                    }
                                }));
                                resolve();
                            }
                            dataUrlReader.onerror = () => {
                                console.error("Error reading blob as data URL for:", fileName);
                                // Still mark as done, but without preview
                                setImageFiles(prev => ({
                                    ...prev,
                                    [fileName]: {
                                        ...prev[fileName],
                                        optimizedBlob: blob,
                                        optimizedSize: blob.size,
                                        status: 'done',
                                        error: 'Preview generation failed',
                                    }
                                }));
                                resolve(); // Resolve even if preview fails
                            }
                            dataUrlReader.readAsDataURL(blob);
                        } else {
                            console.error("Canvas toBlob returned null for:", fileName);
                            setImageFiles(prev => ({
                                ...prev,
                                [fileName]: { ...prev[fileName], status: 'error', error: 'Blob creation failed' }
                            }));
                            reject(new Error('Blob creation failed'));
                        }
                    }, mimeType, qualityArg);
                };
                img.onerror = () => {
                    console.error("Image load error for:", fileName);
                    setImageFiles(prev => ({
                        ...prev,
                        [fileName]: { ...prev[fileName], status: 'error', error: 'Image load failed' }
                    }));
                    reject(new Error('Image load failed'));
                }
                img.src = event.target?.result as string;
            };
            reader.onerror = () => {
                console.error("FileReader error for:", fileName);
                setImageFiles(prev => ({
                    ...prev,
                    [fileName]: { ...prev[fileName], status: 'error', error: 'File read failed' }
                }));
                reject(new Error('File read failed'));
            }
            reader.readAsDataURL(fileState.file);
        });
    };

    const optimizeAllImages = async () => {
        const pendingFiles = Object.keys(imageFiles).filter(name => imageFiles[name].status === 'pending');
        if (pendingFiles.length === 0) {
            toast.info("No images pending optimization.");
            return;
        }

        setIsProcessing(true);
        toast.info(`Optimizing ${pendingFiles.length} image(s)...`);

        const optimizationPromises = pendingFiles.map(fileName =>
            optimizeSingleImage(fileName).catch(error => {
                // Error is handled within optimizeSingleImage by updating state
                console.warn(`Optimization failed for ${fileName}:`, error.message);
                // Ensure the promise resolves even on error so Promise.all completes
                return Promise.resolve();
            })
        );

        try {
            await Promise.all(optimizationPromises);
            toast.success("Optimization process completed.");
        } catch (error) {
            // This catch might not be strictly necessary if individual errors are handled
            console.error("Error during batch optimization:", error);
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
            toast.info("No optimized images to download.");
            return;
        }

        const zip = new JSZip();
        optimizedEntries.forEach(([fileName, state]) => {
            const nameParts = fileName.split('.');
            const extension = nameParts.pop();
            const baseName = nameParts.join('.');
            const optimizedFileName = `${baseName}-optimized.${state.optimizedBlob!.type === 'image/png' ? 'png' : 'jpg'}`;
            zip.file(optimizedFileName, state.optimizedBlob!);
        });

        try {
            toast.info("Generating zip file...");
            const zipBlob = await zip.generateAsync({ type: "blob" });
            saveAs(zipBlob, "optimized_images.zip"); // Using file-saver
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

    const filesToOptimizeCount = Object.values(imageFiles).filter(f => f.status === 'pending').length;
    const optimizedFilesCount = Object.values(imageFiles).filter(f => f.status === 'done' && f.optimizedBlob).length;

    return (
        <div className="container mx-auto p-4 flex flex-col items-center">
            <Card className="w-full max-w-3xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Bulk Image Size Reducer</CardTitle>
                    <CardDescription className="text-center">
                        Upload or drag & drop JPEG/PNG images to reduce file size.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div
                        className={`grid w-full items-center gap-1.5 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()} // Trigger file input click
                    >
                        <Label htmlFor="picture" className="cursor-pointer">
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
                            multiple // Allow multiple file selection
                            className="sr-only" // Hide the default input visually
                        />
                    </div>

                    {Object.keys(imageFiles).length > 0 && (
                        <div className="space-y-4">
                             <div className="flex justify-between items-center gap-2 flex-wrap">
                                <Button onClick={optimizeAllImages} disabled={isProcessing || filesToOptimizeCount === 0}>
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Optimizing...
                                        </>
                                    ) : (
                                        <>
                                            <ArrowRight className="mr-2 h-4 w-4" />
                                            Optimize {filesToOptimizeCount > 0 ? `${filesToOptimizeCount} Pending` : 'Images'}
                                        </>
                                    )}
                                </Button>
                                <div className="flex gap-2">
                                    <Button onClick={handleDownloadAll} disabled={isProcessing || optimizedFilesCount === 0} variant="secondary">
                                        <Archive className="mr-2 h-4 w-4" />
                                        Download All ({optimizedFilesCount})
                                    </Button>
                                    <Button onClick={clearAll} variant="outline" size="icon" title="Clear All">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="h-72 w-full rounded-md border p-4">
                                <div className="space-y-3">
                                    {Object.entries(imageFiles).map(([name, state]) => (
                                        <div key={name} className="flex items-center justify-between gap-2 p-2 rounded bg-secondary/50">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {state.status === 'optimizing' && <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />}
                                                {state.status === 'done' && !state.error && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                                                {state.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
                                                {(state.status === 'pending' || (state.status === 'done' && state.error === 'Preview generation failed')) && <FileImage className="h-4 w-4 text-muted-foreground flex-shrink-0" />}

                                                {state.optimizedDataUrl && state.status === 'done' ? (
                                                    <img src={state.optimizedDataUrl} alt="preview" className="h-8 w-8 object-cover rounded flex-shrink-0 border" />
                                                ) : (
                                                     <div className="h-8 w-8 bg-muted rounded flex-shrink-0 border flex items-center justify-center">
                                                        <FileImage className="h-4 w-4 text-muted-foreground" />
                                                     </div>
                                                )}
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
                                                         {state.status === 'error' && <span className="text-red-600 ml-2">Error: {state.error}</span>}
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