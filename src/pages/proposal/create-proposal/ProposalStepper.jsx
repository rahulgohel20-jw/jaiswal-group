import React from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { PROPOSAL_STEPS } from './types';

export const ProposalStepper = ({ currentStep, onSelectStep, maxCompletedStep = 1 }) => {
  const percentage = Math.round((currentStep / PROPOSAL_STEPS.length) * 100);

  return (
    <div className="bg-[#F8FAFC] border border-[#E4E7EC] rounded-2xl p-4 sm:p-5 shadow-2xs">
      {/* Top summary row with navigation buttons */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EAECF0] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-[#084E92] uppercase bg-[#EBF3FC] px-3 py-1 rounded-full border border-[#D0E2FF]">
            STEP {currentStep} OF {PROPOSAL_STEPS.length}
          </span>
        </div>

        {/* Quick step navigation without calling API */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectStep(currentStep - 1)}
            disabled={currentStep <= 1}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous Step"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => onSelectStep(currentStep + 1)}
            disabled={currentStep >= PROPOSAL_STEPS.length}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#084E92] bg-white border border-[#084E92] hover:bg-blue-50 transition cursor-pointer shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Step"
          >
            <ChevronRight size={16} />
          </button>

          <span className="text-xs font-bold text-[#084E92] ml-1.5">
            {percentage}% Completed
          </span>
        </div>
      </div>

      {/* Steps connector row with guaranteed equal spacing and no overflow */}
      <div className="w-full overflow-hidden">
        <div className="flex items-center justify-between w-full">
          {PROPOSAL_STEPS.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <React.Fragment key={step.id}>
                {/* Step node */}
                <div
                  onClick={() => onSelectStep(step.id)}
                  className="flex items-center gap-1.5 sm:gap-2 shrink-0 group transition cursor-pointer hover:opacity-85"
                  title={`Go to Step ${step.id}: ${step.title} (navigate without API call)`}
                >
                  {/* Number / Check icon circle with background color */}
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-[#084E92] text-white shadow-xs'
                        : isCurrent
                        ? 'bg-[#084E92] text-white ring-3 ring-[#084E92]/20 shadow-xs'
                        : 'bg-[#F2F4F7] border border-[#D0D5DD] text-[#475467] group-hover:border-[#084E92] group-hover:text-[#084E92]'
                    }`}
                  >
                    {isCompleted ? <Check size={13} className="stroke-[3]" /> : step.id}
                  </div>

                  {/* Step labels */}
                  <div className="flex flex-col text-left">
                    <span
                      className={`text-[11px] sm:text-xs font-bold leading-tight max-w-[80px] sm:max-w-[95px] ${
                        isCurrent
                          ? 'text-[#084E92]'
                          : isCompleted
                          ? 'text-gray-900'
                          : 'text-gray-500 group-hover:text-gray-800'
                      }`}
                    >
                      {step.title}
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-medium mt-0.5 ${
                        isCurrent
                          ? 'text-[#084E92] font-semibold'
                          : isCompleted
                          ? 'text-emerald-600 font-semibold'
                          : 'text-gray-400'
                      }`}
                    >
                      {isCurrent ? 'In Progress' : isCompleted ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Connecting line between adjacent steps with equal margins & fill */}
                {index < PROPOSAL_STEPS.length - 1 && (
                  <div className="flex-1 min-w-[12px] sm:min-w-[18px] mx-1.5 sm:mx-2.5 h-[2px] bg-[#E4E7EC] overflow-hidden rounded-full">
                    <div
                      className={`h-full w-full transition-all duration-300 ${
                        step.id < currentStep ? 'bg-[#084E92]' : 'bg-transparent'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProposalStepper;
