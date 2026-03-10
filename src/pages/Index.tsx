import { useAppStore } from '@/lib/store';
import ElevatorPanel from '@/components/ElevatorPanel';
import MetadataTicker from '@/components/MetadataTicker';
import IdeasPage from './IdeasPage';
import ProjectCreatePage from './ProjectCreatePage';
import ProjectPlanPage from './ProjectPlanPage';
import SceneStudioPage from './SceneStudioPage';
import TransitionStudioPage from './TransitionStudioPage';
import ExportPage from './ExportPage';

const PAGES = {
  ideas: IdeasPage,
  create: ProjectCreatePage,
  plan: ProjectPlanPage,
  scenes: SceneStudioPage,
  transitions: TransitionStudioPage,
  export: ExportPage,
};

export default function Index() {
  const currentStep = useAppStore((s) => s.currentStep);
  const ActivePage = PAGES[currentStep];

  return (
    <div className="flex min-h-screen bg-background">
      <ElevatorPanel />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <MetadataTicker />
        <div className="flex-1 overflow-y-auto">
          <ActivePage />
        </div>
      </div>
    </div>
  );
}
