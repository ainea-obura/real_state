"use client";

import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Building2,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getUserAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/actions/accounts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AddAccountModal from "@/features/clients/tabs/components/AddAccountModal";
import EditAccountModal from "@/features/clients/tabs/components/EditAccountModal";
import DeleteAccountModal from "@/features/clients/tabs/components/DeleteAccountModal";

interface CompanyAccountsProps {
  companyId: string;
  userId: string;
}

export interface CompanyAccountsRef {
  openAddModal: () => void;
}

const CompanyAccounts = forwardRef<CompanyAccountsRef, CompanyAccountsProps>(
  ({ companyId, userId }, ref) => {
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<any>(null);
  const queryClient = useQueryClient();

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openAddModal: () => {
      setSelectedAccount(null);
      setIsAccountModalOpen(true);
    },
  }));

  // Fetch company accounts
  const {
    data: accountsData,
    isLoading: loadingAccounts,
    error: accountsError,
  } = useQuery({
    queryKey: ["company-accounts", userId],
    queryFn: async () => {
      if (!userId) return null;
      const result = await getUserAccounts(userId);
      if (result.error) {
        throw new Error(result.message || "Failed to load accounts");
      }
      return result.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Account mutations
  const createAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      if (!userId) {
        throw new Error("User ID not found");
      }
      const result = await createAccount({
        ...accountData,
        user_id: userId,
      });
      if (result.error) {
        throw new Error(result.message || "Failed to create account");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Account created successfully!");
      queryClient.invalidateQueries({ queryKey: ["company-accounts", userId] });
      setIsAccountModalOpen(false);
      setSelectedAccount(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create account");
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!userId) {
        throw new Error("User ID not found");
      }
      const result = await updateAccount(id, {
        ...data,
        user_id: userId,
      });
      if (result.error) {
        throw new Error(result.message || "Failed to update account");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Account updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["company-accounts", userId] });
      setIsAccountModalOpen(false);
      setSelectedAccount(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update account");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      if (!userId) {
        throw new Error("User ID not found");
      }
      const result = await deleteAccount(accountId, userId);
      if (result.error) {
        throw new Error(result.message || "Failed to delete account");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Account deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["company-accounts", userId] });
      setIsDeleteModalOpen(false);
      setAccountToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  return (
    <>
      <Card className="overflow-hidden p-0">
        <CardHeader className="p-4 pt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Company Accounts
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Manage payment accounts for your company
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loadingAccounts ? (
            <div className="flex justify-center items-center py-8">
              <div className="w-6 h-6 rounded-full border-b-2 border-blue-600 animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading accounts...</span>
            </div>
          ) : accountsError ? (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load accounts: {accountsError.message}
              </AlertDescription>
            </Alert>
          ) : !accountsData?.data?.results ||
            accountsData.data.results.length === 0 ? (
            <div className="py-8 text-center">
              <CreditCard className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No accounts yet
              </h3>
              <p className="mb-4 text-gray-600">
                Add payment accounts to manage your company's transactions
              </p>
              <Button
                onClick={() => setIsAccountModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 w-4 h-4" />
                Add First Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {accountsData.data.results.map((account: any) => (
                <div
                  key={account.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200 transition-colors hover:border-blue-300"
                >
                  <div className="flex gap-4 items-center">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {account.account_type === "bank" ? (
                        <Building2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Smartphone className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex gap-2 items-center mb-1">
                        <span className="font-medium text-gray-900">
                          {account.account_name}
                        </span>
                        {account.is_default && (
                          <Badge className="text-xs text-blue-700 bg-blue-100">
                            Default
                          </Badge>
                        )}
                        {!account.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {account.account_type === "bank"
                          ? "Bank Account"
                          : "Mobile Money"}{" "}
                        • {account.account_number}
                      </div>
                      {account.bank_name && (
                        <div className="text-xs text-gray-500">
                          {account.bank_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAccount(account);
                        setIsAccountModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAccountToDelete(account);
                        setIsDeleteModalOpen(true);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Modals */}
      <AddAccountModal
        isOpen={isAccountModalOpen && !selectedAccount}
        onClose={() => {
          setIsAccountModalOpen(false);
          setSelectedAccount(null);
        }}
        onSubmit={(data) => {
          createAccountMutation.mutate(data);
        }}
        isLoading={createAccountMutation.isPending}
        userId={userId}
      />

      {selectedAccount && (
        <EditAccountModal
          isOpen={isAccountModalOpen}
          onClose={() => {
            setIsAccountModalOpen(false);
            setSelectedAccount(null);
          }}
          onSubmit={(data) => {
            updateAccountMutation.mutate({
              id: selectedAccount.id,
              data: data,
            });
          }}
          isLoading={updateAccountMutation.isPending}
          account={selectedAccount}
          userId={userId}
        />
      )}

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setAccountToDelete(null);
        }}
        onConfirm={() => {
          if (accountToDelete) {
            deleteAccountMutation.mutate(accountToDelete.id);
          }
        }}
        account={accountToDelete}
        isLoading={deleteAccountMutation.isPending}
      />
    </>
  );
});

export default CompanyAccounts;
