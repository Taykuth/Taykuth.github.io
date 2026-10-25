"""Builds the portfolio pages from content/en.json and content/tr.json.

    python tools/build.py

Writes index.html (English) and tr/index.html (Turkish). Standard library only.
Edit the JSON files for text changes; edit this file only to change the markup.
"""

import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://taykuth.github.io"
GITHUB = "https://github.com/Taykuth"
LINKEDIN = "https://www.linkedin.com/in/borataykuthindal"
YEAR = 2026


def e(text) -> str:
    return escape(str(text), quote=True)


def links(items, cls="") -> str:
    out = []
    for item in items:
        href = item["href"]
        external = href.startswith("http")
        attrs = ' target="_blank" rel="noopener"' if external else ""
        out.append(f'<a class="{cls}" href="{e(href)}"{attrs}>{e(item["label"])}</a>')
    return "\n".join(out)


def pipeline(steps, labels) -> str:
    items = []
    for i, step in enumerate(steps, 1):
        planned = step.get("planned")
        tag = f' <span class="planned-tag">{e(labels["planned"])}</span>' if planned else ""
        items.append(
            f'<li class="{"is-planned" if planned else ""}">'
            f'<span class="step-no" aria-hidden="true">{i}</span>'
            f'<span class="step-label">{e(step["label"])}{tag}</span></li>'
        )
    return f'<ol class="pipeline" aria-label="{e(labels["pipeline"])}">{"".join(items)}</ol>'


def case(p, labels) -> str:
    built = "".join(f"<li>{e(b)}</li>" for b in p["built"])
    metrics = "".join(
        f'<div class="metric"><dt>{e(m["k"])}</dt><dd>{e(m["v"])}</dd></div>' for m in p["metrics"]
    )
    note = f'<p class="ledger-note">{e(p["metrics_note"])}</p>' if p.get("metrics_note") else ""
    decision = ""
    if p.get("decision"):
        decision = (f'<div class="decision"><h4>{e(p["decision"]["title"])}</h4>'
                    f'<p>{e(p["decision"]["text"])}</p></div>')
    figure = ""
    if p.get("image"):
        img = p["image"]
        figure = (f'<figure class="case-figure"><img src="{e(img["src"])}" alt="{e(img["alt"])}" '
                  f'width="{img["w"]}" height="{img["h"]}" loading="lazy" decoding="async"></figure>')
    featured = " is-featured" if p.get("featured") else ""
    return f"""
<article class="case{featured}" id="{e(p['id'])}" aria-labelledby="{e(p['id'])}-title">
  <div class="wrap case-grid">
    <header class="case-head">
      <p class="status status--{e(p['kind'])}">{e(p['status'])}</p>
      <h3 id="{e(p['id'])}-title">{e(p['title'])}</h3>
      <p class="oneliner">{e(p['oneliner'])}</p>
      <p class="case-links">{links(p['links'], 'textlink')}</p>
    </header>
    {pipeline(p['pipeline'], labels)}
    <div class="case-built">
      <h4>{e(labels['built'])}</h4>
      <ul class="built-list">{built}</ul>
      {decision}
    </div>
    <aside class="ledger" aria-label="{e(labels['measured'])}">
      <h4>{e(labels['measured'])}</h4>
      <dl>{metrics}</dl>
      {note}
      <div class="limit">
        <h4>{e(labels['limit'])}</h4>
        <p>{e(p['limit'])}</p>
      </div>
    </aside>
    <p class="stack"><span class="stack-label">{e(labels['stack'])}</span> {e(', '.join(p['stack']))}</p>
    {figure}
  </div>
</article>"""


