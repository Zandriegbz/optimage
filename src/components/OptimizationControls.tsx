import React from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardFooter } from "@/components/ui/card";


interface OptimizationControlsProps {
  onOptimize: () => void;
  isOptimizing: boolean;
  progress: number;
  canOptimize: boolean;
}

export const OptimizationControls: React.FC<OptimizationControlsProps> = ({
  onOptimize,
  isOptimizing,
  progress,
  canOptimize
}) => {
  return (
    <>
      <CardFooter className="flex justify-end">
        <Button onClick={onOptimize} disabled={isOptimizing || !canOptimize}>
          {isOptimizing ? "Optimizing..." : "Optimize Images"}
        </Button>
      </CardFooter>

      {isOptimizing && (
        <div className="w-full max-w-2xl space-y-2 px-6 pb-6 -mt-4"> {/* Adjust padding/margin to fit layout */}
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-center text-muted-foreground">{progress}% Complete</p>
        </div>
      )}
    </>
  );
};