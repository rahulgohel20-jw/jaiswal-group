'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AddProjectTag = ({ isOpen, onClose, onSubmit, existingTags = [] }) => {
  const [tagName, setTagName] = useState('');

  const handleAddTag = () => {
    if (!tagName.trim()) {
      alert('Please enter a tag name');
      return;
    }

    // Check if tag already exists
    if (
      existingTags.some(
        (tag) => tag.name.toLowerCase() === tagName.trim().toLowerCase(),
      )
    ) {
      alert('This tag already exists');
      return;
    }

    const newTag = {
      id: Date.now().toString(),
      name: tagName.trim(),
      value: tagName.trim().toLowerCase(),
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
    };

    const updatedTags = [...existingTags, newTag];

    // Immediately save and close
    if (onSubmit) {
      onSubmit(updatedTags);
    }

    // Reset form and close
    setTagName('');
    onClose();
  };

  const handleClose = () => {
    setTagName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Project Tag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Tag Name Input */}
          <div className="space-y-2">
            <Label
              htmlFor="tagName"
              className="text-sm font-medium text-gray-700"
            >
              Tag Name
            </Label>
            <Input
              id="tagName"
              placeholder="e.g., Development, Design, Marketing"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="w-full h-11"
              autoFocus
            />
          </div>

          {/* Add Button */}
          <Button
            type="button"
            onClick={handleAddTag}
            className="w-full h-10 bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tag
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectTag;
