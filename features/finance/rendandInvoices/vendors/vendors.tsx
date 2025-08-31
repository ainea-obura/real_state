import { Coins, FileText, Plus, Users } from 'lucide-react';
import { useState } from 'react';

import { deleteVendor, fetchVendorStats, fetchVendorTable } from '@/actions/finance/vendor';
import { DataTable } from '@/components/datatable/data-table';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { createColumns } from './components/columns';
import { DeleteVendorModal } from './components/DeleteVendorModal';
import { VendorModal } from './components/VendorModal';
import { Vendor } from './schema/vendorSchema';

const Vendors = () => {
  // Modal state
  const [editVendor, setEditVendor] = useState<Vendor | null | undefined>(
    undefined
  ); // undefined: closed, null: create, Vendor: update
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(false);

  const queryClient = useQueryClient();

  // Fetch vendor stats
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useQuery({
    queryKey: ["vendor-stats"],
    queryFn: fetchVendorStats,
  });

  // Fetch vendor list
  const {
    data: vendorTable,
    isLoading: isTableLoading,
    isError: isTableError,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ["vendor-table"],
    queryFn: () => fetchVendorTable(),
  });

  // DataTable columns
  const columns = createColumns({
    onEdit: (vendor) => setEditVendor(vendor),
    onDelete: (vendor) => setVendorToDelete(vendor),
  });

  // Add or update vendor (stub, should call API and refetch)
  const handleVendorSubmit = async (data: {
    name: string;
    email: string;
    phone?: string;
  }) => {
    setLoading(true);
    // TODO: Call create/update API, then refetch
    setTimeout(() => {
      setEditVendor(undefined);
      setLoading(false);
      refetchVendors();
    }, 600);
  };

  // Delete vendor (stub, should call API and refetch)
  const handleDeleteVendor = async (vendor: Vendor) => {
    setLoading(true);
    try {
      if (vendor.id) {
        await deleteVendor(vendor.id);
        queryClient.invalidateQueries({ queryKey: ["vendor-table"] });
        queryClient.invalidateQueries({ queryKey: ["vendor-stats"] });
      }
      setVendorToDelete(null);
      refetchVendors();
    } catch (err) {
      // Optionally handle error (show toast, etc.)
      // eslint-disable-next-line no-console
    } finally {
      setLoading(false);
    }
  };

  // Handler for Add Vendor button
  const handleAddVendor = () => setEditVendor(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-2xl">Vendors</h1>
          <p className="text-gray-600">
            Manage your property vendors, track expenses, and keep vendor
            information up to date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate codename="add_vendors" showFallback={false}>
            <Button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
              onClick={handleAddVendor}
            >
              <Plus className="w-4 h-4" />
              Add Vendor
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={Users}
          title="Total Vendors"
          value={
            isStatsLoading
              ? "..."
              : isStatsError
              ? "-"
              : stats?.totalVendors ?? 0
          }
        />
        <FeatureCard
          title="Total Expenses"
          value={
            isStatsLoading
              ? "..."
              : isStatsError
              ? "-"
              : `${stats?.totalExpenses}`
          }
          icon={Coins}
        />
        <FeatureCard
          icon={FileText}
          title="Total Expense Records"
          value={
            isStatsLoading
              ? "..."
              : isStatsError
              ? "-"
              : stats?.totalExpenseCount ?? 0
          }
        />
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={{ data: vendorTable ?? { count: 0, results: [] } }}
        isLoading={isTableLoading}
        isError={isTableError}
        options={[]}
        tableKey="vendors"
        searchableColumnIds={["name", "email", "phone"]}
        searchableColumnsSetters={[() => {}]}
      />

      {/* Vendor Modal (Create/Update) */}
      {editVendor !== undefined &&
        (editVendor === null ? (
          <PermissionGate codename="add_vendors" showFallback={false}>
            <VendorModal
              open={true}
              onClose={() => setEditVendor(undefined)}
              initialVendor={undefined}
            />
          </PermissionGate>
        ) : (
          <PermissionGate codename="edit_vendors" showFallback={false}>
            <VendorModal
              open={true}
              onClose={() => setEditVendor(undefined)}
              initialVendor={editVendor}
            />
          </PermissionGate>
        ))}

      {/* Delete Vendor Modal */}
      <PermissionGate codename="delete_vendors" showFallback={false}>
        <DeleteVendorModal
          open={!!vendorToDelete}
          onClose={() => setVendorToDelete(null)}
          vendor={vendorToDelete}
          onDelete={handleDeleteVendor}
          loading={loading}
        />
      </PermissionGate>
    </div>
  );
};

export default Vendors;
