-- Script SQL per Supabase per aggiungere la tipologia "break"

-- 1. Se hai usato un CHECK CONSTRAINT per la colonna lesson_type nella tabella bookings:
-- Sostituisci "bookings_lesson_type_check" con il nome reale del vincolo se diverso.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_lesson_type_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_lesson_type_check CHECK (lesson_type IN ('private', 'lecture', 'group lesson', 'break'));

-- 2. IN ALTERNATIVA: se in Supabase hai creato un tipo ENUM personalizzato,
-- puoi semplicemente aggiungere il nuovo valore con questo comando:
-- (Sostituisci "lesson_type_enum" con il nome reale del tuo ENUM se esiste)
-- ALTER TYPE lesson_type_enum ADD VALUE IF NOT EXISTS 'break';

-- NOTA: Se la colonna lesson_type è un semplice campo TEXT senza vincoli,
-- non è necessario eseguire alcuno script SQL, perché il nuovo valore "break" 
-- verrà salvato automaticamente.
