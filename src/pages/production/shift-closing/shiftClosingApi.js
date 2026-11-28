import {
  getShiftClosing,
  saveShiftClosingDraft,
  submitShiftClosing,
  getAllShiftClosings,
} from '@/services/apiServices';

export const fetchShiftClosing = (context) => {
  return getShiftClosing({
    productionPlanId: Number(context.productionPlanId),
    mealTypeId: Number(context.mealTypeId),
    organizationId: Number(context.organizationId),
    subOutletId:
      context.subOutletId !== undefined &&
      context.subOutletId !== null &&
      context.subOutletId !== '' &&
      Number(context.subOutletId) > 0
        ? Number(context.subOutletId)
        : null,
  });
};

export const postShiftClosingDraft = (payload) => {
  return saveShiftClosingDraft(payload);
};

export const postShiftClosingSubmit = (payload) => {
  return submitShiftClosing(payload);
};

export const fetchShiftClosingList = (filters) => {
  return getAllShiftClosings(filters);
};

