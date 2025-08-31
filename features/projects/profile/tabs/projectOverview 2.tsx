import { Building03Icon, FloorPlanIcon } from 'hugeicons-react';
import { CheckCircle, Layers3 } from 'lucide-react';

import FeatureCard from '@/features/property/tabs/components/featureCard';

import MapView from '../ProjectMap/MapView';
import Header from './Components/structure/header';

import type { ProjectDetail as ProjectDetailType } from "@/schema/projects/schema";

const ProjectOverview = ({
  projectData,
}: {
  projectData: ProjectDetailType;
}) => {
  return (
    <div className="flex flex-col gap-6 w-full">
      <Header title="Project Overview" description="Overview of the project" />
      {/* Feature cards at the top */}
      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mx-auto w-full max-w-5xl">
        <FeatureCard
          icon={Layers3}
          title="Project Type"
          value={
            projectData.project_type.charAt(0).toUpperCase() +
            projectData.project_type.slice(1)
          }
        />
        <FeatureCard
          icon={CheckCircle}
          title="Status"
          value={
            projectData.status.charAt(0).toUpperCase() +
            projectData.status.slice(1)
          }
        />
        <FeatureCard
          icon={Building03Icon}
          title="Blocks"
          value={projectData.structure_count.total_blocks}
        />
        <FeatureCard
          icon={FloorPlanIcon}
          title="Houses"
          value={projectData.structure_count.total_houses}
        />
      </div>

      {/* Map at the bottom */}
      <div className="relative shadow-xl border border-primary-foreground/10 rounded-2xl w-full h-[320px] sm:h-[400px] overflow-hidden">
        <MapView project={projectData} />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Project description below feature cards */}
      {projectData.description && (
        <div className="mt-4">
          <h1 className="font-medium text-primary text-lg text-left">
            Description
          </h1>
          <p className="text-gray-500 text-sm">{projectData.description}</p>
        </div>
      )}
    </div>
  );
};

export default ProjectOverview;
