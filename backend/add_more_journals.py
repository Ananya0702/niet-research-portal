import pandas as pd

data_path = 'app/ml/data/journal_lookup.csv'
df = pd.read_csv(data_path)

extra = pd.DataFrame({
    'journal_name': [
        # IEEE Journals
        'IEEE Access',
        'IEEE Transactions on Industrial Informatics',
        'IEEE Transactions on Intelligent Transportation Systems',
        'IEEE Internet of Things Journal',
        'IEEE Transactions on Vehicular Technology',
        'IEEE Communications Letters',
        'IEEE Transactions on Network Science',
        'IEEE Sensors Journal',
        'IEEE Transactions on Emerging Topics in Computing',
        # Springer Journals
        'Neural Computing and Applications',
        'Wireless Networks',
        'Cluster Computing',
        'Journal of Ambient Intelligence and Humanized Computing',
        'Multimedia Tools and Applications',
        'Soft Computing',
        'International Journal of Machine Learning and Cybernetics',
        'Telecommunication Systems',
        'Mobile Networks and Applications',
        # Elsevier Journals
        'Ad Hoc Networks',
        'Computer Communications',
        'Vehicular Communications',
        'Journal of Network and Computer Applications',
        'Simulation Modelling Practice and Theory',
        'Mathematical Problems in Engineering',
        'Journal of King Saud University Computer and Information Sciences',
        'Egyptian Informatics Journal',
        'Alexandria Engineering Journal',
        # Computer Vision/AI
        'Pattern Recognition Letters',
        'Engineering Applications of Artificial Intelligence',
        'Applied Soft Computing',
        'Swarm and Evolutionary Computation',
        # General
        'PLOS ONE',
        'Scientific Reports',
        'Heliyon',
        'PeerJ Computer Science',
        # Conferences treated as journals on Scholar
        'International Journal of Advanced Computer Science and Applications',
        'International Journal of Computer Applications',
        'International Journal of Engineering Research and Technology',
        'Journal of Physics Conference Series',
        'IOP Conference Series',
        'Lecture Notes in Networks and Systems',
        'Lecture Notes in Computer Science',
        'Communications in Computer and Information Science',
        'Advances in Intelligent Systems and Computing',
    ],
    'quartile': [
        'Q2','Q1','Q1','Q1','Q1','Q2','Q2','Q2','Q2',
        'Q2','Q2','Q2','Q2','Q3','Q2','Q2','Q3','Q3',
        'Q2','Q2','Q2','Q2','Q2','Q3','Q2','Q3','Q2',
        'Q3','Q2','Q2','Q3',
        'Q2','Q2','Q3','Q3',
        'Q4','Q4','Q4','Q4','Q4','Q3','Q3','Q3','Q3',
    ],
    'indexing': [
        'SCIE','SCI','SCI','SCI','SCI','SCIE','SCIE','SCIE','SCIE',
        'SCIE','SCIE','SCIE','SCIE','SCIE','SCIE','SCIE','Scopus','Scopus',
        'SCI','SCI','SCIE','SCIE','SCIE','Scopus','Scopus','Scopus','Scopus',
        'SCI','SCI','SCI','SCI',
        'SCIE','SCIE','Scopus','Scopus',
        'UGC Care','UGC Care','UGC Care','Scopus','Scopus','Scopus','Scopus','Scopus','Scopus',
    ]
})

extra['journal_lower'] = extra['journal_name'].str.lower().str.strip()
df['journal_lower']    = df['journal_name'].str.lower().str.strip()

combined = pd.concat([df, extra]).drop_duplicates(subset='journal_lower')
combined.to_csv(data_path, index=False)
print(f'Journal lookup now has {len(combined)} entries')