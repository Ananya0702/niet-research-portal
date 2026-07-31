import os
import re
import logging

logger = logging.getLogger(__name__)

RESEARCH_TOPICS = [
    "Machine Learning",
    "Deep Learning",
    "Computer Vision",
    "Natural Language Processing",
    "Internet of Things",
    "Cyber Security",
    "Data Science",
    "Blockchain",
    "Edge Computing",
    "Robotics",
    "Signal Processing",
    "Power Systems",
    "Mechanical Engineering",
    "Biomedical Engineering",
    "Quantum Computing",
]

# Try to load transformers (optional — provides better accuracy)
_transformers_available = False
_classifier = None
try:
    from transformers import pipeline
    _transformers_available = True
except ImportError:
    logger.warning("transformers not installed — using sklearn fallback for topics")

# Try to load rapidfuzz (optional — provides better journal matching)
_rapidfuzz_available = False
try:
    from rapidfuzz import process, fuzz
    _rapidfuzz_available = True
except ImportError:
    logger.warning("rapidfuzz not installed — using basic string matching for journals")

# Try to load sklearn (fallback)
_sklearn_available = False
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.svm import LinearSVC
    from sklearn.pipeline import Pipeline
    _sklearn_available = True
except ImportError:
    logger.warning("sklearn not installed — using keyword matching as last resort")

_journal_df = None
_sklearn_model = None


def get_classifier():
    global _classifier
    if _transformers_available and _classifier is None:
        try:
            logger.info("Loading zero-shot classifier model...")
            _classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=-1
            )
            logger.info("Transformers model loaded successfully!")
        except Exception as e:
            logger.warning(f"Failed to load transformers model: {e}")
    return _classifier


def _build_sklearn_model():
    global _sklearn_model
    if _sklearn_model is not None:
        return _sklearn_model

    # Training data: topic keywords for each research area
    topic_texts = []
    topic_labels = []
    topic_map = {
        "Machine Learning": ["machine learning", "supervised", "unsupervised", "regression",
                             "classification", "ensemble", "random forest", "svm", "boosting",
                             "gradient", "feature selection", "dimensionality reduction",
                             "cross-validation", "hyperparameter", "model selection"],
        "Deep Learning": ["deep learning", "neural network", "cnn", "rnn", "lstm", "transformer",
                          "attention mechanism", "bert", "gpt", "autoencoder", "gan",
                          "generative adversarial", "reinforcement learning", "deep q",
                          "backpropagation", "convolutional", "residual network"],
        "Computer Vision": ["computer vision", "image recognition", "object detection", "segmentation",
                            "facial recognition", "image classification", "visual", "yolo",
                            "image processing", "video analysis", "pose estimation", "ocr"],
        "Natural Language Processing": ["natural language", "text mining", "sentiment analysis",
                                        "named entity", "text classification", "language model",
                                        "machine translation", "question answering", "chatbot",
                                        "text generation", "summarization", "word embedding"],
        "Internet of Things": ["iot", "internet of things", "smart home", "smart city",
                               "sensor network", "wearable", "embedded system", "m2m",
                               "industrial iot", "smart agriculture", "connected device"],
        "Cyber Security": ["cyber security", "cybersecurity", "intrusion detection", "malware",
                           "ransomware", "phishing", "network security", "encryption",
                           "authentication", "access control", "firewall", "vulnerability",
                           "zero trust", "forensic"],
        "Data Science": ["data science", "big data", "data analytics", "data mining",
                         "statistical", "visualization", "predictive modeling",
                         "dimensionality reduction", "pca", "clustering", "anomaly detection",
                         "time series", "forecasting"],
        "Blockchain": ["blockchain", "cryptocurrency", "smart contract", "distributed ledger",
                       "bitcoin", "ethereum", "consensus", "decentralized", "defi", "nft"],
        "Edge Computing": ["edge computing", "fog computing", "edge ai", "mobile edge",
                           "cloudlet", "edge analytics", "distributed computing",
                           "offloading", "edge device"],
        "Robotics": ["robotics", "autonomous", "robot", "manipulator", "navigation",
                     "slam", "path planning", "humanoid", "drone", "uav", "automation",
                     "control system", "kinematics"],
        "Signal Processing": ["signal processing", "speech recognition", "audio",
                              "filter", "wavelet", "spectrum", "beamforming",
                              "compression", "denoising", "equalization", "modulation"],
        "Power Systems": ["power system", "smart grid", "renewable energy",
                          "solar", "wind energy", "energy management", "microgrid",
                          "power electronics", "electric vehicle", "energy storage",
                          "load forecasting", "demand response"],
        "Mechanical Engineering": ["mechanical", "composite", "manufacturing", "additive",
                                   "thermal", "heat", "vibration", "fatigue", "turbine",
                                   "aerospace", "fluid dynamics", "cfd", "thermodynamics"],
        "Biomedical Engineering": ["biomedical", "medical image", "healthcare", "diagnosis",
                                   "eeg", "ecg", "mri", "ct scan", "biosensor",
                                   "prosthetic", "genomic", "bioinformatics"],
        "Quantum Computing": ["quantum", "quantum computing", "qubit", "quantum algorithm",
                              "quantum cryptography", "quantum machine learning",
                              "superposition", "entanglement"],
    }

    for topic, keywords in topic_map.items():
        for kw in keywords:
            topic_texts.append(kw)
            topic_labels.append(topic)

    if _sklearn_available and topic_texts:
        try:
            model = Pipeline([
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), stop_words="english")),
                ("clf", LinearSVC(class_weight="balanced", C=1.0, max_iter=2000)),
            ])
            model.fit(topic_texts, topic_labels)
            _sklearn_model = model
            logger.info("Sklearn topic model trained successfully!")
        except Exception as e:
            logger.warning(f"Failed to train sklearn model: {e}")

    return _sklearn_model


