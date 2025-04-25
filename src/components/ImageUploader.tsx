import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploaderProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileCount: number;
  isOptimizing: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileChange, fileCount, isOptimizing }) => {
  const inputId = "picture-input";
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor={inputId}>Select Images</Label>
      <Label
        htmlFor={isOptimizing ? undefined : inputId} // Disable label click during optimization
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 px-4 py-2 ${
          isOptimizing
            ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
        }`}
      >
        Choose Files ({fileCount} selected)
      </Label>
      <Input
        id={inputId}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp, image/gif"
        onChange={onFileChange}
        className="hidden" // Hide the default input
        disabled={isOptimizing}
      />
    </div>
  );
};