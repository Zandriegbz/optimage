import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud } from "lucide-react"; // Import an appropriate icon

interface ImageUploadInputProps {
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ onFilesSelected, disabled }) => {
  return (
    // Main container for the drop zone appearance
    <div className="w-full max-w-lg mx-auto"> {/* Increased max-width */}
      <Label
        htmlFor="picture"
        className={cn(
          "flex flex-col items-center justify-center w-full h-48", // Increased height
          "border-2 border-dashed border-muted-foreground/50 rounded-lg",
          "cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors",
          disabled ? "opacity-50 cursor-not-allowed" : ""
        )}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
          <p className="mb-2 text-sm font-semibold text-foreground">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP (Max ~10MB each recommended)
          </p>
        </div>
        {/* The actual input is hidden but linked via the label */}
        <Input
          id="picture"
          type="file"
          accept="image/jpeg, image/png, image/webp"
          onChange={onFilesSelected}
          multiple
          disabled={disabled}
          className="hidden" // Hide the default input appearance
        />
      </Label>
    </div>
  );
};

export default ImageUploadInput;