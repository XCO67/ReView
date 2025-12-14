'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  label: string;
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
}

export function MultiSelect({
  label,
  value = [],
  options,
  onChange,
  placeholder = "Select...",
  maxSelections,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }
    
    const query = searchQuery.toLowerCase();
    return options.filter(option => 
      option.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [options, searchQuery]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOption = (option: string) => {
    if (maxSelections && value.length >= maxSelections && !value.includes(option)) {
      return; // Don't add if max reached
    }
    
    const newValue = value.includes(option)
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  const removeOption = (option: string) => {
    onChange(value.filter(v => v !== option));
  };

  const clearAll = () => {
    onChange([]);
  };

  const displayText = value.length === 0 
    ? placeholder 
    : value.length === 1 
    ? value[0]
    : `${value.length} selected`;

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between gap-2 h-9 px-3 text-sm rounded-md border border-input bg-background",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            isOpen && "ring-2 ring-ring ring-offset-2"
          )}
        >
          <span className={cn(
            "truncate text-left flex-1",
            value.length === 0 && "text-muted-foreground"
          )}>
            {displayText}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {value.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {value.length}
              </Badge>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
            {/* Search Input */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-8 text-sm"
                  autoComplete="off"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length > 0 ? (
                <>
                  {filteredOptions.map((option) => {
                    const isSelected = value.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleOption(option)}
                        disabled={maxSelections ? (value.length >= maxSelections && !isSelected) : false}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus:bg-accent focus:outline-none",
                          "transition-colors",
                          isSelected && "bg-accent",
                          maxSelections && value.length >= maxSelections && !isSelected && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-4 h-4 rounded border-2",
                          isSelected 
                            ? "bg-primary border-primary" 
                            : "border-input"
                        )}>
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <span className="flex-1 text-left truncate">{option}</span>
                      </button>
                    );
                  })}
                  {maxSelections && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1">
                      {value.length}/{maxSelections} selected
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              )}
            </div>

            {/* Selected Items Summary */}
            {value.length > 0 && (
              <div className="p-2 border-t bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{value.length} selected</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={clearAll}
                  >
                    Clear all
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {value.slice(0, 3).map((option) => (
                    <Badge
                      key={option}
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5 flex items-center gap-1"
                    >
                      <span className="truncate max-w-[100px]">{option}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOption(option);
                        }}
                        className="hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {value.length > 3 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      +{value.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Badges (outside dropdown) */}
      {value.length > 0 && !isOpen && (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.slice(0, 2).map((option) => (
            <Badge
              key={option}
              variant="secondary"
              className="text-xs px-1.5 py-0.5 flex items-center gap-1"
            >
              <span className="truncate max-w-[80px]">{option}</span>
              <button
                type="button"
                onClick={() => removeOption(option)}
                className="hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {value.length > 2 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              +{value.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

