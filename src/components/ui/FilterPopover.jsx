'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Filter,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ===================== DATA ===================== */

const USERS = [
  { id: 1, name: 'Sahil', avatar: '/media/avatars/300-2.png' },
  { id: 2, name: 'Rahul', avatar: '/media/avatars/300-4.png' },
  { id: 3, name: 'John', avatar: '/media/avatars/300-3.png' },
  { id: 4, name: 'Sarah', avatar: '/media/avatars/300-1.png' },
  { id: 10, name: 'Deep', avatar: '/media/avatars/300-7.png' },
  { id: 11, name: 'Aarya', avatar: '/media/avatars/300-8.png' },
  { id: 12, name: 'Chirag', avatar: '/media/avatars/300-9.png' },
  //   { id: 13, name: 'Amee', avatar: '/media/avatars/300-10.png' },
];

const TEAMS = [
  "CEO's Office",
  "CFO's Office",
  "COO's Office",
  'Administrative Department',
  'Secretarial Services',
  'Finance Department',
  'Accounting Department',
  'Budgeting',
  'HR Department',
  'Recruitment',
  'Training and Development',
  'IT Department',
  'Systems and Network',
];

const STATUSES = [
  'Ongoing',
  'Overdue',
  'Scheduled',
  'Completed',
  'Ongoing with issue',
  'Trashed',
  'Review',
];

const PRIORITIES = ['High', 'Medium', 'Low', 'None'];

/* ===================== COMPONENT ===================== */

