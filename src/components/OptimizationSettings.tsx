import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface OptimizationSettingsProps {
  quality: number;
  setQuality: (value: number) => void;
  maxWidthOrHeight: number;
  setMaxWidthOrHeight: (value: number) => void;
  isOptimizing: boolean;
}

export const OptimizationSettings: React.FC<OptimizationSettingsProps> = ({
  quality,
  setQuality,
  maxWidthOrHeight,
  setMaxWidthOrHeight,
  isOptimizing,
}) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="quality">Quality (0.1 = Max Compression, 1 = Best Quality)</Label>
        <div className="flex items-center space-x-4">
          <Slider
            id="quality"
            min={0.1}
            max={1}
            step={0.05}
            value={[quality]}
            onValueChange={(value) => setQuality(value[0])}
            disabled={isOptimizing}
            className="flex-grow"
          />
          <span className="font-mono text-sm w-12 text-right">{quality.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-dimension">Max Width/Height (pixels)</Label>
        <div className="flex items-center space-x-4">
          <Slider
            id="max-dimension"
            min={320}
            max={4096}
            step={10}
            value={[maxWidthOrHeight]}
            onValueChange={(value) => setMaxWidthOrHeight(value[0])}
            disabled={isOptimizing}
            className="flex-grow"
          />
          <span className="font-mono text-sm w-16 text-right">{maxWidthOrHeight} px</span>
        </div>
      </div>
    </>
  );
};