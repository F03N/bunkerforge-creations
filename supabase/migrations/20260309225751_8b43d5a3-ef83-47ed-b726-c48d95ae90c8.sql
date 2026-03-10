
-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  selected_idea TEXT NOT NULL,
  final_style TEXT NOT NULL,
  visual_mood TEXT NOT NULL,
  construction_intensity TEXT NOT NULL,
  notes TEXT DEFAULT '',
  project_summary TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scenes table
CREATE TABLE public.scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  scene_title TEXT NOT NULL,
  image_prompt TEXT NOT NULL,
  animation_prompt TEXT NOT NULL DEFAULT '',
  sound_prompt TEXT NOT NULL DEFAULT '',
  reference_image_url TEXT,
  output_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transitions table
CREATE TABLE public.transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  transition_number INTEGER NOT NULL,
  from_scene INTEGER NOT NULL,
  to_scene INTEGER NOT NULL,
  animation_prompt TEXT NOT NULL DEFAULT '',
  start_image_url TEXT,
  end_image_url TEXT,
  output_video_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exports table
CREATE TABLE public.exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  exported_images INTEGER DEFAULT 0,
  exported_videos INTEGER DEFAULT 0,
  exported_prompts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_logs table
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);
-- Allow anonymous access for demo (no auth required for now)
CREATE POLICY "Allow anonymous project access" ON public.projects FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- Scenes policies (based on project ownership)
CREATE POLICY "Users can manage scenes of their projects" ON public.scenes FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND (projects.user_id = auth.uid() OR projects.user_id IS NULL)));
CREATE POLICY "Anon can manage scenes" ON public.scenes FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND projects.user_id IS NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND projects.user_id IS NULL));

-- Transitions policies
CREATE POLICY "Users can manage transitions of their projects" ON public.transitions FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = transitions.project_id AND (projects.user_id = auth.uid() OR projects.user_id IS NULL)));
CREATE POLICY "Anon can manage transitions" ON public.transitions FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = transitions.project_id AND projects.user_id IS NULL))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = transitions.project_id AND projects.user_id IS NULL));

-- Exports policies
CREATE POLICY "Users can manage exports of their projects" ON public.exports FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = exports.project_id AND (projects.user_id = auth.uid() OR projects.user_id IS NULL)));

-- Usage logs policies
CREATE POLICY "Users can view their own logs" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can insert logs" ON public.usage_logs FOR INSERT WITH CHECK (true);

-- Storage bucket for generated assets
INSERT INTO storage.buckets (id, name, public) VALUES ('project-assets', 'project-assets', true);

-- Storage policies
CREATE POLICY "Anyone can view project assets" ON storage.objects FOR SELECT USING (bucket_id = 'project-assets');
CREATE POLICY "Anyone can upload project assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-assets');
CREATE POLICY "Anyone can update project assets" ON storage.objects FOR UPDATE USING (bucket_id = 'project-assets');
