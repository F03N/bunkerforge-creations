import { useAppStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { buildManifest } from '@/lib/services/export-service';
import { getProviderCapability, getModeLabel } from '@/lib/services/provider-capabilities';

export default function ExportPage() {
  const { project, scenes, transitions } = useAppStore();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const capability = getProviderCapability();

  const completedScenes = scenes.filter((s) => s.status === 'completed').length;
  const completedTransitions = transitions.filter((t) => t.status === 'completed').length;

  const handleExport = async () => {
    if (!project) return;
    setExporting(true);
    try {
      // Build manifest
      const manifest = buildManifest(project, scenes, transitions);
      const manifestJson = JSON.stringify(manifest, null, 2);

      // Generate prompt text files
      const imagePrompts = scenes.map((s) => `Scene ${s.scene_number} - ${s.scene_title}\n${s.image_prompt}\n`).join('\n');
      const animPrompts = scenes.map((s) => `Scene ${s.scene_number} - ${s.scene_title}\n${s.animation_prompt}\n`).join('\n');
      const soundPrompts = scenes.map((s) => `Scene ${s.scene_number} - ${s.scene_title}\n${s.sound_prompt}\n`).join('\n');
      const summary = `Project: ${project.project_name}\nIdea: ${project.selected_idea}\nStyle: ${project.final_style}\nMood: ${project.visual_mood}\nIntensity: ${project.construction_intensity}\nFormat: Vertical 9:16 (Shorts/Reels/TikTok)\n\n${project.project_summary}`;

      const encoder = new TextEncoder();

      // Upload all files
      await Promise.all([
        supabase.storage.from('project-assets').upload(
          `${project.id}/prompts/image_prompts.txt`, encoder.encode(imagePrompts),
          { contentType: 'text/plain', upsert: true }
        ),
        supabase.storage.from('project-assets').upload(
          `${project.id}/prompts/animation_prompts.txt`, encoder.encode(animPrompts),
          { contentType: 'text/plain', upsert: true }
        ),
        supabase.storage.from('project-assets').upload(
          `${project.id}/prompts/sound_prompts.txt`, encoder.encode(soundPrompts),
          { contentType: 'text/plain', upsert: true }
        ),
        supabase.storage.from('project-assets').upload(
          `${project.id}/prompts/project_summary.txt`, encoder.encode(summary),
          { contentType: 'text/plain', upsert: true }
        ),
        supabase.storage.from('project-assets').upload(
          `${project.id}/metadata/manifest.json`, encoder.encode(manifestJson),
          { contentType: 'application/json', upsert: true }
        ),
      ]);

      // Record export
      await supabase.from('exports').insert({
        project_id: project.id,
        exported_images: completedScenes,
        exported_videos: completedTransitions,
        exported_prompts: 4,
      });

      setDone(true);
      toast.success('Export complete — all assets packaged');
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    if (!project) return;

    // Download scene images (PNG)
    scenes.forEach((s) => {
      if (s.output_image_url) downloadFile(s.output_image_url, `scene${s.scene_number}.png`);
    });

    // Download transition videos (MP4)
    transitions.forEach((t) => {
      if (t.output_video_url) downloadFile(t.output_video_url, `transition${t.transition_number}.mp4`);
    });

    // Download prompts and metadata
    const files = [
      'prompts/image_prompts.txt',
      'prompts/animation_prompts.txt',
      'prompts/sound_prompts.txt',
      'prompts/project_summary.txt',
      'metadata/manifest.json',
    ];
    files.forEach((p) => {
      const { data } = supabase.storage.from('project-assets').getPublicUrl(`${project.id}/${p}`);
      downloadFile(data.publicUrl, p.split('/').pop()!);
    });
  };

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mb-2">EXPORT</h1>
      <p className="text-sm text-muted-foreground mb-2 font-body">Download all generated assets for external assembly.</p>
      <p className="text-[10px] font-display tracking-wider text-spark mb-8">
        FORMAT: VERTICAL 9:16 — PROVIDER: {getModeLabel(capability.effectiveMode).toUpperCase()}
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="SCENE IMAGES" value={`${completedScenes}/9`} detail="PNG" />
        <StatCard label="TRANSITION VIDEOS" value={`${completedTransitions}/8`} detail="MP4" />
        <StatCard label="PROMPT + META FILES" value="5" detail="TXT / JSON" />
      </div>

      <div className="bg-slab border border-border rounded-lg p-5 mb-8 font-mono text-xs text-muted-foreground">
        <p className="text-foreground mb-3 text-sm font-display tracking-wider">DOWNLOAD PACKAGE</p>
        <div className="space-y-1 pl-2">
          <p className="text-foreground">/scenes</p>
          {scenes.map((s) => (
            <p key={s.id} className={`pl-4 ${s.output_image_url ? 'text-success' : ''}`}>
              scene{s.scene_number}.png {s.output_image_url ? '✓' : '—'}
            </p>
          ))}
          <p className="mt-2 text-foreground">/transitions</p>
          {transitions.map((t) => (
            <p key={t.id} className={`pl-4 ${t.output_video_url ? 'text-success' : ''}`}>
              transition{t.transition_number}.mp4 {t.output_video_url ? '✓' : '—'}
            </p>
          ))}
          <p className="mt-2 text-foreground">/prompts</p>
          <p className="pl-4">image_prompts.txt</p>
          <p className="pl-4">animation_prompts.txt</p>
          <p className="pl-4">sound_prompts.txt</p>
          <p className="pl-4">project_summary.txt</p>
          <p className="mt-2 text-foreground">/metadata</p>
          <p className="pl-4">manifest.json</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        {!done ? (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-4 bg-spark text-primary-foreground font-display text-sm tracking-wider rounded-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {exporting ? '[ PACKAGING ASSETS :: ... ]' : <><Download className="w-4 h-4" /> [ EXPORT PROJECT ]</>}
          </button>
        ) : (
          <>
            <div className="w-full py-4 border border-success/30 rounded-sm text-center">
              <p className="font-display text-sm tracking-wider text-success">[ EXPORT COMPLETE ]</p>
              <p className="text-xs text-muted-foreground mt-2 font-body">
                {completedScenes} images (PNG) · {completedTransitions} videos (MP4) · 5 prompt/metadata files
              </p>
            </div>
            <button
              onClick={handleDownloadAll}
              className="w-full py-3 border border-spark/30 text-spark font-display text-sm tracking-wider rounded-sm hover:bg-spark/10 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> [ DOWNLOAD ALL FILES ]
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-slab border border-border rounded-lg p-4 text-center">
      <p className="text-[10px] font-display tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-display font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-display tracking-wider text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}
