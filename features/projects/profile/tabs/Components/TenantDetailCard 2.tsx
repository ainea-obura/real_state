import { FC } from 'react';
import { Tenant } from '../mockTenantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserIcon, HomeIcon, Building2Icon, MailIcon, PhoneIcon } from 'lucide-react';

interface TenantDetailCardProps {
  tenant: Tenant;
}

const statusColor = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  inactive: 'bg-gray-100 text-gray-600',
};

const TenantDetailCard: FC<TenantDetailCardProps> = ({ tenant }) => {
  return (
    <Card className="border-2 shadow-lg transition-all border-primary/10 hover:border-primary">
      <CardHeader className="flex flex-row gap-3 items-center pb-2">
        <div className="p-3 rounded-full bg-primary/10">
          <UserIcon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold truncate">{tenant.name}</CardTitle>
          <div className="flex gap-2 items-center mt-1">
            <Badge className={statusColor[tenant.status || 'inactive'] || ''}>
              {tenant.status || 'inactive'}
            </Badge>
            {tenant.assignedTo && (
              <Badge variant="secondary" className="flex gap-1 items-center">
                {tenant.assignedTo.type === 'unit' ? <Building2Icon className="w-4 h-4" /> : <HomeIcon className="w-4 h-4" />}
                {tenant.assignedTo.name}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        <div className="flex gap-2 items-center text-gray-700 dark:text-gray-300">
          <MailIcon className="w-4 h-4" />
          <span className="truncate">{tenant.email}</span>
        </div>
        {tenant.phone && (
          <div className="flex gap-2 items-center text-gray-700 dark:text-gray-300">
            <PhoneIcon className="w-4 h-4" />
            <span>{tenant.phone}</span>
          </div>
        )}
        {/* Action buttons can be added here, e.g., reassign, view details */}
      </CardContent>
    </Card>
  );
};

export default TenantDetailCard; 