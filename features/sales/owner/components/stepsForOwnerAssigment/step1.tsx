import { Badge, CheckCircle2, Grid3X3, Home, Loader2, Search, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Project {
  id: string;
  name: string;
  type: "residential" | "commercial" | "mixed";
  location: string;
  hasBlocks: boolean;
  hasHouses: boolean;
}

interface Block {
  id: string;
  name: string;
  projectId: string;
  floors: Floor[];
}

interface Floor {
  id: string;
  name: string;
  blockId: string;
  units: Unit[];
}

interface Unit {
  id: string;
  name: string;
  floorId: string;
  type: string;
  size: string;
  price: number;
  status: "available" | "booked" | "sold";
}

interface House {
  id: string;
  name: string;
  projectId: string;
  type: string;
  size: string;
  price: number;
  status: "available" | "booked" | "sold";
}

interface SelectPropertyStepProps {
  selectedProject: Project | null;
  projectSearch: string;
  selectedBlocks: Block[];
  selectedUnits: Unit[];
  selectedHouses: House[];
  projectBlocks: Block[];
  filteredProjects: Project[];
  mockHouses: House[];
  mockBlocks: Block[];
  isLoadingProjects?: boolean;
  setValue: (field: string, value: unknown) => void;
  setProjectSearch: (value: string) => void;
  handleProjectSelect: (project: Project) => void;
}

const SelectPropertyStep = ({
  selectedProject,
  projectSearch,
  selectedBlocks,
  selectedUnits,
  selectedHouses,
  projectBlocks,
  filteredProjects,
  mockHouses,
  mockBlocks,
  isLoadingProjects = false,
  setValue,
  setProjectSearch,
  handleProjectSelect,
}: SelectPropertyStepProps) => {
  // State to track dropdown selections
  const [selectedUnitDropdown, setSelectedUnitDropdown] = useState<string>("");
  const [selectedHouseDropdown, setSelectedHouseDropdown] =
    useState<string>("");

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Search Projects</Label>
        <div className="relative">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search by project name or location..."
            value={projectSearch}
            onChange={(e) => {
              setProjectSearch(e.target.value);
            }}
            className="pl-10"
          />
          {isLoadingProjects && (
            <Loader2 className="top-1/2 right-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 animate-spin transform" />
          )}
        </div>

        {selectedProject && (
          <div className="bg-green-50 p-3 border border-green-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {selectedProject.name}
                  </h4>
                  <p className="text-gray-600 text-xs">
                    {selectedProject.location} • {selectedProject.type}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {selectedProject.hasBlocks && (
                      <Badge className="bg-green-100 px-2 py-0.5 text-green-700 text-xs">
                        <Grid3X3 className="mr-1 w-3 h-3" />
                        Multi-Block
                      </Badge>
                    )}
                    {selectedProject.hasHouses && (
                      <Badge className="bg-green-100 px-2 py-0.5 text-green-700 text-xs">
                        <Home className="mr-1 w-3 h-3" />
                        Houses
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Badge className="bg-green-600 px-2 py-1 text-white text-xs">
                  {selectedProject.hasBlocks
                    ? `${projectBlocks.length} Blocks`
                    : `${
                        mockHouses.filter(
                          (h) => h.projectId === selectedProject.id
                        ).length
                      } Houses`}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setValue("project", null);
                    setValue("blocks", []);
                    setValue("units", []);
                    setValue("houses", []);
                    setProjectSearch("");
                  }}
                  className="px-2 h-7 text-xs"
                >
                  Change Project
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Show Found Projects only when searching and no project is selected */}
      {projectSearch && !selectedProject && (
        <div className="space-y-2">
          <Label>Found Projects</Label>
          {isLoadingProjects ? (
            <div className="flex flex-col justify-center items-center py-8 text-center">
              <Loader2 className="mb-3 w-8 h-8 text-gray-400 animate-spin" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                Searching Projects...
              </h3>
              <p className="max-w-sm text-gray-500">
                Looking for projects matching &quot;{projectSearch}&quot;
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-8 text-center">
              <div className="flex justify-center items-center bg-gray-100 mb-4 rounded-full w-16 h-16">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                No Projects Found
              </h3>
              <p className="max-w-sm text-gray-500">
                No projects found matching &quot;{projectSearch}&quot;. Try
                different keywords or check back later.
              </p>
            </div>
          ) : (
            <div className="gap-3 grid grid-cols-2 max-h-40 overflow-y-auto">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className="hover:shadow-md p-3 border border-gray-200 hover:border-gray-300 rounded-lg transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {project.name}
                      </h4>
                      <p className="text-gray-600 text-xs">
                        {project.location} • {project.type}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        {project.hasBlocks && (
                          <Badge className="bg-blue-50 px-2 py-0.5 border border-blue-200 text-blue-700 text-xs">
                            <Grid3X3 className="mr-1 w-3 h-3" />
                            Multi-Block
                          </Badge>
                        )}
                        {project.hasHouses && (
                          <Badge className="bg-blue-50 px-2 py-0.5 border border-blue-200 text-blue-700 text-xs">
                            <Home className="mr-1 w-3 h-3" />
                            Houses
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="ml-2 text-right">
                      <Badge className="bg-gray-100 px-2 py-1 text-gray-700 text-xs">
                        {project.hasBlocks
                          ? `${
                              mockBlocks.filter(
                                (b) => b.projectId === project.id
                              ).length
                            } Blocks`
                          : `${
                              mockHouses.filter(
                                (h) => h.projectId === project.id
                              ).length
                            } Houses`}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show blocks if project is selected */}
      {selectedProject && selectedProject.hasBlocks && (
        <div className="space-y-3 pt-4 border-t">
          <div className="gap-4 grid grid-cols-2">
            {/* Blocks Dropdown */}
            <div className="space-y-3">
              <Label>Select Blocks</Label>
              <Select
                onValueChange={(value) => {
                  const block = projectBlocks.find((b) => b.id === value);
                  if (block) {
                    if (selectedBlocks.find((b) => b.id === block.id)) {
                      setValue(
                        "blocks",
                        selectedBlocks.filter((b) => b.id !== block.id)
                      );
                      // Also remove units from this block
                      setValue(
                        "units",
                        selectedUnits.filter((unit) => {
                          const blockHasUnit = block.floors.some((floor) =>
                            floor.units.some((u) => u.id === unit.id)
                          );
                          return !blockHasUnit;
                        })
                      );
                    } else {
                      setValue("blocks", [...selectedBlocks, block]);
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full !h-11">
                  <SelectValue
                    placeholder={
                      selectedBlocks.length === 0
                        ? "Choose blocks"
                        : selectedBlocks.length === 1
                        ? selectedBlocks[0].name
                        : `${selectedBlocks.length} blocks selected`
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projectBlocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      <div className="flex items-center space-x-2">
                        {selectedBlocks.find((b) => b.id === block.id) && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        <span>
                          {block.name} ({block.floors.length} Floors,{" "}
                          {block.floors.reduce(
                            (sum, floor) => sum + floor.units.length,
                            0
                          )}{" "}
                          Units)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Units Dropdown */}
            <div className="space-y-3">
              <Label>Select Units</Label>
              <Select
                disabled={selectedBlocks.length === 0}
                value={selectedUnitDropdown}
                onValueChange={(value) => {
                  const unit = projectBlocks
                    .flatMap((block) =>
                      block.floors.flatMap((floor) => floor.units)
                    )
                    .find((u) => u.id === value);
                  if (unit) {
                    if (selectedUnits.find((u) => u.id === unit.id)) {
                      setValue(
                        "units",
                        selectedUnits.filter((u) => u.id !== unit.id)
                      );
                      // Clear dropdown selection when unit is deselected
                      setSelectedUnitDropdown("");
                    } else {
                      setValue("units", [...selectedUnits, unit]);
                      // Clear dropdown selection after adding unit
                      setSelectedUnitDropdown("");
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full !h-11">
                  <SelectValue
                    placeholder={
                      selectedBlocks.length === 0
                        ? "Select blocks first"
                        : selectedUnits.length === 0
                        ? "Choose units"
                        : selectedUnits.length === 1
                        ? selectedUnits[0].name
                        : `${selectedUnits.length} units selected`
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {selectedBlocks.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm text-center">
                      Please select blocks first
                    </div>
                  ) : (
                    projectBlocks.map((block) => (
                      <div key={block.id}>
                        <div className="bg-gray-50 px-2 py-1.5 font-semibold text-gray-900 text-sm">
                          {block.name}
                        </div>
                        {block.floors.map((floor) => (
                          <div key={floor.id}>
                            <div className="bg-gray-25 px-2 py-1 font-medium text-gray-700 text-xs">
                              {floor.name}
                            </div>
                            {floor.units
                              .filter((unit) => unit.status === "available")
                              .map((unit) => (
                                <SelectItem
                                  key={unit.id}
                                  value={unit.id}
                                  className="pl-6"
                                >
                                  <div className="flex items-center space-x-2">
                                    {selectedUnits.find(
                                      (u) => u.id === unit.id
                                    ) && (
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    )}
                                    <span className="text-sm">{unit.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected Units Display */}
          {selectedUnits.length > 0 && (
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm">
                  Selected Units ({selectedUnits.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setValue("units", []);
                    setSelectedUnitDropdown("");
                  }}
                  className="px-2 h-7 text-xs"
                >
                  Clear All
                </Button>
              </div>

              <div className="gap-2 grid grid-cols-2">
                {selectedUnits.map((unit) => {
                  const block = projectBlocks.find((b) =>
                    b.floors.some((f) => f.units.some((u) => u.id === unit.id))
                  );
                  const floor = block?.floors.find((f) =>
                    f.units.some((u) => u.id === unit.id)
                  );

                  return (
                    <Card
                      key={unit.id}
                      className="bg-green-50 p-2 border border-green-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs truncate">
                            {unit.name}
                          </h4>
                          <p className="text-gray-600 text-xs truncate">
                            {block?.name} • {floor?.name}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {unit.type} • {unit.size}
                          </p>
                          <p className="font-semibold text-primary text-xs">
                            KES {unit.price.toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setValue(
                              "units",
                              selectedUnits.filter((u) => u.id !== unit.id)
                            )
                          }
                          className="ml-1 p-1 w-5 h-5 text-xs"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show houses if project is selected */}
      {selectedProject && selectedProject.hasHouses && (
        <div className="space-y-3 pt-4 border-t">
          <Label>Select Houses (Multiple Selection)</Label>
          <Select
            value={selectedHouseDropdown}
            onValueChange={(value) => {
              const house = mockHouses.find((h) => h.id === value);
              if (house) {
                if (selectedHouses.find((h) => h.id === house.id)) {
                  setValue(
                    "houses",
                    selectedHouses.filter((h) => h.id !== house.id)
                  );
                  // Clear dropdown selection when house is deselected
                  setSelectedHouseDropdown("");
                } else {
                  setValue("houses", [...selectedHouses, house]);
                  // Clear dropdown selection after adding house
                  setSelectedHouseDropdown("");
                }
              }
            }}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  selectedHouses.length === 0
                    ? "Choose houses to select"
                    : selectedHouses.length === 1
                    ? selectedHouses[0].name
                    : `${selectedHouses.length} houses selected`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {mockHouses
                .filter((h) => h.projectId === selectedProject.id)
                .map((house) => (
                  <SelectItem key={house.id} value={house.id}>
                    <div className="flex items-center space-x-2">
                      {selectedHouses.find((h) => h.id === house.id) && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      <span>
                        {house.name} - {house.type} (KES{" "}
                        {house.price.toLocaleString()})
                      </span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {selectedHouses.length > 0 && (
            <div className="bg-green-50 p-2 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-green-700 text-sm">
                  <span className="font-medium">
                    Selected Houses ({selectedHouses.length}):
                  </span>{" "}
                  {selectedHouses.map((h) => h.name).join(", ")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue("houses", []);
                    setSelectedHouseDropdown("");
                  }}
                  className="px-2 h-6 text-green-600 hover:text-green-700 text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectPropertyStep;
