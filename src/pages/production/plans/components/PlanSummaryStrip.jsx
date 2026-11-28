import React from 'react';
import { Hash, Calendar, UtensilsCrossed, ChefHat, Users, MapPin } from 'lucide-react';

export const PlanSummaryStrip = ({
  planCode = 'PP-2026-007',
  productionDate = '01 Apr 2026',
  producingKitchen = 'Main Kitchen',
  recipes = 8,
  totalPax = '1,200 Pax',
  destinations = '4 Centers',
  mealType = 'Lunch',
  issueStore = 'Maruti Main Store',
  storeOptions = [],
  showPlanCode = false,
  showCards = true,
  onMealTypeChange,
  onIssueStoreChange
}) => {
  return (
    <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs mb-6">
      {showCards && (
        <div className={`grid grid-cols-2 md:grid-cols-3 ${showPlanCode ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3 mb-3`}>
          {showPlanCode && (
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
              <Hash size={16} className="text-[#084E92] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Plan Code</span>
                <span className="text-xs font-bold text-gray-900 truncate block">{planCode}</span>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
            <Calendar size={16} className="text-[#084E92] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Production Date</span>
              <span className="text-xs font-bold text-gray-900 truncate block">{productionDate}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
            <ChefHat size={16} className="text-[#084E92] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Producing Kitchen</span>
              <span className="text-xs font-bold text-gray-900 truncate block">{producingKitchen}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
            <UtensilsCrossed size={16} className="text-[#084E92] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Recipes</span>
              <span className="text-xs font-bold text-gray-900 truncate block">{recipes} Recipes</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
            <Users size={16} className="text-[#084E92] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Total Output</span>
              <span className="text-xs font-bold text-gray-900 truncate block">{totalPax}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
            <MapPin size={16} className="text-[#084E92] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Destinations</span>
              <span className="text-xs font-bold text-gray-900 truncate block">{destinations}</span>
            </div>
          </div>
        </div>
      )}

      {(onMealTypeChange || onIssueStoreChange) && (
        <div className={`flex flex-wrap items-center gap-4 ${showCards ? 'pt-3 border-t border-gray-100' : ''}`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Meal Type <span className="text-rose-500">*</span></span>
            <select
              value={mealType}
              onChange={(e) => onMealTypeChange?.(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#C3C6D1] text-xs font-medium bg-white focus:border-[#084E92] focus:outline-none"
            >
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="All">All Meals</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Issue Store <span className="text-rose-500">*</span></span>
            <select
              value={issueStore}
              onChange={(e) => onIssueStoreChange?.(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#C3C6D1] text-xs font-medium bg-white focus:border-[#084E92] focus:outline-none"
            >
              {storeOptions && storeOptions.length > 0 ? (
                storeOptions.map((st) => (
                  <option key={st.id || st.name} value={st.name || st.label || st}>
                    {st.name || st.label || st}
                  </option>
                ))
              ) : (
                <>
                  <option value={issueStore}>{issueStore}</option>
                  <option value="Main Store">Main Store</option>
                  <option value="Central Cold Storage">Central Cold Storage</option>
                  <option value="Dry Provision Store">Dry Provision Store</option>
                </>
              )}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanSummaryStrip;
