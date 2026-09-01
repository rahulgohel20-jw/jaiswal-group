import React from 'react';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

export const RequirePermission = ({ page, children }) => {
  const { canView } = usePagePermissions(page);

  if (!canView) {
    return <AccessDenied pageTitle={page} />;
  }

  return children;
};

export default RequirePermission;
