import { ChevronRight, CircleCheck, CircleX, Download, Eye, Loader2, MoreVertical, Package, Plus, RotateCcw, Search, SquarePen, Trash2 } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ConditionModal from "./ConditionModal";
import {
  getConditions,
  getConditionById,
  createCondition,
  updateCondition,
  deleteCondition,
} from "@/services/apiServices";
import { notify } from "@/utils/toast";
import { Container } from "@/components/common/container";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';


const STATUS_COLORS = {
  Active: "bg-[#22C55E]",
  Inactive: "bg-[#C3C6D1]",
};

const StatusBadge = ({ status }) => (
  <span
    className={`px-3 py-1 rounded-full text-[10px] font-semibold ${status === "Active"
      ? "bg-[#DCFCE7] text-[#15803D]"
      : "bg-[#E5EAF5] text-[#6B7280]"
      }`}
  >
    {(status || "").toUpperCase()}
  </span>
);

const ConditionCell = ({ name, color }) => (
  <div className="flex items-center gap-2">
    <span className={`w-2 h-2 rounded-full ${color || "bg-[#C3C6D1]"}`} />
    <span className="font-medium text-[#0F172A]">{name}</span>
  </div>
);

// Normalizes whatever shape the API returns into what the table/form expect.
const normalizeCondition = (raw = {}, index = 0) => ({
  id: raw.id,
  srNo: raw.srNo ?? String(index + 1).padStart(2, "0"),
  name: raw.name ?? raw.conditionName ?? "",
  status: raw.status ?? (raw.active ? "Active" : "Inactive"),
  color: STATUS_COLORS[raw.status ?? (raw.active ? "Active" : "Inactive")] || "bg-[#C3C6D1]",
});

const EMPTY_FORM = { id: null, name: "", status: "Active" };

