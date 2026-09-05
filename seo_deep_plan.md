# BioDockify Learn — Deep SEO Plan
## (Sitemap already submitted to Google Search Console ✅)

---

## 1. INTERNAL LINKING ARCHITECTURE (build on-site, week 1–2)

Google discovers and ranks pages by following links. Right now course pages are
isolated islands — fix with these link patterns:

### a) Hub-and-spoke model (highest impact)
Every course page (hub) links to its lessons (spokes) and to 2–3 related courses:
- Python Basics → Python for Data Science, Python for Pharma Research, AI for Beginners
- AI in Drug Discovery → Medicinal Chemistry, Molecular Docking, Structural Biology
- Pharmacology → Pharmacokinetics, Structural Biology
- LLM Bootcamp → AI Agents Crash Course, Deep Learning with PyTorch
- Computational Biomedicine → Bioinformatics, Research Methods

**Implementation:** "Related courses" card row at the bottom of every course page
(pull 3 courses sharing a category). One PR, sitewide impact.

### b) Breadcrumbs with schema
`Home > Courses > AI in Drug Discovery` — visible breadcrumb + BreadcrumbList
JSON-LD on every course and lesson page. Google shows breadcrumbs in results
instead of the raw URL.

### c) Contextual in-content links
Each lesson description should link 1–2 related lessons by keyword
("prerequisites covered in our Pharmacokinetics course"). Cross-links pass
authority between pages and keep learners on-site.

### d) HTML sitemap page
`/sitemap-pages` — a human-visible directory of all courses grouped by track.
Linked from the footer. Gives every course an extra internal link from a
crawled page.

---

## 2. PROGRAMMATIC SEO PAGES (build on-site, week 2–4)

The catalog IS a keyword goldmine. Generate landing pages at scale:

| Page template | Example keyword targeted | Pages |
|---|---|---|
| `/courses/{id}` per course (done) | "learn pharmacology free", "python for pharma" | 20 |
| `/learn/{topic}` per lesson topic | "what is SHAP in healthcare", "docking with autodock" | 249 (one per lesson!) |
| `/track/{name}` per career track | "become a bioinformatician", "pharma AI career" | 6 tracks |
| `/compare/x-vs-y` | "GANs vs diffusion models", "SHAP vs LIME" | 10–15 |

Each lesson already has a full description in the database — the `/learn/{topic}`
pages are generated from existing content. 280+ indexable pages from data you
already have. This is the single biggest SEO lever available.

---

## 3. CONTENT PLAN — BLOG (2–3 posts/week)

Target long-tail student searches. 20 post ideas from the catalog:

**Beginner intent:**
1. How to Start Learning Bioinformatics in 2026 (zero experience)
2. Python for Pharmacists: Why It Matters More Than Ever
3. AI for Beginners: The Only Roadmap You Need
4. What Is Pharmacokinetics? ADME Explained Simply

**Course-linked intent:**
5. GANs vs Diffusion Models: Which Should You Learn First?
6. SHAP vs LIME: Explainable AI Methods Compared (links to course 20)
7. AutoDock Vina Tutorial: From PDB to Docking Score
8. How AI Is Cutting Drug Discovery Costs by 60%

**Career intent:**
9. Bioinformatics Career Roadmap: Skills, Salary, Jobs
10. Healthcare AI Jobs: Roles, Requirements, How to Break In
11. Pharma Data Science: What Companies Actually Want

Each post: 1,200–1,800 words, links to 2–3 courses (internal links), original
diagrams, ends with course CTA. AI-draft + human edit is fine.

---

## 4. BACKLINK STRATEGY (external links — the ranking multiplier)

### Tier 1 — Easy authoritative links (week 1–2)
- **GitHub**: your 3 repos (ai-healthcare-complete, xai-healthcare, Healthcare-AI-MicroCredentials) — add "📖 Full course at learn.biodockify.com" to each README. GitHub pages carry high authority.
- **Product Hunt**: launch BioDockify Learn ("Free AI-narrated pharma courses")
- **AlternativeTo / SaaSHub / Futurepedia**: list the platform under AI-education tools
- **Hacker News**: "Show HN: I built an AI-narrated pharma learning platform (20 courses, free)"

### Tier 2 — Education directories (week 2–4)
- **freeCodeCamp / Class Central / Coursera-alternatives lists**: submit the platform
- **Awesome-lists on GitHub**: PR additions to awesome-educational-resources, awesome-bioinformatics, awesome-ai-for-health
- **University resource pages**: email bio/pharma departments — your BILD62/IITM/UC Davis-derived courses give a natural reason: "we teach your curriculum, free"
- **Reddit** (genuinely, not spam): r/learnmachinelearning, r/bioinformatics, r/pharmaindustry — share free course announcements when relevant

### Tier 3 — Content-driven links (ongoing)
- The blog posts above get cited when topics trend (e.g., SHAP explainability news)
- Free tools as link magnets: "Drug dosage calculator", "PK half-life calculator" — small widgets other sites embed and link
- YouTube descriptions (courses 1–12) all link to course pages

### Tier 4 — Partner links
- The 3 source-repo communities (UC Davis Bioinformatics Core, NERD Community, IITM) — offer affiliate/cross-promotion
- Pharma/health LinkedIn micro-influencers: free course access for a mention

---

## 5. TECHNICAL ONGOING
- ✅ robots.txt, sitemap, per-course meta, JSON-LD (live)
- Core Web Vitals: images → next/image, lazy-load the classroom player
- SSR the /courses catalog page (client-rendered today)
- GA4 + Search Console anomaly review monthly
- Re-submit sitemap after each batch of new lessons (automated via the publisher)

---

## 6. MEASUREMENT
- GSC: impressions/clicks per course page (weekly)
- Goal: 1,000 organic impressions/week by month 2; first top-10 ranking by month 3
- Track referring domains monthly (aim: 20+ unique domains by month 3)
