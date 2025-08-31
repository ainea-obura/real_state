import { PropertyServiceCard } from "./schema";

export const mockServiceCards: PropertyServiceCard[] = [
  {
    id: "1",
    name: "Sunset Apartments - Unit 101",
    status: "active",
    thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    services: [
      { id: "s1", name: "Cleaning" },
      { id: "s2", name: "Security" },
      { id: "s3", name: "Maintenance" },
    ],
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    descendant: "Block A → Floor 1",
    project_id: "proj1",
  },
  {
    id: "2",
    name: "Palm Villas - House 7",
    status: "paused",
    thumbnail: "",
    services: [
      { id: "s4", name: "Gardening" },
    ],
    start_date: "2024-03-01",
    end_date: "2024-09-01",
    descendant: "Block B → House 7",
    project_id: "proj2",
  },
  {
    id: "3",
    name: "Downtown Lofts - Unit 305",
    status: "cancelled",
    services: [
      { id: "s5", name: "Concierge" },
      { id: "s6", name: "Laundry" },
      { id: "s7", name: "Parking" },
      { id: "s8", name: "Pool Access" },
      { id: "s9", name: "Gym" },
    ],
    start_date: undefined,
    end_date: undefined,
    descendant: "Block C → Floor 3",
    project_id: "proj3",
  },
  {
    id: "4",
    name: "Green Meadows - Unit 12B",
    status: "active",
    thumbnail: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    services: [
      { id: "s10", name: "Waste Collection" },
      { id: "s11", name: "Pest Control" },
    ],
    start_date: "2024-05-01",
    end_date: "2024-11-01",
    descendant: "Block D → Floor 2",
    project_id: "proj4",
  },
]; 