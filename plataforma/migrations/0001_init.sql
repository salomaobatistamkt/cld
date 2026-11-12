-- Esquema inicial · Cloudflare D1 (SQLite)
-- Convenções: datas ISO-8601 em TEXT (UTC), valores monetários em centavos (INTEGER), JSON em TEXT.

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('min_sample', '30'),             -- mínimo de observações para classificar uma oferta
  ('history_days', '180'),          -- janela do histórico usada na pontuação
  ('trip_days_tolerance', '2'),     -- viagens com ±N dias contam como mesma duração
  ('pct_imperdivel', '5'),          -- percentil máximo para "Achado imperdível"
  ('pct_excelente', '15'),
  ('pct_boa', '30'),
  ('pct_competitivo', '50'),
  ('verify_max_age_hours', '6'),    -- consulta mais velha que isso = desatualizada
  ('price_tolerance_pct', '3'),     -- variação aceita na reverificação
  ('offer_ttl_hours', '48'),        -- expiração automática de oferta publicada
  ('brand_name', 'Meridia'),
  ('site_url', 'http://localhost:8787');

CREATE TABLE partners (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('voo','hospedagem','carro','onibus','passeio','seguro','esim','outro')),
  network        TEXT,                              -- Travelpayouts, Awin, direto...
  status         TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('ativo','pendente','inativo')),
  link_template  TEXT,                              -- ex.: https://.../?aid={AFFILIATE_ID}&ss={CITY}
  affiliate_id   TEXT,
  commission_note TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE monitored_routes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  origin        TEXT NOT NULL,                      -- IATA
  destination   TEXT NOT NULL,                      -- IATA
  trip_lengths  TEXT NOT NULL DEFAULT '[2,7,10,15,20,30]',
  months_ahead  INTEGER NOT NULL DEFAULT 6,
  one_way       INTEGER NOT NULL DEFAULT 0,
  priority      INTEGER NOT NULL DEFAULT 2,         -- 1 alta · 2 normal · 3 baixa
  active        INTEGER NOT NULL DEFAULT 1,
  last_collected_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (origin, destination, one_way)
);

CREATE TABLE price_observations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id      INTEGER REFERENCES monitored_routes(id),
  origin        TEXT NOT NULL,
  destination   TEXT NOT NULL,
  depart_date   TEXT NOT NULL,
  return_date   TEXT,
  trip_days     INTEGER,
  price_cents   INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'BRL',
  fare_type     TEXT NOT NULL CHECK (fare_type IN ('ida_volta','trecho')),
  includes_taxes INTEGER,                           -- 1 sim · 0 não · NULL desconhecido
  airline       TEXT,
  transfers     INTEGER,
  source        TEXT NOT NULL,                      -- travelpayouts · manual · exemplo
  source_link   TEXT,
  is_sample     INTEGER NOT NULL DEFAULT 0,         -- 1 = dado de EXEMPLO, nunca publicável
  observed_at   TEXT NOT NULL                       -- quando a fonte viu o preço
);
CREATE INDEX idx_obs_route ON price_observations (origin, destination, fare_type, observed_at);

CREATE TABLE opportunities (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id INTEGER REFERENCES price_observations(id),
  partner_id     INTEGER REFERENCES partners(id),
  origin         TEXT NOT NULL,
  destination    TEXT NOT NULL,
  depart_date    TEXT NOT NULL,
  return_date    TEXT,
  trip_days      INTEGER,
  price_cents    INTEGER NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'BRL',
  fare_type      TEXT NOT NULL,
  includes_taxes INTEGER,
  airline        TEXT,
  transfers      INTEGER,
  source         TEXT NOT NULL,
  is_sample      INTEGER NOT NULL DEFAULT 0,
  score_label    TEXT NOT NULL,                     -- imperdivel · excelente · boa · competitivo · comum · dados_insuficientes
  percentile     REAL,
  median_cents   INTEGER,
  sample_size    INTEGER NOT NULL DEFAULT 0,
  savings_pct    REAL,
  deeplink       TEXT,
  status         TEXT NOT NULL DEFAULT 'nova' CHECK (status IN ('nova','aprovada','publicada','rejeitada','expirada','desatualizada')),
  observed_at    TEXT NOT NULL,
  last_verified_at TEXT,
  expires_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (origin, destination, depart_date, return_date, price_cents, source)
);
CREATE INDEX idx_opp_status ON opportunities (status, created_at);

