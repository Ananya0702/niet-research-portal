import requests
import pandas as pd
import os

os.makedirs("app/ml/data", exist_ok=True)

print("Downloading Scimago journal rankings...")

# Download SJR 2023 data
url = "https://www.scimagojr.com/journalrank.php?out=xls"
headers = {"User-Agent": "Mozilla/5.0"}

try:
    r = requests.get(url, headers=headers, timeout=30)
    with open("app/ml/data/sjr_journals.csv", "wb") as f:
        f.write(r.content)
    print("Downloaded SJR data successfully!")
except Exception as e:
    print(f"Could not download: {e}")
    print("Creating manual fallback data...")

# Create a manual fallback with common journals
journals = {
    "journal_name": [
        "IEEE Transactions on Neural Networks and Learning Systems",
        "IEEE Transactions on Pattern Analysis and Machine Intelligence",
        "Expert Systems with Applications",
        "Knowledge-Based Systems",
        "Information Sciences",
        "Pattern Recognition",
        "Neural Networks",
        "IEEE Access",
        "Computer Networks",
        "Future Generation Computer Systems",
        "Journal of Big Data",
        "Artificial Intelligence in Medicine",
        "Medical Image Analysis",
        "IEEE Transactions on Medical Imaging",
        "IEEE Transactions on Signal Processing",
        "IEEE Communications",
        "Computers and Security",
        "IEEE IoT Journal",
        "IEEE Transactions on Knowledge and Data Engineering",
        "ACM Computing Surveys",
        "Journal of Machine Learning Research",
        "Machine Learning",
        "International Journal of Computer Vision",
        "Computer Vision and Image Understanding",
        "Robotics and Autonomous Systems",
        "Applied Energy",
        "Renewable Energy",
        "Energy Conversion and Management",
        "Journal of Power Sources",
        "Composites Part B",
        "Applied Thermal Engineering",
        "Journal of Manufacturing Science",
        "Mechanical Systems and Signal Processing",
        "Quantum Information Processing",
        "Mathematical Biosciences",
        "European Journal of Operational Research",
        "Signal Processing",
        "Integration VLSI Journal",
        "Biomedical Signal Processing and Control",
        "Multimedia Tools and Applications",
        "Journal of Cloud Computing",
        "Big Data Research",
        "Wireless Communications and Mobile Computing",
        "Sensors",
        "Electronics",
    ],
    "quartile": [
        "Q1","Q1","Q1","Q1","Q1","Q1","Q1","Q2","Q1","Q1",
        "Q2","Q1","Q1","Q1","Q1","Q1","Q1","Q1","Q1","Q1",
        "Q1","Q1","Q1","Q2","Q2","Q1","Q1","Q1","Q1","Q1",
        "Q1","Q2","Q1","Q2","Q2","Q1","Q2","Q3","Q2","Q3",
        "Q3","Q3","Q3","Q3","Q3",
    ],
    "indexing": [
        "SCI","SCI","SCI","SCI","SCI","SCI","SCI","SCIE","SCI","SCI",
        "SCIE","SCI","SCI","SCI","SCI","SCI","SCI","SCI","SCI","SCI",
        "SCI","SCI","SCI","SCI","SCI","SCI","SCI","SCI","SCI","SCI",
        "SCI","SCIE","SCI","SCI","SCI","SCI","SCIE","SCIE","SCIE","SCIE",
        "SCIE","SCIE","SCIE","Scopus","Scopus",
    ]
}

df = pd.DataFrame(journals)
df.to_csv("app/ml/data/journal_lookup.csv", index=False)
print(f"Created journal lookup with {len(df)} journals")
print("Done!")