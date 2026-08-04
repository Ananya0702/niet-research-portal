"""Shared KPI helpers — all values derived from real data, nothing hardcoded."""


def yoy_percent(series):
    """Year-over-year % change between the two most recent years in a
    {year: count} mapping. Returns None when there is no valid base year."""
    years = sorted(y for y in series.keys() if y is not None)
    if len(years) < 2:
        return None
    prev, cur = years[-2], years[-1]
    base = series.get(prev) or 0
    if not base:
        return None
    return round((series.get(cur, 0) - base) / base * 100, 1)


def yoy_delta(series):
    """Absolute change between the two most recent years in a {year: count}
    mapping, using the same base/current years as yoy_percent."""
    years = sorted(y for y in series.keys() if y is not None)
    if len(years) < 2:
        return 0
    prev, cur = years[-2], years[-1]
    return (series.get(cur, 0) or 0) - (series.get(prev, 0) or 0)


def avg_if_by_year(pubs):
    """Map of year -> average impact factor across that year's publications."""
    per_year = {}
    for p in pubs:
        if p.year and p.impact_factor:
            per_year.setdefault(p.year, []).append(p.impact_factor)
    return {
        year: round(sum(vals) / len(vals), 2)
        for year, vals in sorted(per_year.items())
    }


def avg_if(pubs):
    """Average impact factor from publication records. Returns None when no
    publication carries a real impact factor, so UIs can show 'N/A' instead
    of a misleading fallback value."""
    ifs = [p.impact_factor for p in pubs if p.impact_factor]
    if not ifs:
        return None
    return round(sum(ifs) / len(ifs), 2)
