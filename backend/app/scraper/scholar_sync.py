import re
import time
import requests
from datetime import datetime
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _parse_scholar_html(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    h_index = i10_index = citedby = 0
    for td in soup.select("td.gsc_rsb_std"):
        txt = td.get_text(strip=True)
        nums = re.findall(r"\d+", txt)
        val = int(nums[0]) if nums else 0
        if h_index == 0:
            h_index = val
        elif i10_index == 0:
            i10_index = val
        elif citedby == 0:
            citedby = val

    publications = []
    for row in soup.select("tr.gsc_a_tr"):
        try:
            title_el = row.select_one("td.gsc_a_t a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)

            td2 = row.select_one("td.gsc_a_t")
            spans = td2.find_all("span", class_=False) if td2 else []
            journal = spans[-1].get_text(strip=True) if spans else "Unknown Journal"

            td3 = row.select_one("td.gsc_a_c")
            year_str = td3.get_text(strip=True) if td3 else ""
            year_match = re.search(r"\d{4}", year_str)
            year = int(year_match.group()) if year_match else datetime.now().year

            td4 = row.select_one("td.gsc_a_c a")
            cit_text = td4.get_text(strip=True) if td4 else "0"
            cit_match = re.search(r"\d+", cit_text)
            citations = int(cit_match.group()) if cit_match else 0

            publications.append({
                "title": title,
                "journal_name": journal,
                "year": year,
                "citations_count": citations,
                "doi": None,
            })
        except Exception:
            continue

    return {
        "h_index": h_index,
        "i10_index": i10_index,
        "citedby": citedby,
        "publications": publications,
    }


def fetch_scholar_data(scholar_id: str, mock: bool = True):
    if mock or not scholar_id:
        return _sample_scholar_data()

    # Tier 1: Direct HTTP scraping (fast — single request)
    try:
        return _fetch_via_http(scholar_id)
    except Exception as e:
        print(f"[Scholar] HTTP scraping failed: {e}")

    # Tier 2: scholarly library (slow — fills each pub individually)
    try:
        return _fetch_via_scholarly(scholar_id)
    except Exception as e:
        print(f"[Scholar] scholarly failed: {e}")

    # Tier 3: All methods failed
    raise Exception("Could not fetch from Google Scholar (rate limited or blocked). Please try again later.")


def _fetch_via_scholarly(scholar_id: str) -> dict:
    from scholarly import scholarly as sch

    print(f"\n{'='*50}")
    print(f"[Scholar] Fetching via scholarly: {scholar_id}")

    try:
        pg = sch.ProxyGenerator()
        pg.FreeProxies()
        sch.use_proxy(pg)
    except Exception:
        print("[Scholar] No proxy available")

    author = sch.search_author_id(scholar_id)
    author = sch.fill(author, sections=["basics", "indices", "counts", "publications"])

    name = author.get("name", "Unknown")
    pubs = author.get("publications", [])
    total = len(pubs)
    print(f"[Scholar] Found {name} -- {total} publications")

    publications = []
    pubs_sorted = sorted(pubs, key=lambda x: x.get("num_citations", 0), reverse=True)

    for idx, pub in enumerate(pubs_sorted):
        try:
            pub_filled = sch.fill(pub)
            bib = pub_filled.get("bib", {})

            title = bib.get("title", "").strip()
            if not title:
                continue

            journal = (
                bib.get("journal")
                or bib.get("venue")
                or bib.get("booktitle")
                or bib.get("publisher")
                or bib.get("conference")
                or ""
            ).strip()

            for prefix in ["Proceedings of ", "Proceedings of the ", "Proc. ", "In ", "In: "]:
                if journal.startswith(prefix):
                    journal = journal[len(prefix):]

            if not journal or journal.lower() in ["", "n/a", "unknown"]:
                journal = "Unknown Journal"

            year_raw = bib.get("pub_year", None)
            try:
                year = int(year_raw) if year_raw else datetime.now().year
            except Exception:
                year = datetime.now().year

            citations = pub_filled.get("num_citations", 0)
            print(f"  [{idx+1}/{total}] {title[:45]}... | {journal[:30]} | {year} | {citations} cit.")

            publications.append({
                "title": title,
                "journal_name": journal,
                "year": year,
                "citations_count": citations,
                "doi": bib.get("doi", None),
            })

            time.sleep(0.5)
        except Exception as e:
            print(f"  [{idx+1}] Skipped: {e}")
            continue

    print(f"[Scholar] Done -- {len(publications)} pubs from scholarly")
    return {
        "h_index": author.get("hindex", 0),
        "i10_index": author.get("i10index", 0),
        "citedby": author.get("citedby", 0),
        "publications": publications,
    }


def _fetch_via_http(scholar_id: str) -> dict:
    print(f"\n{'='*50}")
    print(f"[Scholar] Fetching via HTTP: {scholar_id}")

    url = f"https://scholar.google.com/citations?user={scholar_id}&hl=en&sortby=pubdate&pagesize=100"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    # Check for invalid ID (Google Scholar returns a search page instead of profile)
    if "User profile not found" in resp.text or "captcha" in resp.text.lower():
        raise Exception("Invalid Scholar ID or CAPTCHA blocked")

    data = _parse_scholar_html(resp.text)
    print(f"[Scholar] HTTP scrape got {len(data['publications'])} pubs, h={data['h_index']}")

    # If we got 0 pubs from a valid looking page, still return (might be empty profile)
    return data


def _sample_scholar_data() -> dict:
    return {
        "h_index": 12,
        "i10_index": 18,
        "citedby": 845,
        "publications": [
            {"title": "Deep Learning for Signal Processing in 5G Networks", "journal_name": "IEEE Transactions on Signal Processing", "year": 2024, "citations_count": 45, "doi": "10.1109/TSP.2024.001"},
            {"title": "Machine Learning Approaches for IoT Security", "journal_name": "IEEE Internet of Things Journal", "year": 2024, "citations_count": 38, "doi": "10.1109/JIOT.2024.001"},
            {"title": "A Novel Framework for Cloud-Edge Collaborative Computing", "journal_name": "Journal of Cloud Computing", "year": 2023, "citations_count": 62, "doi": "10.1007/s00450-023-001"},
            {"title": "Blockchain-Based Secure Data Sharing in Healthcare", "journal_name": "Future Generation Computer Systems", "year": 2023, "citations_count": 89, "doi": "10.1016/j.future.2023.001"},
            {"title": "Attention-Based LSTM for Stock Price Prediction", "journal_name": "Expert Systems with Applications", "year": 2023, "citations_count": 120, "doi": "10.1016/j.eswa.2023.001"},
            {"title": "Energy-Efficient Routing Protocols for Wireless Sensor Networks", "journal_name": "Ad Hoc Networks", "year": 2022, "citations_count": 75, "doi": "10.1016/j.adhoc.2022.001"},
            {"title": "Transfer Learning for Medical Image Classification", "journal_name": "Medical Image Analysis", "year": 2022, "citations_count": 156, "doi": "10.1016/j.media.2022.001"},
            {"title": "Federated Learning: Challenges and Opportunities", "journal_name": "ACM Computing Surveys", "year": 2022, "citations_count": 210, "doi": "10.1145/3544588"},
            {"title": "Smart Grid Optimization Using Reinforcement Learning", "journal_name": "Applied Energy", "year": 2021, "citations_count": 95, "doi": "10.1016/j.apenergy.2021.001"},
            {"title": "A Survey on Natural Language Processing for Indian Languages", "journal_name": "ACM Transactions on Asian Language Processing", "year": 2021, "citations_count": 48, "doi": "10.1145/3456789"},
            {"title": "Quantum Machine Learning: A Comprehensive Review", "journal_name": "Quantum Information Processing", "year": 2021, "citations_count": 67, "doi": "10.1007/s11128-021-001"},
            {"title": "Explainable AI in Autonomous Vehicles", "journal_name": "IEEE Transactions on Intelligent Transportation Systems", "year": 2020, "citations_count": 112, "doi": "10.1109/TITS.2020.001"},
            {"title": "Generative Adversarial Networks for Data Augmentation", "journal_name": "Pattern Recognition", "year": 2020, "citations_count": 185, "doi": "10.1016/j.patcog.2020.001"},
            {"title": "Edge Intelligence: Paving the Path to Smart Cities", "journal_name": "IEEE Communications Magazine", "year": 2020, "citations_count": 93, "doi": "10.1109/MCOM.2020.001"},
            {"title": "Cybersecurity Threats in IoT: A Survey", "journal_name": "Computers & Security", "year": 2019, "citations_count": 220, "doi": "10.1016/j.cose.2019.001"},
        ],
    }
