-- Tiendas iniciales. Todas aparecen en el directorio oficial de tumallsanpedro.com.
-- La asignación de cuáles son patrocinadoras (x2) es de ejemplo y se cambia desde /admin/tiendas.
INSERT INTO tiendas (nombre, categoria, patrocinadora, boletos_por_bloque) VALUES
  ('Dormicentro Jirón',     'Hogar',                 TRUE,  2),
  ('Cell Tech',             'Tecnología',            TRUE,  2),
  ('Best Brands',           'Moda',                  TRUE,  2),
  ('Sabata',                'Calzado',               TRUE,  2),
  ('Turkezza',              'Joyería y accesorios',  TRUE,  2),
  ('Ana Bickel',            'Moda',                  FALSE, 1),
  ('Alma Boutique Niños',   'Moda infantil',         FALSE, 1),
  ('Capsule Store C.R.',    'Moda',                  FALSE, 1),
  ('Intima Colombiana',     'Ropa íntima',           FALSE, 1),
  ('Apolo',                 'Comercio',              FALSE, 1)
ON CONFLICT (nombre) DO NOTHING;
