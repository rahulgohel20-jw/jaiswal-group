'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { notify, getApiErrorMessage } from '@/utils/toast';
import { Loader2, Plus, Save, ShieldCheck, X } from 'lucide-react';
import {
  addRoleMaster,
  addUserRights,
  getPages,
  getUserRightsByRole,
} from '@/services/apiServices';
import AddDepartmentModal from './AddDepartmentModal';

const ACTIONS = [
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'view', label: 'View' },
  { key: 'delete', label: 'Delete' },
];

// ADJUST: normalizes getPages() into { moduleName: [ {id, name}, ... ] }.
// Handles the shapes I'd expect given isCombine=true groups pages by module:
//   1) { data: { "Banquet": [...], "Master": [...] } }   (object keyed by module)
//   2) { data: [ { moduleName, pages: [...] } ] }          (array of module groups)
//   3) { data: [ { module, id, name } ] }                  (flat list w/ module field)
// Confirmed response shape from GET /user-rights/getPages:
//   { msg, data: { ModuleWiseUserRights: [ { moduleId, moduleName, userRightsPages: [ { pageId, pagename } ] } ] }, success }
const normalizePages = (res) => {
  const modules = res?.data?.data?.ModuleWiseUserRights ?? [];
  const grouped = {};
  modules.forEach((m) => {
    grouped[m.moduleName] = (m.userRightsPages ?? []).map((p) => ({
      id: p.pageId,
      name: p.pagename,
      moduleId: m.moduleId, // kept in case addRights needs moduleId per page
    }));
  });
  return grouped;
};

const normalizeExistingRights = (res) => {
  const modules = res?.data?.data?.UserRights ?? [];
  const map = {};
  modules.forEach((m) => {
    (m.userRights ?? []).forEach((r) => {
      map[r.pageid] = {
        add: Boolean(r.add),
        edit: Boolean(r.edit),
        view: Boolean(r.view),
        delete: Boolean(r.delete),
      };
    });
  });
  return map;
};

const emptyRow = { add: false, edit: false, view: false, delete: false };
const fullRow = { add: true, edit: true, view: true, delete: true };

