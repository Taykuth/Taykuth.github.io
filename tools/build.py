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

ICONS = {
    "github": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
    "linkedin": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M3 5.5h18v13H3z"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="m3.5 6 8.5 7 8.5-7"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M7 17 17 7M9 7h8v8"/></svg>',
}


def e(text) -> str:
    return escape(str(text), quote=True)


def ext(href: str) -> str:
    return ' target="_blank" rel="noopener"' if href.startswith("http") else ""


def project(p: dict, i: int) -> str:
    points = "".join(f"<li>{e(x)}</li>" for x in p["points"])
    tags = "".join(f"<li>{e(t)}</li>" for t in p["tags"])
    links = "".join(
        f'<a class="{"btn btn--red" if l.get("primary") else "btn btn--ghost"}" href="{e(l["href"])}"{ext(l["href"])}>'
        f'{e(l["label"])}{ICONS["arrow"] if l["href"].startswith("http") else ""}</a>'
        for l in p["links"]
    )
    if p.get("image"):
        img = p["image"]
        visual = (f'<figure class="visual visual--shot"><img src="{e(img["src"])}" alt="{e(img["alt"])}" '
                  f'width="{img["w"]}" height="{img["h"]}" loading="lazy" decoding="async"></figure>')
    else:
        stats = "".join(f'<div class="stat"><p class="stat-v">{e(s["v"])}</p><p class="stat-k">{e(s["k"])}</p></div>'
                        for s in p["stats"])
        visual = f'<div class="visual visual--stats">{stats}</div>'
    side = " is-flipped" if i % 2 else ""
    return f"""
    <article class="project{side}" id="{e(p['id'])}" aria-labelledby="{e(p['id'])}-t">
      <div class="project-text">
        <p class="tag">{e(p['tag'])}</p>
        <h3 id="{e(p['id'])}-t">{e(p['title'])}</h3>
        <p class="project-desc">{e(p['text'])}</p>
        <ul class="points">{points}</ul>
        <ul class="chips">{tags}</ul>
        <div class="project-links">{links}</div>
      </div>
      {visual}
    </article>"""


def page(c: dict) -> str:
    lang, path = c["lang"], c["path"]
    url = SITE + path
    alt_url = SITE + c["alt_path"]
    en_url, tr_url = (url, alt_url) if lang == "en" else (alt_url, url)
    h, s, a, w, ct, n = c["hero"], c["signal"], c["about"], c["work"], c["contact"], c["nav"]

    redirect = ""
    if lang == "en":
        # Turkish browsers go to /tr/ once, unless the visitor already picked a language.
        redirect = ("<script>(function(){try{if(localStorage.getItem('lang-choice'))return;"
                    "var l=(navigator.languages&&navigator.languages[0])||navigator.language||'';"
                    "if(/^tr\\b/i.test(l))location.replace('/tr/'+location.hash);}catch(e){}})();</script>")

    person = {
        "@context": "https://schema.org", "@type": "Person",
        "name": "Bora Taykut Hindal", "url": url,
        "jobTitle": "AI Engineer" if lang == "en" else "Yapay Zeka Mühendisi",
        "email": "mailto:" + ct["email"],
        "address": {"@type": "PostalAddress", "addressRegion": "Kocaeli", "addressCountry": "TR"},
        "alumniOf": "OSTİM Teknik Üniversitesi",
        "sameAs": [GITHUB, LINKEDIN],
        "image": SITE + "/assets/img/profile.jpg",
    }

    paragraphs = "".join(f"<p>{e(x)}</p>" for x in a["paragraphs"])
    facts = "".join(f'<div><dt>{e(f["k"])}</dt><dd>{e(f["v"])}</dd></div>' for f in a["facts"])
    focus = "".join(f'<li><h4>{e(f["title"])}</h4><p>{e(f["text"])}</p></li>' for f in a["focus"])
    projects = "".join(project(p, i) for i, p in enumerate(w["projects"]))
    more = "".join(
        f'<li><a class="more-card" href="{e(m["href"])}" target="_blank" rel="noopener">'
        f'<h4>{e(m["title"])} {ICONS["arrow"]}</h4><p>{e(m["text"])}</p><p class="more-tags">{e(m["tags"])}</p></a></li>'
        for m in c["more"]["items"]
    )
    timeline = "".join(
        f'<li><p class="when">{e(x["when"])}</p><div><h4>{e(x["org"])}</h4>'
        f'<p class="role-line">{e(x["role"])}</p><p>{e(x["text"])}</p></div></li>'
        for x in c["experience"]["items"]
    )
    skills = "".join(
        f'<div class="skill-group"><h4>{e(g["title"])}</h4><ul class="chips">'
        + "".join(f"<li>{e(i)}</li>" for i in g["items"]) + "</ul></div>"
        for g in c["skills"]["groups"]
    )

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
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/archivo-latin-standard-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/img/portrait-560.webp" as="image" type="image/webp" imagesrcset="/assets/img/portrait-360.webp 360w, /assets/img/portrait-560.webp 560w" imagesizes="(max-width: 760px) 220px, 420px">
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
        <li><a href="#about">{e(n['about'])}</a></li>
        <li><a href="#work">{e(n['work'])}</a></li>
        <li><a href="#skills">{e(n['skills'])}</a></li>
        <li><a href="#contact">{e(n['contact'])}</a></li>
      </ul>
      <a class="lang-switch" href="{c['alt_path']}" hreflang="{c['alt_lang']}" lang="{c['alt_lang']}" data-lang="{c['alt_lang']}">{e(c['alt_label'])}</a>
      <a class="btn btn--small" href="{e(h['cv_href'])}" download>{e(n['cv'])}</a>
    </nav>
  </div>
