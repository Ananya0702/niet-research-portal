import pandas as pd

data_path = 'app/ml/data/journal_lookup.csv'
df = pd.read_csv(data_path)

new_journals = pd.DataFrame({
    'journal_name': [
        'IEEE Transactions on Neural Networks and Learning Systems',
        'IEEE Transactions on Neural Networks',
        'Nature Machine Intelligence',
        'IEEE Transactions on Pattern Analysis and Machine Intelligence',
        'Expert Systems with Applications',
        'Knowledge-Based Systems',
        'Neural Networks',
        'IEEE Access',
        'Computers and Security',
        'IEEE Internet of Things Journal',
        'IEEE IoT Journal',
        'Journal of Big Data',
        'Artificial Intelligence in Medicine',
        'Medical Image Analysis',
        'IEEE Transactions on Medical Imaging',
        'IEEE Transactions on Signal Processing',
        'Pattern Recognition',
        'Information Sciences',
        'Future Generation Computer Systems',
        'Computer Networks',
        'Applied Energy',
        'Renewable Energy',
        'Composites Part B Engineering',
        'Mechanical Systems and Signal Processing',
        'Journal of Power Sources',
        'Energy Conversion and Management',
        'Sensors',
        'Multimedia Tools and Applications',
        'Journal of Cloud Computing',
        'Big Data Research',
        'IEEE Transactions on Knowledge and Data Engineering',
        'ACM Computing Surveys',
        'Journal of Machine Learning Research',
        'Machine Learning',
        'International Journal of Computer Vision',
        'IEEE Communications Letters',
        'IEEE Transactions on Communications',
        'Wireless Communications and Mobile Computing',
        'Biomedical Signal Processing and Control',
        'Signal Processing',
        'Applied Thermal Engineering',
        'Quantum Information Processing',
        'Mathematical Biosciences',
        'European Journal of Operational Research',
        'Robotics and Autonomous Systems',
        'Computer Vision and Image Understanding',
        'Expert Systems',
        'IEEE Transactions on Cybernetics',
        'IEEE Transactions on Industrial Electronics',
        'Neurocomputing',
    ],
    'quartile': [
        'Q1','Q1','Q1','Q1','Q1','Q1','Q1','Q2','Q1','Q1',
        'Q1','Q2','Q1','Q1','Q1','Q1','Q1','Q1','Q1','Q1',
        'Q1','Q1','Q1','Q1','Q1','Q1','Q3','Q3','Q3','Q3',
        'Q1','Q1','Q1','Q1','Q1','Q2','Q1','Q3','Q2','Q2',
        'Q1','Q2','Q2','Q1','Q2','Q2','Q2','Q1','Q1','Q2',
    ],
    'indexing': [
        'SCI','SCI','SCI','SCI','SCI','SCI','SCI','SCIE','SCI','SCI',
        'SCI','SCIE','SCI','SCI','SCI','SCI','SCI','SCI','SCI','SCI',
        'SCI','SCI','SCI','SCI','SCI','SCI','Scopus','SCIE','SCIE','SCIE',
        'SCI','SCI','SCI','SCI','SCI','SCI','SCI','Scopus','SCIE','SCIE',
        'SCI','SCI','SCI','SCI','SCI','SCI','SCI','SCI','SCI','SCI',
    ]
})

new_journals['journal_lower'] = new_journals['journal_name'].str.lower().str.strip()
df['journal_lower'] = df['journal_name'].str.lower().str.strip()

combined = pd.concat([df, new_journals]).drop_duplicates(subset='journal_lower')
combined.to_csv(data_path, index=False)
print(f'Journal lookup now has {len(combined)} journals')