const PermissionsModal = ({
  isOpen,
  onClose,
  role,
  mode,
  onDepartmentAdded,
  canEdit = true,
  canAdd = true,
}) => {
  const [pagesByModule, setPagesByModule] = useState({});
  const [checks, setChecks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // --- Add Department state ---
  const [showAddDept, setShowAddDept] = useState(false);
  const [addingDept, setAddingDept] = useState(false);

  const isReportMode = mode === 'reportRights';

  const load = useCallback(async () => {
    if (!isOpen || !role) return;
    setLoading(true);
    setError('');
    try {
      // ADJUST: no separate "reports" pages endpoint was given, so Report
      // Rights reuses getPages with isAdminRights flipped as a guess. If
      // Report Rights should hit a different API entirely, swap this out.
      const pagesRes = await getPages(isReportMode, true);
      setPagesByModule(normalizePages(pagesRes));

      const rightsRes = await getUserRightsByRole(role.id);
      setChecks(normalizeExistingRights(rightsRes));
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to load permissions.'));
    } finally {
      setLoading(false);
    }
  }, [isOpen, role, isReportMode]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset the add-department form whenever the modal closes/reopens
  useEffect(() => {
    if (!isOpen) {
      setShowAddDept(false);
    }
  }, [isOpen]);

  const allPageIds = useMemo(
    () =>
      Object.values(pagesByModule)
        .flat()
        .map((p) => p.id),
    [pagesByModule],
  );

  if (!isOpen) return null;

  const toggle = (pageId, actionKey) => {
    setChecks((prev) => ({
      ...prev,
      [pageId]: {
        ...(prev[pageId] ?? emptyRow),
        [actionKey]: !prev[pageId]?.[actionKey],
      },
    }));
  };

  // ---- Column-wise (existing) ----
  const isColumnFullyChecked = (actionKey) =>
    allPageIds.length > 0 && allPageIds.every((id) => checks[id]?.[actionKey]);

  const toggleColumn = (actionKey) => {
    const shouldCheck = !isColumnFullyChecked(actionKey);
    setChecks((prev) => {
      const next = { ...prev };
      allPageIds.forEach((id) => {
        next[id] = { ...(next[id] ?? emptyRow), [actionKey]: shouldCheck };
      });
      return next;
    });
  };

  // ---- Row-wise "All" (new) ----
  const isRowFullyChecked = (pageId) =>
    ACTIONS.every((a) => Boolean(checks[pageId]?.[a.key]));

  const toggleRow = (pageId) => {
    const shouldCheck = !isRowFullyChecked(pageId);
    setChecks((prev) => ({
      ...prev,
      [pageId]: shouldCheck ? { ...fullRow } : { ...emptyRow },
    }));
  };

  // ---- Master "select everything" (new, bonus) ----
  const isEverythingChecked =
    allPageIds.length > 0 && allPageIds.every((id) => isRowFullyChecked(id));

  const toggleEverything = () => {
    const shouldCheck = !isEverythingChecked;
    setChecks((prev) => {
      const next = { ...prev };
      allPageIds.forEach((id) => {
        next[id] = shouldCheck ? { ...fullRow } : { ...emptyRow };
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const rightsList = allPageIds
        .map((pageId) => {
          const pageInfo = Object.values(pagesByModule)
            .flat()
            .find((p) => p.id === pageId);
          const row = checks[pageId] ?? emptyRow;
          return {
            pageid: pageId, // NOTE: lowercase 'd' — matches addRights request model exactly
            moduleId: pageInfo?.moduleId,
            add: row.add,
            edit: row.edit,
            view: row.view,
            delete: row.delete,
          };
        })
        .filter((r) => r.add || r.edit || r.view || r.delete);
      // ADJUST: still worth confirming whether unchecked/all-false pages should
      // be included (to explicitly revoke previously granted rights) or omitted
      // entirely like this. If a role had "Edit" on a page and you uncheck it,
      // omitting the row here means the backend won't know to revoke it unless
      // addRights treats this as a full replace of the role's rights each save.

      await addUserRights({
        roleId: role.id,
        rightsList,
      });
      notify?.success?.('Permissions saved successfully');
      onClose?.();
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err, 'Failed to save permissions.');
      setError(msg);
      notify?.error?.(msg);
    } finally {
      setSaving(false);
    }
  };

  // payload comes from AddDepartmentModal as { name, description }
  const handleAddDepartment = async (payload) => {
    setAddingDept(true);
    try {
      // ADJUST: addRoleMaster(...) payload shape assumed to be { name, description }
      // per AddDepartmentModal — point this at whatever your real "create
      // department" endpoint/service actually expects.
      const res = await addRoleMaster(payload);
      notify?.success?.('Department added successfully');
      setShowAddDept(false);
      onDepartmentAdded?.(res?.data?.data ?? payload);
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err, 'Failed to add department.');
      notify?.error?.(msg);
    } finally {
      setAddingDept(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none text-[#084E92]">
                {isReportMode ? 'Report Permissions' : 'Permissions'} —{' '}
                {role?.name}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                Configure {isReportMode ? 'report access' : 'module access'} for
                this role
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isReportMode && canAdd && (
              <button
                onClick={() => setShowAddDept(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#084E92] text-[#084E92] text-xs font-medium hover:bg-blue-50 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Department
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 cursor-pointer" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
              <Loader2 className="animate-spin" size={20} />
              Loading permissions...
            </div>
          ) : Object.keys(pagesByModule).length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500">
              No permissions found for this role.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB] sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[#43474F]">
                    Page Name
                  </th>
                  <th className="text-center px-4 py-3 font-semibold">
                    <div className="flex flex-col items-center gap-1">
                      <span>All</span>
                      <input
                        type="checkbox"
                        checked={isEverythingChecked}
                        disabled={!canEdit}
                        onChange={toggleEverything}
                        className="rounded disabled:opacity-50"
                        title="Toggle Add/Edit/View/Delete for every page"
                      />
                    </div>
                  </th>
                  {ACTIONS.map((a) => (
                    <th
                      key={a.key}
                      className="text-center px-4 py-3 font-semibold"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{a.label}</span>
                        <input
                          type="checkbox"
                          checked={isColumnFullyChecked(a.key)}
                          disabled={!canEdit}
                          onChange={() => toggleColumn(a.key)}
                          className="rounded disabled:opacity-50"
                          title={`Toggle ${a.label} for all`}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(pagesByModule).map(([moduleName, pages]) => (
                  <React.Fragment key={moduleName}>
                    <tr className="bg-[#F7F8FA]">
                      <td
                        colSpan={ACTIONS.length + 2}
                        className="px-4 py-2 font-semibold text-[#43474F]"
                      >
                        {moduleName}
                      </td>
                    </tr>
                    {pages.map((page) => (
                      <tr
                        key={page.id}
                        className="border-b border-[#F0F1F3] last:border-b-0"
                      >
                        <td className="px-4 py-2.5 pl-8 text-gray-700">
                          {page.name}
                        </td>
                        <td className="text-center px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={isRowFullyChecked(page.id)}
                            disabled={!canEdit}
                            onChange={() => toggleRow(page.id)}
                            className="rounded disabled:opacity-50"
                            title="Toggle Add/Edit/View/Delete for this row"
                          />
                        </td>
                        {ACTIONS.map((a) => (
                          <td key={a.key} className="text-center px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={Boolean(checks[page.id]?.[a.key])}
                              disabled={!canEdit}
                              onChange={() => toggle(page.id, a.key)}
                              className="rounded disabled:opacity-50"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 cursor-pointer"
          >
            {canEdit ? 'Cancel' : 'Close'}
          </button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#084E92] text-white text-sm font-medium hover:bg-[#073e77] disabled:opacity-60 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          )}
        </div>
      </div>

      <AddDepartmentModal
        isOpen={showAddDept}
        onClose={() => setShowAddDept(false)}
        onSave={handleAddDepartment}
        saving={addingDept}
      />
    </div>
  );
};

export default PermissionsModal;
