import { Group, Permission, PermissionCategory, AppModel } from "./schema";

// Mock Groups Data
export const mockGroups: Group[] = [
  {
    id: 1,
    name: "Position_Property Manager",
    user_count: 5,
    permission_count: 24,
    is_position_group: true,
    position_name: "Property Manager",
    created_at: "2024-01-15T10:30:00Z",
    modified_at: "2024-01-15T10:30:00Z",
  },
  {
    id: 2,
    name: "Position_Accountant",
    user_count: 3,
    permission_count: 18,
    is_position_group: true,
    position_name: "Accountant",
    created_at: "2024-01-16T14:20:00Z",
    modified_at: "2024-01-16T14:20:00Z",
  },
  {
    id: 3,
    name: "Position_Staff Member",
    user_count: 12,
    permission_count: 8,
    is_position_group: true,
    position_name: "Staff Member",
    created_at: "2024-01-17T09:15:00Z",
    modified_at: "2024-01-17T09:15:00Z",
  },
  {
    id: 4,
    name: "Super Admin",
    user_count: 2,
    permission_count: 156,
    is_position_group: false,
    created_at: "2024-01-18T11:45:00Z",
    modified_at: "2024-01-18T11:45:00Z",
  },
  {
    id: 5,
    name: "Finance Team",
    user_count: 4,
    permission_count: 32,
    is_position_group: false,
    created_at: "2024-01-19T16:30:00Z",
    modified_at: "2024-01-19T16:30:00Z",
  },
  {
    id: 6,
    name: "Marketing Team",
    user_count: 3,
    permission_count: 12,
    is_position_group: false,
    created_at: "2024-01-20T13:25:00Z",
    modified_at: "2024-01-20T13:25:00Z",
  },
];

// Mock Permissions Data
export const mockPermissions: Permission[] = [
  // Properties permissions
  {
    id: 1,
    name: "Can add project detail",
    codename: "add_projectdetail",
    content_type: { id: 1, app_label: "properties", model: "projectdetail" },
  },
  {
    id: 2,
    name: "Can change project detail",
    codename: "change_projectdetail",
    content_type: { id: 1, app_label: "properties", model: "projectdetail" },
  },
  {
    id: 3,
    name: "Can delete project detail",
    codename: "delete_projectdetail",
    content_type: { id: 1, app_label: "properties", model: "projectdetail" },
  },
  {
    id: 4,
    name: "Can view project detail",
    codename: "view_projectdetail",
    content_type: { id: 1, app_label: "properties", model: "projectdetail" },
  },
  {
    id: 5,
    name: "Can add property tenant",
    codename: "add_propertytenant",
    content_type: { id: 2, app_label: "properties", model: "propertytenant" },
  },
  {
    id: 6,
    name: "Can change property tenant",
    codename: "change_propertytenant",
    content_type: { id: 2, app_label: "properties", model: "propertytenant" },
  },
  {
    id: 7,
    name: "Can delete property tenant",
    codename: "delete_propertytenant",
    content_type: { id: 2, app_label: "properties", model: "propertytenant" },
  },
  {
    id: 8,
    name: "Can view property tenant",
    codename: "view_propertytenant",
    content_type: { id: 2, app_label: "properties", model: "propertytenant" },
  },
  // Payments permissions
  {
    id: 9,
    name: "Can add invoice",
    codename: "add_invoice",
    content_type: { id: 3, app_label: "payments", model: "invoice" },
  },
  {
    id: 10,
    name: "Can change invoice",
    codename: "change_invoice",
    content_type: { id: 3, app_label: "payments", model: "invoice" },
  },
  {
    id: 11,
    name: "Can delete invoice",
    codename: "delete_invoice",
    content_type: { id: 3, app_label: "payments", model: "invoice" },
  },
  {
    id: 12,
    name: "Can view invoice",
    codename: "view_invoice",
    content_type: { id: 3, app_label: "payments", model: "invoice" },
  },
  {
    id: 13,
    name: "Can add transaction",
    codename: "add_transaction",
    content_type: { id: 4, app_label: "payments", model: "transaction" },
  },
  {
    id: 14,
    name: "Can change transaction",
    codename: "change_transaction",
    content_type: { id: 4, app_label: "payments", model: "transaction" },
  },
  {
    id: 15,
    name: "Can delete transaction",
    codename: "delete_transaction",
    content_type: { id: 4, app_label: "payments", model: "transaction" },
  },
  {
    id: 16,
    name: "Can view transaction",
    codename: "view_transaction",
    content_type: { id: 4, app_label: "payments", model: "transaction" },
  },
  // Users permissions
  {
    id: 17,
    name: "Can add user",
    codename: "add_users",
    content_type: { id: 5, app_label: "accounts", model: "users" },
  },
  {
    id: 18,
    name: "Can change user",
    codename: "change_users",
    content_type: { id: 5, app_label: "accounts", model: "users" },
  },
  {
    id: 19,
    name: "Can delete user",
    codename: "delete_users",
    content_type: { id: 5, app_label: "accounts", model: "users" },
  },
  {
    id: 20,
    name: "Can view user",
    codename: "view_users",
    content_type: { id: 5, app_label: "accounts", model: "users" },
  },
  // Documents permissions
  {
    id: 21,
    name: "Can add contract template",
    codename: "add_contracttemplate",
    content_type: { id: 6, app_label: "documents", model: "contracttemplate" },
  },
  {
    id: 22,
    name: "Can change contract template",
    codename: "change_contracttemplate",
    content_type: { id: 6, app_label: "documents", model: "contracttemplate" },
  },
  {
    id: 23,
    name: "Can delete contract template",
    codename: "delete_contracttemplate",
    content_type: { id: 6, app_label: "documents", model: "contracttemplate" },
  },
  {
    id: 24,
    name: "Can view contract template",
    codename: "view_contracttemplate",
    content_type: { id: 6, app_label: "documents", model: "contracttemplate" },
  },
];