CREATE TABLE channels (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('telegram','whatsapp_canal','whatsapp_api','instagram','facebook','email','site')),
  target_ref    TEXT,                               -- chat_id do Telegram, id da lista etc.
  rules         TEXT NOT NULL DEFAULT '{}',         -- {"origins":["NAT"],"origin_regions":["BR-RN"],"international":null,"max_price":null,"min_label":"boa"}
  template      TEXT NOT NULL DEFAULT 'classico',   -- classico · direto · roteiro · alerta
  max_per_day   INTEGER NOT NULL DEFAULT 6,
  quiet_start   INTEGER NOT NULL DEFAULT 22,        -- hora local sem envios
  quiet_end     INTEGER NOT NULL DEFAULT 8,
  members_count INTEGER,                            -- só quando informado legitimamente
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE tracked_links (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT NOT NULL UNIQUE,
  opportunity_id INTEGER REFERENCES opportunities(id),
  channel_id     INTEGER REFERENCES channels(id),
  partner_id     INTEGER REFERENCES partners(id),
  target_url     TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE posts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id),
  channel_id     INTEGER NOT NULL REFERENCES channels(id),
  link_id        INTEGER REFERENCES tracked_links(id),
  body           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'aguardando_aprovacao' CHECK (status IN ('aguardando_aprovacao','aprovado','enviado','falhou','rejeitado','bloqueado')),
  error          TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  approved_at    TEXT,
  sent_at        TEXT,
  UNIQUE (opportunity_id, channel_id)
);

CREATE TABLE clicks (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id   INTEGER NOT NULL REFERENCES tracked_links(id),
  at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  country   TEXT,
  referrer  TEXT
);
CREATE INDEX idx_clicks_at ON clicks (at);

CREATE TABLE conversions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id      INTEGER REFERENCES partners(id),
  link_id         INTEGER REFERENCES tracked_links(id),
  external_ref    TEXT,
  amount_cents    INTEGER,
  commission_cents INTEGER,
  currency        TEXT NOT NULL DEFAULT 'BRL',
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmada','paga','cancelada')),
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','importacao','api')),
  occurred_at     TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (partner_id, external_ref)
);

CREATE TABLE subscribers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT,
  phone          TEXT,
  email          TEXT,
  ddd            TEXT,
  inferred_region TEXT,                             -- vindo do DDD: apenas indicação, nunca localização confirmada
  region         TEXT,                              -- informado pelo usuário (ex.: BR-RN)
  city           TEXT,
  home_airport   TEXT,
  interests      TEXT NOT NULL DEFAULT '{}',        -- destinos, faixa de preço, períodos
  consent_marketing INTEGER NOT NULL DEFAULT 0,
  consent_at     TEXT,
  consent_text   TEXT,
  consent_channel TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE searches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  origin      TEXT,
  destination TEXT,
  depart_date TEXT,
  return_date TEXT,
  results     INTEGER,
  source      TEXT,
  at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE activity_log (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  kind     TEXT NOT NULL,                           -- job · integracao · admin · erro
  source   TEXT,
  level    TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info','aviso','erro')),
  message  TEXT NOT NULL,
  at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_log_at ON activity_log (at);

-- Parceiros iniciais: todos PENDENTES até você cadastrar o ID de afiliado.
INSERT INTO partners (name, kind, network, status, link_template, commission_note, notes) VALUES
  ('Aviasales', 'voo', 'Travelpayouts', 'pendente', NULL, 'Conferir no painel Travelpayouts', 'Fonte de preços do MVP (Data API). Precisa de TRAVELPAYOUTS_TOKEN e marker.'),
  ('Booking.com', 'hospedagem', 'Booking Affiliate Partner', 'pendente', 'https://www.booking.com/searchresults.html?aid={AFFILIATE_ID}&ss={CITY}&checkin={CHECKIN}&checkout={CHECKOUT}', 'Escalonada por volume — confirmar', 'Link de busca. API de disponibilidade é restrita a parceiros aprovados.'),
  ('Rentcars', 'carro', 'Awin', 'pendente', NULL, 'CPS — confirmar percentual na Awin', 'Gerar deeplink no painel da Awin e colar o modelo aqui.'),
  ('ClickBus', 'onibus', NULL, 'pendente', NULL, NULL, 'Sem programa de afiliados público no Brasil encontrado. Contato comercial direto.'),
  ('Duffel', 'voo', 'Direto', 'pendente', NULL, 'Custo por pedido + busca excedente', 'Fase futura: confirmação de preço em tempo real.');
