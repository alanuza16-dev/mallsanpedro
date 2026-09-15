-- Esquema de la Góndola de Fin de Año, Mall San Pedro
-- Idempotente: se puede correr varias veces sin romper nada (npm run db:migrate).

CREATE TABLE IF NOT EXISTS tiendas (
  id               SERIAL PRIMARY KEY,
  nombre           TEXT NOT NULL UNIQUE,
  categoria        TEXT NOT NULL DEFAULT 'Comercio',
  patrocinadora    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Boletos que otorga cada bloque de monto (ver configuracion.monto_por_bloque).
  -- Patrocinadoras: 2 (x2). Resto: 1.
  boletos_por_bloque INTEGER NOT NULL DEFAULT 1 CHECK (boletos_por_bloque BETWEEN 1 AND 10),
  activa           BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participantes (
  id                SERIAL PRIMARY KEY,
  cedula            TEXT NOT NULL UNIQUE,
  nombre_completo   TEXT NOT NULL,
  email             TEXT NOT NULL,
  telefono          TEXT NOT NULL,
  prefiere_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  acepta_terminos   BOOLEAN NOT NULL,
  fecha_aceptacion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  rol           TEXT NOT NULL DEFAULT 'admin',
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facturas (
  id                 SERIAL PRIMARY KEY,
  participante_id    INTEGER NOT NULL REFERENCES participantes(id),
  tienda_id          INTEGER NOT NULL REFERENCES tiendas(id),
  numero_factura     TEXT NOT NULL,
  monto              NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  foto_blob_url      TEXT NOT NULL,
  foto_blob_pathname TEXT NOT NULL,
  foto_bytes         INTEGER,
  foto_tipo          TEXT,
  estado             TEXT NOT NULL DEFAULT 'aprobada' CHECK (estado IN ('aprobada', 'rechazada')),
  motivo_rechazo     TEXT,
  boletos_asignados  INTEGER NOT NULL CHECK (boletos_asignados > 0),
  revisado_por       INTEGER REFERENCES admins(id),
  revisado_en        TIMESTAMPTZ,
  canal              TEXT NOT NULL DEFAULT 'web',
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Regla de negocio: el número de factura no se puede repetir dentro de la misma tienda.
  CONSTRAINT facturas_tienda_numero_unico UNIQUE (tienda_id, numero_factura)
);
CREATE INDEX IF NOT EXISTS facturas_participante_idx ON facturas (participante_id);
CREATE INDEX IF NOT EXISTS facturas_creado_idx ON facturas (creado_en DESC);
-- Una foto solo puede respaldar una factura.
CREATE UNIQUE INDEX IF NOT EXISTS facturas_foto_unica ON facturas (foto_blob_pathname);

CREATE SEQUENCE IF NOT EXISTS boleto_seq START 1;

CREATE TABLE IF NOT EXISTS boletos (
  id            SERIAL PRIMARY KEY,
  factura_id    INTEGER NOT NULL REFERENCES facturas(id),
  numero_boleto TEXT NOT NULL UNIQUE,
  anulado       BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS boletos_factura_idx ON boletos (factura_id);

CREATE TABLE IF NOT EXISTS configuracion (
  id                 INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  monto_por_bloque   INTEGER NOT NULL DEFAULT 10000 CHECK (monto_por_bloque > 0),
  fecha_inicio_promo TIMESTAMPTZ,
  fecha_fin_promo    TIMESTAMPTZ,
  activa             BOOLEAN NOT NULL DEFAULT TRUE,
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS notificaciones (
  id            SERIAL PRIMARY KEY,
  factura_id    INTEGER NOT NULL REFERENCES facturas(id),
  canal         TEXT NOT NULL CHECK (canal IN ('email', 'whatsapp')),
  tipo          TEXT NOT NULL CHECK (tipo IN ('boletos_asignados', 'factura_anulada')),
  estado        TEXT NOT NULL CHECK (estado IN ('enviado', 'fallido', 'omitido')),
  detalle_error TEXT,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notificaciones_factura_idx ON notificaciones (factura_id);

CREATE TABLE IF NOT EXISTS ganadores (
  id           SERIAL PRIMARY KEY,
  boleto_id    INTEGER NOT NULL UNIQUE REFERENCES boletos(id),
  premio       TEXT NOT NULL,
  sorteado_por INTEGER REFERENCES admins(id),
  fecha_sorteo TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
