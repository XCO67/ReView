'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchableSelectProps {
  label: string;
  value: string | null;
  options: string[] | Array<{ value: string; label: string }>;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
}: SearchableSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to always have value and label
  const normalizedOptions = useMemo(() => {
    return options.map(opt => 
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    );
  }, [options]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return normalizedOptions;
    }
    
    const query = searchQuery.toLowerCase();
    return normalizedOptions.filter(option => 
      option.label.toLowerCase().includes(query)
    ).slice(0, 50); // Limit to 50 results for performance
  }, [normalizedOptions, searchQuery]);

  // Clear search when value changes externally
  useEffect(() => {
    if (value && !isSearchOpen) {
      setSearchQuery('');
    }
  }, [value, isSearchOpen]);

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const hasSearch = normalizedOptions.length > 10;

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      
      {hasSearch ? (
        // Searchable version for large lists
        <div className="relative">
          {!isSearchOpen ? (
            // Show select trigger when not searching
            <div className="flex gap-2">
              <Select
                value={value || 'all'}
                onValueChange={(val) => onChange(val === 'all' ? null : val)}
              >
                <SelectTrigger className="h-9 text-sm flex-1">
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="all">All {label}</SelectItem>
                  {normalizedOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  setIsSearchOpen(true);
                }}
                title="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
              {value && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleClear}
                  title="Clear"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            // Show search interface when searching
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-9 text-sm"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Search Results */}
              {searchQuery && (
                <div className="border border-border rounded-md bg-popover shadow-lg max-h-60 overflow-auto">
                  {filteredOptions.length > 0 ? (
                    <div className="p-1">
                      {filteredOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSelectOption(option.value)}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent focus:bg-accent focus:outline-none transition-colors"
                        >
                          {option.label}
                        </button>
                      ))}
                      {filteredOptions.length === 50 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Showing first 50 results. Refine your search.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Simple select for small lists
        <div className="flex gap-2">
          <Select
            value={value || 'all'}
            onValueChange={(val) => onChange(val === 'all' ? null : val)}
          >
            <SelectTrigger className="h-9 text-sm flex-1">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="all">All {label}</SelectItem>
              {normalizedOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {value && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleClear}
              title="Clear"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

