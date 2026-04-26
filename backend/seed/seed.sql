-- ═══════════════════════════════════════════════════════════════════
-- SUFFRAGE — E-Voting System
-- Database Seed Script (PostgreSQL / MySQL compatible)
-- ═══════════════════════════════════════════════════════════════════
--
-- STUDENT ID FORMAT: [SEQUENCE][ENROLLMENT YEAR]
--   e.g. 10012023 = Student #1001, enrolled 2023
--
-- DEFAULT PASSWORD = Student ID (e.g. password for 10012023 is "10012023")
--
-- IMPORTANT: Passwords stored here are bcrypt hashes (cost 12).
--   The plaintext is the student_id value.
--   Generated with: bcrypt.hash(student_id, 12)
--
--   Since bcrypt is async/environment-specific, this script stores the
--   PLAINTEXT in a staging column and provides a post-run UPDATE block
--   using pgcrypto (PostgreSQL) or a trigger (MySQL) to hash them.
--   See Section 4 for instructions.
--
-- YEAR LEVEL LOGIC (Academic Year 2024-2025):
--   Enrolled 2021 → Year 4
--   Enrolled 2022 → Year 3
--   Enrolled 2023 → Year 2
--   Enrolled 2024 → Year 1
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- SECTION 1: SCHEMA
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    student_id      VARCHAR(20)  UNIQUE,
    full_name       VARCHAR(120) NOT NULL,
    email           VARCHAR(160) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'student'
                        CHECK (role IN ('student', 'admin', 'superadmin')),
    department      VARCHAR(100),
    year_level      SMALLINT     CHECK (year_level BETWEEN 1 AND 5),
    enrollment_year SMALLINT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    has_voted       BOOLEAN      NOT NULL DEFAULT FALSE,
    voted_at        TIMESTAMP,
    risk_score      SMALLINT     NOT NULL DEFAULT 0,
    is_flagged      BOOLEAN      NOT NULL DEFAULT FALSE,
    flag_reason     TEXT,
    login_attempts  SMALLINT     NOT NULL DEFAULT 0,
    lock_until      TIMESTAMP,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS elections (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    academic_year   VARCHAR(20)  NOT NULL,
    semester        VARCHAR(10)  NOT NULL CHECK (semester IN ('1st', '2nd', 'Summer')),
    status          VARCHAR(30)  NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','scheduled','active','paused','closed','results_published')),
    start_date      TIMESTAMP    NOT NULL,
    end_date        TIMESTAMP    NOT NULL,
    total_votes_cast INT         NOT NULL DEFAULT 0,
    created_by      INT          REFERENCES users(id),
    is_locked       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT end_after_start CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS positions (
    id              SERIAL PRIMARY KEY,
    election_id     INT          NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    title           VARCHAR(100) NOT NULL,
    description     TEXT,
    max_votes       SMALLINT     NOT NULL DEFAULT 1,
    display_order   SMALLINT     NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS candidates (
    id              SERIAL PRIMARY KEY,
    election_id     INT          NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    position_id     INT          NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    full_name       VARCHAR(120) NOT NULL,
    student_id      VARCHAR(20),
    department      VARCHAR(100),
    year_level      SMALLINT,
    platform        TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    display_order   SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
    id              SERIAL PRIMARY KEY,
    election_id     INT          NOT NULL REFERENCES elections(id),
    voter_hash      VARCHAR(64)  NOT NULL UNIQUE,   -- SHA-256, anonymous
    ballot_hash     VARCHAR(64)  NOT NULL,           -- integrity check
    token_hash      VARCHAR(64)  NOT NULL,
    ip_hash         VARCHAR(32),
    user_agent      TEXT,
    submitted_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    is_valid        BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS vote_entries (
    id              SERIAL PRIMARY KEY,
    vote_id         INT          NOT NULL REFERENCES votes(id),
    position_id     INT          NOT NULL REFERENCES positions(id),
    position_title  VARCHAR(100) NOT NULL,
    encrypted_candidate_id TEXT  NOT NULL    -- AES-256-CBC encrypted
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         INT          REFERENCES users(id),
    user_email      VARCHAR(160),
    user_role       VARCHAR(20),
    category        VARCHAR(20)  NOT NULL
                        CHECK (category IN ('auth','vote','admin','security','system','access')),
    action          VARCHAR(80)  NOT NULL,
    severity        VARCHAR(10)  NOT NULL DEFAULT 'info'
                        CHECK (severity IN ('info','warning','critical')),
    details         JSONB,
    ip_hash         VARCHAR(32),
    user_agent      TEXT,
    session_id      VARCHAR(64),
    resource_type   VARCHAR(40),
    resource_id     INT,
    success         BOOLEAN      NOT NULL DEFAULT TRUE,
    error_message   TEXT,
    timestamp       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Prevent updates on votes and audit_logs (immutability) ──
-- PostgreSQL rule:
CREATE OR REPLACE RULE votes_no_update AS ON UPDATE TO votes DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_id   ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_has_voted    ON users(has_voted);
CREATE INDEX IF NOT EXISTS idx_users_flagged      ON users(is_flagged);
CREATE INDEX IF NOT EXISTS idx_elections_status   ON elections(status);
CREATE INDEX IF NOT EXISTS idx_votes_election     ON votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_hash   ON votes(voter_hash);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp    ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user         ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_severity     ON audit_logs(severity, category);


-- ───────────────────────────────────────────────────────────────────
-- SECTION 2: ADMIN ACCOUNTS
-- Password for both admins: Admin@Suffrage2025!
-- (Pre-hashed with bcrypt cost 12)
-- ───────────────────────────────────────────────────────────────────

INSERT INTO users (student_id, full_name, email, password_hash, role, department, year_level, enrollment_year, must_change_password) VALUES
('ADMIN-001', 'Election Administrator', 'admin@college.edu',
 '$2a$12$PLACEHOLDER_HASH_ADMIN_001_REPLACE_WITH_REAL_BCRYPT_HASH',
 'admin', 'Office of Student Affairs', NULL, NULL, FALSE),

('ADMIN-000', 'Super Administrator', 'superadmin@college.edu',
 '$2a$12$PLACEHOLDER_HASH_ADMIN_000_REPLACE_WITH_REAL_BCRYPT_HASH',
 'superadmin', 'Office of Student Affairs', NULL, NULL, FALSE);


-- ───────────────────────────────────────────────────────────────────
-- SECTION 3: STUDENT ACCOUNTS (50 students)
-- Password for each student = their student_id (plaintext shown in comment)
-- must_change_password = TRUE (forced reset on first login)
-- ───────────────────────────────────────────────────────────────────
-- FORMAT: (student_id, full_name, email, password_hash, role, department, year_level, enrollment_year)
-- password_hash column currently holds PLAINTEXT for hashing step — see Section 4

INSERT INTO users (student_id, full_name, email, password_hash, role, department, year_level, enrollment_year, must_change_password) VALUES

-- ── 2021 Enrollees (Year 4) ─────────────────────────────────────
('10042021', 'Gabriel Flores',       'gabriel.flores@college.edu',      '10042021', 'student', 'Nursing',             4, 2021, TRUE),
('10052021', 'Patricia Bautista',    'patricia.bautista@college.edu',   '10052021', 'student', 'Education',           4, 2021, TRUE),
('10082021', 'Patrick Castillo',     'patrick.castillo@college.edu',    '10082021', 'student', 'Psychology',          4, 2021, TRUE),
('10142021', 'Gabriel Lopez',        'gabriel.lopez@college.edu',       '10142021', 'student', 'Nursing',             4, 2021, TRUE),
('10172021', 'Elena Ramos',          'elena.ramos@college.edu',         '10172021', 'student', 'Law',                 4, 2021, TRUE),
('10202021', 'Carlo Flores',         'carlo.flores@college.edu',        '10202021', 'student', 'Accountancy',         4, 2021, TRUE),
('10382021', 'Maricel Go',           'maricel.go@college.edu',          '10382021', 'student', 'Psychology',          4, 2021, TRUE),
('10412021', 'Ben Castillo',         'ben.castillo@college.edu',        '10412021', 'student', 'Computer Science',    4, 2021, TRUE),
('10432021', 'Vincent Villanueva',   'vincent.villanueva@college.edu',  '10432021', 'student', 'Engineering',         4, 2021, TRUE),
('10442021', 'Stephanie Bautista',   'stephanie.bautista@college.edu',  '10442021', 'student', 'Nursing',             4, 2021, TRUE),
('10482021', 'Ben Chua',             'ben.chua@college.edu',            '10482021', 'student', 'Psychology',          4, 2021, TRUE),
('10492021', 'Maricel Cruz',         'maricel.cruz@college.edu',        '10492021', 'student', 'Mass Communication',  4, 2021, TRUE),

-- ── 2022 Enrollees (Year 3) ─────────────────────────────────────
('10022022', 'Roberto Cruz',         'roberto.cruz@college.edu',        '10022022', 'student', 'Business Administration', 3, 2022, TRUE),
('10032022', 'Diane Fernandez',      'diane.fernandez@college.edu',     '10032022', 'student', 'Engineering',         3, 2022, TRUE),
('10102022', 'Liza Martinez',        'liza.martinez@college.edu',       '10102022', 'student', 'Accountancy',         3, 2022, TRUE),
('10122022', 'Mark Go',              'mark.go@college.edu',             '10122022', 'student', 'Business Administration', 3, 2022, TRUE),
('10132022', 'Isabella Uy',          'isabella.uy@college.edu',         '10132022', 'student', 'Engineering',         3, 2022, TRUE),
('10182022', 'Isabella Morales',     'isabella.morales@college.edu',    '10182022', 'student', 'Psychology',          3, 2022, TRUE),
('10222022', 'Vincent Ortiz',        'vincent.ortiz@college.edu',       '10222022', 'student', 'Business Administration', 3, 2022, TRUE),
('10282022', 'Camille Lim',          'camille.lim@college.edu',         '10282022', 'student', 'Psychology',          3, 2022, TRUE),
('10292022', 'Rachel Diaz',          'rachel.diaz@college.edu',         '10292022', 'student', 'Mass Communication',  3, 2022, TRUE),
('10352022', 'Christian Gonzalez',   'christian.gonzalez@college.edu',  '10352022', 'student', 'Education',           3, 2022, TRUE),
('10452022', 'Angela Gonzalez',      'angela.gonzalez@college.edu',     '10452022', 'student', 'Education',           3, 2022, TRUE),
('10462022', 'Abigail Go',           'abigail.go@college.edu',          '10462022', 'student', 'Architecture',        3, 2022, TRUE),
('10472022', 'Patricia Castillo',    'patricia.castillo@college.edu',   '10472022', 'student', 'Law',                 3, 2022, TRUE),

-- ── 2023 Enrollees (Year 2) ─────────────────────────────────────
('10012023', 'Vincent Garcia',       'vincent.garcia@college.edu',      '10012023', 'student', 'Computer Science',    2, 2023, TRUE),
('10072023', 'Carlo Reyes',          'carlo.reyes@college.edu',         '10072023', 'student', 'Law',                 2, 2023, TRUE),
('10092023', 'Rachel Fernandez',     'rachel.fernandez@college.edu',    '10092023', 'student', 'Mass Communication',  2, 2023, TRUE),
('10112023', 'Luis Martinez',        'luis.martinez@college.edu',       '10112023', 'student', 'Computer Science',    2, 2023, TRUE),
('10192023', 'Camille Rivera',       'camille.rivera@college.edu',      '10192023', 'student', 'Mass Communication',  2, 2023, TRUE),
('10232023', 'Sofia Torres',         'sofia.torres@college.edu',        '10232023', 'student', 'Engineering',         2, 2023, TRUE),
('10262023', 'Gabriel Morales',      'gabriel.morales@college.edu',     '10262023', 'student', 'Architecture',        2, 2023, TRUE),
('10272023', 'Diane Castillo',       'diane.castillo@college.edu',      '10272023', 'student', 'Law',                 2, 2023, TRUE),
('10322023', 'Antonio Go',           'antonio.go@college.edu',          '10322023', 'student', 'Business Administration', 2, 2023, TRUE),
('10332023', 'Isabella Cruz',        'isabella.cruz@college.edu',       '10332023', 'student', 'Engineering',         2, 2023, TRUE),
('10392023', 'Natalia Uy',           'natalia.uy@college.edu',          '10392023', 'student', 'Mass Communication',  2, 2023, TRUE),
('10402023', 'Grace Villanueva',     'grace.villanueva@college.edu',    '10402023', 'student', 'Accountancy',         2, 2023, TRUE),
('10422023', 'Stephanie Co',         'stephanie.co@college.edu',        '10422023', 'student', 'Business Administration', 2, 2023, TRUE),

-- ── 2024 Enrollees (Year 1) ─────────────────────────────────────
('10062024', 'Ramon Morales',        'ramon.morales@college.edu',       '10062024', 'student', 'Architecture',        1, 2024, TRUE),
('10152024', 'Patricia Torres',      'patricia.torres@college.edu',     '10152024', 'student', 'Education',           1, 2024, TRUE),
('10162024', 'Patricia Tan',         'patricia.tan@college.edu',        '10162024', 'student', 'Architecture',        1, 2024, TRUE),
('10212024', 'Gabriel Torres',       'gabriel.torres@college.edu',      '10212024', 'student', 'Computer Science',    1, 2024, TRUE),
('10242024', 'Jasmine Go',           'jasmine.go@college.edu',          '10242024', 'student', 'Nursing',             1, 2024, TRUE),
('10252024', 'Isabella Hernandez',   'isabella.hernandez@college.edu',  '10252024', 'student', 'Education',           1, 2024, TRUE),
('10302024', 'Ana Castillo',         'ana.castillo@college.edu',        '10302024', 'student', 'Accountancy',         1, 2024, TRUE),
('10312024', 'Pedro Perez',          'pedro.perez@college.edu',         '10312024', 'student', 'Computer Science',    1, 2024, TRUE),
('10342024', 'Elena Hernandez',      'elena.hernandez@college.edu',     '10342024', 'student', 'Nursing',             1, 2024, TRUE),
('10362024', 'Felicia Lim',          'felicia.lim@college.edu',         '10362024', 'student', 'Architecture',        1, 2024, TRUE),
('10372024', 'Elena Rivera',         'elena.rivera@college.edu',        '10372024', 'student', 'Law',                 1, 2024, TRUE),
('10502024', 'Kevin Reyes',          'kevin.reyes@college.edu',         '10502024', 'student', 'Accountancy',         1, 2024, TRUE);


-- ───────────────────────────────────────────────────────────────────
-- SECTION 4: HASH PASSWORDS (PostgreSQL with pgcrypto)
-- ───────────────────────────────────────────────────────────────────
-- Run this AFTER the inserts above.
-- It reads the plaintext stored in password_hash and replaces it
-- with a proper bcrypt hash.
--
-- Requires: CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable pgcrypto extension (run once as superuser):
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash all student passwords (plaintext = their student_id):
UPDATE users
SET password_hash = crypt(password_hash, gen_salt('bf', 12))
WHERE role = 'student'
  AND password_hash NOT LIKE '$2%';  -- skip already-hashed rows

-- Hash admin passwords manually (change 'Admin@Suffrage2025!' to your desired value):
UPDATE users
SET password_hash = crypt('Admin@Suffrage2025!', gen_salt('bf', 12))
WHERE role IN ('admin', 'superadmin')
  AND password_hash LIKE '$2a$12$PLACEHOLDER%';


-- ───────────────────────────────────────────────────────────────────
-- SECTION 4b: MYSQL / MariaDB ALTERNATIVE
-- ───────────────────────────────────────────────────────────────────
-- MySQL does NOT have native bcrypt. Use application-level hashing instead.
-- Option A: Run the Node.js seeder (seed/seeder.js) which handles bcrypt.
-- Option B: Use this stored procedure approach with the SHA2 fallback
--           (less secure — only for dev/testing):
--
-- UPDATE users
-- SET password_hash = SHA2(CONCAT(student_id, 'your_pepper_secret'), 256)
-- WHERE role = 'student' AND password_hash NOT LIKE '$%';
--
-- STRONGLY RECOMMENDED: Use the Node.js seeder for production.


-- ───────────────────────────────────────────────────────────────────
-- SECTION 5: SAMPLE ELECTION DATA
-- ───────────────────────────────────────────────────────────────────

INSERT INTO elections (title, description, academic_year, semester, status, start_date, end_date, created_by)
VALUES (
    'Student Government Association Elections 2024–2025',
    'Annual election for SGA officers. Cast your vote to shape the future of your campus.',
    '2024-2025',
    '2nd',
    'scheduled',
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '7 days',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

-- Positions
INSERT INTO positions (election_id, title, description, max_votes, display_order)
SELECT id, 'President',      'Chief executive officer of the SGA',             1, 1 FROM elections WHERE title LIKE 'Student Government%' LIMIT 1;
INSERT INTO positions (election_id, title, description, max_votes, display_order)
SELECT id, 'Vice President', 'Assists the president and oversees committees',   1, 2 FROM elections WHERE title LIKE 'Student Government%' LIMIT 1;
INSERT INTO positions (election_id, title, description, max_votes, display_order)
SELECT id, 'Secretary',      'Maintains records and communications',            1, 3 FROM elections WHERE title LIKE 'Student Government%' LIMIT 1;
INSERT INTO positions (election_id, title, description, max_votes, display_order)
SELECT id, 'Treasurer',      'Manages SGA funds and budgeting',                 1, 4 FROM elections WHERE title LIKE 'Student Government%' LIMIT 1;
INSERT INTO positions (election_id, title, description, max_votes, display_order)
SELECT id, 'Auditor',        'Ensures financial accountability and transparency',1, 5 FROM elections WHERE title LIKE 'Student Government%' LIMIT 1;

-- Candidates
INSERT INTO candidates (election_id, position_id, full_name, student_id, department, year_level, platform, display_order)
SELECT
    e.id,
    p.id,
    c.full_name,
    c.student_id,
    c.department,
    c.year_level,
    c.platform,
    c.display_order
FROM elections e
JOIN positions p ON p.election_id = e.id
JOIN (VALUES
    -- President candidates
    ('President', 'Alexandra Reyes',    'CAND-P001', 'Political Science',    4, 'Transparent governance, student welfare, and campus sustainability.',         1),
    ('President', 'Miguel Santos',      'CAND-P002', 'Business Administration', 4, 'Economic empowerment, alumni partnerships, modernizing student services.',  2),
    -- VP candidates
    ('Vice President', 'Isabella Cruz', 'CAND-V001', 'Psychology',           3, 'Mental health advocacy and inclusive campus culture.',                        1),
    ('Vice President', 'Rafael Torres', 'CAND-V002', 'Engineering',          3, 'Technology integration and academic excellence programs.',                    2),
    -- Secretary candidates
    ('Secretary', 'Sofia Lim',          'CAND-S001', 'Mass Communication',   2, 'Open communication, digital transparency, and student feedback systems.',     1),
    ('Secretary', 'Carlos Bautista',    'CAND-S002', 'Computer Science',     2, 'Digitizing SGA processes and improving information access.',                  2),
    -- Treasurer candidates
    ('Treasurer', 'Daniela Flores',     'CAND-T001', 'Accountancy',          4, 'Responsible fund management and transparent student budgeting.',              1),
    ('Treasurer', 'Patrick Villanueva', 'CAND-T002', 'Finance',              3, 'Maximizing student development funds and sponsorship drives.',                2),
    -- Auditor candidates
    ('Auditor',   'Camille Aquino',     'CAND-A001', 'Accountancy',          3, 'Zero-tolerance audit culture and financial integrity.',                       1),
    ('Auditor',   'Jerome Mendez',      'CAND-A002', 'Business Administration', 2, 'Proactive reporting and student fund protection.',                         2)
) AS c(position_title, full_name, student_id, department, year_level, platform, display_order)
  ON p.title = c.position_title
WHERE e.title LIKE 'Student Government%';


-- ───────────────────────────────────────────────────────────────────
-- SECTION 6: VERIFICATION QUERIES
-- Run these to confirm the seed was successful.
-- ───────────────────────────────────────────────────────────────────

-- Count by role
SELECT role, COUNT(*) AS total FROM users GROUP BY role ORDER BY role;
-- Expected: admin=1, superadmin=1, student=50

-- Count by year level
SELECT year_level, enrollment_year, COUNT(*) AS total
FROM users WHERE role = 'student'
GROUP BY year_level, enrollment_year
ORDER BY enrollment_year;
-- Expected: 2021→12, 2022→13, 2023→13, 2024→12

-- Count by department
SELECT department, COUNT(*) AS total
FROM users WHERE role = 'student'
GROUP BY department ORDER BY total DESC;

-- Verify election and positions
SELECT e.title, COUNT(p.id) AS positions
FROM elections e
LEFT JOIN positions p ON p.election_id = e.id
GROUP BY e.title;
-- Expected: 1 election, 5 positions

-- Verify candidates
SELECT p.title AS position, COUNT(c.id) AS candidates
FROM positions p
LEFT JOIN candidates c ON c.position_id = p.id AND c.is_active = TRUE
GROUP BY p.title, p.display_order
ORDER BY p.display_order;
-- Expected: 2 candidates per position

-- Verify passwords are hashed (no plaintext remaining)
SELECT COUNT(*) AS unhashed_count
FROM users
WHERE password_hash NOT LIKE '$2%';
-- Expected: 0 (after running Section 4)


-- ───────────────────────────────────────────────────────────────────
-- SECTION 7: QUICK REFERENCE — ALL ACCOUNTS
-- ───────────────────────────────────────────────────────────────────
/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  ADMIN ACCOUNTS                                                              ║
╠═══════════════════════╦═══════════════════════════╦══════════════════════════╣
║  Role                 ║  Email                    ║  Password                ║
╠═══════════════════════╬═══════════════════════════╬══════════════════════════╣
║  admin                ║  admin@college.edu        ║  Admin@Suffrage2025!     ║
║  superadmin           ║  superadmin@college.edu   ║  Admin@Suffrage2025!     ║
╚═══════════════════════╩═══════════════════════════╩══════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════════╗
║  STUDENT ACCOUNTS  (password = student_id, must change on first login)      ║
╠═══════════════╦════════════════════════╦══════════════════════════════╦══════╣
║  Student ID   ║  Email                 ║  Name                        ║  Yr  ║
╠═══════════════╬════════════════════════╬══════════════════════════════╬══════╣
║  10012023     ║  vincent.garcia        ║  Vincent Garcia              ║   2  ║
║  10022022     ║  roberto.cruz          ║  Roberto Cruz                ║   3  ║
║  10032022     ║  diane.fernandez       ║  Diane Fernandez             ║   3  ║
║  10042021     ║  gabriel.flores        ║  Gabriel Flores              ║   4  ║
║  10052021     ║  patricia.bautista     ║  Patricia Bautista           ║   4  ║
║  10062024     ║  ramon.morales         ║  Ramon Morales               ║   1  ║
║  10072023     ║  carlo.reyes           ║  Carlo Reyes                 ║   2  ║
║  10082021     ║  patrick.castillo      ║  Patrick Castillo            ║   4  ║
║  10092023     ║  rachel.fernandez      ║  Rachel Fernandez            ║   2  ║
║  10102022     ║  liza.martinez         ║  Liza Martinez               ║   3  ║
║  10112023     ║  luis.martinez         ║  Luis Martinez               ║   2  ║
║  10122022     ║  mark.go               ║  Mark Go                     ║   3  ║
║  10132022     ║  isabella.uy           ║  Isabella Uy                 ║   3  ║
║  10142021     ║  gabriel.lopez         ║  Gabriel Lopez               ║   4  ║
║  10152024     ║  patricia.torres       ║  Patricia Torres             ║   1  ║
║  10162024     ║  patricia.tan          ║  Patricia Tan                ║   1  ║
║  10172021     ║  elena.ramos           ║  Elena Ramos                 ║   4  ║
║  10182022     ║  isabella.morales      ║  Isabella Morales            ║   3  ║
║  10192023     ║  camille.rivera        ║  Camille Rivera              ║   2  ║
║  10202021     ║  carlo.flores          ║  Carlo Flores                ║   4  ║
║  10212024     ║  gabriel.torres        ║  Gabriel Torres              ║   1  ║
║  10222022     ║  vincent.ortiz         ║  Vincent Ortiz               ║   3  ║
║  10232023     ║  sofia.torres          ║  Sofia Torres                ║   2  ║
║  10242024     ║  jasmine.go            ║  Jasmine Go                  ║   1  ║
║  10252024     ║  isabella.hernandez    ║  Isabella Hernandez          ║   1  ║
║  10262023     ║  gabriel.morales       ║  Gabriel Morales             ║   2  ║
║  10272023     ║  diane.castillo        ║  Diane Castillo              ║   2  ║
║  10282022     ║  camille.lim           ║  Camille Lim                 ║   3  ║
║  10292022     ║  rachel.diaz           ║  Rachel Diaz                 ║   3  ║
║  10302024     ║  ana.castillo          ║  Ana Castillo                ║   1  ║
║  10312024     ║  pedro.perez           ║  Pedro Perez                 ║   1  ║
║  10322023     ║  antonio.go            ║  Antonio Go                  ║   2  ║
║  10332023     ║  isabella.cruz         ║  Isabella Cruz               ║   2  ║
║  10342024     ║  elena.hernandez       ║  Elena Hernandez             ║   1  ║
║  10352022     ║  christian.gonzalez    ║  Christian Gonzalez          ║   3  ║
║  10362024     ║  felicia.lim           ║  Felicia Lim                 ║   1  ║
║  10372024     ║  elena.rivera          ║  Elena Rivera                ║   1  ║
║  10382021     ║  maricel.go            ║  Maricel Go                  ║   4  ║
║  10392023     ║  natalia.uy            ║  Natalia Uy                  ║   2  ║
║  10402023     ║  grace.villanueva      ║  Grace Villanueva            ║   2  ║
║  10412021     ║  ben.castillo          ║  Ben Castillo                ║   4  ║
║  10422023     ║  stephanie.co          ║  Stephanie Co                ║   2  ║
║  10432021     ║  vincent.villanueva    ║  Vincent Villanueva          ║   4  ║
║  10442021     ║  stephanie.bautista    ║  Stephanie Bautista          ║   4  ║
║  10452022     ║  angela.gonzalez       ║  Angela Gonzalez             ║   3  ║
║  10462022     ║  abigail.go            ║  Abigail Go                  ║   3  ║
║  10472022     ║  patricia.castillo     ║  Patricia Castillo           ║   3  ║
║  10482021     ║  ben.chua              ║  Ben Chua                    ║   4  ║
║  10492021     ║  maricel.cruz          ║  Maricel Cruz                ║   4  ║
║  10502024     ║  kevin.reyes           ║  Kevin Reyes                 ║   1  ║
╚═══════════════╩════════════════════════╩══════════════════════════════╩══════╝

  All emails: @college.edu
  Student ID format: [SEQUENCE][ENROLLMENT YEAR]
    e.g. 10012023 = Student #1001, enrolled in 2023

  Year Level (as of 2024–2025):
    Enrolled 2021 → Year 4  (12 students)
    Enrolled 2022 → Year 3  (13 students)
    Enrolled 2023 → Year 2  (13 students)
    Enrolled 2024 → Year 1  (12 students)
*/
