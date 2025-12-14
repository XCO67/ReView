"use client";

import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";
import type { RenewalFilterOptions } from "@/lib/renewals";
import { MultiSelect } from "@/components/filters/MultiSelect";

const YEARS = ["2020", "2021", "2022", "2023", "2024", "2025"];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const MONTH_NAMES = [
  { value: "JAN", label: "January" },
  { value: "FEB", label: "February" },
  { value: "MAR", label: "March" },
  { value: "APR", label: "April" },
  { value: "MAY", label: "May" },
  { value: "JUN", label: "June" },
  { value: "JUL", label: "July" },
  { value: "AUG", label: "August" },
  { value: "SEP", label: "September" },
  { value: "OCT", label: "October" },
  { value: "NOV", label: "November" },
  { value: "DEC", label: "December" },
];

const STATUS_OPTIONS = [
  { label: 'Renewed', value: 'renewed' as const },
  { label: 'Not Renewed', value: 'not-renewed' as const },
  { label: 'Upcoming Renewal', value: 'upcoming-renewal' as const },
];
const DEFAULT_LOC_OPTIONS = ['HO', 'FERO'];

interface RenewalFiltersProps {
  initialYear?: string | undefined;
  initialQuarter?: string;
  initialStatus?: 'renewed' | 'not-renewed' | 'upcoming-renewal';
  initialMonthName?: string;
  initialCountry?: string;
  initialBusinessType?: string;
  initialClassName?: string;
  initialCountrySearch?: string;
  initialSrlSearch?: string;
  initialLoc?: string;
  filterOptions: RenewalFilterOptions;
  onChange: (filters: { 
    year?: string | undefined; 
    quarter?: string; 
    status?: 'renewed' | 'not-renewed' | 'upcoming-renewal';
    monthName?: string;
    country?: string[];
    countrySearch?: string;
    srlSearch?: string;
    businessType?: string[];
    className?: string[];
    subClass?: string[];
    loc?: string;
    extType?: string[];
  }) => void;
}

