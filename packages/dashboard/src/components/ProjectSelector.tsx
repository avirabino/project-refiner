interface ProjectSelectorProps {
  projects: string[];
  selected: string;
  onChange: (project: string) => void;
}

export function ProjectSelector({ projects, selected, onChange }: ProjectSelectorProps) {
  return (
    <select
      data-testid="project-selector"
      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
      value={selected}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All projects</option>
      {projects.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
