import re
import time
import urllib.parse
import os
import requests
from datetime import datetime
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def _parse_scholar_html(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    h_index = i10_index = citedby = 0

    for row in soup.select("#gsc_rsb_st tr"):
        label_el = row.select_one("td.gsc_rsb_sc1 a.gsc_rsb_f")
        if not label_el:
            continue
        label = label_el.get_text(strip=True).lower()
        values = []
        for td in row.select("td.gsc_rsb_std"):
            nums = re.findall(r"\d+", td.get_text(strip=True))
            values.append(int(nums[0]) if nums else 0)
        if not values:
            continue
        val = values[0]
        if "citations" in label:
            citedby = val
        elif "h-index" in label:
            h_index = val
        elif "i10" in label:
            i10_index = val

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


def extract_scholar_id(raw_input: str) -> str:
    """Extract a 12-character Scholar user ID even if a full URL was provided."""
    s = (raw_input or "").strip()
    if not s:
        return ""
    # Look for user=XXXXXXXXXXXX in URLs
    match = re.search(r"user=([a-zA-Z0-9_-]{12})", s)
    if match:
        return match.group(1)
    # Match any 12-char sequence
    match_direct = re.search(r"([a-zA-Z0-9_-]{12})", s)
    if match_direct:
        return match_direct.group(1)
    return s


def fetch_scholar_data(scholar_id: str, mock: bool = False, author_name: str = "", orcid_id: str = ""):
    if mock or not scholar_id:
        return _sample_scholar_data()

    clean_id = extract_scholar_id(scholar_id)
    if not clean_id:
        return _sample_scholar_data()

    # Use a managed Google Scholar Author API when configured. Unlike direct
    # scraping, this works from hosted backends whose IPs Google rate-limits.
    serpapi_key = os.getenv("SERPAPI_API_KEY", "").strip()
    if serpapi_key:
        return _fetch_via_serpapi(clean_id, serpapi_key)

    # Tier 1: Direct HTTP scraping (fast — single request)
    try:
        data = _fetch_via_http(clean_id)
        if data and (data.get("publications") or data.get("h_index")):
            return data
    except Exception as e:
        print(f"[Scholar] Direct HTTP scraping failed or rate-limited: {e}")

    # Tier 2: scholarly library (still fetches from Google Scholar itself).
    try:
        data = _fetch_via_scholarly(clean_id)
        if data and data.get("publications"):
            return data
    except Exception as e:
        print(f"[Scholar] scholarly failed: {e}")

    # Do not silently substitute OpenAlex results: this action is specifically
    # a Google Scholar sync and must keep its source attribution correct.
    raise Exception(
        "Google Scholar is rate-limiting this cloud server. Configure SERPAPI_API_KEY "
        "on the backend for hosted Google Scholar sync, or sync from a local machine."
    )


def _fetch_via_serpapi(scholar_id: str, api_key: str) -> dict:
    """Fetch one page (up to 100 records) from SerpApi's Scholar Author API."""
    try:
        response = requests.get(
            "https://serpapi.com/search.json",
            params={
                "engine": "google_scholar_author",
                "author_id": scholar_id,
                "hl": "en",
                "num": 100,
                "api_key": api_key,
            },
            timeout=45,
        )
    except requests.RequestException as exc:
        raise Exception("Could not reach the configured Google Scholar sync provider.") from exc

    if response.status_code != 200:
        raise Exception(f"Google Scholar sync provider returned HTTP {response.status_code}.")
    try:
        payload = response.json()
    except ValueError as exc:
        raise Exception("Google Scholar sync provider returned an unreadable response.") from exc

    provider_error = payload.get("error")
    if provider_error:
        # Provider messages may echo request parameters, so don't return them
        # verbatim (the request contains the private API key).
        safe_error = str(provider_error).replace(api_key, "[redacted]")[:240]
        raise Exception(f"Google Scholar sync provider error: {safe_error}")

    articles = payload.get("articles") or []
    publications = []
    for article in articles:
        publication = str(article.get("publication") or "")
        year_value = article.get("year")
        if not year_value:
            year_match = re.search(r"\b(?:19|20)\d{2}\b", publication)
            year_value = year_match.group(0) if year_match else None
        try:
            year = int(year_value) if year_value else datetime.now().year
        except (TypeError, ValueError):
            year = datetime.now().year
        cited_by = article.get("cited_by") or {}
        cited_value = cited_by.get("value", 0) if isinstance(cited_by, dict) else 0
        try:
            citation_count = int(cited_value or 0)
        except (TypeError, ValueError):
            citation_count = 0
        publications.append({
            "title": article.get("title") or "",
            "journal_name": publication.split(",", 1)[0].strip() or "Unknown Journal",
            "year": year,
            "citations_count": citation_count,
            "authors": article.get("authors") or "",
            "source_id": article.get("citation_id") or "",
            "external_url": article.get("link") or "",
            "doi": None,
        })

    metrics = {"h_index": 0, "i10_index": 0, "citedby": 0}
    cited_by_section = payload.get("cited_by") or {}
    for row in cited_by_section.get("table", []) if isinstance(cited_by_section, dict) else []:
        if not isinstance(row, dict):
            continue
        for metric_name, values in row.items():
            if not isinstance(values, dict):
                continue
            metric_key = str(metric_name).lower()
            if "citation" in metric_key:
                output_key = "citedby"
            elif "i10" in metric_key:
                output_key = "i10_index"
            elif "h_index" in metric_key or "h-index" in metric_key or "indice_h" in metric_key:
                output_key = "h_index"
            else:
                continue
            try:
                metrics[output_key] = int(values.get("all") or 0)
            except (TypeError, ValueError):
                pass

    if not metrics["citedby"]:
        metrics["citedby"] = sum(item["citations_count"] for item in publications)
    return {**metrics, "publications": publications}


def _fetch_via_openalex(scholar_id: str = "", author_name: str = "", orcid_id: str = "") -> dict:
    """Fetch publications and metrics from OpenAlex academic graph.

    Kept for explicit OpenAlex use; Google Scholar sync must not call this as a
    fallback because those records are from a different source.
    """
    headers = {"User-Agent": "NIETResearchPortal/1.0 (mailto:admin@niet.co.in)"}
    works = []
    author_info = {}

    # 1. Match by ORCID
    clean_orcid = (orcid_id or "").strip()
    if clean_orcid:
        try:
            author_url = f"https://api.openalex.org/authors?filter=orcid:{clean_orcid}"
            resp = requests.get(author_url, headers=headers, timeout=15)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    author_info = results[0]

            works_url = f"https://api.openalex.org/works?filter=author.orcid:{clean_orcid}&sort=cited_by_count:desc&per-page=100"
            wresp = requests.get(works_url, headers=headers, timeout=20)
            if wresp.status_code == 200:
                works = wresp.json().get("results", [])
        except Exception as e:
            print(f"[Scholar/OpenAlex] ORCID lookup error: {e}")

    # 2. Match by author_name if ORCID returned nothing
    if not works and author_name:
        try:
            search_name = author_name.strip()
            for prefix in ["Dr.", "Prof.", "Mr.", "Ms.", "Mrs.", "Dr ", "Prof ", "Mr "]:
                if search_name.startswith(prefix):
                    search_name = search_name[len(prefix):].strip()

            encoded_name = urllib.parse.quote(search_name)
            search_url = f"https://api.openalex.org/authors?filter=display_name.search:{encoded_name}"
            resp = requests.get(search_url, headers=headers, timeout=15)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    best = results[0]
                    for r in results:
                        affils = " ".join([a.get("institution", {}).get("display_name", "") for a in r.get("affiliations", [])]).lower()
                        if "noida" in affils or "niet" in affils or "engineering" in affils:
                            best = r
                            break
                    author_info = best
                    works_url = best.get("works_api_url")
                    if works_url:
                        wresp = requests.get(f"{works_url}&sort=cited_by_count:desc&per-page=100", headers=headers, timeout=20)
                        if wresp.status_code == 200:
                            works = wresp.json().get("results", [])
        except Exception as e:
            print(f"[Scholar/OpenAlex] Name search error: {e}")

    if not works:
        return {}

    summary_stats = author_info.get("summary_stats", {})
    h_index = summary_stats.get("h_index") or 0
    i10_index = summary_stats.get("i10_index") or 0
    total_cited = author_info.get("cited_by_count") or sum(w.get("cited_by_count", 0) for w in works)

    publications = []
    for idx, w in enumerate(works):
        title = (w.get("display_name") or w.get("title") or "").strip()
        if not title:
            continue

        source_obj = (w.get("primary_location") or {}).get("source") or {}
        journal = source_obj.get("display_name") or "Academic Proceedings"

        year = w.get("publication_year") or datetime.now().year
        citations = w.get("cited_by_count") or 0

        doi = w.get("doi")
        if doi and doi.startswith("https://doi.org/"):
            doi = doi.replace("https://doi.org/", "")

        work_type = (w.get("type") or "").lower()
        pub_type = "Conference" if ("conference" in work_type or "proceeding" in work_type) else "Journal"

        authorships = w.get("authorships", [])
        author_names = [a.get("author", {}).get("display_name", "") for a in authorships if a.get("author")]
        authors_str = ", ".join(filter(None, author_names)) or author_name or "Faculty Author"

        publications.append({
            "title": title,
            "journal_name": journal,
            "year": year,
            "citations_count": citations,
            "doi": doi,
            "publication_type": pub_type,
            "authors": authors_str,
            "source_id": f"gs_{idx+1}",
        })

    # Derive h-index if missing
    if not h_index and publications:
        cits = sorted([p["citations_count"] for p in publications], reverse=True)
        h = 0
        for i, c in enumerate(cits):
            if c >= i + 1:
                h = i + 1
            else:
                break
        h_index = h

    if not i10_index and publications:
        i10_index = sum(1 for p in publications if p["citations_count"] >= 10)

    return {
        "h_index": h_index,
        "i10_index": i10_index,
        "citedby": total_cited,
        "publications": publications,
    }


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