export function RenewalFilters({ 
  initialYear, 
  initialQuarter, 
  initialStatus, 
  initialMonthName,
  initialCountry,
  initialBusinessType,
  initialClassName,
  initialCountrySearch,
  initialSrlSearch,
  initialLoc,
  filterOptions,
  onChange 
}: RenewalFiltersProps) {
  const [year, setYear] = useState<string | undefined>(initialYear);
  const [quarter, setQuarter] = useState(initialQuarter);
  const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]['value'] | undefined>(initialStatus);
  const [monthName, setMonthName] = useState(initialMonthName);
  const [country, setCountry] = useState<string[]>(initialCountry ? [initialCountry] : []);
  const [businessType, setBusinessType] = useState<string[]>(initialBusinessType ? [initialBusinessType] : []);
  const [className, setClassName] = useState<string[]>(initialClassName ? [initialClassName] : []);
  const [subClass, setSubClass] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState(initialCountrySearch || '');
  const [srlSearch, setSrlSearch] = useState(initialSrlSearch || '');
  const [loc, setLoc] = useState<string | undefined>(initialLoc);
  const [extType, setExtType] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Debounce timers
  const countrySearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const srlSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Dynamic filter options that update when class changes
  const [dynamicFilterOptions, setDynamicFilterOptions] = useState(filterOptions);
  
  // Fetch updated filter options when class changes
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const params = new URLSearchParams();
        if (className && className.length > 0) {
          className.forEach(c => params.append('class', c));
        }
        const response = await fetch(`/api/renewals/filter-options?${params.toString()}`);
        if (response.ok) {
          const options = await response.json();
          setDynamicFilterOptions(options);
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      }
    };
    
    fetchFilterOptions();
  }, [className]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (countrySearchTimeoutRef.current) {
        clearTimeout(countrySearchTimeoutRef.current);
      }
      if (srlSearchTimeoutRef.current) {
        clearTimeout(srlSearchTimeoutRef.current);
      }
    };
  }, []);

  const locOptions = (() => {
    const available = (filterOptions.locs.length ? filterOptions.locs : DEFAULT_LOC_OPTIONS)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    const filtered = available.filter((value) =>
      DEFAULT_LOC_OPTIONS.includes(value.toUpperCase())
    );
    return filtered.length ? filtered : DEFAULT_LOC_OPTIONS;
  })();

  type FilterState = {
    year?: string;
    quarter?: string;
    status?: typeof STATUS_OPTIONS[number]['value'];
    monthName?: string;
    country?: string[];
    countrySearch?: string;
    srlSearch?: string;
    businessType?: string[];
    className?: string[];
    subClass?: string[];
    loc?: string;
    extType?: string[];
  };

  const emitChange = (overrides: Partial<FilterState> = {}) => {
    const nextState: FilterState = {
      year,
      quarter,
      status,
      monthName,
      country,
      countrySearch,
      srlSearch,
      businessType,
      className,
      subClass,
      loc,
      extType,
      ...overrides,
    };

    onChange({
      year: nextState.year,
      quarter: nextState.quarter,
      status: nextState.status,
      monthName: nextState.monthName,
      country: nextState.country && nextState.country.length > 0 ? nextState.country : undefined,
      countrySearch: nextState.countrySearch?.trim()
        ? nextState.countrySearch.trim()
        : undefined,
      srlSearch: nextState.srlSearch?.trim()
        ? nextState.srlSearch.trim()
        : undefined,
      businessType: nextState.businessType && nextState.businessType.length > 0 ? nextState.businessType : undefined,
      className: nextState.className && nextState.className.length > 0 ? nextState.className : undefined,
      subClass: nextState.subClass && nextState.subClass.length > 0 ? nextState.subClass : undefined,
      loc: nextState.loc || undefined,
      extType: nextState.extType && nextState.extType.length > 0 ? nextState.extType : undefined,
    });
  };

  const resetFilters = () => {
    setYear(undefined);
    setQuarter(undefined);
    setStatus(undefined);
    setMonthName(undefined);
    setCountry([]);
    setBusinessType([]);
    setClassName([]);
    setSubClass([]);
    setCountrySearch('');
    setSrlSearch('');
    setLoc(undefined);
    setExtType([]);

    onChange({
      year: undefined,
    });
  };

  const activeFilterCount = [
    year, quarter, status, monthName, 
    country.length, businessType.length, className.length, subClass.length, extType.length,
    countrySearch, srlSearch, loc
  ].filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length;

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="rounded-lg border bg-card">
          {/* Header with Collapse Button */}
          <div className="px-3 py-2 border-b">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity group"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isExpanded ? "rotate-180" : "rotate-0"
                  )}
                />
                <h2 className="text-sm font-semibold text-foreground">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {activeFilterCount} Active
                  </span>
                )}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
                onClick={resetFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Collapsible Content */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out",
              isExpanded 
                ? "max-h-[5000px] opacity-100 overflow-visible" 
                : "max-h-0 overflow-hidden opacity-0"
            )}
          >
            <div className="p-3 space-y-4 relative">
              {/* Time Period Filters */}
              <div className="grid grid-cols-3 gap-3">
                  {/* Year Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Year</label>
                    <Select
                      value={year || 'all'}
                      onValueChange={(value) => {
                        const newYear = value === 'all' ? undefined : value;
                        setYear(newYear);
                        emitChange({ year: newYear });
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                  {/* Month Name Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Month</label>
                    <Select
                      value={monthName || 'all'}
                      onValueChange={(value) => {
                        const newMonthName = value === 'all' ? undefined : value;
                        setMonthName(newMonthName);
                        // Clear quarter when month is selected
                        if (newMonthName) {
                          setQuarter(undefined);
                          emitChange({ monthName: newMonthName, quarter: undefined });
                        } else {
                          emitChange({ monthName: newMonthName });
                        }
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {MONTH_NAMES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                  {/* Quarter Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Quarter</label>
                    <div className="flex gap-1.5">
                      <Button
                        variant={!quarter ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-9 px-3 text-xs flex-1",
                          monthName ? "opacity-50 cursor-not-allowed" : ""
                        )}
                        onClick={() => {
                          if (monthName) return; // Disabled when month is selected
                          setQuarter(undefined);
                          emitChange({ quarter: undefined });
                        }}
                        disabled={!!monthName}
                      >
                        All
                      </Button>
                      {QUARTERS.map((q) => (
                        <Button
                          key={q}
                          variant={quarter === q ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-9 px-2.5 text-xs",
                            monthName ? "opacity-50 cursor-not-allowed" : ""
                          )}
                          onClick={() => {
                            if (monthName) return; // Disabled when month is selected
                            const nextQuarter = quarter === q ? undefined : q;
                            setQuarter(nextQuarter);
                            // Clear month when quarter is selected
                            if (nextQuarter) {
                              setMonthName(undefined);
                              emitChange({ quarter: nextQuarter, monthName: undefined });
                            } else {
                              emitChange({ quarter: nextQuarter });
                            }
                          }}
                          disabled={!!monthName}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                    {monthName && (
                      <p className="text-xs text-muted-foreground mt-1">Month filter is active. Quarter filter is disabled.</p>
                    )}
                  </div>
                </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={status === option.value ? "default" : "outline"}
                    size="sm"
                    className="h-9 px-4 text-xs flex-1"
                    onClick={() => {
                      const nextStatus = status === option.value ? undefined : option.value;
                      setStatus(nextStatus);
                      emitChange({ status: nextStatus });
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Business Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Source Filter (HO/FERO) */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Office</label>
                    <div className="flex gap-2">
                      <Button
                        variant={!loc ? "default" : "outline"}
                        size="sm"
                        className="h-9 px-3 text-xs flex-1"
                        onClick={() => {
                          setLoc(undefined);
                          emitChange({ loc: undefined });
                        }}
                      >
                        All
                      </Button>
                      {locOptions.map((locOption) => (
                        <Button
                          key={locOption}
                          variant={loc === locOption ? "default" : "outline"}
                          size="sm"
                          className="h-9 px-3 text-xs flex-1"
                          onClick={() => {
                            const next = loc === locOption ? undefined : locOption;
                            setLoc(next);
                            emitChange({ loc: next });
                          }}
                        >
                          {locOption || 'Unknown'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Policy Nature */}
                  <MultiSelect
                    label="Policy Nature"
                    value={businessType}
                    options={filterOptions.businessTypes}
                    onChange={(val) => {
                      setBusinessType(val);
                      emitChange({ businessType: val });
                    }}
                  />

                  {/* Extract Type Filter */}
                  <MultiSelect
                    label="Extract Type"
                    value={extType}
                    options={filterOptions.extTypes || []}
                    onChange={(val) => {
                      setExtType(val);
                      emitChange({ extType: val });
                    }}
                  />

                  {/* Class Filter */}
                  <MultiSelect
                    label="Class"
                    value={className}
                    options={filterOptions.classes}
                    onChange={(val) => {
                      setClassName(val);
                      setSubClass([]); // Clear subclass when class changes
                      emitChange({ className: val, subClass: [] });
                    }}
                  />

                  {/* Subclass Filter */}
                  {className.length > 0 ? (
                    <MultiSelect
                      label="Subclass"
                      value={subClass}
                      options={dynamicFilterOptions.subClasses || []}
                      onChange={(val) => {
                        setSubClass(val);
                        emitChange({ subClass: val });
                      }}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Subclass</label>
                      <div className="h-9 flex items-center text-sm text-muted-foreground px-3 border border-border rounded-md bg-muted/50">
                        Select class first
                      </div>
                    </div>
                  )}
              </div>

              {/* Country Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <MultiSelect
                  label="Country"
                  value={country}
                  options={filterOptions.countries}
                  onChange={(val) => {
                    setCountry(val);
                    emitChange({ country: val });
                  }}
                />
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Search</label>
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => {
                          const value = e.target.value; // Don't trim here - preserve spaces for typing
                          setCountrySearch(value);
                          
                          // Clear existing timeout
                          if (countrySearchTimeoutRef.current) {
                            clearTimeout(countrySearchTimeoutRef.current);
                          }
                          
                          // Debounce the API call - wait 500ms after user stops typing
                          // Trim only when sending to API
                          countrySearchTimeoutRef.current = setTimeout(() => {
                            const trimmedValue = value.trim();
                            emitChange({ countrySearch: trimmedValue || undefined });
                          }, 500);
                        }}
                        onBlur={() => {
                          // Immediately emit on blur if there's a value
                          if (countrySearchTimeoutRef.current) {
                            clearTimeout(countrySearchTimeoutRef.current);
                          }
                          const trimmedValue = countrySearch.trim();
                          emitChange({ countrySearch: trimmedValue || undefined });
                        }}
                        placeholder="Country..."
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">SRL</label>
                      <input
                        type="text"
                        value={srlSearch}
                        onChange={(e) => {
                          const value = e.target.value; // Don't trim here - preserve spaces for typing
                          setSrlSearch(value);
                          
                          // Clear existing timeout
                          if (srlSearchTimeoutRef.current) {
                            clearTimeout(srlSearchTimeoutRef.current);
                          }
                          
                          // Debounce the API call - wait 500ms after user stops typing
                          // Trim only when sending to API
                          srlSearchTimeoutRef.current = setTimeout(() => {
                            const trimmedValue = value.trim();
                            emitChange({ srlSearch: trimmedValue || undefined });
                          }, 500);
                        }}
                        onBlur={() => {
                          // Immediately emit on blur if there's a value
                          if (srlSearchTimeoutRef.current) {
                            clearTimeout(srlSearchTimeoutRef.current);
                          }
                          const trimmedValue = srlSearch.trim();
                          emitChange({ srlSearch: trimmedValue || undefined });
                        }}
                        placeholder="SRL..."
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

