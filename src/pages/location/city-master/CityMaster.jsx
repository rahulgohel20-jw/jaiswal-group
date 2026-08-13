import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/common/container";
import {
  ChevronRight,
  Plus,
  Search,
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

import DeleteConfirmModal from "@/utils/DeleteConfirmModal";
import AddCityModel from "./AddCityModel";


const CityMaster = () => {
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [rowSelection, setRowSelection] = useState({});

  // ---------------- MODAL ----------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

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

  // ---------------- ADD ----------------
  const openAddModal = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  // ---------------- EDIT ----------------
  const openEditModal = (row) => {
    setEditData(row);
    setIsModalOpen(true);
  };

  // ---------------- CLOSE MODAL ----------------
  const closeModal = () => {
    setIsModalOpen(false);
    setEditData(null);
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
              onClick={() => openEditModal(row.original)}
            >
              <SquarePen
                size={18}
                className="text-blue-400 hover:text-blue-800 cursor-pointer"
              />
            </button>

            <button
              onClick={() => openDeleteConfirm(row.original)}
            >
              <Trash2
                size={18}
                className="text-red-300 hover:text-red-700 cursor-pointer"
              />
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    []
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

  return (
    <Container>
      <div className="p-4 md:p-6">

        {/* BREADCRUMB */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>

          <ChevronRight size={12} />

          <span>Location Master</span>

          <ChevronRight size={12} />

          <span className="text-[#084E92] font-medium">
            City
          </span>
        </div>

        {/* HEADER */}
        <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] text-start">
              City Master
            </h1>
          </div>

          <div className="flex gap-3 self-end">
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-[#084E92] border border-[#E2E8F0] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-blue-800 transition"
            >
              <Plus size={16} />
              Add City
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="bg-white py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="relative w-full md:w-96">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search City..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);

                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: 0,
                  }));
                }}
                className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#084E92]"
              />
            </div>

            <p className="text-sm text-gray-500">
              Showing {filteredCities.length} of {cities.length} cities
            </p>

          </div>
        </div>

        {/* TABLE */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">

          {loading && (
            <p className="p-4 text-sm text-gray-500">
              Loading cities...
            </p>
          )}

          {error && (
            <p className="p-4 text-sm text-red-600">
              {error}
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