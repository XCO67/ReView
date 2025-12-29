"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { RiskControlAssessment } from '@/lib/database/queries';

interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
}

interface PingModalProps {
  open: boolean;
  onClose: () => void;
  riskData: RiskControlAssessment | null;
}

// Generate dynamic message based on risk data and template type
const generateMessage = (type: string, riskData: RiskControlAssessment | null): string => {
  if (!riskData) return '';

  const riskId = riskData.risk_id || 'N/A';
  const riskItem = riskData.risk_item || 'this risk item';
  const riskOwner = riskData.risk_owner || 'the risk owner';
  const dueDate = riskData.due_date ? new Date(riskData.due_date).toLocaleDateString() : null;
  const residualCategory = riskData.residual_category || 'N/A';
  const inherentCategory = riskData.inherent_category || 'N/A';
  const controlToBeImplemented = riskData.control_to_be_implemented || null;

  switch (type) {
    case 'due_date_near':
      return dueDate 
        ? `⚠️ Be aware: Due date (${dueDate}) is approaching for Risk ID ${riskId} - ${riskItem}. Please review and take necessary actions.`
        : `⚠️ Be aware: Due date is approaching for Risk ID ${riskId} - ${riskItem}. Please review and take necessary actions.`;
    
    case 'high_impact':
      return `⚠️ High Impact Alert: Risk ID ${riskId} - ${riskItem} has been identified as high impact (Residual Category: ${residualCategory}). Immediate attention required.`;
    
    case 'control_review':
      return `⚠️ Control Review Required: Please review the controls for Risk ID ${riskId} - ${riskItem} and provide feedback.`;
    
    case 'residual_risk':
      return `⚠️ Residual Risk Notice: Risk ID ${riskId} - ${riskItem} has a residual category of ${residualCategory}. Your attention is required.`;
    
    case 'implementation_due':
      return controlToBeImplemented
        ? `⚠️ Implementation Due: Control "${controlToBeImplemented}" for Risk ID ${riskId} is due soon. Please ensure timely completion.`
        : `⚠️ Implementation Due: Control implementation for Risk ID ${riskId} - ${riskItem} is due soon. Please ensure timely completion.`;
    
    case 'risk_owner_action':
      return `⚠️ Risk Owner Action Required: As the risk owner (${riskOwner}), your action is needed on Risk ID ${riskId} - ${riskItem}.`;
    
    case 'category_change':
      return `⚠️ Category Change Alert: Risk ID ${riskId} - ${riskItem} category has been updated (Inherent: ${inherentCategory}, Residual: ${residualCategory}). Please review the changes.`;
    
    default:
      return '';
  }
};

const MESSAGE_TEMPLATES = [
  { type: 'due_date_near', label: 'Due Date Approaching' },
  { type: 'high_impact', label: 'High Impact Alert' },
  { type: 'control_review', label: 'Control Review Required' },
  { type: 'residual_risk', label: 'Residual Risk Notice' },
  { type: 'implementation_due', label: 'Implementation Due' },
  { type: 'risk_owner_action', label: 'Risk Owner Action Required' },
  { type: 'category_change', label: 'Category Change Alert' },
  { type: 'custom', label: 'Custom Message' },
];

export default function PingModal({ open, onClose, riskData }: PingModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('due_date_near');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        // Filter only active users
        const activeUsers = data.filter((user: User) => user.is_active);
        setUsers(activeUsers);
        setFilteredUsers(activeUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search query
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = userSearchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        )
      );
    }
  }, [userSearchQuery, users]);

  const handleSend = async () => {
    if (!selectedUserId || !riskData) return;

    const message = selectedTemplate === 'custom' 
      ? customMessage.trim()
      : generateMessage(selectedTemplate, riskData);

    if (!message) {
      alert('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: parseInt(selectedUserId),
          risk_id: riskData.risk_id,
          message,
          message_type: selectedTemplate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      alert('Notification sent successfully!');
      onClose();
      setSelectedUserId('');
      setSelectedTemplate('due_date_near');
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const currentMessage = selectedTemplate === 'custom'
    ? customMessage
    : generateMessage(selectedTemplate, riskData);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            Send Notification
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Send a notification to a user about Risk ID: <span className="font-semibold text-white">{riskData?.risk_id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selection with Search */}
          <div className="space-y-2">
            <Label htmlFor="user">Select User</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loading}>
                <SelectTrigger id="user" className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder={loading ? "Loading users..." : filteredUsers.length === 0 ? "No users found" : "Choose a user"} />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/10 max-h-[200px]">
                  {filteredUsers.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-white/60">No users found</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <SelectItem 
                        key={user.id} 
                        value={user.id.toString()}
                        className="text-white focus:bg-white/10"
                      >
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Message Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template" className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/10">
                {MESSAGE_TEMPLATES.map((template) => (
                  <SelectItem 
                    key={template.type} 
                    value={template.type}
                    className="text-white focus:bg-white/10"
                  >
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Preview/Edit */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            {selectedTemplate === 'custom' ? (
              <textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your custom message..."
                className="w-full min-h-[100px] px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
              />
            ) : (
              <div className="w-full min-h-[100px] px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white/70 p-4">
                {currentMessage}
              </div>
            )}
          </div>

          {/* Risk Details Preview */}
          {riskData && (
            <div className="p-3 bg-white/5 rounded-md border border-white/10">
              <p className="text-xs text-white/60 mb-2">Risk Details:</p>
              <div className="space-y-1 text-sm">
                <p><span className="text-white/60">Risk Item:</span> <span className="text-white">{riskData.risk_item || 'N/A'}</span></p>
                {riskData.due_date && (
                  <p><span className="text-white/60">Due Date:</span> <span className="text-white">{new Date(riskData.due_date).toLocaleDateString()}</span></p>
                )}
                {riskData.risk_owner && (
                  <p><span className="text-white/60">Risk Owner:</span> <span className="text-white">{riskData.risk_owner}</span></p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white/70 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedUserId || !currentMessage.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

