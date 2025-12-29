"use client";

import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { RiskControlAssessment } from '@/lib/database/queries';
import { Save, X, Search, Trash2, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PingModal from './PingModal';

interface RiskAssessmentTableProps {
  initialData: RiskControlAssessment[];
}

export default function RiskAssessmentTable({ initialData }: RiskAssessmentTableProps) {
  const [data, setData] = useState<RiskControlAssessment[]>(initialData);
  const [editingCell, setEditingCell] = useState<{ riskId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRowData, setNewRowData] = useState<Partial<RiskControlAssessment>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pingModalOpen, setPingModalOpen] = useState(false);
  const [selectedRiskForPing, setSelectedRiskForPing] = useState<RiskControlAssessment | null>(null);
  const router = useRouter();

  // Sync with initialData when it changes (e.g., after import)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Calculate derived values based on rules
  const calculateDerivedValues = (rowData: Partial<RiskControlAssessment>) => {
    const inputFreq = rowData.input_frequency ? parseInt(rowData.input_frequency.toString()) : null;
    const inputSev = rowData.input_severity ? parseInt(rowData.input_severity.toString()) : null;
    
    const calculated: Partial<RiskControlAssessment> = {};
    
    // Input Impact = Frequency x Severity
    if (inputFreq !== null && inputSev !== null) {
      calculated.input_impact = inputFreq * inputSev;
    }
    
    // Inherent Frequency = 2^(Input Frequency - 1)
    if (inputFreq !== null && inputFreq > 0) {
      calculated.inherent_frequency = Math.pow(2, inputFreq - 1);
    }
    
    // Inherent Severity = 2^(Input Severity - 1)
    if (inputSev !== null && inputSev > 0) {
      calculated.inherent_severity = Math.pow(2, inputSev - 1);
    }
    
    // Inherent Impact = Inherent Frequency x Inherent Severity
    const inherentFreq = calculated.inherent_frequency ?? (rowData.inherent_frequency ? parseInt(rowData.inherent_frequency.toString()) : null);
    const inherentSev = calculated.inherent_severity ?? (rowData.inherent_severity ? parseInt(rowData.inherent_severity.toString()) : null);
    
    if (inherentFreq !== null && inherentSev !== null) {
      calculated.inherent_impact = inherentFreq * inherentSev;
    }
    
    return calculated;
  };

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase().trim();
    return data.filter(item => 
      item.risk_id?.toLowerCase().includes(query) ||
      item.risk_item?.toLowerCase().includes(query) ||
      item.risk_description?.toLowerCase().includes(query) ||
      item.risk_owner?.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  // Listen for add new row event from parent
  useEffect(() => {
    const handleAddNewEvent = () => {
      setIsAddingNew(true);
      setNewRowData({ risk_id: '' });
    };
    window.addEventListener('addNewRow', handleAddNewEvent);
    return () => window.removeEventListener('addNewRow', handleAddNewEvent);
  }, []);

  const handleCellClick = (riskId: string, field: string, currentValue: unknown) => {
    setEditingCell({ riskId, field });
    setEditValue(currentValue?.toString() || '');
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleSave = async (riskId: string, field: string) => {
    setSaving(`${riskId}-${field}`);
    try {
      const updateData: Record<string, unknown> = { [field]: editValue || null };
      
      // If updating input_frequency or input_severity, recalculate derived values
      if (field === 'input_frequency' || field === 'input_severity') {
        const currentItem = data.find(item => item.risk_id === riskId);
        if (currentItem) {
          const updatedItem = { ...currentItem, [field]: editValue || null };
          const calculated = calculateDerivedValues(updatedItem);
          Object.assign(updateData, calculated);
        }
      }
      
      const response = await fetch(`/api/admin/risk-assessment/${encodeURIComponent(riskId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert('You do not have permission to perform this action. Please contact an administrator.');
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to save');
      }

      const result = await response.json();
      
      // Update local state
      setData(prev => prev.map(item => 
        item.risk_id === riskId ? { ...item, ...result.data } : item
      ));
      
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewRowData({});
  };

  const handleSaveNew = async () => {
    if (!newRowData.risk_id || newRowData.risk_id.trim() === '') {
      alert('Risk ID is required');
      return;
    }

    try {
      // Calculate derived values before saving
      const calculated = calculateDerivedValues(newRowData);
      const dataToSave = { ...newRowData, ...calculated };
      
      const response = await fetch('/api/admin/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert('You do not have permission to perform this action. Please contact an administrator.');
          router.push('/dashboard');
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to create');
      }

      const result = await response.json();
      setData(prev => [...prev, result.data]);
      setIsAddingNew(false);
      setNewRowData({});
      router.refresh();
    } catch (error) {
      console.error('Error creating:', error);
      alert(error instanceof Error ? error.message : 'Failed to create new record');
    }
  };

  const handleDelete = async (riskId: string) => {
    if (!confirm(`Are you sure you want to delete Risk ID: ${riskId}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(riskId);
    try {
      const response = await fetch(`/api/admin/risk-assessment/${encodeURIComponent(riskId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert('You do not have permission to perform this action. Please contact an administrator.');
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to delete');
      }

      setData(prev => prev.filter(item => item.risk_id !== riskId));
      router.refresh();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete record. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getSeverityColumnColor = (category: string | null): string => {
    if (!category) return 'bg-white/5';
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('critical')) {
      return 'bg-red-500/25 border-l-4 border-red-500';
    } else if (categoryLower.includes('major')) {
      return 'bg-orange-500/25 border-l-4 border-orange-500';
    } else if (categoryLower.includes('moderate')) {
      return 'bg-yellow-500/25 border-l-4 border-yellow-500';
    } else if (categoryLower.includes('minor')) {
      return 'bg-blue-500/25 border-l-4 border-blue-500';
    } else if (categoryLower.includes('negligible')) {
      return 'bg-green-500/25 border-l-4 border-green-500';
    }
    return 'bg-white/5';
  };

  const getSeverityBadgeColor = (category: string | null): string => {
    if (!category) return 'bg-white/10 text-white/60';
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('critical')) {
      return 'bg-red-500/30 text-red-200 border border-red-500/50';
    } else if (categoryLower.includes('major')) {
      return 'bg-orange-500/30 text-orange-200 border border-orange-500/50';
    } else if (categoryLower.includes('moderate')) {
      return 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50';
    } else if (categoryLower.includes('minor')) {
      return 'bg-blue-500/30 text-blue-200 border border-blue-500/50';
    } else if (categoryLower.includes('negligible')) {
      return 'bg-green-500/30 text-green-200 border border-green-500/50';
    }
    return 'bg-white/10 text-white/60';
  };

  const getFieldValue = (item: RiskControlAssessment, field: string): string => {
    const value = (item as unknown as Record<string, unknown>)[field];
    if (value === null || value === undefined) return '';
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    return value.toString();
  };

  const columns = [
    { key: 'risk_id', label: 'Risk ID', width: '120px', required: true },
    { key: 'risk_item', label: 'RISK ITEM', width: '220px' },
    { key: 'risk_description', label: 'RISK DESCRIPTION', width: '320px' },
    { key: 'control_exist', label: 'CONTROL EXIST?', width: '130px' },
    { key: 'unit', label: 'UNIT', width: '160px' },
    { key: 'lob', label: 'LOB', width: '130px' },
    { key: 'class', label: 'CLASS', width: '160px' },
    { key: 'risk_owner', label: 'Risk Owner', width: '160px' },
    { key: 'level_01', label: 'LEVEL 01', width: '160px' },
    { key: 'level_02', label: 'LEVEL 02', width: '160px' },
    { key: 'level_03', label: 'LEVEL 03', width: '160px' },
    { key: 'level_04', label: 'LEVEL 04', width: '160px' },
    { key: 'input_frequency', label: 'INPUT FREQUENCY', width: '150px' },
    { key: 'input_severity', label: 'INPUT SEVERITY', width: '150px' },
    { key: 'input_impact', label: 'INPUT IMPACT', width: '150px' },
    { key: 'inherent_frequency', label: 'INHERENT FREQUENCY', width: '170px' },
    { key: 'inherent_severity', label: 'INHERENT SEVERITY', width: '170px' },
    { key: 'inherent_impact', label: 'INHERENT IMPACT', width: '170px' },
    { key: 'inherent_category', label: 'INHERENT CATEGORY', width: '170px' },
    { key: 'no_of_controls', label: 'No. of Controls', width: '150px' },
    { key: 'control_01', label: 'Control 01', width: '220px' },
    { key: 'effect_c1', label: 'Effect C1', width: '130px' },
    { key: 'control_02', label: 'Control 02', width: '220px' },
    { key: 'effect_c2', label: 'Effect C2', width: '130px' },
    { key: 'control_03', label: 'Control 03', width: '220px' },
    { key: 'effect_c3', label: 'Effect C3', width: '130px' },
    { key: 'control_04', label: 'Control 04', width: '220px' },
    { key: 'effect_c4', label: 'Effect C4', width: '130px' },
    { key: 'control_05', label: 'Control 05', width: '220px' },
    { key: 'effect_c5', label: 'Effect C5', width: '130px' },
    { key: 'date_of_review', label: 'Date of review', width: '150px' },
    { key: 'control_to_be_implemented', label: 'Control To Be Implemented', width: '270px' },
    { key: 'due_date', label: 'Due Date', width: '130px' },
    { key: 'residual_impact', label: 'RESIDUAL IMPACT', width: '150px' },
    { key: 'residual_category', label: 'RESIDUAL CATEGORY', width: '170px' },
    { key: 'risk_manager_remarks', label: 'Risk Manager Remarks', width: '270px' },
  ];

  const renderCell = (item: RiskControlAssessment | Partial<RiskControlAssessment>, col: typeof columns[0], isNewRow: boolean = false) => {
    const riskId = item.risk_id || '';
    const isEditing = editingCell?.riskId === riskId && editingCell?.field === col.key;
    const isSaving = saving === `${riskId}-${col.key}`;
    const value = isNewRow 
      ? (newRowData as Record<string, unknown>)[col.key]?.toString() || ''
      : getFieldValue(item as RiskControlAssessment, col.key);

    if (isNewRow) {
      return (
        <TableCell
          key={col.key}
          className="text-xs text-white/70 p-2 bg-white/5 border-r border-white/15"
          style={{ minWidth: col.width }}
        >
          <Input
            value={value}
            onChange={(e) => setNewRowData(prev => ({ ...prev, [col.key]: e.target.value }))}
            placeholder={col.required ? `${col.label} *` : col.label}
            className="h-9 text-xs bg-white/15 border-white/25 text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30"
            required={col.required}
          />
        </TableCell>
      );
    }

    return (
      <TableCell
        key={col.key}
        className="text-xs text-white/90 p-3 relative group border-r border-white/10"
        style={{ minWidth: col.width }}
        onClick={() => !isEditing && handleCellClick(riskId, col.key, value)}
      >
        {isEditing ? (
          <div className="flex items-start gap-2">
            <Input
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                // Auto-calculate if editing input_frequency or input_severity
                if (col.key === 'input_frequency' || col.key === 'input_severity') {
                  const currentItem = data.find(item => item.risk_id === riskId);
                  if (currentItem) {
                    // Update the edit value to show calculated fields will change
                    // The actual save will handle the calculations
                  }
                }
              }}
              className="h-9 text-xs bg-white/15 border-white/25 text-white flex-1 focus:ring-2 focus:ring-white/30"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave(riskId, col.key);
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0 hover:bg-green-500/20"
              onClick={() => handleSave(riskId, col.key)}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 text-green-400" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0 hover:bg-red-500/20"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        ) : (
          <div className="cursor-pointer hover:bg-white/5 p-2 rounded min-h-[40px] transition-colors break-words whitespace-normal">
            <span className="text-white/90 leading-relaxed text-sm">{value || <span className="text-white/40">—</span>}</span>
          </div>
        )}
      </TableCell>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Search Bar */}
      <div className="px-6 py-3 border-b border-white/10 bg-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              type="text"
              placeholder="Search by Risk ID, Risk Item, Description, or Owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="text-white/60 hover:text-white"
            >
              Clear
            </Button>
          )}
          <span className="text-sm text-white/60">
            Showing {filteredData.length} of {data.length} records
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 w-full h-full overflow-auto">
        <Table className="w-full border-collapse bg-transparent">
            <colgroup>
              {columns.map((col) => (
                <col key={col.key} style={{ width: col.width, minWidth: col.width }} />
              ))}
            </colgroup>
            <TableHeader className="bg-gradient-to-b from-white/20 to-white/10 sticky top-0 z-20 border-b-2 border-white/30 shadow-lg">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="sticky left-0 z-30 bg-gradient-to-b from-white/20 to-white/10 text-sm font-bold text-white px-4 py-4 whitespace-nowrap border-r border-white/20 uppercase tracking-wide">
                  Actions
                </TableHead>
                {columns.map((col) => (
                  <TableHead 
                    key={col.key} 
                    className="text-sm font-bold text-white px-4 py-4 whitespace-nowrap border-r border-white/20 bg-gradient-to-b from-white/20 to-white/10 uppercase tracking-wide"
                    style={{ width: col.width, minWidth: col.width }}
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAddingNew && (
                <TableRow className="bg-white/5 border-b border-white/10">
                  <TableCell className="p-3 border-r border-white/10 bg-white/5">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 hover:bg-green-500/20 text-green-400"
                        onClick={handleSaveNew}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 hover:bg-red-500/20 text-red-400"
                        onClick={handleCancelNew}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                  {columns.map((col) => {
                    const value = (newRowData as Record<string, unknown>)[col.key]?.toString() || '';
                    const isCalculatedField = col.key === 'input_impact' || 
                                             col.key === 'inherent_frequency' || 
                                             col.key === 'inherent_severity' || 
                                             col.key === 'inherent_impact';
                    
                    // Show calculated value for derived fields
                    if (isCalculatedField) {
                      const calculated = calculateDerivedValues(newRowData);
                      const calculatedValue = (calculated as Record<string, unknown>)[col.key];
                      return (
                        <TableCell key={col.key} className="p-3 border-r border-white/10 bg-white/5">
                          <Input
                            value={calculatedValue?.toString() || ''}
                            placeholder="Auto-calculated"
                            className="h-9 text-xs bg-white/10 border-white/15 text-white/60 placeholder:text-white/40"
                            disabled
                            readOnly
                          />
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell
                        key={col.key}
                        className="text-xs text-white/70 p-2 bg-white/5 border-r border-white/15"
                        style={{ minWidth: col.width }}
                      >
                        <Input
                          value={value}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            const updated = { ...newRowData, [col.key]: newValue };
                            // Auto-calculate if input_frequency or input_severity changes
                            if (col.key === 'input_frequency' || col.key === 'input_severity') {
                              const calculated = calculateDerivedValues(updated);
                              setNewRowData({ ...updated, ...calculated });
                            } else {
                              setNewRowData(updated);
                            }
                          }}
                          placeholder={col.required ? `${col.label} *` : col.label}
                          className="h-9 text-xs bg-white/15 border-white/25 text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30"
                          required={col.required}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              )}
              {filteredData.length === 0 && !isAddingNew ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="px-6 py-12 text-center text-white/60">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm">No risk assessment data found.</p>
                      <p className="text-xs text-white/40">Click &quot;Add New&quot; to create a record or import CSV data.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item, index) => {
                  return (
                    <TableRow 
                      key={item.risk_id} 
                      className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                        index % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                      }`}
                    >
                      {/* Actions Column */}
                      <TableCell className="sticky left-0 z-10 bg-inherit border-r border-white/10 p-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-blue-500/20"
                            onClick={() => {
                              setSelectedRiskForPing(item);
                              setPingModalOpen(true);
                            }}
                            title="Send notification to user"
                          >
                            <Bell className="h-4 w-4 text-blue-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-red-500/20"
                            onClick={() => handleDelete(item.risk_id)}
                            disabled={deletingId === item.risk_id}
                            title="Delete risk assessment"
                          >
                            <Trash2 className={`h-4 w-4 ${deletingId === item.risk_id ? 'text-white/40' : 'text-red-400'}`} />
                          </Button>
                        </div>
                      </TableCell>
                      {columns.map((col) => {
                        // Show calculated values for derived fields (read-only)
                        if (col.key === 'input_impact' || col.key === 'inherent_frequency' || 
                            col.key === 'inherent_severity' || col.key === 'inherent_impact') {
                          const calculated = calculateDerivedValues(item);
                          const calculatedValue = (calculated as Record<string, unknown>)[col.key] ?? getFieldValue(item, col.key);
                          return (
                            <TableCell
                              key={col.key}
                              className="text-xs text-white/70 p-3 border-r border-white/10 bg-white/5"
                              style={{ minWidth: col.width }}
                              title="Auto-calculated field"
                            >
                              <span className="text-white/60 italic">{calculatedValue || '—'}</span>
                            </TableCell>
                          );
                        }
                        
                        if (col.key === 'residual_category' || col.key === 'inherent_category') {
                          const categoryValue = item[col.key as keyof RiskControlAssessment] as string | null;
                          const severityColor = getSeverityColumnColor(categoryValue);
                          return (
                            <TableCell
                              key={col.key}
                              className={`text-xs text-white/90 p-3 border-r border-white/10 ${severityColor}`}
                              style={{ minWidth: col.width }}
                            >
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getSeverityBadgeColor(categoryValue)}`}>
                                {getFieldValue(item, col.key) || '—'}
                              </span>
                            </TableCell>
                          );
                        }
                        return renderCell(item, col, false);
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      
      {/* Ping Modal */}
      <PingModal
        open={pingModalOpen}
        onClose={() => {
          setPingModalOpen(false);
          setSelectedRiskForPing(null);
        }}
        riskData={selectedRiskForPing}
      />
    </div>
  );
}
