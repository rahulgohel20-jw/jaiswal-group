'use client';

import React, { useState } from 'react';
import { Check, Edit3, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const WorkflowSelectionModal = ({ isOpen, onClose, onContinue }) => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState('manual'); // 'predefined' or 'manual'

  const handleContinue = () => {
    if (selectedOption === 'predefined') {
      // Navigate to view pipeline page using React Router (no page refresh)
      navigate('/viewpipeline');
      onClose();
    } else {
      // Call the onContinue callback for manual option
      if (onContinue) {
        onContinue(selectedOption);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative animate-in fade-in zoom-in duration-200">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Header */}
          <div className="text-center pt-12 pb-8 px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              How would you like to create tasks for this event?
            </h2>
            <p className="text-gray-500 text-base">
              Choose a workflow to get your event tasks set up instantly.
            </p>
          </div>

          {/* Options */}
          <div className="px-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Predefined Pipeline Option */}
              <div
                onClick={() => setSelectedOption('predefined')}
                className={cn(
                  'relative border-2 rounded-xl p-8 cursor-pointer transition-all duration-200 hover:shadow-lg',
                  selectedOption === 'predefined'
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-gray-200 hover:border-gray-300 bg-white',
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center mb-6 transition-colors',
                    selectedOption === 'predefined'
                      ? 'bg-blue-100'
                      : 'bg-gray-100',
                  )}
                >
                  <Sparkles
                    className={cn(
                      'w-7 h-7',
                      selectedOption === 'predefined'
                        ? 'text-blue-600'
                        : 'text-gray-600',
                    )}
                  />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Use Predefined Catering Pipeline
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  Auto-create standard pre-event, event-day & post-event tasks
                  based on industry standards.
                </p>

                {/* Selected Indicator */}
                {selectedOption === 'predefined' && (
                  <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    Selected
                  </div>
                )}
              </div>

              {/* Manual Creation Option */}
              <div
                onClick={() => setSelectedOption('manual')}
                className={cn(
                  'relative border-2 rounded-xl p-8 cursor-pointer transition-all duration-200 hover:shadow-lg',
                  selectedOption === 'manual'
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-gray-200 hover:border-gray-300 bg-white',
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center mb-6 transition-colors',
                    selectedOption === 'manual' ? 'bg-blue-100' : 'bg-gray-100',
                  )}
                >
                  <Edit3
                    className={cn(
                      'w-7 h-7',
                      selectedOption === 'manual'
                        ? 'text-blue-600'
                        : 'text-gray-600',
                    )}
                  />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Create Tasks Manually
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  Add your own custom tasks and checklists specifically for this
                  event's unique requirements.
                </p>

                {/* Selected Indicator */}
                {selectedOption === 'manual' && (
                  <div className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    Selected
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-white px-8 py-6 rounded-b-2xl">
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleContinue}
                className="w-full max-w-xs h-12 bg-[#0066CC] hover:bg-[#0052A3] text-white font-medium text-base rounded-lg shadow-sm transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  navigate('/');
                }}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Go back to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkflowSelectionModal;
