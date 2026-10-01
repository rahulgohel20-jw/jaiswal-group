import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/common/container";
import { SearchBar } from "@/components/common/SearchBar";
import {
  ChevronRight,
  Eye,
  Plus,
  SquarePen,
  Trash2,
} from "lucide-react";

import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import {
  ScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area";

import {
  getAllCities,
  deleteCityById,
} from "../../../services/apiServices";

import { usePagePermissions } from "@/utils/permissions";
import { AccessDenied } from "@/components/common/AccessDenied";
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import DeleteConfirmModal from "@/utils/DeleteConfirmModal";
import AddCityModel from "./AddCityModel";
import { useNavigate } from "react-router";


const CityMaster = () => {
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('City');

  const [search, setSearch] = useState("");
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [rowSelection, setRowSelection] = useState({});

  // ---------------- MODAL ----------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // ---------------- DELETE ----------------
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // ---------------- FETCH CITIES ----------------
  const fetchCities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getAllCities();
      const payload = res.data;

      if (payload?.success) {
        const mapped = (payload.data['city Details'] || []).map((item) => ({
          id: item.id,
          name: item.name,
          state: item.state?.name ?? "",
          stateId: item.state?.id ?? "",
          createdAt: item.createdAt,
        }));
        setCities(mapped);
      } else {
        setError("Failed to load cities.");
      }
    } catch (err) {
      console.error("Failed to fetch cities:", err);
      setError("Something went wrong while fetching cities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  // ---------------- MODAL CONTROLS ----------------
  const openAddModal = () => {
    setIsViewOnly(false);
    setEditData(null);
    setIsModalOpen(true);
  };

  const openViewModal = (row) => {
    setIsViewOnly(true);
    setEditData(row);
    setIsModalOpen(true);
  };

  const openEditModal = (row) => {
    setIsViewOnly(false);
    setEditData(row);
    setIsModalOpen(true);
  };

  // ---------------- CLOSE MODAL ----------------
  const closeModal = () => {
    setIsModalOpen(false);
    setEditData(null);
    setIsViewOnly(false);
  };

  // ---------------- DELETE ----------------
  const openDeleteConfirm = (row) => {
    setDeleteTarget({
      id: row.id,
      itemLabel: row.name,
    });

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
      await deleteCityById(deleteTarget.id);

      closeDeleteConfirm();
      fetchCities();
    } catch (err) {
      console.error("Failed to delete city:", err);
    } finally {
      setDeleteSaving(false);
    }
  };

  // ---------------- SEARCH ----------------
  const filteredCities = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return cities;
    }

    return cities.filter(
      (city) =>
        city.name?.toLowerCase().includes(searchTerm) ||
        city.state?.toLowerCase().includes(searchTerm)
    );
  }, [cities, search]);

  // ---------------- COLUMNS ----------------
  const columns = useMemo(
    () => [
      // S.NO
      {
        id: "sno",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="text-[#43474F] font-semibold py-4 uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2">
            {String(row.index + 1).padStart(2, "0")}
          </span>
        ),
        enableSorting: false,
        size: 70,
      },

      // NAME
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Name"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <div className="font-semibold text-gray-800 capitalize">
            {row.original.name}
          </div>
        ),
      },

      // STATE NAME
      {
        id: "state",
        accessorFn: (row) => row.state,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="State Name"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <div className="text-gray-700 capitalize">
            {row.original.state || "-"}
          </div>
        ),
      },

      // ACTIONS
      {
        id: "actions",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Actions"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-sm"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <button
              onClick={() => openViewModal(row.original)}
              title="View Details"
            >
              <Eye
                size={18}
                className="text-gray-500 hover:text-green-600 cursor-pointer"
              />
            </button>

            {canEdit && (
              <button
                onClick={() => openEditModal(row.original)}
                title="Edit"
              >
                <SquarePen
                  size={18}
                  className="text-blue-400 hover:text-blue-800 cursor-pointer"
                />
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => openDeleteConfirm(row.original)}
                title="Delete"
              >
                <Trash2
                  size={18}
                  className="text-red-300 hover:text-red-700 cursor-pointer"
                />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
      },
    ],
    [canEdit, canDelete]
  );

  // ---------------- TABLE ----------------
  const table = useReactTable({
    data: filteredCities,
    columns,
    state: {
      pagination,
      rowSelection,
    },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="City" />;
  }

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-3.5">
        <PageHeader
          title="City Master"
          actions={
            canAdd && (
              <HeaderActionButton onClick={openAddModal}>
                Add City
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert error={error} onRetry={fetchCities} />

        {/* SEARCH */}
        <div className="w-full">
          <SearchBar
            placeholder="Search City..."
            value={search}
            isStandalone={true}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({
                ...prev,
                pageIndex: 0,
              }));
            }}
          />
        </div>

        {/* TABLE */}
        <div className="w-full border border-[#C3C6D1] rounded-2xl overflow-hidden">

          {loading && (
            <p className="p-4 text-sm text-gray-500">
              Loading cities...
            </p>
          )}

          <DataGrid
            table={table}
            recordCount={filteredCities.length}
            className="rounded-2xl"
          >
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
        </div>

        <AddCityModel
          open={isModalOpen}
          editData={editData}
          onClose={closeModal}
          onSuccess={fetchCities}
          isViewOnly={isViewOnly}
        />

        {/* DELETE */}
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.itemLabel}
          saving={deleteSaving}
        />

      </div>
    </Container>
  );
};

export default CityMaster;