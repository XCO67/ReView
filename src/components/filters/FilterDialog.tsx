'use client';

import { useState, useMemo, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  onApply?: () => void;
  showClearButton?: boolean;
  className?: string;
}

export function FilterDialog({
  open,
  onOpenChange,
  title = 'Filters',
  children,
  activeFilterCount = 0,
  onClearFilters,
  onApply,
  showClearButton = true,
  className,
}: FilterDialogProps) {
  const handleApply = () => {
    if (onApply) {
      onApply();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "max-w-4xl max-h-[90vh] overflow-hidden flex flex-col w-[95vw] sm:w-full",
          className
        )}
      >
        <DialogHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                {activeFilterCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {activeFilterCount}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-4">
          <div className="space-y-4 w-full">
            {children}
          </div>
        </div>

        <DialogFooter className="border-t border-border/40 pt-4 mt-4">
          <div className="flex items-center gap-2 w-full">
            {showClearButton && onClearFilters && (
              <Button
                onClick={onClearFilters}
                variant="outline"
                className="flex-1"
                disabled={activeFilterCount === 0}
              >
                Clear All
              </Button>
            )}
            <Button
              onClick={handleApply}
              className={cn(
                showClearButton && onClearFilters ? "flex-1" : "w-full"
              )}
            >
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FilterButtonProps {
  onClick: () => void;
  activeFilterCount?: number;
  className?: string;
}

export function FilterButton({ onClick, activeFilterCount = 0, className }: FilterButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={cn(
        "gap-2 relative",
        activeFilterCount > 0 && "border-primary/50 bg-primary/5",
        className
      )}
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span>Filter</span>
      {activeFilterCount > 0 && (
        <Badge 
          variant="secondary" 
          className="ml-1 h-5 min-w-5 px-1.5 text-xs font-semibold bg-primary text-primary-foreground"
        >
          {activeFilterCount}
        </Badge>
      )}
    </Button>
  );
}

