import { Building2, Factory, Grid, Hotel, Store } from 'lucide-react';

import type { LucideIcon } from "lucide-react";

// 1️⃣ Master tuple of type values
export const projectTypeValues = [
  "residential",
  "commercial",
  "mixed",
  "industrial",
  "hospitality",
] as const;

// 2️⃣ Export TS union for use across your app
export type ProjectType = (typeof projectTypeValues)[number];

// 3️⃣ Metadata for labels & icons
const projectTypeMeta: Record<
  ProjectType,
  { label: string; icon: LucideIcon }
> = {
  residential: { label: "Residential", icon: Building2 },
  commercial: { label: "Commercial", icon: Store },
  mixed: { label: "Mixed-Use", icon: Grid },
  industrial: { label: "Industrial", icon: Factory },
  hospitality: { label: "Hospitality", icon: Hotel },
};

// 4️⃣ Derive UI array automatically
export const ProjectTypes = projectTypeValues.map((value) => ({
  value,
  label: projectTypeMeta[value].label,
  icon: projectTypeMeta[value].icon,
})) as {
  readonly value: ProjectType;
  readonly label: string;
  readonly icon: LucideIcon;
}[];
