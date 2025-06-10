-- Seed initial exam board data
INSERT INTO exam_boards (code, full_name, country, website_url) VALUES
('AQA', 'Assessment and Qualifications Alliance', 'UK', 'https://www.aqa.org.uk'),
('EDEXCEL', 'Pearson Edexcel', 'UK', 'https://qualifications.pearson.com'),
('OCR', 'Oxford, Cambridge and RSA', 'UK', 'https://www.ocr.org.uk'),
('WJEC', 'Welsh Joint Education Committee', 'UK', 'https://www.wjec.co.uk'),
('EDUQAS', 'WJEC Eduqas', 'UK', 'https://www.eduqas.co.uk'),
('CCEA', 'Council for Curriculum, Examinations & Assessment', 'UK', 'https://ccea.org.uk'),
('SQA', 'Scottish Qualifications Authority', 'UK', 'https://www.sqa.org.uk'),
('CIE', 'Cambridge International Examinations', 'International', 'https://www.cambridgeinternational.org');

-- Seed qualification types
INSERT INTO qualification_types (code, name, level) VALUES
('GCSE', 'General Certificate of Secondary Education', 2),
('A_LEVEL', 'Advanced Level', 3),
('AS_LEVEL', 'Advanced Subsidiary Level', 3),
('BTEC', 'Business and Technology Education Council', 2),
('IB', 'International Baccalaureate', 3),
('IGCSE', 'International GCSE', 2); 