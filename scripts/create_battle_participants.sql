-- Create battle_participants table
CREATE TABLE public.battle_participants (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id text,
    name text NOT NULL,
    original_name text NOT NULL,
    hp_max integer NOT NULL,
    hp_current integer NOT NULL,
    rk integer,
    ini integer,
    saves text,
    bw text,
    ub integer,
    attributes jsonb,
    actions jsonb,
    bonus_actions jsonb,
    states text[] NOT NULL DEFAULT '{}',
    active_variant text,
    image_url text,
    CONSTRAINT battle_participants_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage their own battle participants
CREATE POLICY "Allow users to CRUD their own battle_participants" ON public.battle_participants
    FOR ALL
    TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
