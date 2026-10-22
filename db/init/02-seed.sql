-- Testeurs : données fictive
INSERT INTO testeur (id, nom, email, iban, date_naissance, region) VALUES
  (1, 'Dupont Marie',     'marie.dupont@example.test',    'FR7630001007941234567890185', '1991-04-12', 'Allemagne'),
  (2, 'Schmidt Lukas',    'lukas.schmidt@example.test',   'DE89370400440532013000',      '1986-11-03', 'Allemagne'),
  (3, 'Miller John',      'john.miller@example.test',     'GB33BUKB20201555555555',      '1958-02-27', 'Amerique du Nord Est'),
  (4, 'Garcia Sofia',     'sofia.garcia@example.test',    'ES9121000418450200051332',    '2001-08-19', 'Amerique du Sud'),
  (5, 'Nakamura Yuki',    'yuki.nakamura@example.test',   NULL,                          '1995-06-30', 'Amerique du Nord Ouest'),
  (6, 'Bernard Camille',  'camille.bernard@example.test', 'FR7630006000011234567890189', '1974-01-15', 'Allemagne');

-- Correspondance : un pseudo par testeur
INSERT INTO appariement (id_testeur, pseudonyme) VALUES
  (1, 'Storm_X9'),
  (2, 'Nova_K42'),
  (3, 'Echo_R7'),
  (4, 'Vortex_B3'),
  (5, 'Cipher_M8'),
  (6, 'Drift_Z5');

-- Sessions
INSERT INTO session (id, pseudonyme, application, debut) VALUES
  (41, 'Storm_X9',  'othello',    '2026-10-19 09:02:11.000'),
  (42, 'Storm_X9',  'arena_fps',  '2026-10-19 14:10:00.000'),
  (43, 'Nova_K42',  'arena_fps',  '2026-10-19 14:12:45.000'),
  (44, 'Echo_R7',   'echecs',     '2026-10-19 15:30:20.000'),
  (45, 'Vortex_B3', 'othello',    '2026-10-20 10:05:00.000'),
  (46, 'Cipher_M8', 'simulation', '2026-10-20 11:48:33.000'),
  (47, 'Drift_Z5',  'go',         '2026-10-20 16:20:05.000'),
  (48, 'Nova_K42',  'echecs',     '2026-10-21 08:55:12.000');
