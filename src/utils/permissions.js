import { useMemo } from 'react';
import { getAuth } from '@/auth/lib/helpers';

/**
 * Robust boolean coercion handling true/false, 1/0, "true"/"false", "1"/"0".
 */
export const toBool = (val) => {
  if (val === true || val === 1 || val === '1' || val === 'true' || val === 'TRUE') {
    return true;
  }
  return false;
};

/**
 * Normalizes a page title or name without modifying case (trims whitespace).
 */
export const normalizePageName = (name) => {
  if (!name) return '';
  return String(name).trim();
};

/**
 * Helper to safely retrieve user/auth payload containing userRights from any storage key.
 */
export const getStoredAuthOrUser = () => {
  let auth = getAuth();
  if (auth && (auth.userRights || auth.user?.userRights || auth.data?.userRights)) {
    return auth;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToTry = ['userData', 'user', 'currentUser', 'authUser', 'authData', 'jaiswal-group-auth'];
    for (const k of keysToTry) {
      try {
        const item = localStorage.getItem(k);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && (parsed.userRights || parsed.user?.userRights || parsed.data?.userRights)) {
            return parsed;
          }
        }
      } catch (_) {}
    }
  }

  return auth || null;
};

/**
 * Extracts and maps user rights from stored auth / user payload.
 */
export const getUserPermissions = (userOrAuth) => {
  const auth = userOrAuth || getStoredAuthOrUser() || {};
  const user = auth?.user || auth?.data || auth || {};

  const isAdmin =
    user?.userType === 'ADMIN' ||
    user?.userType === 'SUPER_ADMIN' ||
    user?.is_admin === true ||
    user?.isAdmin === true ||
    auth?.userType === 'ADMIN' ||
    auth?.userType === 'SUPER_ADMIN';

  let rawUserRights =
    user?.userRights ||
    auth?.userRights ||
    auth?.data?.userRights ||
    auth?.user?.userRights;

  if (!rawUserRights && typeof window !== 'undefined' && window.localStorage) {
    const rightsKeys = ['userRights', 'rights', 'permissions', 'userData', 'jaiswal-group-auth', 'user'];
    for (const k of rightsKeys) {
      try {
        const item = localStorage.getItem(k);
        if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed)) {
            rawUserRights = parsed;
            break;
          } else if (Array.isArray(parsed?.userRights)) {
            rawUserRights = parsed.userRights;
            break;
          } else if (Array.isArray(parsed?.data?.userRights)) {
            rawUserRights = parsed.data.userRights;
            break;
          }
        }
      } catch (_) {}
    }
  }

  // Flatten nested module userRights into a lookup map
  const rightsMap = {};

  if (Array.isArray(rawUserRights)) {
    rawUserRights.forEach((moduleGroup) => {
      const pages = Array.isArray(moduleGroup?.userRights)
        ? moduleGroup.userRights
        : Array.isArray(moduleGroup?.pages)
          ? moduleGroup.pages
          : Array.isArray(moduleGroup?.userRightsPages)
            ? moduleGroup.userRightsPages
            : [];

      pages.forEach((page) => {
        const pageName = page?.pageName || page?.pagename || page?.name || page?.title;
        if (pageName) {
          const rawKey = String(pageName).trim();
          const lowerKey = rawKey.toLowerCase();

          const viewVal = page.view ?? page.isView ?? page.canView ?? page.viewRight ?? page.is_view;
          const addVal = page.add ?? page.isAdd ?? page.canAdd ?? page.addRight ?? page.is_add;
          const editVal = page.edit ?? page.isEdit ?? page.canEdit ?? page.editRight ?? page.is_edit;
          const deleteVal = page.delete ?? page.isDelete ?? page.canDelete ?? page.deleteRight ?? page.is_delete;

          const rightObj = {
            view: toBool(viewVal),
            add: toBool(addVal),
            edit: toBool(editVal),
            delete: toBool(deleteVal),
            pageName: pageName,
            pageId: page.pageid ?? page.pageId ?? page.id,
            moduleId: moduleGroup.moduleId,
            moduleName: moduleGroup.moduleName,
          };

          rightsMap[rawKey] = rightObj;
          rightsMap[lowerKey] = rightObj;
        }
      });
    });
  }

  const getPageRights = (pageName) => {
    if (!pageName) {
      return { view: false, add: false, edit: false, delete: false, hasAccess: false };
    }

    const rawKey = String(pageName).trim();
    const lowerKey = rawKey.toLowerCase();
    const rights = rightsMap[rawKey] || rightsMap[lowerKey];

    // Explicit page rights always take priority
    if (rights) {
      return {
        view: toBool(rights.view),
        add: toBool(rights.add),
        edit: toBool(rights.edit),
        delete: toBool(rights.delete),
        hasAccess: toBool(rights.view),
      };
    }

    // If no explicit rights and user is Admin, grant full access
    if (isAdmin) {
      return { view: true, add: true, edit: true, delete: true, hasAccess: true };
    }

    return { view: false, add: false, edit: false, delete: false, hasAccess: false };
  };

  const hasPermission = (pageName, action = 'view') => {
    const rights = getPageRights(pageName);
    return Boolean(rights[action]);
  };

  return {
    isAdmin,
    rightsMap,
    getPageRights,
    hasPermission,
  };
};

/**
 * Filter menu items recursively based on user rights.
 */
export const filterMenuByPermissions = (menuItems, userOrAuth) => {
  if (!Array.isArray(menuItems)) return [];
  const { isAdmin, hasPermission } = getUserPermissions(userOrAuth);

  if (isAdmin) {
    return menuItems;
  }

  const filterItem = (item) => {
    // If item has children, filter recursively
    if (Array.isArray(item.children) && item.children.length > 0) {
      const visibleChildren = item.children
        .map(filterItem)
        .filter(Boolean);

      // If no visible children left, omit parent category/module
      if (visibleChildren.length === 0) {
        return null;
      }

      return {
        ...item,
        children: visibleChildren,
      };
    }

    // Leaf item — check view permission
    const pageTitle = item.title;
    if (!pageTitle) return null;

    if (hasPermission(pageTitle, 'view')) {
      return item;
    }

    return null;
  };

  return menuItems.map(filterItem).filter(Boolean);
};

/**
 * React hook for checking page-level permissions inside components.
 * 
 * @example
 * const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Types');
 */
export const usePagePermissions = (pageName) => {
  return useMemo(() => {
    const auth = getStoredAuthOrUser();
    const { isAdmin, getPageRights } = getUserPermissions(auth);
    const rights = getPageRights(pageName);

    return {
      canView: Boolean(rights.view),
      canAdd: Boolean(rights.add),
      canEdit: Boolean(rights.edit),
      canDelete: Boolean(rights.delete),
      hasAccess: Boolean(rights.view),
      isAdmin,
      rights,
    };
  }, [pageName]);
};

/**
 * Helper component for conditional rendering based on permission.
 */
export const Can = ({ page, do: action = 'view', children, fallback = null }) => {
  const { hasPermission } = getUserPermissions();
  if (hasPermission(page, action)) {
    return children;
  }
  return fallback;
};