</header>

<main id="main">
  <section class="hero" aria-labelledby="name">
    <div class="wrap hero-grid">
      <div class="hero-text">
        <p class="role"><span class="live-dot" aria-hidden="true"></span>{e(h['role'])}</p>
        <h1 id="name" class="name">Bora Taykut <span>Hindal</span></h1>
        <p class="statement">{e(h['statement'])}</p>
        <p class="sub">{e(h['sub'])}</p>
        <div class="actions">
          <a class="btn btn--red" href="#work">{e(h['cta_work'])}</a>
          <a class="btn btn--ghost" href="{e(h['cv_href'])}" download>{e(h['cv'])}</a>
          <span class="socials">
            <a class="icon-link" href="{GITHUB}" target="_blank" rel="noopener" aria-label="GitHub">{ICONS['github']}</a>
            <a class="icon-link" href="{LINKEDIN}" target="_blank" rel="noopener" aria-label="LinkedIn">{ICONS['linkedin']}</a>
            <a class="icon-link" href="mailto:{e(ct['email'])}" aria-label="{"E-posta" if lang == "tr" else "Email"}">{ICONS['mail']}</a>
          </span>
        </div>
      </div>
      <div class="portrait">
        <img src="/assets/img/portrait-560.webp" srcset="/assets/img/portrait-360.webp 360w, /assets/img/portrait-560.webp 560w"
          sizes="(max-width: 760px) 220px, 420px" width="560" height="560" alt="{e(h['portrait_alt'])}" fetchpriority="high" decoding="async">
      </div>
    </div>
    <figure class="strip" aria-labelledby="strip-cap">
      <canvas id="trace" role="img" aria-label="{e(s['caption'])}" data-y-label="{e(s['y_label'])}" data-threshold="{e(s['threshold'])}"></canvas>
      <figcaption id="strip-cap" class="wrap">{e(s['caption'])} <a class="textlink" href="{e(s['href'])}">{e(s['link'])}</a></figcaption>
    </figure>
  </section>

  <section id="about" class="section wrap" aria-labelledby="about-t">
    <h2 id="about-t">{e(a['heading'])}</h2>
    <div class="about-grid">
      <div class="about-text">{paragraphs}</div>
      <dl class="facts">{facts}</dl>
    </div>
    <h3 class="sub-h">{e(a['focus_heading'])}</h3>
    <ul class="focus">{focus}</ul>
  </section>

  <section id="work" class="section" aria-labelledby="work-t">
    <div class="wrap">
      <h2 id="work-t">{e(w['heading'])}</h2>
      <p class="lede">{e(w['lede'])}</p>
      <div class="projects">{projects}
      </div>
      <h3 class="sub-h">{e(c['more']['heading'])}</h3>
      <ul class="more">{more}</ul>
    </div>
  </section>

  <section id="skills" class="section wrap" aria-labelledby="skills-t">
    <div class="split">
      <div>
        <h2 id="skills-t">{e(c['skills']['heading'])}</h2>
        <div class="skills">{skills}</div>
      </div>
      <div>
        <h2 id="exp-t">{e(c['experience']['heading'])}</h2>
        <ol class="timeline" aria-labelledby="exp-t">{timeline}</ol>
      </div>
    </div>
  </section>

  <section id="contact" class="contact" aria-labelledby="contact-t">
    <div class="wrap">
      <h2 id="contact-t">{e(ct['heading'])}</h2>
      <p class="contact-text">{e(ct['text'])}</p>
      <p class="email-line">
        <a class="email" href="mailto:{e(ct['email'])}">{e(ct['email'])}</a>
        <button class="copy" type="button" data-copy="{e(ct['email'])}" data-done="{e(ct['copied'])}">{e(ct['copy'])}</button>
      </p>
      <p class="contact-links">
        <a class="textlink" href="{LINKEDIN}" target="_blank" rel="noopener">{e(ct['linkedin'])}</a>
        <a class="textlink" href="{GITHUB}" target="_blank" rel="noopener">{e(ct['github'])}</a>
        <a class="textlink" href="{e(h['cv_href'])}" download>{e(h['cv'])}</a>
        <a class="textlink" href="{e(h['cv_alt_href'])}" download>{e(h['cv_alt'])}</a>
      </p>
    </div>
  </section>
</main>

<footer class="footer wrap">
  <p>© {YEAR} Bora Taykut Hindal</p>
  <a class="textlink" href="{GITHUB}/Taykuth.github.io" target="_blank" rel="noopener">{e(c['footer']['source'])}</a>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
"""


def main() -> None:
    for lang in ("en", "tr"):
        content = json.loads((ROOT / "content" / f"{lang}.json").read_text(encoding="utf-8"))
        out = ROOT / "index.html" if content["path"] == "/" else ROOT / content["path"].strip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(content), encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
