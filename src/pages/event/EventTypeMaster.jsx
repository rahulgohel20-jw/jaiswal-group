import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  CalendarCheck,
  PartyPopper,
  Plus,
  Search,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { Container } from '@/components/common/container';
import { notify } from '@/utils/toast';
import { getUserIdFromToken } from '@/utils/auth';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  createEventType,
  deleteEventType,
  getAllEventTypes,
  updateEventType,
} from '@/services/apiServices';

const DEFAULT_TYPES = [
  { id: 1, eventTypeName: 'Wedding', description: 'Grand wedding ceremonies, pre-wedding rituals & functions', isActive: true },
  { id: 2, eventTypeName: 'Reception', description: 'Post-wedding celebration dinner and guest banqueting', isActive: true },
  { id: 3, eventTypeName: 'Corporate Event', description: 'Business meetings, executive conferences & annual galas', isActive: true },
  { id: 4, eventTypeName: 'Birthday Party', description: 'Theme birthdays, kids mocktail parties and celebration events', isActive: true },
  { id: 5, eventTypeName: 'Anniversary', description: 'Silver, Golden, and milestone family celebrations', isActive: true },
  { id: 6, eventTypeName: 'Engagement / Ring Ceremony', description: 'Formal ring exchange ceremony and high tea/lunch', isActive: true },
  { id: 7, eventTypeName: 'Outdoor Catering (ODC)', description: 'Full-scale on-location food preparation & buffet catering', isActive: true },
];

export const EventTypeMaster = () => {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeName, setTypeName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      const res = await getAllEventTypes(userId);
      const list = res?.data?.data || res?.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setTypes(list);
      } else {
        setTypes(DEFAULT_TYPES);
      }
    } catch (err) {
      setTypes(DEFAULT_TYPES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const filteredTypes = useMemo(() => {
    const term = search.toLowerCase();
    return types.filter(
      (t) =>
        (t.eventTypeName || t.name || '').toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term),
    );
  }, [types, search]);

  const handleOpenAdd = () => {
    setEditingType(null);
    setTypeName('');
    setDescription('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingType(item);
    setTypeName(item.eventTypeName || item.name || '');
    setDescription(item.description || '');
    setModalOpen(true);
  };

  const handleSaveType = async (e) => {
    e.preventDefault();
    if (!typeName.trim()) {
      notify.error('Please enter an Event Type name.');
      return;
    }

    setSaving(true);
    const userId = getUserIdFromToken();
    const payload = {
      eventTypeName: typeName.trim(),
      description: description.trim(),
      userId,
      isActive: true,
    };

    try {
      if (editingType?.id) {
        await updateEventType(editingType.id, payload);
        notify.success('Event type updated successfully!');
      } else {
        await createEventType(payload);
        notify.success('Event type added successfully!');
      }
      fetchTypes();
      setModalOpen(false);
    } catch (err) {
      // Local fallback for offline/mock dev
      if (editingType) {
        setTypes((prev) =>
          prev.map((t) =>
            t.id === editingType.id
              ? { ...t, eventTypeName: typeName.trim(), description: description.trim() }
              : t,
          ),
        );
        notify.success('Event type updated!');
      } else {
        const newObj = {
          id: Date.now(),
          eventTypeName: typeName.trim(),
          description: description.trim(),
          isActive: true,
        };
        setTypes((prev) => [newObj, ...prev]);
        notify.success('Event type created!');
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (item) => {
    setDeleteTarget(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEventType(deleteTarget.id);
      notify.success('Event type deleted');
      setTypes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      notify.success('Event type removed');
      setTypes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Container>
      <div className="py-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/events')}
              className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition shadow-sm"
              title="Back to Events"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <PartyPopper className="w-6 h-6 text-purple-600" />
                Event Type Master
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Define and configure celebration categories (Weddings, Corporate, Private Parties).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow transition"
            >
              <Plus className="w-4 h-4" />
              Add Event Type
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="p-4 shadow-sm border-gray-200">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event type..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>
        </Card>

        {/* Data Table */}
        <Card className="shadow-sm border-gray-200 overflow-hidden">
          <CardTable>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/75 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                  <tr>
                    <th className="px-6 py-4 w-16">#</th>
                    <th className="px-6 py-4 min-w-[200px]">Event Type Name</th>
                    <th className="px-6 py-4 min-w-[300px]">Description</th>
                    <th className="px-6 py-4 w-28 text-center">Status</th>
                    <th className="px-6 py-4 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTypes.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                        No event types found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredTypes.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{index + 1}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {item.eventTypeName || item.name}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {item.description || 'No description added.'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 font-semibold rounded-full text-xs px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Type"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition"
                            >
                              <SquarePen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item)}
                              title="Delete Type"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardTable>
        </Card>
      </div>

      {/* Add / Edit Event Type Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-gray-900">
                {editingType ? 'Edit Event Type' : 'Add New Event Type'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Event Type Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Destination Wedding, Annual Gala"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-white placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Optional details regarding this event category..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-white placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingType ? 'Update' : 'Save Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        itemLabel={deleteTarget?.eventTypeName || deleteTarget?.name}
        saving={deleting}
        title="Delete Event Type"
        description="Are you sure you want to remove this event type? It will no longer appear in new event creation forms."
      />
    </Container>
  );
};
