'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReinsuranceData } from '@/lib/schema';

interface FilterSummaryProps {
  totalRecords: number;
  filteredRecords: number;
  onClearFilters: () => void;
  className?: string;
}

export function FilterSummary({ 
  totalRecords, 
  filteredRecords, 
  onClearFilters, 
  className 
}: FilterSummaryProps) {
  const isFiltered = filteredRecords !== totalRecords;
  const percentage = totalRecords > 0 ? (filteredRecords / totalRecords) * 100 : 0;

  if (!isFiltered) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                Filtered
              </Badge>
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredRecords.toLocaleString()}</span> of{' '}
                <span className="font-semibold text-foreground">{totalRecords.toLocaleString()}</span> records
                <span className="text-primary font-medium ml-1">
                  ({percentage.toFixed(1)}% of total data)
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="text-xs"
            >
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}



















