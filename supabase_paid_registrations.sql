-- Questo script non è strettamente necessario in quanto il codice Javascript 
-- utilizza "upsert" e creerà la riga automaticamente al primo click sul pulsante "Segna saldato".
-- Tuttavia, se desideri inizializzare la riga manualmente nella tabella site_settings,
-- puoi eseguire questo comando:

INSERT INTO site_settings (key, value)
VALUES ('paid_registrations', '[]')
ON CONFLICT (key) DO NOTHING;
