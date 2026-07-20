-- Persönlicher Workshop-Fortschritt je Nutzer und Kapitel (Gamification: Fortschrittsbalken + Achievements).
-- Rein individuelle Lernstatistik, bewusst nicht organisationsweit geteilt.

CREATE TABLE public.workshop_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_key text NOT NULL,
  steps_completed integer NOT NULL DEFAULT 0,
  steps_total integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  first_opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, chapter_key)
);

CREATE INDEX workshop_progress_user_idx ON public.workshop_progress (user_id);

ALTER TABLE public.workshop_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop-Fortschritt: eigenen lesen"
ON public.workshop_progress FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Schreibzugriffe laufen ausschließlich über diese validierte, monotone RPC —
-- keine direkten INSERT/UPDATE-Policies, analog zu den übrigen VINcent-Tabellen.
CREATE OR REPLACE FUNCTION public.record_workshop_progress(
  _chapter_key text,
  _steps_completed integer,
  _steps_total integer,
  _completed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  -- steps_completed darf nie größer als steps_total sein (sonst zeigt der Fortschrittsbalken >100 %) —
  -- einmal hier normalisiert, statt das in jedem Aufrufer/Client erneut sicherstellen zu müssen.
  normalized_completed integer;
BEGIN
  IF current_user_id IS NULL THEN RETURN; END IF;
  IF _chapter_key IS NULL OR char_length(_chapter_key) NOT BETWEEN 1 AND 60 THEN RETURN; END IF;
  IF _steps_completed IS NULL OR _steps_total IS NULL THEN RETURN; END IF;
  IF _steps_completed < 0 OR _steps_total < 0 OR _steps_completed > 500 OR _steps_total > 500 THEN RETURN; END IF;

  normalized_completed := LEAST(_steps_completed, _steps_total);

  INSERT INTO public.workshop_progress (
    user_id, chapter_key, steps_completed, steps_total, completed, completed_at, updated_at
  ) VALUES (
    current_user_id, _chapter_key, normalized_completed, _steps_total, COALESCE(_completed, false),
    CASE WHEN _completed THEN clock_timestamp() ELSE NULL END, clock_timestamp()
  )
  ON CONFLICT (user_id, chapter_key) DO UPDATE SET
    -- steps_total kann sich ändern (Kapitel-Inhalt wurde erweitert/gekürzt); steps_completed wird
    -- danach gekappt, damit ein alter, höherer Stand nie größer als die aktuelle Gesamtzahl anzeigt.
    steps_completed = LEAST(
      GREATEST(public.workshop_progress.steps_completed, EXCLUDED.steps_completed),
      EXCLUDED.steps_total
    ),
    steps_total = EXCLUDED.steps_total,
    completed = public.workshop_progress.completed OR EXCLUDED.completed,
    completed_at = COALESCE(public.workshop_progress.completed_at, EXCLUDED.completed_at),
    updated_at = clock_timestamp();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_workshop_progress(text, integer, integer, boolean) TO authenticated;
