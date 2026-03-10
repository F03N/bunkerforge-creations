import { useAppStore } from '@/lib/store';

export default function MetadataTicker() {
  const project = useAppStore((s) => s.project);
  if (!project) return null;

  return (
    <div className="metadata-ticker border-border">
      <div>
        <span className="label">Project </span>
        <span className="value">{project.project_name}</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div>
        <span className="label">Mood </span>
        <span className="value">{project.visual_mood}</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div>
        <span className="label">Style </span>
        <span className="value">{project.final_style}</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div>
        <span className="label">Intensity </span>
        <span className="value">{project.construction_intensity}</span>
      </div>
    </div>
  );
}
