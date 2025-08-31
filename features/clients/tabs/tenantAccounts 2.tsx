"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, CreditCard, Smartphone, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { getUserAccounts, createAccount, updateAccount, deleteAccount } from "@/actions/accounts";
import AddAccountModal from "./components/AddAccountModal";
import EditAccountModal from "./components/EditAccountModal";
import DeleteAccountModal from "./components/DeleteAccountModal";

interface TenantAccountsProps {
  tenantId: string;
}

const TenantAccounts = ({ tenantId }: TenantAccountsProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch user accounts
  const {
    data: accountsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["userAccounts", tenantId],
    queryFn: () => getUserAccounts(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Create account mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => createAccount({ ...data, user_id: tenantId }),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.message || "Failed to create account");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["userAccounts", tenantId] });
      setIsAddModalOpen(false);
      toast.success(response.message || "Account created successfully");
    },
    onError: (error: any) => {
      console.error("Create account error:", error);
      toast.error(error.message || "Failed to create account");
    },
  });

  // Update account mutation
  const updateMutation = useMutation({
    mutationFn: ({ accountId, data }: { accountId: string; data: any }) =>
      updateAccount(accountId, { ...data, user_id: tenantId }),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.message || "Failed to update account");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["userAccounts", tenantId] });
      setIsEditModalOpen(false);
      setSelectedAccount(null);
      toast.success(response.message || "Account updated successfully");
    },
    onError: (error: any) => {
      console.error("Update account error:", error);
      toast.error(error.message || "Failed to update account");
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: (accountId: string) => deleteAccount(accountId, tenantId),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.message || "Failed to delete account");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["userAccounts", tenantId] });
      setIsDeleteModalOpen(false);
      setSelectedAccount(null);
      toast.success(response.message || "Account deleted successfully");
    },
    onError: (error: any) => {
      console.error("Delete account error:", error);
      toast.error(error.message || "Failed to delete account");
    },
  });

  const handleCreateAccount = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateAccount = (data: any) => {
    if (selectedAccount) {
      updateMutation.mutate({ accountId: selectedAccount.id, data });
    }
  };

  const handleDeleteAccount = (account: any) => {
    setSelectedAccount(account);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedAccount) {
      deleteMutation.mutate(selectedAccount.id);
    }
  };

  const handleEditAccount = (account: any) => {
    setSelectedAccount(account);
    setIsEditModalOpen(true);
  };

  // Extract accounts from the response
  const accounts = accountsResponse?.data?.data?.results || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-8 h-8 rounded-full border-b-2 animate-spin border-primary"></div>
      </div>
    );
  }

  if (error || accountsResponse?.error) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-center">
          <p className="mb-4 text-red-600">
            {accountsResponse?.message || "Failed to load accounts"}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Accounts</h2>
          <p className="text-gray-600">Manage your payment accounts</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 w-4 h-4" />
          Add Account
        </Button>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-16">
          <div className="relative mb-6">
            <div className="flex justify-center items-center w-20 h-20 bg-gradient-to-br rounded-full border from-primary/20 to-primary/10 border-primary/20">
              <CreditCard className="w-10 h-10 text-primary" />
            </div>
            <div className="flex absolute -top-1 -right-1 justify-center items-center w-6 h-6 rounded-full shadow-sm bg-primary">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">No accounts yet</h3>
          <p className="mb-6 max-w-md text-center text-muted-foreground">
            Add your first payment account to start receiving payments and manage your finances
          </p>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="shadow-sm bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Your First Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account: any) => (
            <div key={account.id} className="relative group">
              {/* Account Card */}
              <div className="relative overflow-hidden rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] group-hover:border-primary/30">
                {/* Header Section */}
                <div className="relative p-6 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      {/* Account Type Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                        account.account_type === "bank" 
                          ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700" 
                          : "bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700"
                      }`}>
                        {account.account_type === "bank" ? (
                          <Building2 className="w-6 h-6 text-white" />
                        ) : (
                          <Smartphone className="w-6 h-6 text-white" />
                        )}
                      </div>
                      
                      {/* Account Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate text-card-foreground">
                          {account.account_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {account.account_type === "bank" ? "Bank Account" : "Mobile Money"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Number */}
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
                      {account.account_type === "bank" ? "Account Number" : "Mobile Number"}
                    </p>
                    <div className="px-4 py-3 rounded-lg border bg-muted/50 border-border">
                      <p className="font-mono text-lg font-semibold text-card-foreground">
                        {account.account_number}
                      </p>
                    </div>
                  </div>
                  
                  {/* Provider Info */}
                  {account.bank_name && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
                        Provider
                      </p>
                      <div className="flex gap-3 items-center px-4 py-3 rounded-lg border bg-muted/30 border-border">
                        <div className={`w-3 h-3 rounded-full ${
                          account.account_type === "bank" ? "bg-blue-500" : "bg-emerald-500"
                        }`} />
                        <span className="font-medium text-card-foreground">{account.bank_name}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Footer with Status and Actions */}
                <div className="px-6 pb-6">
                  <div className="flex justify-between items-center">
                    {/* Status Indicators */}
                    <div className="flex gap-2 items-center">
                      {/* Active Status */}
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        account.is_active 
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                          : "bg-red-100 text-red-700 border border-red-200"
                      }`}>
                        {account.is_active ? "Active" : "Inactive"}
                      </div>
                      
                      {/* Default Badge */}
                      {account.is_default && (
                        <div className="px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full border border-amber-200">
                          Default
                        </div>
                      )}
                    </div>
                    
                    {/* Action Icons */}
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="p-2 rounded-lg transition-colors hover:bg-accent"
                        title="Edit account"
                      >
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        disabled={!account.is_active}
                        className="p-2 rounded-lg transition-colors hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete account"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-0 transition-opacity duration-300 pointer-events-none from-primary/5 group-hover:opacity-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateAccount}
        isLoading={createMutation.isPending}
        userId={tenantId}
      />

      {selectedAccount && (
        <EditAccountModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateAccount}
          isLoading={updateMutation.isPending}
          account={selectedAccount}
          userId={tenantId}
        />
      )}

      {selectedAccount && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          isLoading={deleteMutation.isPending}
          account={selectedAccount}
        />
      )}
    </div>
  );
};

export default TenantAccounts; 