def page(c: dict) -> str:
    lang, path = c["lang"], c["path"]
    url = SITE + path
    alt_url = SITE + c["alt_path"]
    en_url, tr_url = (url, alt_url) if lang == "en" else (alt_url, url)
    labels = c["work"]["labels"]
    h, s, w = c["hero"], c["signal"], c["work"]

    redirect = ""
    if lang == "en":
        # Turkish browsers go to /tr/ once, unless the visitor picked a language before.
        redirect = """<script>
(function(){try{if(localStorage.getItem('lang-choice'))return;var l=(navigator.languages&&navigator.languages[0])||navigator.language||'';if(/^tr\\b/i.test(l))location.replace('/tr/'+location.hash);}catch(e){}})();
</script>"""

    person = {
        "@context": "https://schema.org", "@type": "Person",
        "name": "Bora Taykut Hindal", "url": url,
        "jobTitle": "AI Engineer" if lang == "en" else "Yapay Zeka Mühendisi",
        "email": "mailto:" + c["contact"]["email"],
        "address": {"@type": "PostalAddress", "addressLocality": "Gebze", "addressRegion": "Kocaeli", "addressCountry": "TR"},
        "alumniOf": "OSTİM Teknik Üniversitesi",
        "sameAs": [GITHUB, LINKEDIN],
        "image": SITE + "/assets/img/profile.jpg",
    }

    projects = "\n".join(case(p, labels) for p in w["projects"])
    also = "\n".join(
        f'<li><a class="also-title" href="{e(i["href"])}" target="_blank" rel="noopener">{e(i["title"])}</a>'
        f'<p>{e(i["text"])}</p></li>' for i in c["also"]["items"]
    )
    timeline = "\n".join(
        f'<li><p class="when">{e(i["when"])}</p><div class="what"><h3>{e(i["org"])}</h3>'
        f'<p class="role-line">{e(i["role"])}</p><p>{e(i["text"])}</p></div></li>'
        for i in c["experience"]["items"]
    )
    cols = c["skills"]["cols"]
    head = "".join(f'<th scope="col">{e(col)}</th>' for col in cols)
    rows = "\n".join(
        "<tr>" + f'<th scope="row" data-label="{e(cols[0])}">{e(r[0])}</th>'
        + "".join(f'<td data-label="{e(cols[i])}">{e(r[i])}</td>' for i in (1, 2)) + "</tr>"
        for r in c["skills"]["rows"]
    )
    n = c["nav"]
    ct = c["contact"]

    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(c['meta']['title'])}</title>
<meta name="description" content="{e(c['meta']['description'])}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en" href="{en_url}">
<link rel="alternate" hreflang="tr" href="{tr_url}">
<link rel="alternate" hreflang="x-default" href="{SITE}/">
<meta property="og:type" content="profile">
<meta property="og:title" content="{e(c['meta']['title'])}">
<meta property="og:description" content="{e(c['meta']['description'])}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="{c['meta']['og_locale']}">
<meta property="og:image" content="{SITE}/assets/img/og-{lang}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#eef1ee" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f242a" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/archivo-latin-standard-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/source-serif-4-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/assets/site.css">
{redirect}
<script type="application/ld+json">{json.dumps(person, ensure_ascii=False)}</script>
</head>
<body>
<a class="skip" href="#main">{e(c['ui']['skip'])}</a>
<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="{path}">Bora Taykut Hindal</a>
    <nav aria-label="{e(c['ui']['menu'])}">
      <ul class="nav-sections">
        <li><a href="#work">{e(n['work'])}</a></li>
        <li><a href="#experience">{e(n['experience'])}</a></li>
        <li><a href="#skills">{e(n['skills'])}</a></li>
        <li><a href="#contact">{e(n['contact'])}</a></li>
      </ul>
      <a class="lang-switch" href="{c['alt_path']}" hreflang="{c['alt_lang']}" lang="{c['alt_lang']}" data-lang="{c['alt_lang']}">{e(c['alt_label'])}</a>
      <a class="btn btn--small" href="{e(h['cv_href'])}" download>{e(n['cv'])}</a>
    </nav>
  </div>
</header>

