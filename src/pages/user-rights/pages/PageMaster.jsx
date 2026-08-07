import React, { useEffect, useMemo, useState } from 'react';
import { notify } from '@/utils/toast';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronRight, Plus, Search, SquarePen } from 'lucide-react';
import { deletePage, getPages } from '@/services/apiServices';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import AddPageModal from './AddPageModal';

// Maps a raw API page object (+ its row position) to the shape the table expects
const mapPage = (p, index) => ({
  id: p.id,
  srNo: index + 1,
  name: p.pageName ?? p.name,
  moduleName: p.moduleName,
});

const PageMaster = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [showAddPage, setShowAddPage] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [search, setSearch] = useState('');

  const openEditModal = (row) => {
    setEditingPage(row);
    setShowAddPage(true);
  };

  const openCreateModal = () => {
    setEditingPage(null);
    setShowAddPage(true);
  };

  const closeModal = () => {
    setShowAddPage(false);
    setEditingPage(null);
  };

  // Flattens the module-wise response into flat rows the table expects
  const flattenPages = (moduleWiseRights) => {
    const rows = [];
    moduleWiseRights.forEach((mod) => {
      (mod.userRightsPages ?? []).forEach((page) => {
        rows.push({
          id: page.pageId,
          name: page.pagename ?? '-',
          moduleId: mod.moduleId,
          moduleName: mod.moduleName,
        });
      });
    });
    return rows;
  };

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPages(false, true);
      const moduleWiseRights = res.data?.data?.ModuleWiseUserRights ?? [];
      const flattened = flattenPages(moduleWiseRights);
      setPages(flattened.map((p, i) => ({ ...p, srNo: i + 1 })));
    } catch (err) {
      console.error(err);
      setError('Failed to load pages');
      notify.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const filteredPages = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return pages;

    return pages.filter(
      (page) =>
        page.name.toLowerCase().includes(keyword) ||
        page.moduleName.toLowerCase().includes(keyword),
    );
  }, [pages, search]);

  const columns = useMemo(
    () => [
      {
        id: 'srNo',
        accessorFn: (row) => row.srNo,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Sr No#"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2">{row.original.srNo}</span>
        ),
        enableSorting: false,
        size: 90,
      },
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Page Name"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openEditModal(row.original)}
            className="text-[#084E92] font-medium hover:underline text-left cursor-pointer"
          >
            {row.original.name}
          </button>
        ),
        size: 280,
      },
      {
        id: 'moduleName',
        accessorFn: (row) => row.moduleName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Module Name"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-[#084E92]">{row.original.moduleName}</span>
        ),
        size: 280,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Actions"
            column={column}
            className="text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openEditModal(row.original)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-[#084E92] text-[#084E92] hover:bg-[#084E92] hover:text-white transition cursor-pointer"
            aria-label={`Edit ${row.original.name}`}
          >
            <SquarePen size={14} />
          </button>
        ),
        enableSorting: false,
        size: 100,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredPages,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Container>
      <div className="p-4 md:p-6">
        {/* Header row: title left, breadcrumb + primary action right */}
        <div className="flex justify-between items-start flex-col sm:flex-row gap-4 mb-6">
          <h1 className="text-2xl font-bold text-[#1B1B1F]">Page Master</h1>
        </div>

        {/* Search + Add Page */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-4">
          <div className="relative w-full sm:w-80 border border-[#C3C6D1] rounded-lg">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Page"
              className="w-full pl-10 py-2 outline-none rounded-lg bg-transparent"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center justify-center text-sm font-medium hover:bg-[#073e77] transition self-end sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            Add Page
          </button>
        </div>

        {/* Table */}
        <div className="w-full border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {loading && (
            <p className="p-4 text-sm text-gray-500">Loading pages...</p>
          )}
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          <DataGrid
            table={table}
            recordCount={filteredPages.length}
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

        <AddPageModal
          isOpen={showAddPage}
          onClose={closeModal}
          onSaved={fetchPages}
          initialData={editingPage}
        />
      </div>
    </Container>
  );
};

export default PageMaster;