def get_journal_df():
    global _journal_df
    if _journal_df is not None:
        return _journal_df

    try:
        import pandas as pd
        data_path = os.path.join(os.path.dirname(__file__), "data", "journal_lookup.csv")
        if os.path.exists(data_path):
            _journal_df = pd.read_csv(data_path)
            _journal_df["journal_lower"] = _journal_df["journal_name"].str.lower().str.strip()
        else:
            _journal_df = pd.DataFrame(columns=["journal_name", "quartile", "indexing", "journal_lower"])
    except Exception:
        _journal_df = pd.DataFrame(columns=["journal_name", "quartile", "indexing", "journal_lower"])

    return _journal_df


def classify_topic(title: str) -> dict:
    if not title or len(title.strip()) < 5:
        return {"topic": "Other", "confidence": 0.0}

    # Method 1: Transformers (best accuracy)
    if _transformers_available:
        try:
            clf = get_classifier()
            if clf:
                result = clf(title, RESEARCH_TOPICS, multi_label=False)
                return {"topic": result["labels"][0], "confidence": round(result["scores"][0], 3)}
        except Exception as e:
            logger.warning(f"Transformers classification failed: {e}")

    # Method 2: Sklearn TF-IDF + SVM
    if _sklearn_available:
        try:
            model = _build_sklearn_model()
            if model:
                pred = model.predict([title])[0]
                return {"topic": pred, "confidence": 0.7}
        except Exception as e:
            logger.warning(f"Sklearn classification failed: {e}")

    # Method 3: Simple keyword scoring (always works)
    title_lower = title.lower()
    scores = {}
    for topic in RESEARCH_TOPICS:
        keywords = topic.lower().split()
        score = sum(1 for kw in keywords if kw in title_lower)
        if score > 0:
            scores[topic] = score
    if scores:
        best = max(scores, key=scores.get)
        return {"topic": best, "confidence": round(scores[best] / len(RESEARCH_TOPICS), 3)}

    return {"topic": "Other", "confidence": 0.0}


def _infer_indexing_from_name(journal_name: str) -> str:
    """Infer indexing from journal name patterns when not in lookup."""
    name = journal_name.lower().strip()
    # IEEE journals are typically SCI/SCIE
    if "ieee" in name:
        return "SCIE"  # Most IEEE journals are SCIE
    # Springer / Elsevier / Taylor & Francis / Sage
    if any(x in name for x in ["springer", "elsevier", "taylor & francis", "sage"]):
        return "SCI"
    # Nature / Science journals
    if any(x in name for x in ["nature ", " science", "cell ", " the lancet"]):
        return "SCI"
    # ACM conferences / journals
    if "acm" in name:
        return "Scopus"
    # Conferences
    if any(x in name for x in ["conference", "proceedings", "workshop", "symposium",
                                "proc.", "lecture notes", "lncs", "lnai"]):
        return "Scopus"
    # Open access / MDPI
    if any(x in name for x in ["mdpi", "plos", "frontiers", "hindawi", "wiley"]):
        return "SCIE"
    return "None"


def _infer_quartile_from_indexing(indexing: str) -> str:
    """Assign a reasonable default quartile based on indexing type."""
    if indexing in ("SCI",):
        return "Q2"
    if indexing == "SCIE":
        return "Q2"
    if indexing == "Scopus":
        return "Q3"
    return "N/A"


