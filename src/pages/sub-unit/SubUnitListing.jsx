import { useState, useMemo, useEffect } from "react";
import {
  Building2,
  Plus,
  Eye,
  SquarePen,
  Trash2,
  Search,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Container } from "@/components/common/container";
import { Link, useNavigate } from "react-router";
import {
  getAllSubOutlets,
  getSubOutletById,
  deleteSubOutletById,
} from "../../services/apiServices";
import { notify } from "@/utils/toast";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-gray-100 text-gray-500 ring-gray-200",
};

const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-gray-400"
        }`}
    />
    {STATUS_LABELS[status]}
  </span>
);



const SubUnitListing = () => {
  const navigate = useNavigate();
  const [subUnits, setSubUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const normalizeSubUnit = (item) => ({
    id: item.id,
    name: item.subOutletName || "",
    code: item.subOutletCode || "",
    location: item.cityName || "",
    email: item.email || "",
    mobile: item.contactNumber || "",
    status: item.isActive ? "active" : "inactive",
  });

  const fetchSubUnits = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getAllSubOutlets();

      const list =
        res?.data?.data ||
        res?.data?.content ||
        res?.data ||
        [];

      const subUnitList = Array.isArray(list) ? list : [];

      setSubUnits(subUnitList.map(normalizeSubUnit));
    } catch (err) {
      console.error(err);
      setError("Failed to load sub units.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubUnits();
  }, []);

  const handleViewClick = async (subUnit) => {
    try {
      const res = await getSubOutletById(subUnit.id);
      navigate("/sub-units/sub-unit-details", {
        state: {
          subUnit: res.data.data,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const filteredSubUnits = useMemo(
    () =>
      subUnits.filter((s) => {
        const q = search.toLowerCase();
        const matchesSearch =
          (s.name || "").toLowerCase().includes(q) ||
          (s.code || "").toLowerCase().includes(q) ||
          (s.location || "").toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q) ||
          (s.mobile || "").toLowerCase().includes(q);
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [subUnits, search, statusFilter],
  );

  const openDeleteConfirm = (row) => {
    setDeleteTarget({ id: row.id, name: row.name });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteSubOutletById(deleteTarget.id);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      await fetchSubUnits();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };



  const handleEdit = async (subUnit) => {
    try {
      const res = await getSubOutletById(subUnit.id);
      navigate("/sub-units/update-sub-unit", {
        state: {
          subUnit: res.data.data,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader title="Sub Unit Name" column={column} />,
        cell: ({ row }) => (
          <span className="font-semibold text-gray-800">{row.original.name}</span>
        ),
        size: 220,
      },
      {
        id: "location",
        accessorFn: (row) => row.location,
        header: ({ column }) => <DataGridColumnHeader title="Location" column={column} />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.location}</span>,
      },
      {
        id: "email",
        accessorFn: (row) => row.email,
        header: ({ column }) => <DataGridColumnHeader title="Contact Email" column={column} />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.email}</span>,
      },
      {
        id: "mobile",
        accessorFn: (row) => row.mobile,
        header: ({ column }) => <DataGridColumnHeader title="Mobile Number" column={column} />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.mobile}</span>,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => (
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Actions
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewClick(row.original)}
              className="text-gray-500 hover:text-green-600 cursor-pointer"
              title="View sub unit"
            >
              <Eye size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(row.original)}
              className="text-gray-500 hover:text-blue-600 cursor-pointer"
              title="Update sub unit"
            >
              <SquarePen size={18} />
            </button>
            <button
              type="button"
              onClick={() => openDeleteConfirm(row.original)}
              className="text-red-300 hover:text-red-600 cursor-pointer"
              title="Delete sub unit"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredSubUnits,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const STATUS_TABS = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Inactive" },
  ];

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-60">
          Loading sub units...
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="text-red-500 text-center py-10">{error}</div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="p-4 md:p-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-none">
                Registered Sub Units
              </h1>
              <p className="text-md text-gray-400 mt-2.5">
                Manage and monitor all sub units registered within the Jaiswal Group ecosystem through our <br />
                centralized administration panel.
              </p>
            </div>
          </div>
          <Link
            to="/sub-units/add"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-900 text-white text-sm font-semibold border-0 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            Add new sub unit
          </Link>
        </div>

        <DataGrid table={table} recordCount={filteredSubUnits.length}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100 gap-4 flex-wrap">
            {/* Search */}
            <div className="relative sm:w-[50%] w-full border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sub units..."
                className="pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-emerald-100 focus:border-emerald-300 w-56 transition placeholder-gray-400"
              />
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl p-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border-0 ${statusFilter === tab.key
                      ? "bg-white text-gray-800 shadow-sm"
                      : "bg-transparent text-gray-400 hover:text-gray-600"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Card */}
          <Card className="rounded-t-none border-t-0 border shadow-none">
            <CardTable>
              <ScrollArea>
                <DataGridTable />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </Card>
        </DataGrid>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        itemLabel={deleteTarget?.name}
        saving={deleteLoading}
      />
    </Container>
  );
};

export default SubUnitListing;