'use client';

import { useCallback, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonthlyOverviewPage from '../monthly-overview/page';
import QuarterlyOverviewPage from '../quarterly-overview/page';
import YearlyOverviewPage from '../yearly-overview/page';
import { Badge } from '@/components/ui/badge';
import { ChatBot } from '@/components/chat/ChatBot';

const TAB_CONFIG = [
  {
    value: 'monthly',
    label: 'Monthly Overview',
    description: 'Month-by-month KPI tracking and loss ratios.',
  },
  {
    value: 'quarterly',
    label: 'Quarterly Overview',
    description: 'Quarterly performance insights with trends.',
  },
  {
    value: 'yearly',
    label: 'Yearly Overview',
    description: 'Year-over-year comparisons and totals.',
  },
] as const;

type TabValue = (typeof TAB_CONFIG)[number]['value'];

function OverviewHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = useMemo<TabValue>(() => {
    const tabParam = searchParams.get('tab');
    return TAB_CONFIG.some((tab) => tab.value === tabParam) ? (tabParam as TabValue) : 'monthly';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  const handleTabChange = useCallback(
    (value: string) => {
      if (!TAB_CONFIG.some((tab) => tab.value === value)) {
        return;
      }
      const nextValue = value as TabValue;
      setActiveTab(nextValue);

      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', nextValue);
      router.replace(`/overview?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-10 space-y-8">
        <header className="space-y-3">
          <Badge variant="outline" className="uppercase tracking-[0.3em] text-xs">
            Overview
          </Badge>
          <h1 className="text-3xl font-semibold">Overview</h1>
          <p className="text-muted-foreground">
            View monthly, quarterly, or yearly analytics without leaving this workspace.
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex flex-wrap gap-3 rounded-2xl bg-muted/30 p-2">
            {TAB_CONFIG.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 min-w-[200px] rounded-xl border border-transparent px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-border/80 hover:bg-background data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
              >
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="monthly" className="space-y-6">
            <MonthlyOverviewPage />
          </TabsContent>
          <TabsContent value="quarterly" className="space-y-6">
            <QuarterlyOverviewPage />
          </TabsContent>
          <TabsContent value="yearly" className="space-y-6">
            <YearlyOverviewPage />
          </TabsContent>
        </Tabs>
      </div>

      <ChatBot />
    </div>
  );
}

export default function OverviewHubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <OverviewHubContent />
    </Suspense>
  );
}

