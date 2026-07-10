'use client';

import { Fragment, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Eye, SquarePen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Container } from '@/components/common/container';
import FilterPopover from '../../components/ui/FilterPopover';
import SidebarModal from '../../components/ui/sidebar';
import TeamViewSidebar from './TeamViewSidebar';

const teamMemberData = [
  {
    id: 1,
    employeeCode: '7MAOTNLN',
    name: 'Haris Pathan',
    rating: 0,
    phoneNumber: '+919182002080',
    role: 'Employee',
    team: 'IT Department',
    designation: 'Frontend Developer',
    status: true,
    avatar: '/media/avatars/300-1.png',
    email: 'haris@example.com',
    outlet: 'Main Office',
  },
  {
    id: 2,
    employeeCode: '3W2G3A3Z',
    name: 'Vivek Prajapati',
    rating: 0,
    phoneNumber: '+919875202337',
    role: 'Manager',
    team: 'IT Department',
    designation: 'Backend Developer',
    status: true,
    avatar: '/media/avatars/300-2.png',
    email: 'vivek@example.com',
    outlet: 'Main Office',
  },
  {
    id: 3,
    employeeCode: 'UISKKL1V',
    name: 'Zankhna',
    rating: 0,
    phoneNumber: '+918758044668',
    role: 'Employee',
    team: 'IT Department',
    designation: 'Senior Java Developer',
    status: true,
    avatar: '/media/avatars/300-3.png',
    email: 'zankhna@example.com',
    outlet: 'Main Office',
  },
  {
    id: 4,
    employeeCode: 'OGDVXVKN',
    name: 'Keval Soni',
    rating: 0,
    phoneNumber: '+919016182082',
    role: 'Employee',
    team: 'IT Department',
    designation: 'Senior Java Developer',
    status: true,
    avatar: '/media/avatars/300-4.png',
    email: 'keval@example.com',
    outlet: 'Main Office',
  },
  {
    id: 5,
    employeeCode: 'V2PLM6BQ',
    name: 'Pratik Chandegara',
    rating: 0,
    phoneNumber: '+919510835355',
    role: 'Employee',
    team: 'IT Department',
    designation: 'Mobile Application Developer',
    status: true,
    avatar: '/media/avatars/300-5.png',
    email: 'pratik@example.com',
    outlet: 'Main Office',
  },
];

const StatusToggle = ({ status, onChange }) => (
  <Switch
    checked={status}
    onCheckedChange={onChange}
    className="data-[state=checked]:bg-[#005BA8]"
  />
);

const TeamMemberCell = ({ user }) => (
  <div className="flex items-center gap-2">
    <img
      src={user.avatar}
      alt={user.name}
      className="h-7 w-7 rounded-full object-cover"
    />
    <span className="text-sm font-medium text-foreground">{user.name}</span>
  </div>
);

export function UserManagement() {
  const router = useNavigate();
  const [teamMembers, setTeamMembers] = useState(teamMemberData);
  const [isTeamViewOpen, setIsTeamViewOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const handleAddUser = () => {
    router('/user-management/adduser');
  };

  // ── Navigate to edit with user data + isEdit flag via router state ──────────
  const handleEditUser = (user) => {
    router('/user-management/adduser', {
      state: { isEdit: true, editUserData: user },
    });
  };

  const handleStatusToggle = (userId, newStatus) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, status: newStatus } : m)),
    );
  };

  const handleDeleteUser = (userId) => {
    console.log('Delete user', userId);
  };

  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
  };

  const columns = [
    {
      id: 'srNo',
      header: () => <span>Sr. no.</span>,
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">{row.index + 1}</span>
      ),
      enableSorting: false,
    },
    {
      id: 'employeeCode',
      accessorFn: (row) => row.employeeCode,
      header: ({ column }) => (
        <DataGridColumnHeader title="Employee Code" column={column} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.employeeCode}</span>
      ),
    },
    {
      id: 'teamMember',
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataGridColumnHeader title="Team member" column={column} />
      ),
      cell: ({ row }) => <TeamMemberCell user={row.original} />,
    },
    {
      id: 'phoneNumber',
      accessorFn: (row) => row.phoneNumber,
      header: ({ column }) => (
        <DataGridColumnHeader title="Phone Number" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.phoneNumber}</span>
      ),
    },
    {
      id: 'role',
      accessorFn: (row) => row.role,
      header: ({ column }) => (
        <DataGridColumnHeader title="Role" column={column} />
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.role}</span>,
    },
    {
      id: 'team',
      accessorFn: (row) => row.team,
      header: ({ column }) => (
        <DataGridColumnHeader title="Team" column={column} />
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.team}</span>,
    },
    {
      id: 'designation',
      accessorFn: (row) => row.designation,
      header: ({ column }) => (
        <DataGridColumnHeader title="Designation" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.designation}</span>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataGridColumnHeader title="Status" column={column} />
      ),
      cell: ({ row }) => (
        <StatusToggle
          status={row.original.status}
          onChange={(checked) => handleStatusToggle(row.original.id, checked)}
        />
      ),
    },
    {
      id: 'actions',
      header: () => <span>Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditUser(row.original)}
            title="Edit User"
          >
            <SquarePen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteUser(row.original.id)}
            title="Delete User"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: teamMembers,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Fragment>
      <Container>
        <div className="mb-6 flex items-center justify-end gap-3">
          <FilterPopover onApplyFilter={handleApplyFilter} />
          <Button
            size="lg"
            className="bg-[#005BA8] hover:bg-[#005BA8] text-white gap-2"
            onClick={handleAddUser}
          >
            + Add New User
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={() => setIsTeamViewOpen(true)}
          >
            <Eye className="h-4 w-4" />
            Team User View
          </Button>
        </div>

        <DataGrid table={table} recordCount={teamMembers.length}>
          <Card>
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
      </Container>

      <SidebarModal
        isOpen={isTeamViewOpen}
        onClose={() => setIsTeamViewOpen(false)}
        title="Team-wise user view"
        width="xl"
      >
        <TeamViewSidebar teamMembers={teamMembers} />
      </SidebarModal>
    </Fragment>
  );
}