<main id="main">
  <section class="hero wrap" aria-labelledby="name">
    <div class="hero-text">
      <p class="role">{e(h['role'])}</p>
      <h1 id="name" class="name">Bora Taykut <span class="name-last">Hindal</span></h1>
      <p class="statement">{e(h['statement'])}</p>
      <div class="actions">
        <a class="btn" href="{e(h['cv_href'])}" download>{e(h['cv'])}</a>
        <a class="textlink" href="{e(h['cv_alt_href'])}" download>{e(h['cv_alt'])}</a>
        <a class="textlink" href="{GITHUB}" target="_blank" rel="noopener">GitHub</a>
        <a class="textlink" href="{LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a>
        <a class="textlink" href="mailto:{e(ct['email'])}">{e(ct['email'])}</a>
      </div>
    </div>
    <img class="portrait" src="/assets/img/profile.jpg" alt="{e(h['portrait_alt'])}" width="400" height="400">
  </section>

  <figure class="strip" aria-labelledby="strip-caption">
    <div class="strip-chart">
      <canvas id="trace" role="img" aria-label="{e(s['caption'])}"
        data-y-label="{e(s['y_label'])}" data-x-label="{e(s['x_label'])}" data-threshold="{e(s['threshold'])}"
        data-now="{e(s['now'])}" data-hours="{e(s['hours'])}"></canvas>
    </div>
    <figcaption id="strip-caption" class="wrap strip-caption">{e(s['caption'])} <a class="textlink" href="{e(s['href'])}">{e(s['link'])}</a></figcaption>
  </figure>

  <section id="work" class="work" aria-labelledby="work-title">
    <div class="wrap section-head">
      <h2 id="work-title">{e(w['heading'])}</h2>
      <p class="lede">{e(w['lede'])}</p>
    </div>
    {projects}
  </section>

  <section class="also wrap" aria-labelledby="also-title">
    <h2 id="also-title" class="h-small">{e(c['also']['heading'])}</h2>
    <ul class="also-list">{also}</ul>
  </section>

  <section id="experience" class="wrap experience" aria-labelledby="exp-title">
    <h2 id="exp-title">{e(c['experience']['heading'])}</h2>
    <ol class="timeline">{timeline}</ol>
  </section>

  <section id="skills" class="wrap skills" aria-labelledby="skills-title">
    <h2 id="skills-title">{e(c['skills']['heading'])}</h2>
    <table class="skills-table">
      <thead><tr>{head}</tr></thead>
      <tbody>{rows}</tbody>
    </table>
  </section>

  <section id="contact" class="contact" aria-labelledby="contact-title">
    <div class="wrap">
      <h2 id="contact-title">{e(ct['heading'])}</h2>
      <p class="contact-text">{e(ct['text'])}</p>
      <p class="email-line">
        <a class="email" href="mailto:{e(ct['email'])}">{e(ct['email'])}</a>
        <button class="copy" type="button" data-copy="{e(ct['email'])}" data-done="{e(ct['copied'])}">{e(ct['copy'])}</button>
      </p>
      <p class="contact-links">
        <a class="textlink" href="{LINKEDIN}" target="_blank" rel="noopener">{e(ct['linkedin'])}</a>
        <a class="textlink" href="{GITHUB}" target="_blank" rel="noopener">{e(ct['github'])}</a>
        <a class="textlink" href="{e(h['cv_href'])}" download>{e(h['cv'])}</a>
      </p>
    </div>
  </section>
</main>

<footer class="footer wrap">
  <p>© {YEAR} Bora Taykut Hindal. {e(c['footer']['note'])} <a class="textlink" href="{GITHUB}/Taykuth.github.io" target="_blank" rel="noopener">{e(c['footer']['source'])}</a></p>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
"""


def main() -> None:
    for lang in ("en", "tr"):
        content = json.loads((ROOT / "content" / f"{lang}.json").read_text(encoding="utf-8"))
        out = ROOT / content["path"].strip("/") / "index.html" if content["path"] != "/" else ROOT / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(content), encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
