import { Document } from './documentTypes';

export const mockDocuments: Document[] = [
  {
    id: "1",
    title: "Lease Agreement",
    description: "Signed lease agreement for unit 101",
    category: "contract",
    uploadedBy: "John Doe",
    createdAt: "2024-05-01",
    url: "/docs/lease-agreement.pdf",
  },
  {
    id: "2",
    title: "ID Proof",
    description: "Tenant government-issued ID",
    category: "id",
    uploadedBy: "Jane Smith",
    createdAt: "2024-05-03",
    url: "/docs/id-proof.pdf",
  },
  {
    id: "3",
    title: "Maintenance Contract",
    description: "Annual maintenance contract",
    category: "agreement",
    uploadedBy: "Admin",
    createdAt: "2024-04-20",
    url: "/docs/maintenance-contract.pdf",
  },
];
