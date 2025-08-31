"use client";
import { TenantAssignment } from "./types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LucideEdit, LucideTrash2 } from "lucide-react";

interface TenantAssignmentTableProps {
  assignments: TenantAssignment[];
  onEdit: (assignment: TenantAssignment) => void;
  onDelete: (assignment: TenantAssignment) => void;
}

export const TenantAssignmentTable = ({ assignments, onEdit, onDelete }: TenantAssignmentTableProps) => {
  if (!assignments || assignments.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No tenant assignments found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full" aria-label="Tenant Assignments Table" role="table" tabIndex={0}>
        <TableHeader>
          <TableRow>
            <TableHead>Unit</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>Rent</TableHead>
            <TableHead>Contract Start</TableHead>
            <TableHead>Contract End</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <div className="font-medium">{a.node?.node_name} ({a.node?.identifier})</div>
                <div className="text-xs text-muted-foreground">{a.node?.size} | {a.node?.management_mode}</div>
                <div className="text-xs text-muted-foreground">Status: {a.node?.status}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{a.tenant_user?.first_name} {a.tenant_user?.last_name}</div>
                <div className="text-xs text-muted-foreground">{a.tenant_user?.email}</div>
                <div className="text-xs text-muted-foreground">{a.tenant_user?.phone}</div>
              </TableCell>
              <TableCell>{a.rent_amount}</TableCell>
              <TableCell>{a.contract_start}</TableCell>
              <TableCell>{a.contract_end}</TableCell>
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit assignment"
                  tabIndex={0}
                  role="button"
                  onClick={() => onEdit(a)}
                  className="mr-2"
                >
                  <LucideEdit className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  aria-label="Delete assignment"
                  tabIndex={0}
                  role="button"
                  onClick={() => onDelete(a)}
                >
                  <LucideTrash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 