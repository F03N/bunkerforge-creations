import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="p-1 hover:text-spark transition-colors text-muted-foreground">
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function ProjectPlanPage() {
  const { project, scenes, setStep } = useAppStore();

  if (!project) return null;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mb-2">
        {project.selected_idea.toUpperCase()}
      </h1>
      <div className="mb-8 p-4 bg-slab border border-border rounded-lg">
        <span className="text-[10px] font-display tracking-widest text-muted-foreground">PROJECT SUMMARY</span>
        <p className="text-sm text-muted-foreground font-body mt-2 leading-relaxed">{project.project_summary}</p>
      </div>

      <div className="space-y-1">
        {scenes.map((scene, i) => (
          <motion.div key={scene.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="p-5 bg-slab border border-border rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-display text-xs tracking-wider text-spark">SCENE {scene.scene_number}</span>
                <span className="font-display text-sm font-semibold text-foreground">— {scene.scene_title}</span>
              </div>
              <div className="space-y-3">
                <PromptBlock label="TEXT-TO-IMAGE PROMPT" text={scene.image_prompt} />
                <PromptBlock label="ANIMATION PROMPT" text={scene.animation_prompt} />
                <PromptBlock label="SOUND PROMPT" text={scene.sound_prompt} />
              </div>
            </div>
            {i < scenes.length - 1 && <div className="conduit-line h-6" />}
          </motion.div>
        ))}
      </div>

      <div className="mt-8">
        <button onClick={() => setStep('scenes')} className="px-8 py-3 bg-spark text-primary-foreground font-display text-sm tracking-wider rounded-sm hover:brightness-110 transition-all">
          [ PROCEED TO SCENE STUDIO ]
        </button>
      </div>
    </div>
  );
}

function PromptBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="bg-background border border-border rounded-sm p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-display tracking-widest text-muted-foreground">{label}</span>
        <CopyButton text={text} />
      </div>
      <p className="text-xs text-muted-foreground font-body leading-relaxed">{text}</p>
    </div>
  );
}
