import { RentalUnit } from "./schema";

export interface LocationNode {
  block: string;
  floor: string;
}

export interface RentalUnitExtended extends RentalUnit {
  project: string;
  locationNode: LocationNode;
  thumbnail?: string;
}

export const mockRentals: RentalUnitExtended[] = [
  {
    id: "1",
    name: "Sunset Villa Apt 101",
    type: "Apartment",
    status: "Rented",
    rental_price: 2200,
    size: "120 sqm",
    tenant: { id: "t1", name: "Sarah Johnson", contact: "sarah@email.com" },
    agent: { id: "a1", name: "Agent Smith", contact: "smith@agency.com" },
    rental_start: "2024-04-01",
    rental_end: "2025-03-31",
    identifier: "APT-101",
    descendants: [
      { id: "d1", name: "Room 1", type: "Bedroom" },
      { id: "d2", name: "Room 2", type: "Bedroom" },
    ],
    invoices: [
      { id: "inv1", amount: 2200, due_date: "2024-04-01", status: "Paid" },
      { id: "inv2", amount: 2200, due_date: "2024-05-01", status: "Unpaid" },
    ],
    payments: [
      { id: "pay1", amount: 2200, date: "2024-04-01", method: "Bank Transfer" },
    ],
    project: "Sunset Villas",
    locationNode: { block: "A", floor: "1" },
    thumbnail: "/public/images/building-nav.jpg",
  },
  {
    id: "2",
    name: "Downtown Loft 2B",
    type: "Loft",
    status: "Rented",
    rental_price: 1800,
    size: "85 sqm",
    tenant: { id: "t2", name: "Michael Chen", contact: "michael@email.com" },
    agent: null,
    rental_start: "2024-03-15",
    rental_end: "2025-03-14",
    identifier: "LOFT-2B",
    descendants: [],
    invoices: [
      { id: "inv3", amount: 1800, due_date: "2024-03-15", status: "Paid" },
      { id: "inv4", amount: 1800, due_date: "2024-04-15", status: "Paid" },
    ],
    payments: [
      { id: "pay2", amount: 1800, date: "2024-03-15", method: "Credit Card" },
      { id: "pay3", amount: 1800, date: "2024-04-15", method: "Credit Card" },
    ],
    project: "Downtown Lofts",
    locationNode: { block: "B", floor: "11" },
    thumbnail: "",
  },
  {
    id: "3",
    name: "Greenfield House 5",
    type: "House",
    status: "Available",
    rental_price: 3500,
    size: "200 sqm",
    tenant: { id: "t3", name: "Emily Davis", contact: "emily@email.com" },
    agent: null,
    rental_start: "2024-02-01",
    rental_end: "2025-01-31",
    identifier: "HOUSE-5",
    descendants: [
      { id: "d3", name: "Main House", type: "House" },
      { id: "d4", name: "Guest House", type: "House" },
    ],
    invoices: [],
    payments: [],
    project: "Greenfield Estate",
    locationNode: { block: "C", floor: "2" },
    thumbnail: "/public/images/bg-circle.svg",
  },
  ...Array.from({ length: 17 }, (_, i) => {
    const idx = i + 4;
    return {
      id: idx.toString(),
      name: `Project Unit ${idx}`,
      type: ["Apartment", "Loft", "House", "Condo"][idx % 4],
      status: idx % 3 === 0 ? "Available" : "Rented",
      rental_price: 1500 + (idx % 5) * 500,
      size: `${80 + (idx % 4) * 20} sqm`,
      tenant: { id: `t${idx}`, name: `Tenant ${idx}`, contact: `tenant${idx}@email.com` },
      agent: idx % 2 === 0 ? { id: `a${idx}`, name: `Agent ${idx}`, contact: `agent${idx}@agency.com` } : null,
      rental_start: `2024-0${(idx % 9) + 1}-01`,
      rental_end: `2025-0${(idx % 9) + 1}-01`,
      identifier: `UNIT-${idx}`,
      descendants: [],
      invoices: [],
      payments: [],
      project: ["Sunset Villas", "Downtown Lofts", "Greenfield Estate", "Riverside Condos"][idx % 4],
      locationNode: {
        block: String.fromCharCode(65 + (idx % 4)),
        floor: `${(idx % 15) + 1}`,
      },
      thumbnail: idx % 4 === 0 ? "/public/images/building-nav.jpg" : idx % 4 === 1 ? "" : idx % 4 === 2 ? "/public/images/bg-circle.svg" : "",
    };
  }),
]; 