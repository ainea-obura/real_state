export interface UnitDetail {
  id: string;
  node_id: string;
  node_name: string;
  identifier: string;
  size: string;
  management_mode: string;
  sale_price: string;
  rental_price: string;
  status: string;
  description: string;
}

export interface TenantUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string | null;
  date_joined: string;
  last_login: string | null;
  is_verified: boolean;
  status: string;
  type: string;
}

export interface TenantAssignment {
  id: string;
  node_id: string;
  node: UnitDetail;
  tenant_user_id: string;
  tenant_user: TenantUser;
  contract_start: string;
  contract_end: string;
  rent_amount: string;
  commission?: string | null;
}

export interface TenantAssignmentCreateInput {
  node: string; // node id
  tenant_user: string; // user id
  contract_start: string;
  contract_end: string;
  rent_amount: string;
  commission?: string | null;
}

export interface TenantAssignmentUpdateInput {
  node?: string;
  tenant_user?: string;
  contract_start?: string;
  contract_end?: string;
  rent_amount?: string;
  commission?: string | null;
} 