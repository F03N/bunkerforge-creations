import { useAppStore } from '@/lib/store';
import { BUNKER_IDEAS } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function IdeasPage() {
  const { selectedIdeaId, selectIdea, setStep } = useAppStore();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          SELECT BUNKER IDEA
        </h1>
        <p className="text-sm text-muted-foreground mt-2 font-body">
          Choose one concept to begin your transformation pipeline.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-5xl">
        {BUNKER_IDEAS.map((idea, i) => (
          <motion.button
            key={idea.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => selectIdea(idea.id)}
            className={cn(
              "relative aspect-video rounded-lg border text-left p-6 transition-all duration-200 flex flex-col justify-end",
              "bg-slab hover:bg-secondary",
              selectedIdeaId === idea.id
                ? "border-spark ring-1 ring-spark/20"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <span className="absolute top-4 left-4 font-display text-[10px] tracking-widest text-muted-foreground">
              {String(idea.id).padStart(2, '0')}
            </span>
            {selectedIdeaId === idea.id && (
              <span className="absolute top-4 right-4 text-[10px] font-display tracking-wider text-spark">
                [ SELECTED ]
              </span>
            )}
            <h3 className="font-display text-sm font-semibold text-foreground mb-1">
              {idea.title}
            </h3>
            <p className="text-xs text-muted-foreground font-body leading-relaxed">
              {idea.description}
            </p>
          </motion.button>
        ))}
      </div>

      {selectedIdeaId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8"
        >
          <button
            onClick={() => setStep('create')}
            className="px-8 py-3 bg-spark text-primary-foreground font-display text-sm tracking-wider rounded-sm hover:brightness-110 transition-all"
          >
            [ PROCEED TO PROJECT SETUP ]
          </button>
        </motion.div>
      )}
    </div>
  );
}
