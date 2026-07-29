USE niet_research;


SELECT d.dept_name, COUNT(p.pub_id) as publications
FROM departments d
LEFT JOIN faculty f ON f.dept_id = d.dept_id
LEFT JOIN publications p ON p.faculty_id = f.faculty_id
GROUP BY d.dept_name;

USE niet_research;

 


SELECT faculty_id, name, dept_id, role FROM faculty ORDER BY faculty_id;

USE niet_research;

-- Add faculty for other departments
INSERT INTO faculty (dept_id, name, email, password_hash, role, designation, is_phd, joining_year, google_scholar_id, h_index, i10_index, avg_impact_factor, research_score, total_publications, total_citations) VALUES
-- ECE Department (dept_id=2)
(2,'Dr. Priya Sharma','priya@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','hod','Professor',1,2009,'GS_PS007',14,20,3.10,88.1,13,580),
(2,'Dr. Arun Mishra','arun@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','faculty','Associate Professor',1,2011,'GS_AM008',11,15,2.70,80.3,10,420),
(2,'Dr. Kavita Singh','kavita@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','faculty','Assistant Professor',1,2014,'GS_KS009',9,12,2.30,75.0,8,310),
(2,'Dr. Rohit Jain','rohit@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','faculty','Assistant Professor',0,2017,'GS_RJ010',7,9,2.00,70.5,6,210),

-- ME Department (dept_id=3)
(3,'Dr. Suresh Gupta','suresh@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','hod','Professor',1,2008,'GS_SG012',13,19,2.90,88.1,12,480),
(3,'Dr. Meena Verma','meena@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','faculty','Associate Professor',1,2012,'GS_MV013',10,13,2.50,77.4,9,350),
(3,'Dr. Ajay Singh','ajay@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','faculty','Assistant Professor',0,2015,'GS_AS014',8,11,2.20,72.0,7,280),

-- EEE Department (dept_id=4)
(4,'Dr. Deepak Kumar','deepak@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','hod','Professor',1,2010,'GS_DK016',12,16,2.75,82.6,10,380),
(4,'Dr. Anita Sharma','anita@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','faculty','Associate Professor',1,2013,'GS_AS017',10,14,2.60,78.2,8,320),
(4,'Dr. Vijay Yadav','vijay@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','faculty','Assistant Professor',0,2016,'GS_VY018',8,10,2.25,73.5,6,240),

-- AI & DS Department (dept_id=5)
(5,'Dr. Sachin Gupta','sachin@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','hod','Professor',1,2009,'GS_SGU019',13,18,2.80,85.3,11,430),
(5,'Dr. Sonal Jain','sonal@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','faculty','Associate Professor',1,2013,'GS_SJ020',10,13,2.55,76.9,8,300),

-- Applied Sciences (dept_id=6)
(6,'Dr. Anand Prakash','anand@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','hod','Professor',1,2007,'GS_AP021',11,15,2.70,80.0,10,390),
(6,'Dr. Ritu Singh','ritu@niet.co.in','$2b$12$KIX8X8X8X8X8X8X8X8X8uuFnRSsxKZuD5YQWIY0OLGiVm/wbSzlC','faculty','Associate Professor',1,2011,'GS_RS022',9,12,2.40,75.5,8,310);

SELECT faculty_id, name, dept_id FROM faculty ORDER BY faculty_id;

USE niet_research;

