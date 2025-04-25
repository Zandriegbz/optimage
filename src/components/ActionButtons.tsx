import React from 'react';
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";

interface ActionButtonsProps {
  completedFiles: number;
  errorFiles: number;
  totalFiles: number;
  canDownload: boolean;
  canReset: boolean;
  onDownload: () => void;
  onReset: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  completedFiles,
  errorFiles,
  totalFiles,
  canDownload,
  canReset,
  onDownload,
  onReset
}) => {
  return (
    <CardFooter className="flex flex-col items-center justify-center pt-6 border-t space-y-4">
      {totalFiles > 0 && (<p className="text-sm text-muted-foreground">{completedFiles} completed, {errorFiles} errors.</p>)}
      <div className="flex flex-wrap justify-center gap-4">
        <Button onClick={onDownload} disabled={!canDownload}>
          <Download className="mr-2 h-4 w-4" /> Download {completedFiles > 0 ? `${completedFiles} File(s)` : 'Files'}
        </Button>
        <Button variant="outline" onClick={onReset} disabled={!canReset}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset
        </Button>
      </div>
    </CardFooter>
  );
};

export default ActionButtons;