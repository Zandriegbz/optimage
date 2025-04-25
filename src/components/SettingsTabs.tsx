import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Settings2, Ruler } from "lucide-react";

interface SettingsTabsProps {
  jpegQuality: number;
  enableResizingLossy: boolean;
  pngMaxDimension: number;
  onJpegQualityChange: (value: number[]) => void;
  onEnableResizingLossyChange: (checked: boolean) => void;
  onPngDimensionChange: (value: number[]) => void;
  onSettingsCommit: () => void; // Function to trigger reprocessing on commit
  disabled: boolean;
  lossyControlClassName: string;
  pngControlClassName: string;
  lossyTabTriggerClassName: string;
  pngTabTriggerClassName: string;
  defaultMaxDimension: number;
  maxSliderDimension: number;
}

const SettingsTabs: React.FC<SettingsTabsProps> = ({
  jpegQuality,
  enableResizingLossy,
  pngMaxDimension,
  onJpegQualityChange,
  onEnableResizingLossyChange,
  onPngDimensionChange,
  onSettingsCommit,
  disabled,
  lossyControlClassName,
  pngControlClassName,
  lossyTabTriggerClassName,
  pngTabTriggerClassName,
  defaultMaxDimension,
  maxSliderDimension,
}) => {
  return (
    <div className="border-t pt-4 space-y-4">
      <h3 className="text-lg font-semibold flex items-center justify-center gap-2"><Settings2 className="w-5 h-5" /> 2. Global Settings</h3>
      <Tabs defaultValue="lossy" className="w-full max-w-xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lossy" className={lossyTabTriggerClassName}>JPEG / WEBP</TabsTrigger>
          <TabsTrigger value="png" className={pngTabTriggerClassName}>PNG</TabsTrigger>
        </TabsList>
        <TabsContent value="lossy" className="mt-4 border rounded-md p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <Label htmlFor="quality-slider" className={cn(lossyControlClassName)}>Quality: {Math.round(jpegQuality * 100)}%</Label>
              <Slider
                id="quality-slider"
                min={0.05} max={1} step={0.05}
                value={[jpegQuality]}
                onValueChange={onJpegQualityChange} // Updates state/label only
                onValueCommit={onSettingsCommit} // Triggers processing on release
                disabled={disabled}
              />
            </div>
            <div className="flex items-center justify-center space-x-2 pt-5 sm:pt-0">
              <Switch id="resizing-switch-lossy" checked={enableResizingLossy} onCheckedChange={onEnableResizingLossyChange} disabled={disabled} />
              <Label htmlFor="resizing-switch-lossy" className={cn(lossyControlClassName)}>Resize if &gt; {defaultMaxDimension}px</Label>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="png" className="mt-4 border rounded-md p-4 space-y-2">
          <Label htmlFor="dimension-slider-png" className={cn("flex items-center gap-1 justify-center", pngControlClassName)}>
            <Ruler className="w-4 h-4" /> Max Dimension: {pngMaxDimension < maxSliderDimension ? `${pngMaxDimension}px` : 'Original'}
          </Label>
          <Slider
            id="dimension-slider-png"
            min={320} max={maxSliderDimension} step={10}
            value={[pngMaxDimension]}
            onValueChange={onPngDimensionChange} // Updates state/label only
            onValueCommit={onSettingsCommit} // Triggers processing on release
            disabled={disabled}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsTabs;