-- Os metadados das fotos (as fotos em si ficam no object storage).
CREATE TABLE IF NOT EXISTS fotos (
  seq          INTEGER PRIMARY KEY AUTOINCREMENT,  -- ordem de chegada
  id           TEXT    NOT NULL UNIQUE,
  peca         TEXT    NOT NULL,
  lote         TEXT    NOT NULL,
  camera       TEXT    NOT NULL,
  tipo         TEXT    NOT NULL,
  bytes        INTEGER NOT NULL,
  trinca       REAL    NOT NULL,
  mancha       REAL    NOT NULL,
  destino      TEXT    NOT NULL CHECK (destino IN ('caixa', 'refugo', 'revisao')),
  criada_em    INTEGER NOT NULL,
  revisada_em  INTEGER,
  revisada_por TEXT
);
CREATE INDEX IF NOT EXISTS fotos_lote ON fotos (lote);
CREATE INDEX IF NOT EXISTS fotos_destino ON fotos (destino);
