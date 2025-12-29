"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const handleImport = async () => {
    setIsImporting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/risk-assessment/import', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert('You do not have permission to import CSV. Only system administrators can perform this action.');
          return;
        }
        throw new Error(data.error || 'Failed to import CSV');
      }

      setMessage({ type: 'success', text: data.message || 'Import successful!' });
      
      // Refresh the page after a short delay to show the new data
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to import CSV'
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleImport}
        disabled={isImporting}
        className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
      >
        {isImporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </>
        )}
      </Button>
      {message && (
        <p className={`text-xs ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

