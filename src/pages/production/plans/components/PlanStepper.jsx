import React from 'react';
import { Check } from 'lucide-react';

export const PlanStepper = ({ currentStep = 1, onStepClick }) => {
  const steps = [
    { number: 1, title: 'General Setup', subtitle: 'Plan details and scope' },
    { number: 2, title: 'Recipes and Allocation', subtitle: 'Configure recipes and quantities.' },
    { number: 3, title: 'Material Sourcing', subtitle: 'Raw material planning' }
  ];

  return (
    <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto relative">
        {steps.map((step, idx) => {
          const isDone = currentStep > step.number;
          const isActive = currentStep === step.number;

          return (
            <React.Fragment key={step.number}>
              <div
                className={`flex items-center gap-3.5 cursor-pointer transition select-none ${
                  isActive ? 'opacity-100' : isDone ? 'opacity-90' : 'opacity-40'
                }`}
                onClick={() => onStepClick?.(step.number)}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isActive
                      ? 'bg-[#084E92] text-white shadow-md ring-4 ring-blue-50'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {isDone ? <Check size={16} strokeWidth={2.5} /> : step.number}
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-tight ${isActive ? 'text-[#084E92]' : 'text-gray-900'}`}>
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 font-normal mt-0.5">{step.subtitle}</p>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex-1 mx-6 h-0.5 bg-gray-100 relative">
                  <div
                    className={`h-full transition-all duration-300 ${
                      currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-transparent'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PlanStepper;
