import { SalesDocument } from './columns';

export const sampleSalesDocuments: SalesDocument[] = [
  {
    id: "1",
    buyer: {
      name: "John Smith",
      phone: "+254 700 123 456",
      email: "john.smith@email.com",
    },
    property: {
      project: "Sunset Gardens",
      block: "A",
      floor: "3",
      unit: "301",
    },
    offerLetter: {
      documentLink: "/documents/offers/offer-1.pdf",
      dueDate: "2024-02-15",
      status: "active",
      documentName: "Offer Letter - Unit 301",
    },
    agreement: {
      documentLink: "/documents/agreements/agreement-1.pdf",
      status: "pending",
      documentName: "Sales Agreement - Unit 301",
    },
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
  },
  {
    id: "2",
    buyer: {
      name: "Sarah Johnson",
      phone: "+254 700 234 567",
      email: "sarah.johnson@email.com",
    },
    property: {
      project: "Marina Heights",
      houseName: "Beach Villa 5",
    },
    offerLetter: {
      documentLink: "/documents/offers/offer-2.pdf",
      dueDate: "2024-02-10",
      status: "accepted",
      documentName: "Offer Letter - Beach Villa 5",
    },
    agreement: {
      documentLink: "/documents/agreements/agreement-2.pdf",
      status: "signed",
      documentName: "Sales Agreement - Beach Villa 5",
    },
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-01-25T16:00:00Z",
  },
  {
    id: "3",
    buyer: {
      name: "Michael Brown",
      phone: "+254 700 345 678",
      email: "michael.brown@email.com",
    },
    property: {
      project: "City Center",
      block: "B",
      floor: "8",
      unit: "802",
    },
    offerLetter: {
      documentLink: "/documents/offers/offer-3.pdf",
      dueDate: "2024-01-30",
      status: "expired",
      documentName: "Offer Letter - Unit 802",
    },
    agreement: {
      documentLink: "/documents/agreements/agreement-3.pdf",
      status: "draft",
      documentName: "Sales Agreement - Unit 802",
    },
    createdAt: "2024-01-05T11:00:00Z",
    updatedAt: "2024-01-30T12:00:00Z",
  },
  {
    id: "4",
    buyer: {
      name: "Emily Davis",
      phone: "+254 700 456 789",
      email: "emily.davis@email.com",
    },
    property: {
      project: "Green Valley",
      block: "C",
      floor: "2",
      unit: "205",
    },
    offerLetter: {
      documentLink: "/documents/offers/offer-4.pdf",
      dueDate: "2024-02-20",
      status: "active",
      documentName: "Offer Letter - Unit 205",
    },
    agreement: {
      documentLink: "/documents/agreements/agreement-4.pdf",
      status: "pending",
      documentName: "Sales Agreement - Unit 205",
    },
    createdAt: "2024-01-20T13:00:00Z",
    updatedAt: "2024-01-22T15:30:00Z",
  },
  {
    id: "5",
    buyer: {
      name: "David Wilson",
      phone: "+254 700 567 890",
      email: "david.wilson@email.com",
    },
    property: {
      project: "Royal Palms",
      houseName: "Executive Suite 12",
    },
    offerLetter: {
      documentLink: "/documents/offers/offer-5.pdf",
      dueDate: "2024-02-05",
      status: "rejected",
      documentName: "Offer Letter - Executive Suite 12",
    },
    agreement: {
      documentLink: "/documents/agreements/agreement-5.pdf",
      status: "expired",
      documentName: "Sales Agreement - Executive Suite 12",
    },
    createdAt: "2024-01-12T08:00:00Z",
    updatedAt: "2024-01-28T10:00:00Z",
  },
];