def detect_indexing(journal_name: str) -> str:
    if not journal_name:
        return _infer_indexing_from_name(journal_name or "")

    try:
        df = get_journal_df()
        if not df.empty:
            query = journal_name.lower().strip()
            choices = df["journal_lower"].tolist()

            if _rapidfuzz_available:
                match = process.extractOne(query, choices, scorer=fuzz.token_sort_ratio, score_cutoff=75)
                if match:
                    idx = df[df["journal_lower"] == match[0]].index[0]
                    return df.loc[idx, "indexing"]

            for _, row in df.iterrows():
                jl = row["journal_lower"]
                if jl in query or query in jl:
                    return row["indexing"]

        return _infer_indexing_from_name(journal_name)
    except Exception as e:
        logger.error(f"Indexing detection error: {e}")
        return _infer_indexing_from_name(journal_name)


def detect_quartile(journal_name: str) -> str:
    if not journal_name:
        return _infer_quartile_from_indexing(_infer_indexing_from_name(journal_name or ""))

    try:
        df = get_journal_df()
        if not df.empty:
            query = journal_name.lower().strip()
            choices = df["journal_lower"].tolist()

            if _rapidfuzz_available:
                match = process.extractOne(query, choices, scorer=fuzz.token_sort_ratio, score_cutoff=75)
                if match:
                    idx = df[df["journal_lower"] == match[0]].index[0]
                    return df.loc[idx, "quartile"]

            for _, row in df.iterrows():
                jl = row["journal_lower"]
                if jl in query or query in jl:
                    return row["quartile"]

        inferred = _infer_indexing_from_name(journal_name)
        return _infer_quartile_from_indexing(inferred)
    except Exception as e:
        logger.error(f"Quartile detection error: {e}")
        inferred = _infer_indexing_from_name(journal_name)
        return _infer_quartile_from_indexing(inferred)


CONFERENCE_INDICATORS = [
    "conference", "proceedings", "workshop", "symposium", "icml", "cvpr",
    "iccv", "eccv", "acl", "naacl", "emnlp", "neurips", "iclr", "kdd",
    "icde", "icse", "asplos", "micro", "isca", "sigmod", "vldb",
    "mobicom", "sigcomm", "osdi", "sosp", "ccs", "usenix", "aaai",
    "ijcai", "icra", "iros", "iccad", "dac", "cikm", "www",
    "icwsm", "wsdm", "sigir", "iscas", "icassp", "icip", "icpr",
    "icb", "btas", "icmla", "icit", "icacci", "iccct", "icccnt",
    "icacc", "icissp", "iciss", "icic", "icnc", "aita", "icact",
    "icc", "globecom", "infocom", "icon", "icn", "icdcn",
    "int. conf.", "international conference", "intl conf",
    "ieee conference", "springer conference", "elsevier conference",
    "acm conference", "int. symposium", "international symposium",
    "springer berlin", "crc press", "aip conference",
]
JOURNAL_INDICATORS = [
    "journal", "ieee access", "nature", "elsevier", "springer",
    "transactions on", "applied sciences", "international journal",
    "journal of", "acta", "computers &", "lecture notes in",
    "advances in", "proceedings of the ieee", "ieee reviews",
    "acm computing", "acm transactions", "sensors", "energies",
    "molecules", "materials", "nanomaterials", "electronics",
    "remotesensing", "sustainability", "polymers",
]

def classify_publication_type(title: str, journal_name: str) -> str:
    venue = (journal_name or "").lower().strip()
    combined = f"{title} {journal_name}".lower()
    for ind in CONFERENCE_INDICATORS:
        if ind in venue:
            return "Conference"
    for ind in JOURNAL_INDICATORS:
        if ind in venue:
            return "Journal"
    for ind in CONFERENCE_INDICATORS:
        if ind in combined:
            return "Conference"
    for ind in JOURNAL_INDICATORS:
        if ind in combined:
            return "Journal"
    return "Journal"
    return "Journal"


def process_publication(title: str, journal_name: str) -> dict:
    topic_result = classify_topic(title)
    indexing = detect_indexing(journal_name)
    quartile = detect_quartile(journal_name)

    if quartile == "N/A" and indexing in ["SCI", "SCIE"]:
        quartile = "Q2"

    return {
        "ml_topic": topic_result["topic"],
        "ml_confidence": topic_result["confidence"],
        "indexing": indexing,
        "quartile": quartile,
    }
