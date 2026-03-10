import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { WorkflowStep } from '@/lib/types';

const STEPS: { key: WorkflowStep; label: string; number: string }[] = [
  { key: 'ideas', label: 'SELECT IDEA', number: '01' },
  { key: 'create', label: 'CREATE PROJECT', number: '02' },
  { key: 'plan', label: 'PROJECT PLAN', number: '03' },
  { key: 'scenes', label: 'SCENE STUDIO', number: '04' },
  { key: 'transitions', label: 'TRANSITIONS', number: '05' },
  { key: 'export', label: 'EXPORT', number: '06' },
];

const STEP_ORDER: WorkflowStep[] = ['ideas', 'create', 'plan', 'scenes', 'transitions', 'export'];

function getStepState(step: WorkflowStep, currentStep: WorkflowStep) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);
  const stepIdx = STEP_ORDER.indexOf(step);
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'locked';
}

export default function ElevatorPanel() {
  const { currentStep, setStep, project, reset } = useAppStore();

  return (
    <div className="w-[300px] min-h-screen border-r border-border bg-sidebar flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="font-display text-sm font-bold tracking-widest text-foreground">AI BUNKER</h1>
        <p className="text-[10px] tracking-[0.2em] text-muted-foreground mt-1 font-display">TRANSFORMATION PIPELINE</p>
      </div>

      <nav className="flex-1 py-4">
        {STEPS.map((step, i) => {
          const state = getStepState(step.key, currentStep);
          const canNavigate = state === 'completed' || state === 'active';

          return (
            <div key={step.key}>
              <button
                onClick={() => canNavigate && setStep(step.key)}
                disabled={!canNavigate}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-4 text-left transition-all duration-200",
                  state === 'active' && "bg-secondary border-l-2 border-l-spark",
                  state === 'completed' && "hover:bg-secondary/50 cursor-pointer",
                  state === 'locked' && "opacity-30 cursor-not-allowed"
                )}
              >
                <span className={cn("font-display text-xs tracking-wider", state === 'active' ? "text-spark" : "text-muted-foreground")}>{step.number}</span>
                <span className={cn("font-display text-xs tracking-wider flex-1", state === 'active' ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
                {state === 'active' && <ChevronRight className="w-3 h-3 text-spark" />}
                {state === 'completed' && <span className="text-[10px] text-success font-display tracking-wider">✓</span>}
              </button>
              {i < STEPS.length - 1 && <div className={cn("conduit-line h-4 ml-[39px]", state === 'completed' && "active")} />}
            </div>
          );
        })}
      </nav>

      {project && (
        <div className="p-4 border-t border-border">
          <p className="text-[10px] tracking-wider text-muted-foreground mb-1 font-display">ACTIVE PROJECT</p>
          <p className="text-xs font-display text-foreground truncate">{project.project_name}</p>
        </div>
      )}

      <div className="p-4 border-t border-border">
        <button
          onClick={() => reset()}
          className="w-full text-[10px] tracking-wider text-muted-foreground hover:text-spark transition-colors font-display py-2 border border-border rounded-sm hover:border-spark/30"
        >
          [ NEW PROJECT ]
        </button>
      </div>
    </div>
  );
}
