"use client";

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function AddNewButton() {
  const handleClick = () => {
    // Dispatch custom event to trigger add new row in table
    const event = new CustomEvent('addNewRow');
    window.dispatchEvent(event);
  };

  return (
    <Button
      onClick={handleClick}
      className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
      size="sm"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add New
    </Button>
  );
}

