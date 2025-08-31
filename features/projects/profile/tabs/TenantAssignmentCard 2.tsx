import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Phone, Trash2, UserPlus, Building2, Home } from "lucide-react";
import { FC } from "react";
import { TenantAssignment } from './mockTenantData';
import { PermissionGate } from '@/components/PermissionGate';

interface TenantAssignmentCardProps {
  assignment: TenantAssignment;
  onDelete: (id: string) => void;
  onVacate: (id: string) => void;
  price?: string;
  agent?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

const TenantAssignmentCard: FC<TenantAssignmentCardProps> = ({ assignment, onDelete, onVacate, price, agent }) => {
  // Determine status for the status chip
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const contractEnd = assignment.contract_end ? new Date(assignment.contract_end) : null;
  const isActive = !contractEnd || contractEnd >= today;
  const statusText = isActive ? 'Active' : 'Inactive';
  const statusChipColor = isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  
  return (
    <div className={`flex flex-col gap-4 p-6 w-full h-full bg-gray-50 rounded-xl border transition-all duration-300 ease-in-out cursor-pointer hover:bg-primary/10 min-h-36 dark:bg-gray-900`}>
      {/* Header: Tenant Name + Status + Actions */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold leading-tight text-gray-900 break-words dark:text-gray-100">
            {assignment.tenant_user.first_name} {assignment.tenant_user.last_name}
          </h3>
          <div className="flex gap-2 items-center mt-1">
            <Badge className={`text-xs font-medium ${statusChipColor}`}>
              {statusText}
            </Badge>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2 ml-3">
          {isActive && (
            <button
              aria-label="Vacate tenant"
              className="p-2 text-gray-500 rounded-lg transition-colors hover:text-orange-600 hover:bg-orange-50"
              onClick={() => onVacate(assignment.id)}
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
          <PermissionGate codename="delete_tenant_assignment">
            <button
              aria-label="Delete tenant assignment"
              className="p-2 text-gray-500 rounded-lg transition-colors hover:text-red-600 hover:bg-red-50"
              onClick={() => onDelete(assignment.id)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Tenant Contact Info */}
      <div className="space-y-2">
        <div className="flex gap-2 items-center text-sm text-gray-600 dark:text-gray-400">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="truncate">{assignment.tenant_user.email}</span>
        </div>
        {assignment.tenant_user.phone && (
          <div className="flex gap-2 items-center text-sm text-gray-600 dark:text-gray-400">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{assignment.tenant_user.phone}</span>
          </div>
        )}
      </div>

      {/* Property Assignment Info - Grouped together */}
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="space-y-2">
              {/* Property ID with tag/pill style */}
              <Badge variant="secondary" className="flex gap-2 items-center px-3 py-2 text-sm font-medium">
                {assignment.node.node_type === 'UNIT' ? <Building2 className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                {assignment.node.name}
              </Badge>
              
              {/* Dates */}
              <div className="flex gap-2 items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {assignment.contract_start}
                  </span>
                  <span className="text-xs text-gray-500">
                    to {assignment.contract_end || 'Ongoing'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Rent amount - Bold and right-aligned */}
          {price && (
            <div className="flex-shrink-0 text-right">
              <div className="mb-1 text-xs font-medium text-gray-500 uppercase">Rent</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {price}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent Info - Subtle divider and smaller section */}
      {agent && (
        <>
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Agent</div>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2 items-center">
                <UserPlus className="flex-shrink-0 w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-700 break-words dark:text-gray-300">
                  {agent.first_name} {agent.last_name}
                </span>
              </div>
              <div className="flex gap-2 items-center text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{agent.email}</span>
              </div>
              {agent.phone && (
                <div className="flex gap-2 items-center text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{agent.phone}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TenantAssignmentCard; 