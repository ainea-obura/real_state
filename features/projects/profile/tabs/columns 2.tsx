import { ColumnDef } from '@tanstack/react-table';
import { Tenant } from './mockTenantData';
import { Badge } from '@/components/ui/badge';
import { Building2, Home, UserCheck, UserMinus } from 'lucide-react';

export const tenantColumns: ColumnDef<Tenant>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <span>{row.original.email}</span>,
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => <span>{row.original.phone || '-'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="outline" className="capitalize">
          {status === 'active' && <UserCheck className="w-4 h-4 mr-1 text-green-600 inline" />}
          {status === 'pending' && <UserMinus className="w-4 h-4 mr-1 text-yellow-600 inline" />}
          {status === 'inactive' && <UserMinus className="w-4 h-4 mr-1 text-gray-400 inline" />}
          {status || '-'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assignment',
    cell: ({ row }) => {
      const assigned = row.original.assignedTo;
      if (!assigned) return <span className="text-gray-400">Unassigned</span>;
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          {assigned.type === 'unit' ? <Building2 className="w-4 h-4" /> : <Home className="w-4 h-4" />}
          {assigned.name}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: () => <span className="text-primary cursor-pointer">...</span>,
    enableSorting: false,
    enableHiding: false,
  },
]; 