export default function FilterPopover({ onApplyFilter, appliedFilters }) {
  const [open, setOpen] = useState(false);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [showAllAssignees, setShowAllAssignees] = useState(false);
  const [showAllCreators, setShowAllCreators] = useState(false);

  const [assignees, setAssignees] = useState(appliedFilters?.assignees || []);
  const [creators, setCreators] = useState(appliedFilters?.creators || []);
  const [teams, setTeams] = useState(appliedFilters?.teams || []);
  const [statuses, setStatuses] = useState(appliedFilters?.statuses || []);
  const [priorities, setPriorities] = useState(
    appliedFilters?.priorities || [],
  );
  const [dueDate, setDueDate] = useState(
    appliedFilters?.dueDate || { start: '', end: '' },
  );

  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [creatorSearch, setCreatorSearch] = useState('');

  const popoverRef = useRef(null);
  const teamsPopoverRef = useRef(null);
  const assigneesModalRef = useRef(null);
  const creatorsModalRef = useRef(null);

  /* -------- Outside Click Close -------- */
  useEffect(() => {
    const handler = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        (!teamsPopoverRef.current ||
          !teamsPopoverRef.current.contains(e.target)) &&
        (!assigneesModalRef.current ||
          !assigneesModalRef.current.contains(e.target)) &&
        (!creatorsModalRef.current ||
          !creatorsModalRef.current.contains(e.target))
      ) {
        setOpen(false);
        setShowAllTeams(false);
        setShowAllAssignees(false);
        setShowAllCreators(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* -------- Helpers -------- */
  const toggleValue = (list, setList, value) => {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );
  };

  const handleApply = () => {
    onApplyFilter({
      assignees,
      creators,
      teams,
      statuses,
      priorities,
      dueDate,
    });
    setOpen(false);
    setShowAllTeams(false);
    setShowAllAssignees(false);
    setShowAllCreators(false);
  };

  const handleClear = () => {
    setAssignees([]);
    setCreators([]);
    setTeams([]);
    setStatuses([]);
    setPriorities([]);
    setDueDate({ start: '', end: '' });
    setAssigneeSearch('');
    setCreatorSearch('');

    onApplyFilter({
      assignees: [],
      creators: [],
      teams: [],
      statuses: [],
      priorities: [],
      dueDate: { start: '', end: '' },
    });
  };

  // Filter users based on search
  const filteredAssignees = USERS.filter((u) =>
    u.name.toLowerCase().includes(assigneeSearch.toLowerCase()),
  );

  const filteredCreators = USERS.filter((u) =>
    u.name.toLowerCase().includes(creatorSearch.toLowerCase()),
  );

  return (
    <div className="relative">
      {/* FILTER BUTTON */}
      <Button
        variant="ghost"
        size="md"
        onClick={() => setOpen((p) => !p)}
        className="
    gap-2
    border border-gray-300
    rounded-lg
    bg-white
    hover:bg-gray-50
    hover:border-gray-400
  "
      >
        <Filter className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Filter</span>
      </Button>

      {/* ===================== MAIN POPOVER ===================== */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-[400px] bg-white border border-gray-200 rounded-xl shadow-xl z-[100] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[350px] overflow-y-auto">
            {/* ASSIGNED TO */}
            <UserSectionWithSearch
              title="Assigned to"
              users={filteredAssignees}
              allUsers={USERS}
              selected={assignees}
              searchValue={assigneeSearch}
              onSearchChange={setAssigneeSearch}
              onToggle={(id) => toggleValue(assignees, setAssignees, id)}
              onShowAll={() => setShowAllAssignees(true)}
              searchPlaceholder="Search assigned to..."
            />

            {/* CREATED BY */}
            <UserSectionWithSearch
              title="Created by"
              users={filteredCreators}
              allUsers={USERS}
              selected={creators}
              searchValue={creatorSearch}
              onSearchChange={setCreatorSearch}
              onToggle={(id) => toggleValue(creators, setCreators, id)}
              onShowAll={() => setShowAllCreators(true)}
              searchPlaceholder="Search created by..."
            />

            {/* TEAM */}
            <Section title="Team">
              <div className="grid grid-cols-2 gap-2">
                {TEAMS.slice(0, 6).map((team) => (
                  <CheckboxItem
                    key={team}
                    label={team}
                    checked={teams.includes(team)}
                    onChange={() => toggleValue(teams, setTeams, team)}
                  />
                ))}
              </div>

              {TEAMS.length > 6 && (
                <button
                  onClick={() => setShowAllTeams(true)}
                  className="mt-2 inline-flex items-center px-3 py-1 text-sm font-medium border-2 border-dashed border-primary text-primary rounded-lg  transition-colors"
                >
                  +{TEAMS.length - 6} more
                </button>
              )}
            </Section>

            {/* STATUS */}
            <Section title="Status">
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map((s) => (
                  <CheckboxItem
                    key={s}
                    label={s}
                    checked={statuses.includes(s)}
                    onChange={() => toggleValue(statuses, setStatuses, s)}
                  />
                ))}
              </div>
            </Section>

            {/* PRIORITY */}
            <Section title="Priority">
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => (
                  <CheckboxItem
                    key={p}
                    label={p}
                    checked={priorities.includes(p)}
                    onChange={() => toggleValue(priorities, setPriorities, p)}
                  />
                ))}
              </div>
            </Section>

            {/* DUE DATE */}
            <Section title="Due Date">
              <div className="flex gap-2">
                <DateInput
                  value={dueDate.start}
                  onChange={(v) => setDueDate((d) => ({ ...d, start: v }))}
                  placeholder="Start date"
                />
                <DateInput
                  value={dueDate.end}
                  onChange={(v) => setDueDate((d) => ({ ...d, end: v }))}
                  placeholder="End date"
                />
              </div>
            </Section>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleClear}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100"
            >
              Clear all
            </button>
            <Button
              size="sm"
              className="bg-primary  text-white font-medium px-5 shadow-sm"
              onClick={handleApply}
            >
              Apply Filter
            </Button>
          </div>
        </div>
      )}

      {/* ===================== TEAM +MORE POPOVER ===================== */}
      {showAllTeams && (
        <div
          ref={teamsPopoverRef}
          className="absolute right-0 top-0 w-[300px] bg-white border border-gray-200 rounded-xl shadow-xl z-[101] overflow-hidden"
        >
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">Team</h4>
            <button
              onClick={() => setShowAllTeams(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-4 space-y-1.5">
            {TEAMS.map((team) => (
              <CheckboxItem
                key={team}
                label={team}
                checked={teams.includes(team)}
                onChange={() => toggleValue(teams, setTeams, team)}
              />
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <Button
              size="sm"
              className="w-full bg-primary text-white"
              onClick={() => setShowAllTeams(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ===================== ASSIGNEES MODAL ===================== */}
      {showAllAssignees && (
        <div
          ref={assigneesModalRef}
          className="absolute right-0 top-0 w-[280px] bg-white border border-gray-200 rounded-xl shadow-xl z-[101] overflow-hidden"
        >
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">Assigned to</h4>
            <button
              onClick={() => setShowAllAssignees(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* User List */}
          <div className="max-h-[380px] overflow-y-auto p-4">
            <div className="space-y-2">
              {filteredAssignees.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  selected={assignees.includes(user.id)}
                  onToggle={() => toggleValue(assignees, setAssignees, user.id)}
                />
              ))}
              {filteredAssignees.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No users found
                </p>
              )}
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <Button
              size="sm"
              className="w-full bg-primary  text-white"
              onClick={() => setShowAllAssignees(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ===================== CREATORS MODAL ===================== */}
      {showAllCreators && (
        <div
          ref={creatorsModalRef}
          className="absolute right-0 top-0 w-[380px] bg-white border border-gray-200 rounded-xl shadow-xl z-[101] overflow-hidden"
        >
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">Created by</h4>
            <button
              onClick={() => setShowAllCreators(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* User List */}
          <div className="max-h-[380px] overflow-y-auto p-4">
            <div className="space-y-2">
              {filteredCreators.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  selected={creators.includes(user.id)}
                  onToggle={() => toggleValue(creators, setCreators, user.id)}
                />
              ))}
              {filteredCreators.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No users found
                </p>
              )}
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <Button
              size="sm"
              className="w-full bg-primary  text-white"
              onClick={() => setShowAllCreators(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== SUB COMPONENTS ===================== */

function Section({ title, children }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 last:border-b-0">
      <h4 className="text-lg font-semibold text-gray-900 mb-2.5">{title}</h4>
      {children}
    </div>
  );
}

function UserSectionWithSearch({
  title,
  users,
  allUsers,
  selected,
  searchValue,
  onSearchChange,
  onToggle,
  onShowAll,
  searchPlaceholder,
}) {
  const displayUsers = users.slice(0);

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <h4 className="text-md font-semibold text-gray-900 mb-2.5">{title}</h4>

      {/* Search Input */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2  focus:border-transparent placeholder:text-gray-400"
        />
      </div>

      {/* User Grid */}
      <div className="grid grid-cols-3 gap-1">
        {displayUsers.map((u) => (
          <button
            key={u.id}
            onClick={() => onToggle(u.id)}
            className={`flex items-center gap-1.5 p-1  transition-all duration-200
              ${
                selected.includes(u.id)
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
          >
            <img
              src={u.avatar}
              alt={u.name}
              className="h-6 w-6 rounded-full object-cover ring-2 ring-white flex-shrink-0"
            />
            <span className="text-md font-medium text-gray-700 truncate">
              {u.name}
            </span>
          </button>
        ))}

        {/* More Button */}
        {allUsers.length > 4 && (
          <button
            onClick={onShowAll}
            className="
      h-6 w-6 
      flex items-center justify-center
      rounded-full
      border-2 border-gray-200
      hover:border-gray-300
      hover:bg-gray-50
      transition-all
    "
          >
            <MoreHorizontal className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* No results message */}
      {searchValue && users.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-3">No users found</p>
      )}
    </div>
  );
}

function UserListItem({ user, selected, onToggle }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
      />
      <img
        src={user.avatar}
        alt={user.name}
        className="h-8 w-8 rounded-full object-cover ring-2 ring-white flex-shrink-0"
      />
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
        {user.name}
      </span>
    </label>
  );
}

function CheckboxItem({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
      />
      <span className="text-xs text-gray-700 group-hover:text-gray-900 select-none">
        {label}
      </span>
    </label>
  );
}

function DateInput({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2  focus:border-transparent "
      />
    </div>
  );
}
