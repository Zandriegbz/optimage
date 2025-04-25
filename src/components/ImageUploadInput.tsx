import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploadInputProps {
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ onFilesSelected, disabled }) => {
  return (
    <div className="grid w-full max-w-md items-center gap-1.5 mx-auto">
      <Label htmlFor="picture" className="text-center">1. Upload Images</Label>
      <Input
        id="picture"
        type="file"
        accept="image/jpeg, image/png, image/webp"
        onChange={onFilesSelected}
        multiple
        disabled={disabled}
        className="h-12 text-center cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
      />
      <p className="text-xs text-muted-foreground text-center">Select one or more files.</p>
    </div>
  );
};

export default ImageUploadInput;