import { useAppStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1.5 border border-border rounded-sm hover:border-spark/30 transition-colors text-muted-foreground hover:text-spark"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function SceneStudioPage() {
  const { scenes, project, updateScene, setStep } = useAppStore();
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const handleGenerate = async (sceneId: string, sceneNumber: number) => {
    if (!project) return;

    // Check dependency
    if (sceneNumber > 1) {
      const prev = scenes.find((s) => s.scene_number === sceneNumber - 1);
      if (prev?.status !== 'completed') {
        toast.error('Previous scene must be completed first');
        return;
      }
    }

    setGeneratingIds((prev) => new Set(prev).add(sceneId));
    updateScene(sceneId, { status: 'generating' });

    try {
      const { data, error } = await supabase.functions.invoke('generate-scene-image', {
        body: { sceneId, projectId: project.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      updateScene(sceneId, {
        status: 'completed',
        output_image_url: data.scene.output_image_url,
      });

      // Update next scene's reference
      const nextScene = scenes.find((s) => s.scene_number === sceneNumber + 1);
      if (nextScene) {
        updateScene(nextScene.id, { reference_image_url: data.scene.output_image_url });
      }

      toast.success(`Scene ${sceneNumber} generated`);
    } catch (err: any) {
      console.error('Scene generation error:', err);
      updateScene(sceneId, { status: 'failed' });
      toast.error(err.message || 'Failed to generate scene');
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    }
  };

  const canGenerate = (sceneNumber: number) => {
    if (sceneNumber === 1) return true;
    const prev = scenes.find((s) => s.scene_number === sceneNumber - 1);
    return prev?.status === 'completed';
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mb-2">
        SCENE STUDIO
      </h1>
      <p className="text-sm text-muted-foreground mb-8 font-body">
        Generate scene images sequentially. Each scene depends on the previous.
      </p>

      <div className="space-y-0">
        {scenes.map((scene, i) => {
          const locked = !canGenerate(scene.scene_number) && scene.status === 'pending';
          const isGenerating = generatingIds.has(scene.id) || scene.status === 'generating';
          const prevScene = scenes.find((s) => s.scene_number === scene.scene_number - 1);

          return (
            <motion.div key={scene.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <div className={cn("border border-border rounded-lg bg-slab p-5 transition-all", locked && "scene-locked")}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xs tracking-wider text-spark">SCENE {scene.scene_number}</span>
                    <span className="font-display text-sm font-semibold text-foreground">— {scene.scene_title}</span>
                  </div>
                  <StatusBadge status={scene.status} />
                </div>

                <div className="bg-background border border-border rounded-sm p-3 mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-display tracking-widest text-muted-foreground">TEXT-TO-IMAGE PROMPT</span>
                    <CopyBtn text={scene.image_prompt} />
                  </div>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">{scene.image_prompt}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="aspect-video bg-background border border-border rounded-sm flex items-center justify-center overflow-hidden">
                    {prevScene?.output_image_url ? (
                      <img src={prevScene.output_image_url} alt="Reference" className="w-full h-full object-cover rounded-sm" />
                    ) : (
                      <span className="text-[10px] font-display tracking-wider text-muted-foreground">
                        {scene.scene_number === 1 ? 'NO REFERENCE' : 'AWAITING PREV SCENE'}
                      </span>
                    )}
                  </div>
                  <div className="aspect-video bg-background border border-border rounded-sm flex items-center justify-center overflow-hidden">
                    {scene.output_image_url ? (
                      <img src={scene.output_image_url} alt={`Scene ${scene.scene_number}`} className="w-full h-full object-cover rounded-sm" />
                    ) : (
                      <span className="text-[10px] font-display tracking-wider text-muted-foreground">
                        {isGenerating ? '[ RENDERING ]' : 'NOT GENERATED'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isGenerating && (
                    <button
                      onClick={() => handleGenerate(scene.id, scene.scene_number)}
                      disabled={locked}
                      className={cn(
                        "px-4 py-2 font-display text-xs tracking-wider rounded-sm transition-all",
                        scene.status === 'completed'
                          ? "border border-border text-muted-foreground hover:border-spark/30 hover:text-spark"
                          : "bg-spark text-primary-foreground hover:brightness-110",
                        locked && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      {scene.status === 'completed' ? (
                        <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> REGENERATE</span>
                      ) : '[ GENERATE ]'}
                    </button>
                  )}
                  {isGenerating && (
                    <div className="px-4 py-2 border border-spark/30 rounded-sm font-display text-xs tracking-wider text-spark animate-pulse-amber">
                      [ RENDERING :: ... ]
                    </div>
                  )}
                </div>
              </div>

              {i < scenes.length - 1 && (
                <div className={cn("conduit-line h-8", scene.status === 'completed' && "active")} />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8">
        <button onClick={() => setStep('transitions')} className="px-8 py-3 bg-spark text-primary-foreground font-display text-sm tracking-wider rounded-sm hover:brightness-110 transition-all">
          [ PROCEED TO TRANSITIONS ]
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { text: string; cls: string }> = {
    pending: { text: 'PENDING', cls: 'text-muted-foreground border-border' },
    generating: { text: 'RENDERING', cls: 'text-spark border-spark/30 animate-pulse-amber' },
    completed: { text: 'ASSET SECURED', cls: 'text-success border-success/30' },
    failed: { text: 'FAILED', cls: 'text-destructive border-destructive/30' },
  };
  const c = config[status] || config.pending;
  return <span className={cn("status-badge", c.cls)}>[ {c.text} ]</span>;
}
