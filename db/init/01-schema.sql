CREATE TABLE testeur (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nom             VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  iban            VARCHAR(34),
  date_naissance  DATE NOT NULL,
  region          VARCHAR(50) NOT NULL
);

CREATE TABLE appariement (
  id_testeur  INT PRIMARY KEY,
  pseudonyme  VARCHAR(30) NOT NULL UNIQUE,
  FOREIGN KEY (id_testeur) REFERENCES testeur(id)
);

CREATE TABLE session (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  pseudonyme   VARCHAR(30) NOT NULL,
  application  VARCHAR(50) NOT NULL,
  debut        DATETIME(3) NOT NULL,
  FOREIGN KEY (pseudonyme) REFERENCES appariement(pseudonyme)
);

CREATE TABLE evenement (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id      INT NOT NULL,
  titre           VARCHAR(20) NOT NULL,      -- BUG1, BUG2, ...
  id_utilisateur  VARCHAR(30) NOT NULL,      -- pseudonyme
  description     VARCHAR(500),
  payload         JSON,
  timestamp       DATETIME(3) NOT NULL,
  type_bug        VARCHAR(30) NOT NULL,      -- MAP, AUTRE_JOUEUR, ...
  FOREIGN KEY (session_id) REFERENCES session(id),
  FOREIGN KEY (id_utilisateur) REFERENCES appariement(pseudonyme)
);