const ConditionMasterModule = () => {
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Conditions Master');

  const [conditions, setConditions] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});

  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  // modal: mode is 'add' | 'edit' | 'view' | null
  const [modalMode, setModalMode] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [deletingId, setDeletingId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [statusInput, setStatusInput] = useState("All Status");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);



  const loadConditions = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await getConditions();
      const list = res?.data?.data ?? [];
      setConditions(list.map(normalizeCondition));
    } catch (err) {
      setListError(err?.message || "Failed to load conditions");
      notify.error("Failed to load conditions");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadConditions();
  }, []);

  const STATS = [
    {
      title: "Total Conditions",
      value: `${conditions.length}`,
      badge: "+2 new",
      icon: Package,
      iconBg: "bg-[#EAF3FF]",
      iconColor: "text-[#084E92]",
    },
    {
      title: "Operational",
      value: `${conditions.filter((c) => c.status == 'Active').length}`,
      badge: "ACTIVE",
      icon: CircleCheck,
      iconBg: "bg-[#ECFDF3]",
      iconColor: "text-[#16A34A]",
    },
    {
      title: "Archived",
      value: `${conditions.filter((c) => c.status == 'Inactive').length}`,
      badge: "INACTIVE",
      icon: CircleX,
      iconBg: "bg-[#EEF2F6]",
      iconColor: "text-[#6B7280]",
    }
  ];
  // -------------------------------------------------------------------
  // Modal open handlers — View and Edit both call getConditionById first
  // so the modal always renders the freshest record from the server.
  // -------------------------------------------------------------------
  const openAddModal = () => {
    setFormData(EMPTY_FORM);
    setModalError(null);
    setModalMode("add");
  };

  const openWithFetchedRecord = async (id, mode) => {
    setModalMode(mode);
    setModalLoading(true);
    setModalError(null);
    setFormData(EMPTY_FORM);
    try {
      const res = await getConditionById(id);
      const record = res?.data?.data ?? res?.data ?? res;
      setFormData(normalizeCondition(record));
    } catch (err) {
      setModalError(err?.message || "Failed to load condition");
    } finally {
      setModalLoading(false);
    }
  };

  const openViewModal = (id) => openWithFetchedRecord(id, "view");
  const openEditModal = (id) => openWithFetchedRecord(id, "edit");

  const closeModal = () => {
    setModalMode(null);
    setModalError(null);
    setFormData(EMPTY_FORM);
  };

  // -------------------------------------------------------------------
  // Save (create or update depending on mode)
  // -------------------------------------------------------------------
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setModalError("Condition name is required");
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      const payload = {
        name: formData.name.trim(),
        status: formData.status,
        active: formData.status === "Active",
      };

      if (modalMode === "edit") {
        await updateCondition({ id: formData.id, ...payload });
      } else {
        await createCondition(payload);
      }

      await loadConditions();
      closeModal();
    } catch (err) {
      setModalError(err?.message || "Failed to save condition");
      notify.error("Failed to save conditions");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------

  const openDeleteConfirm = (row) => {
    setDeleteTarget({ id: row.id, itemLabel: row.name });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteSaving) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deleteCondition(deleteTarget.id);
      closeDeleteConfirm();
      await loadConditions();
    } catch (err) {
      setListError(err?.message || "Failed to delete condition");
    } finally {
      setDeleteSaving(false);
    }
  };

  // -------------------------------------------------------------------
  // Table columns
  // -------------------------------------------------------------------
  const columns = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className='mx-4 my-5'
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className='mx-4 my-2'
        />
      ),
      enableSorting: false,
      size: 50,
    },

    {
      accessorKey: "srNo",
      header: ({ column }) => (
        <DataGridColumnHeader title="S.NO" column={column} className="font-semibold text-[#43474F]" />
      ),
      cell: ({ row }) => (
        <span className="text-[#737781]">
          {row.original.srNo}
        </span>
      ),
      size: 50,
    },

    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="CONDITION NAME"
          column={column}
          className="font-semibold text-[#43474F]"
        />
      ),
      cell: ({ row }) => (
        <ConditionCell
          name={row.original.name}
          color={row.original.color}
        />
      ),
    },

    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="STATUS"
          column={column}
          className="font-semibold text-[#43474F]"
        />
      ),
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },

    {
      id: "actions",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ACTIONS"
          column={column}
          className="font-semibold text-[#43474F]"
        />
      ),

      cell: ({ row }) => (
        <div className="flex items-center gap-4">
          <Eye
            size={18}
            className="text-gray-500 hover:text-green-600 cursor-pointer"
            onClick={() => openViewModal(row.original.id)}
            title="View Condition"
          />

          {canEdit && (
            <SquarePen
              size={18}
              className="text-gray-500 hover:text-blue-600 cursor-pointer"
              onClick={() => openEditModal(row.original.id)}
              title="Edit Condition"
            />
          )}

          {canDelete && (
            deletingId === row.original.id ? (
              <Loader2 size={18} className="animate-spin text-red-500" />
            ) : (
              <Trash2
                size={18}
                className="text-red-300 hover:text-red-600 cursor-pointer"
                onClick={() => openDeleteConfirm(row.original)}
                title="Delete Condition"
              />
            )
          )}
        </div>
      ),

      enableSorting: false,
    },
  ], [canEdit, canDelete, deletingId]);

  const filteredConditions = useMemo(() => {
    return conditions.filter((condition) => {
      const matchesSearch =
        searchInput === "" ||
        condition.name
          .toLowerCase()
          .includes(searchInput.toLowerCase());

      const matchesStatus =
        statusInput === "All Status" ||
        condition.status === statusInput;

      return matchesSearch && matchesStatus;
    });
  }, [conditions, searchInput, statusInput]);

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [searchInput, statusInput]);


  const table = useReactTable({
    data: filteredConditions,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Conditions Master" />;
  }

  return (
    <Container>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Asset Management</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Condition Master</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Condition Master
            </h1>

            <p className="text-[#5F6368] mt-1 max-w-2xl text-sm">
              Configure and standardize asset health states
              across the enterprise.
            </p>
          </div>

          {canAdd && (
            <div className="flex gap-3">
              <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2 bg-linear-to-r from-[#084E92] to-[#002246] text-white cursor-pointer rounded-lg">
                <Plus size={16} />
                Add Condition
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
          {STATS.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="bg-white rounded-3xl border border-[#E6EBF4] p-5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div
                    className={`w-6 h-6 rounded ${item.iconBg} flex items-center justify-center`}
                  >
                    <Icon
                      size={15}
                      className={item.iconColor}
                    />
                  </div>

                  {index === 0 && (
                    <MoreVertical
                      size={16}
                      className="text-[#9CA3AF]"
                    />
                  )}
                </div>
                <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                <h2 className={`text-xl font-bold`}>{item.value}</h2>
                <p className={`text-xs ${item.iconColor}`}>{item.badge}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[#D9DEE8] p-5 my-10 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Search  */}
            <div className="relative border border-[#C3C6D1] rounded-lg col-span-1 md:col-span-2 py-0">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Type to search conditions..."
                className="w-full pl-10 py-2 rounded-lg outline-none"
              />
            </div>


            {/* Status */}
            <Select
              value={statusInput}
              onValueChange={(value) => setStatusInput(value)}
            >
              <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg text-sm text-gray-600">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="All Status">
                  All Status
                </SelectItem>

                <SelectItem value="Active">
                  Active
                </SelectItem>

                <SelectItem value="Inactive">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {listError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
            {listError}
          </div>
        )}

        {/* Table */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {listLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#5F6368]">
              <Loader2 size={18} className="animate-spin" />
              Loading conditions...
            </div>
          ) : (
            <DataGrid table={table} recordCount={filteredConditions.length} className="rounded-2xl">
              <Card className="rounded-t-none border-t-0 rounded-2xl">
                <CardTable>
                  <ScrollArea>
                    <DataGridTable />
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardTable>
                <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </div>

        <ConditionModal
          mode={modalMode}
          formData={formData}
          loading={modalLoading}
          error={modalError}
          saving={saving}
          onChange={setFormData}
          onClose={closeModal}
          onSave={handleSave}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.itemLabel}
          saving={deleteSaving}
        />
      </div>
    </Container>
  )
}

export default ConditionMasterModule