-- ECE Department (faculty_ids 8-11)
INSERT INTO publications (faculty_id, title, journal_name, doi, indexing, quartile, impact_factor, year, citations_count, ml_topic) VALUES
(8, 'Deep Learning for Signal Processing', 'IEEE Trans. Signal Processing', '10.1109/TSP.2024.001', 'SCI', 'Q1', 9.4, 2024, 10, 'Deep Learning'),
(8, '5G Network Optimization using ML', 'IEEE Communications', '10.1109/COMM.2023.001', 'SCI', 'Q1', 11.2, 2023, 18, 'Machine Learning'),
(9, 'Smart Antenna Design for IoT', 'IEEE Trans. Antennas', '10.1109/TAP.2023.001', 'SCI', 'Q1', 5.7, 2023, 12, 'IoT'),
(9, 'MIMO Systems for 5G', 'Wireless Communications', '10.1109/WC.2022.001', 'SCI', 'Q2', 4.2, 2022, 15, 'Machine Learning'),
(10, 'Embedded ML for Medical Devices', 'Biomedical Engineering', '10.1109/BME.2024.001', 'SCI', 'Q2', 3.8, 2024, 6, 'Machine Learning'),
(10, 'VLSI Design Optimization', 'Integration VLSI Journal', '10.1016/vlsi.2023.001', 'SCIE', 'Q2', 2.9, 2023, 8, 'Data Science'),
(11, 'Digital Signal Processing Survey', 'Signal Processing', '10.1016/sigpro.2022.001', 'SCI', 'Q1', 4.4, 2022, 20, 'Machine Learning'),

-- ME Department (faculty_ids 12-14)
(12, 'Lightweight Composite Materials for Aerospace', 'Composites Part B', '10.1016/compb.2024.001', 'SCI', 'Q1', 9.1, 2024, 8, 'Data Science'),
(12, 'Thermal Analysis of Heat Exchangers', 'Applied Thermal Engineering', '10.1016/apptherm.2023.001', 'SCI', 'Q1', 6.4, 2023, 14, 'Data Science'),
(13, 'Additive Manufacturing Techniques', 'Journal of Manufacturing', '10.1016/jmfg.2023.001', 'SCI', 'Q2', 4.1, 2023, 9, 'Machine Learning'),
(13, 'Vibration Analysis using ML', 'Mechanical Systems Signal Processing', '10.1016/mssp.2022.001', 'SCI', 'Q1', 8.4, 2022, 16, 'Machine Learning'),
(14, 'CFD Simulation for Turbines', 'Energy Conversion and Management', '10.1016/enconman.2022.001', 'SCI', 'Q1', 9.9, 2022, 11, 'Data Science'),

-- EEE Department (faculty_ids 15-17)
(15, 'Smart Grid Demand Forecasting using ML', 'Applied Energy', '10.1016/apenergy.2024.001', 'SCI', 'Q1', 11.2, 2024, 9, 'Machine Learning'),
(15, 'Renewable Energy Optimization', 'Renewable Energy', '10.1016/renene.2023.001', 'SCI', 'Q1', 8.7, 2023, 13, 'Machine Learning'),
(16, 'Power Electronics for EV Charging', 'IEEE Trans. Power Electronics', '10.1109/TPEL.2023.001', 'SCI', 'Q1', 6.7, 2023, 10, 'IoT'),
(17, 'Energy Storage Systems Survey', 'Journal of Power Sources', '10.1016/jpowsour.2022.001', 'SCI', 'Q1', 9.2, 2022, 17, 'Data Science'),

-- AI & DS Department (faculty_ids 18-19)
(18, 'Explainable AI for Finance', 'Expert Systems with Applications', '10.1016/eswa.2024.003', 'SCI', 'Q1', 8.5, 2024, 7, 'Machine Learning'),
(18, 'Generative AI for Healthcare', 'Artificial Intelligence in Medicine', '10.1016/artmed.2024.001', 'SCI', 'Q1', 7.0, 2024, 5, 'Deep Learning'),
(19, 'Federated Learning Privacy', 'IEEE Trans. Neural Networks', '10.1109/TNNLS.2023.003', 'SCI', 'Q1', 10.4, 2023, 11, 'Machine Learning'),
(19, 'AutoML for Tabular Data', 'Machine Learning Journal', '10.1007/mlj.2023.001', 'SCI', 'Q2', 5.4, 2023, 8, 'Machine Learning'),

