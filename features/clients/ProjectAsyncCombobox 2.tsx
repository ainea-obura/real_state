import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

// You need to implement or import this API function
import { getProjects } from '@/features/projects/fetchProjects';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
}

interface ProjectsResponse {
  data: {
    results: Project[];
  };
}

interface ProjectAsyncComboboxProps {
  value: string;
  onValueChange: (id: string) => void;
  onProjectChange?: (project: Project) => void;
  className?: string;
}

const ProjectAsyncCombobox: React.FC<ProjectAsyncComboboxProps> = ({
  value,
  onValueChange,
  onProjectChange,
  className,
}) => {
  const [query, setQuery] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["projects", query],
    queryFn: () => getProjects({ search: query }),
  });

  const projects: Project[] = React.useMemo(() => {
    if (
      projectsData &&
      typeof projectsData === "object" &&
      projectsData.data &&
      Array.isArray(projectsData.data.results)
    ) {
      return projectsData.data.results;
    }
    return [];
  }, [projectsData]);

  const filteredProjects = React.useMemo(() => {
    if (!inputValue) return projects;
    const q = inputValue.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, inputValue]);

  const selectedProject = projects.find((p) => p.id === value) || null;

  React.useEffect(() => {
    if (onProjectChange && selectedProject) {
      onProjectChange(selectedProject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  // Keyboard navigation
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  React.useEffect(() => {
    if (!open) setHighlightedIndex(-1);
  }, [open, filteredProjects]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredProjects.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const p = filteredProjects[highlightedIndex];
      if (p) {
        onValueChange(p.id);
        setInputValue(p.name);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <label className="block mb-1 font-medium text-sm">Select Project</label>
      <input
        ref={inputRef}
        type="text"
        className="px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary w-full"
        placeholder={isLoading ? "Loading..." : "Search or select a project..."}
        value={inputValue || (selectedProject ? selectedProject.name : "")}
        onChange={(e) => {
          setInputValue(e.target.value);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        onKeyDown={handleInputKeyDown}
        aria-autocomplete="list"
        aria-controls="project-combobox-listbox"
        autoComplete="off"
      />
      {open && (
        <div
          id="project-combobox-listbox"
          className="z-10 absolute bg-white dark:bg-popover shadow-lg mt-1 border border-border rounded w-full max-h-60 overflow-auto"
          role="listbox"
        >
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-4 py-3 text-muted-foreground text-sm">
              No projects found
            </div>
          ) : (
            filteredProjects.map((p: Project, idx: number) => (
              <div
                key={p.id}
                role="option"
                aria-selected={value === p.id}
                className={cn(
                  "flex flex-col px-4 py-2 cursor-pointer transition-colors",
                  value === p.id &&
                    "bg-primary/10 text-primary font-semibold",
                  highlightedIndex === idx && "bg-muted"
                )}
                onMouseDown={() => {
                  onValueChange(p.id);
                  setInputValue(p.name);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <span className="text-base">{p.name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectAsyncCombobox; 