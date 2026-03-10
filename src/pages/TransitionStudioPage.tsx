import { useAppStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { RefreshCw, Info } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getProviderCapability, getModeLabel, getModeDescription } from '@/lib/services/provider-capabilities';

export default function TransitionStudioPage() {
  const { scenes, transitions, project, updateTransition, setStep } = useAppStore();
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [showProviderInfo, setShowProviderInfo] = useState(false);
  const capability = getProviderCapability();

  const allScenesComplete = scenes.every((s) => s.status === 'completed');

  const handleGenerate = async (transitionId: string) => {
    if (!project) return;

    const t = transitions.find((tr) => tr.id === transitionId);
    if (!t) return;

    // Validate both scenes have images
    const fromScene = scenes.find((s) => s.scene_number === t.from_scene);
    const toScene = scenes.find((s) => s.scene_number === t.to_scene);

    if (!fromScene?.output_image_url) {
      toast.error(`Scene ${t.from_scene} must be generated first`);
      return;
    }
    if (!toScene?.output_image_url) {
      toast.error(`Scene ${t.to_scene} must be generated first`);
      return;
    }

    setGeneratingIds((prev) => new Set(prev).add(transitionId));
    updateTransition(transitionId, { status: 'generating' });

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { transitionId, projectId: project.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      updateTransition(transitionId, {
        status: 'completed',
        output_video_url: data.transition.output_video_url,
        start_image_url: data.transition.start_image_url,
        end_image_url: data.transition.end_image_url,
      });
      toast.success(`Transition ${data.transition.transition_number} generated (${getModeLabel(capability.effectiveMode)})`);
    } catch (err: any) {
      console.error('Transition generation error:', err);
      updateTransition(transitionId, { status: 'failed' });
      toast.error(err.message || 'Failed to generate transition');
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(transitionId);
        return next;
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mb-2">
        TRANSITION STUDIO
      </h1>
      <p className="text-sm text-muted-foreground mb-4 font-body">
        Generate transition videos between consecutive scenes. Each transition uses the start scene image as the exact source frame.
      </p>

      {/* Provider capability info */}
      <button
        onClick={() => setShowProviderInfo(!showProviderInfo)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-spark transition-colors mb-4 font-display tracking-wider"
      >
        <Info className="w-3.5 h-3.5" />
        PROVIDER MODE: {getModeLabel(capability.effectiveMode).toUpperCase()}
      </button>

      {showProviderInfo && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 bg-slab border border-border rounded-lg">
          <p className="text-[10px] font-display tracking-widest text-muted-foreground mb-2">PROVIDER CAPABILITIES</p>
          <div className="space-y-1 text-xs font-body text-muted-foreground">
            <p><span className="text-foreground">Provider:</span> {capability.provider} — {capability.model}</p>
            <p><span className="text-foreground">Start Frame:</span> {capability.supportsStartFrame ? '✓ Supported' : '✗ Not supported'}</p>
            <p><span className="text-foreground">End Frame Keyframe:</span> {capability.supportsEndFrame ? '✓ Supported' : '✗ Not supported (prompt-guided only)'}</p>
            <p><span className="text-foreground">Effective Mode:</span> {getModeLabel(capability.effectiveMode)}</p>
            <p className="mt-2 text-muted-foreground/80 italic">{getModeDescription(capability.effectiveMode)}</p>
          </div>
        </motion.div>
      )}

      {!allScenesComplete && (
        <div className="mb-6 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
          <p className="text-xs font-display tracking-wider text-destructive">
            ⚠ GENERATE ALL SCENE IMAGES FIRST
          </p>
          <p className="text-xs text-muted-foreground font-body mt-1">
            All 9 scenes must be completed before generating transition videos.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {transitions.map((t, i) => {
          const fromScene = scenes.find((s) => s.scene_number === t.from_scene);
          const toScene = scenes.find((s) => s.scene_number === t.to_scene);
          const isGenerating = generatingIds.has(t.id) || t.status === 'generating';
          const canGenerate = !!fromScene?.output_image_url && !!toScene?.output_image_url;

          return (
            <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border border-border rounded-lg bg-slab p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="font-display text-xs tracking-wider text-spark">TRANSITION {t.transition_number}</span>
                  <span className="text-[10px] font-display tracking-wider text-muted-foreground px-2 py-0.5 border border-border rounded-sm">
                    {getModeLabel(capability.effectiveMode).toUpperCase()}
                  </span>
                </div>
                <StatusBadge status={t.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-display tracking-widest text-muted-foreground">START FRAME — SCENE {t.from_scene}</span>
                  <div className="aspect-[9/16] bg-background border border-border rounded-sm flex items-center justify-center overflow-hidden">
                    {fromScene?.output_image_url ? (
                      <img src={fromScene.output_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-display text-muted-foreground">{fromScene?.scene_title || 'MISSING'}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  {t.output_video_url ? (
                    <div className="aspect-[9/16] w-full bg-background border border-success/30 rounded-sm flex items-center justify-center overflow-hidden">
                      <video src={t.output_video_url} controls loop muted playsInline className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="h-px w-8 bg-border" />
                      <span className="text-[10px] font-display tracking-wider">VIDEO</span>
                      <div className="h-px w-8 bg-border" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-display tracking-widest text-muted-foreground">
                    END TARGET — SCENE {t.to_scene}
                    {!capability.supportsEndFrame && ' (GUIDED)'}
                  </span>
                  <div className="aspect-[9/16] bg-background border border-border rounded-sm flex items-center justify-center overflow-hidden">
                    {toScene?.output_image_url ? (
                      <img src={toScene.output_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-display text-muted-foreground">{toScene?.scene_title || 'MISSING'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-background border border-border rounded-sm p-3 mb-4">
                <span className="text-[10px] font-display tracking-widest text-muted-foreground">ANIMATION PROMPT</span>
                <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">{t.animation_prompt}</p>
              </div>

              <div className="flex gap-2">
                {!isGenerating && (
                  <button
                    onClick={() => handleGenerate(t.id)}
                    disabled={!canGenerate}
                    className={cn(
                      "px-4 py-2 font-display text-xs tracking-wider rounded-sm transition-all",
                      t.status === 'completed'
                        ? "border border-border text-muted-foreground hover:border-spark/30 hover:text-spark"
                        : "bg-spark text-primary-foreground hover:brightness-110",
                      !canGenerate && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {t.status === 'completed' ? (
                      <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> REGENERATE</span>
                    ) : '[ GENERATE VIDEO ]'}
                  </button>
                )}
                {isGenerating && (
                  <div className="px-4 py-2 border border-spark/30 rounded-sm font-display text-xs tracking-wider text-spark animate-pulse-amber">
                    [ RENDERING VIDEO :: ... ]
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8">
        <button onClick={() => setStep('export')} className="px-8 py-3 bg-spark text-primary-foreground font-display text-sm tracking-wider rounded-sm hover:brightness-110 transition-all">
          [ PROCEED TO EXPORT ]
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { text: string; cls: string }> = {
    pending: { text: 'PENDING', cls: 'text-muted-foreground border-border' },
    generating: { text: 'RENDERING VIDEO', cls: 'text-spark border-spark/30 animate-pulse-amber' },
    completed: { text: 'VIDEO READY', cls: 'text-success border-success/30' },
    failed: { text: 'FAILED', cls: 'text-destructive border-destructive/30' },
  };
  const c = config[status] || config.pending;
  return <span className={cn("status-badge", c.cls)}>[ {c.text} ]</span>;
}
