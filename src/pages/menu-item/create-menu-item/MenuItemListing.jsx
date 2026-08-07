import React, { useCallback, useEffect, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import { notify } from '@/utils/toast';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router';
import { Container } from '@/components/common/container';
import {
  deleteMenuItemById,
  getAllMenuItem,
  updateMenuItemStatus,
} from '../../../services/apiServices';
import { getUserIdFromToken } from '../../../utils/auth';

const StatCard = ({ label, value, icon, tone }) => (
  <div className="bg-white border rounded-xl py-3 px-4">
    <div
      className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${tone}`}
    >
      {icon}{' '}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-black">{value}</p>
    </div>
  </div>
);

const MenuItemsListing = ({ onAddNew }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('Category Type');
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const userId = getUserIdFromToken();

  const fetchMenuItems = useCallback(async () => {
    setLoading(true);

    try {
      const res = await getAllMenuItem({
        userId,
        page,
        size,
      });

      const payload = res?.data?.data ?? {};

      const rawList = payload['Menu Item Details'] || payload.items || [];

      const list = rawList.map((item) => ({
        id: item.id,
        image: item.imagePath,
        name: item.nameEnglish,
        category: item.menuCategory?.nameEnglish,
        subCategory: item.menuSubCategory?.nameEnglish,
        price: item.price,
        sequence: item.sequence,
        status: item.isActive ? 'Active' : 'Inactive',
      }));

      setMenuItems(list);
    } catch (err) {
      console.error(err);
      setMenuItems([]);
      setError(err.msg);
    } finally {
      setLoading(false);
    }
  }, [userId, page, size]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const categoryOptions = [
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];
  const totalItems = menuItems.length;

  const activeItems = menuItems.filter(
    (item) => item.status === 'Active',
  ).length;

  const inactiveItems = menuItems.filter(
    (item) => item.status === 'Inactive',
  ).length;

  const filtered = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'All Status' || item.status === statusFilter;
    const matchesCategory =
      categoryFilter === 'Category Type' || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const openStatusConfirm = (item) => {
    setStatusTarget({
      id: item.id,
      itemLabel: item.name,
      nextStatus: item.status === 'Active' ? false : true,
      nextStatusLabel: item.status === 'Active' ? 'Inactive' : 'Active',
    });

    setShowStatusConfirm(true);
  };

  const closeStatusConfirm = () => {
    if (statusSaving) return;

    setShowStatusConfirm(false);
    setStatusTarget(null);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;

    setStatusSaving(true);

    try {
      await updateMenuItemStatus({
        id: statusTarget.id,
        isActive: statusTarget.nextStatus,
      });

      fetchMenuItems();

      setShowStatusConfirm(false);
      setStatusTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setStatusSaving(false);
    }
  };

  const openDeleteConfirm = (item) => {
    setDeleteTarget({ id: item.id, itemLabel: item.name });
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
      await deleteMenuItemById(deleteTarget.id);
      closeDeleteConfirm();
      fetchMenuItems();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <Container>
      <div className="p-4 md:p-6 text-gray-600 min-h-screen">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-1">
          Dashboard &gt; Master Data &gt;{' '}
          <span className="text-[#084E92] font-medium">Menu Items</span>
        </p>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-black">
              Menu Items Master
            </h2>
            <p className="text-sm text-gray-400 mt-1 max-w-xl">
              Manage your restaurant's menu catalog, pricing, and category
              organization in one place.
            </p>
          </div>

          <Link
            to="/menu-item/add-menu-items   "
            className="flex items-center gap-2 bg-[#084E92] text-white px-4 py-2.5 rounded-lg font-medium cursor-pointer whitespace-nowrap"
          >
            <Plus size={18} />
            Add New Item
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Items"
            value={totalItems}
            icon={<Package size={18} className="text-[#084E92]" />}
            tone="bg-blue-50"
          />
          <StatCard
            label="Active Items"
            value={activeItems}
            icon={<CheckCircle2 size={18} className="text-green-600" />}
            tone="bg-green-50"
          />
          <StatCard
            label="Inactive Items"
            value={inactiveItems}
            icon={<XCircle size={18} className="text-red-500" />}
            tone="bg-red-50"
          />
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-xl p-3 py-4 grid md:grid-cols-4 grid-cols-1 gap-5 mb-6">
          <div className="flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 bg-[#F8FAFC] col-span-2">
            <Search size={16} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item name..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <p className="border rounded-lg px-3 py-2 text-sm bg-[#F8FAFC] ">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="outline-none w-full"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </p>

          <p className="border rounded-lg px-3 py-2 text-sm bg-[#F8FAFC] ">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="outline-none w-full"
            >
              <option>Category Type</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </p>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b bg-[#F8FAFC]">
                  <th className="px-4 py-3 font-medium">S.NO</th>
                  <th className="px-4 py-3 font-medium">IMAGE</th>
                  <th className="px-4 py-3 font-medium">ITEM NAME</th>
                  <th className="px-4 py-3 font-medium">CATEGORY</th>
                  <th className="px-4 py-3 font-medium">SUB CATEGORY</th>
                  <th className="px-4 py-3 font-medium">PRICE</th>
                  <th className="px-4 py-3 font-medium">SEQ.</th>
                  <th className="px-4 py-3 font-medium">STATUS</th>
                  <th className="px-4 py-3 font-medium">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {error && (
                  <tr>
                    <td colSpan={9} className="text-red-700">
                      Failed to load Menu Items
                    </td>
                  </tr>
                )}
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={16} className="text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-black">
                        {item.name}
                      </td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3">{item.subCategory}</td>
                      <td className="px-4 py-3">${item.price.toFixed(2)}</td>
                      <td className="px-4 py-3">{item.sequence}</td>
                      <td className="px-4 py-3">
                        <label className="relative inline-flex cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.status === 'Active'}
                            onChange={() => openStatusConfirm(item)}
                            className="sr-only peer"
                          />

                          <div className=" w-11 h-6  bg-gray-300 rounded-full peer peer-checked:bg-[#084E92] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-gray-400">
                          <Link to={`/menu-item/edit-menu-item/${item.id}`}>
                            <Pencil
                              size={16}
                              className="text-[#084E92] cursor-pointer"
                            />
                          </Link>
                          <button
                            onClick={() => openDeleteConfirm(item)}
                            className="text-red-500 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      No menu items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t text-sm">
            <p className="text-gray-400">
              Showing {filtered.length} of {totalItems} entries
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer ${
                    page === n
                      ? 'bg-[#084E92] text-white'
                      : 'border text-gray-500'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(3, p + 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <StatusConfirmModal
          isOpen={showStatusConfirm}
          onClose={closeStatusConfirm}
          onConfirm={confirmStatusChange}
          itemLabel={statusTarget?.itemLabel}
          nextStatusLabel={statusTarget?.nextStatusLabel}
          saving={statusSaving}
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
  );
};

export default MenuItemsListing;