-- Applied Sciences (faculty_ids 20-21)
(20, 'Quantum Computing for Cryptography', 'Quantum Information Processing', '10.1007/qip.2024.001', 'SCI', 'Q2', 3.5, 2024, 4, 'Machine Learning'),
(20, 'Mathematical Modeling in Biology', 'Mathematical Biosciences', '10.1016/mbs.2023.001', 'SCI', 'Q2', 4.1, 2023, 7, 'Data Science'),
(21, 'Statistical Learning Theory', 'Journal of Machine Learning Research', '10.JMLR.2023.001', 'SCI', 'Q1', 6.5, 2023, 9, 'Machine Learning'),
(21, 'Optimization Algorithms Survey', 'European Journal of OR', '10.1016/ejor.2022.001', 'SCI', 'Q1', 6.4, 2022, 12, 'Data Science');

-- Citations yearly for all new faculty
INSERT INTO citations_yearly (faculty_id, year, citations_count) VALUES
(8,2019,90),(8,2020,140),(8,2021,210),(8,2022,320),(8,2023,480),(8,2024,580),
(9,2019,70),(9,2020,110),(9,2021,170),(9,2022,260),(9,2023,380),(9,2024,420),
(10,2019,50),(10,2020,80),(10,2021,120),(10,2022,190),(10,2023,280),(10,2024,310),
(11,2019,40),(11,2020,65),(11,2021,100),(11,2022,160),(11,2023,230),(11,2024,260),
(12,2019,80),(12,2020,120),(12,2021,185),(12,2022,280),(12,2023,400),(12,2024,480),
(13,2019,60),(13,2020,95),(13,2021,145),(13,2022,220),(13,2023,320),(13,2024,350),
(14,2019,45),(14,2020,70),(14,2021,110),(14,2022,170),(14,2023,250),(14,2024,280),
(15,2019,75),(15,2020,115),(15,2021,175),(15,2022,265),(15,2023,380),(15,2024,430),
(16,2019,55),(16,2020,85),(16,2021,130),(16,2022,200),(16,2023,290),(16,2024,320),
(17,2019,40),(17,2020,62),(17,2021,95),(17,2022,148),(17,2023,215),(17,2024,240),
(18,2019,65),(18,2020,100),(18,2021,155),(18,2022,235),(18,2023,340),(18,2024,380),
(19,2019,50),(19,2020,78),(19,2021,120),(19,2022,183),(19,2023,265),(19,2024,300),
(20,2019,55),(20,2020,85),(20,2021,130),(20,2022,198),(20,2023,285),(20,2024,320),
(21,2019,45),(21,2020,70),(21,2021,108),(21,2022,165),(21,2023,240),(21,2024,270);

-- Research areas for new faculty
INSERT INTO faculty_research_areas (faculty_id, area_name, pub_count, expertise_percent) VALUES
(8,'Machine Learning',2,40),(8,'Deep Learning',1,30),(8,'IoT',1,30),
(9,'IoT',1,40),(9,'Machine Learning',1,35),(9,'Data Science',1,25),
(12,'Data Science',2,45),(12,'Machine Learning',1,35),(12,'Computer Vision',1,20),
(15,'Machine Learning',2,50),(15,'IoT',1,30),(15,'Data Science',1,20),
(18,'Machine Learning',2,45),(18,'Deep Learning',1,35),(18,'Data Science',1,20),
(20,'Machine Learning',2,50),(20,'Data Science',2,50);

-- Update dept HODs
UPDATE departments SET hod_faculty_id = 8  WHERE dept_code = 'ECE';
UPDATE departments SET hod_faculty_id = 12 WHERE dept_code = 'ME';
UPDATE departments SET hod_faculty_id = 15 WHERE dept_code = 'EEE';
UPDATE departments SET hod_faculty_id = 18 WHERE dept_code = 'AI_DS';
UPDATE departments SET hod_faculty_id = 20 WHERE dept_code = 'APPLIED';

SELECT d.dept_name, COUNT(p.pub_id) as publications
FROM departments d
LEFT JOIN faculty f ON f.dept_id = d.dept_id
LEFT JOIN publications p ON p.faculty_id = f.faculty_id
GROUP BY d.dept_name
ORDER BY publications DESC;

COMMIT; 