// Mock Permission Categories
export const mockPermissionCategories: PermissionCategory[] = [
  {
    app_label: "properties",
    model: "projectdetail",
    display_name: "Project Details",
    permissions: mockPermissions.filter(p => p.content_type.model === "projectdetail"),
  },
  {
    app_label: "properties",
    model: "propertytenant",
    display_name: "Property Tenants",
    permissions: mockPermissions.filter(p => p.content_type.model === "propertytenant"),
  },
  {
    app_label: "payments",
    model: "invoice",
    display_name: "Invoices",
    permissions: mockPermissions.filter(p => p.content_type.model === "invoice"),
  },
  {
    app_label: "payments",
    model: "transaction",
    display_name: "Transactions",
    permissions: mockPermissions.filter(p => p.content_type.model === "transaction"),
  },
  {
    app_label: "accounts",
    model: "users",
    display_name: "Users",
    permissions: mockPermissions.filter(p => p.content_type.model === "users"),
  },
  {
    app_label: "documents",
    model: "contracttemplate",
    display_name: "Contract Templates",
    permissions: mockPermissions.filter(p => p.content_type.model === "contracttemplate"),
  },
];

// Mock Group Permissions (which permissions each group has)
export const mockGroupPermissions: Record<number, number[]> = {
  1: [1, 2, 4, 5, 6, 8, 12, 16, 20, 24], // Property Manager
  2: [9, 10, 12, 13, 14, 16, 20], // Accountant
  3: [4, 8, 12, 16, 20, 24], // Staff Member
  4: mockPermissions.map(p => p.id), // Super Admin - all permissions
  5: [9, 10, 12, 13, 14, 16, 20, 24], // Finance Team
  6: [4, 8, 12, 16, 20], // Marketing Team
};

// App-Model Relationship Data
export const mockAppModels: AppModel[] = [
  {
    app_label: "properties",
    app_name: "Properties",
    models: [
      { model: "projectdetail", model_name: "Project Details" },
      { model: "propertytenant", model_name: "Property Tenants" },
    ],
  },
  {
    app_label: "payments",
    app_name: "Payments",
    models: [
      { model: "invoice", model_name: "Invoices" },
      { model: "transaction", model_name: "Transactions" },
    ],
  },
  {
    app_label: "accounts",
    app_name: "Accounts",
    models: [
      { model: "users", model_name: "Users" },
    ],
  },
  {
    app_label: "documents",
    app_name: "Documents",
    models: [
      { model: "contracttemplate", model_name: "Contract Templates" },
    ],
  },
  {
    app_label: "company",
    app_name: "Company",
    models: [
      { model: "company", model_name: "Companies" },
      { model: "position", model_name: "Positions" },
    ],
  },
  {
    app_label: "reports",
    app_name: "Reports",
    models: [
      { model: "report", model_name: "Reports" },
    ],
  },
];

// App labels for filter dropdown
export const mockAppLabels = [
  { value: "properties", label: "Properties" },
  { value: "payments", label: "Payments" },
  { value: "accounts", label: "Accounts" },
  { value: "documents", label: "Documents" },
  { value: "company", label: "Company" },
  { value: "reports", label: "Reports" },
];

// Helper function to get models for a specific app
export const getModelsForApp = (appLabel: string) => {
  const appModel = mockAppModels.find(app => app.app_label === appLabel);
  return appModel ? appModel.models : [];
}; 