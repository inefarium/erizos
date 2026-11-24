CREATE TABLE IF NOT EXISTS adornos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ffcf7a',
  pos_x REAL NOT NULL,
  pos_y REAL NOT NULL,
  pos_z REAL NOT NULL,
  rot_y REAL NOT NULL DEFAULT 0,
  rot_z REAL NOT NULL DEFAULT 0,
  escala REAL NOT NULL DEFAULT 1,
  creado TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_adornos_creado ON adornos (creado);
