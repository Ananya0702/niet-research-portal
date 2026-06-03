CREATE DATABASE niet_research;
USE niet_research;
SELECT DATABASE();
SHOW DATABASES;
USE niet_research;

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    dept_id          INT AUTO_INCREMENT PRIMARY KEY,
    dept_code        VARCHAR(20) NOT NULL UNIQUE,
    dept_name        VARCHAR(100) NOT NULL,
    hod_faculty_id   INT DEFAULT NULL,
    established_year INT
);

-- FACULTY
CREATE TABLE IF NOT EXISTS faculty (
    faculty_id        INT AUTO_INCREMENT PRIMARY KEY,
    dept_id           INT,
    name              VARCHAR(100),
    email             VARCHAR(150) UNIQUE,
    password_hash     VARCHAR(255),
    role              VARCHAR(20) DEFAULT 'faculty',
    designation       VARCHAR(100),
    is_phd            BOOLEAN DEFAULT FALSE,
    joining_year      INT,
    google_scholar_id VARCHAR(50),
    h_index           FLOAT DEFAULT 0,
    i10_index         FLOAT DEFAULT 0,
    avg_impact_factor FLOAT DEFAULT 0,
    research_score    FLOAT DEFAULT 0,
    total_publications INT DEFAULT 0,
    total_citations   INT DEFAULT 0,
    profile_photo_url VARCHAR(255),
    bio               TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE SET NULL
);

-- PUBLICATIONS
CREATE TABLE IF NOT EXISTS publications (
    pub_id          INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id      INT,
    title           VARCHAR(500),
    journal_name    VARCHAR(300),
    doi             VARCHAR(200),
    indexing        VARCHAR(20) DEFAULT 'None',
    quartile        VARCHAR(5)  DEFAULT 'N/A',
    impact_factor   FLOAT DEFAULT 0,
    year            INT,
    citations_count INT DEFAULT 0,
    ml_topic        VARCHAR(100),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);

-- CITATIONS YEARLY
CREATE TABLE IF NOT EXISTS citations_yearly (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id      INT,
    year            INT,
    citations_count INT DEFAULT 0,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);

-- FACULTY RESEARCH AREAS
CREATE TABLE IF NOT EXISTS faculty_research_areas (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id        INT,
    area_name         VARCHAR(100),
    pub_count         INT DEFAULT 0,
    expertise_percent FLOAT DEFAULT 0,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);

-- ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id     INT,
    title          VARCHAR(300),
    category       VARCHAR(50),
    issuer         VARCHAR(200),
    year           INT,
    amount         DECIMAL(12,2) DEFAULT NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    project_id   INT AUTO_INCREMENT PRIMARY KEY,
    dept_id      INT,
    faculty_id   INT,
    title        VARCHAR(300),
    sponsor_type VARCHAR(50),
    sponsor_name VARCHAR(200),
    amount_lakhs FLOAT DEFAULT 0,
    status       VARCHAR(20) DEFAULT 'Ongoing',
    start_date   DATE,
    end_date     DATE,
    FOREIGN KEY (dept_id)    REFERENCES departments(dept_id) ON DELETE SET NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE SET NULL
);

-- PATENTS
CREATE TABLE IF NOT EXISTS patents (
    patent_id     INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id    INT,
    title         VARCHAR(300),
    patent_number VARCHAR(100),
    status        VARCHAR(20) DEFAULT 'Filed',
    year          INT,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);

-- ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
    log_id      INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id  INT,
    action      VARCHAR(100),
    description VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);
SHOW TABLES;
DESC departments;
DESC faculty;
USE niet_research;
-- DEPARTMENTS
INSERT INTO departments (dept_code, dept_name, established_year) VALUES
('CSE',     'Computer Science & Engineering',         1998),
('ECE',     'Electronics & Communication Engg.',      1999),
('ME',      'Mechanical Engineering',                 2000),
('EEE',     'Electrical & Electronics Engg.',         2001),
('AI_DS',   'Artificial Intelligence & Data Science', 2019),
('APPLIED', 'Applied Sciences',                       1998);
-- FACULTY (password for all = "password123")
INSERT INTO faculty (dept_id,name,email,password_hash,role,designation,is_phd,
joining_year,google_scholar_id,h_index,i10_index,avg_impact_factor,
research_score,total_publications,total_citations) VALUES
(1,'Dr. Vivek Sharma','vivek@niet.co.in',
'$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC',
'faculty','Professor',1,2010,'GS_VS001',15,22,3.21,92.4,48,1245),

(1,'Dr. Neha Singh','neha@niet.co.in',
'$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC',
'hod','Associate Professor',1,2012,'GS_NS002',13,18,2.95,89.7,14,680),

(1,'Dr. Pankaj Kumar','pankaj@niet.co.in',
'$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC',
'faculty','Assistant Professor',1,2015,'GS_PK003',9,11,2.40,82.1,11,520),

(1,'Dr. Richa Gupta','richa@niet.co.in',
'$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC',
'faculty','Assistant Professor',1,2016,'GS_RG004',8,10,2.10,78.5,8,410),

(1,'Dr. Manish Kumar','manish@niet.co.in',
'$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC',
'faculty','Associate Professor',1,2013,'GS_MK005',7,8,1.95,74.2,7,360),

(1,'Dr. Anjali Verma','anjali@niet.co.in',
'$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC',
'faculty','Assistant Professor',0,2018,'GS_AV006',6,6,1.80,68.0,5,240),

(NULL,'Dean R&D','dean@niet.co.in',
'$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC',
'dean_rd','Dean R&D',1,2005,NULL,18,28,3.50,NULL,NULL,NULL);
-- Update HOD
UPDATE departments SET hod_faculty_id = 2 WHERE dept_code = 'CSE';
UPDATE faculty
SET password_hash = '$2b$12$Q1eektq9tGmjoOrqS5a1SuhsVhotxbPixgErfrDlb/hTGaiXbAadW';
DESC faculty;
UPDATE faculty
SET password_hash = '$2b$12$Q1eektq9tGmjoOrqS5a1SuhsVhotxbPixgErfrDlb/hTGaiXbAadW'
WHERE faculty_id > 0;
SELECT faculty_id, name, email, role
FROM faculty;
SELECT COUNT(*) AS total_faculty
FROM faculty;
COMMIT;