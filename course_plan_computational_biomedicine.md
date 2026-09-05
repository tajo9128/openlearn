# Course Plan: "Computational Biomedicine: From Command Line to Single-Cell"

**Built from 3 sources (content same, headings new):**
| Source repo | What it contributes |
|---|---|
| `ucdavis/2025-December-Fundamentals-of-Scientific-Computing` | CLI/bash, R fundamentals, tidyverse, containers, make |
| `schatzlab/biomedicalresearch2021` (JHU) | Sequencing, assembly, mapping, variant calling, RNA-seq, regulation lectures + 5 assignments |
| `ucdavis/2025-July-Single-Cell-RNA-Seq-Analysis` | scRNA-seq file types, Seurat pipeline (8 analysis stages), doublets, integration |

**Target audience:** students who know basic Python, want to do real biomedical research with genomic data.
**Tools taught:** bash, R + Seurat + tidyverse, Docker/Apptainer, WDL/miniwdl, 10x cellranger.

---

## Module 1 — Research Computing Essentials *(source: scicomp CLI + biomedical assignment 4/12)*
| # | Lesson (new heading) | Source content |
|---|---|---|
| 1 | The Research Command Line: Your First Laboratory | scicomp `CLI/intro_cli.md` (navigating, viewing files) |
| 2 | Command Memory: History, Repeats & Editing | scicomp CLI (repeating/editing commands) |
| 3 | Pipelines of Text: Combining Commands, Moving Data | scicomp CLI (combining commands, creating/moving/removing) |
| 4 | Automation Superpowers: Wildcards, Variables & Scripts | scicomp CLI (env vars, wildcards, shell scripting) |
| 5 | Reproducible Workflows with WDL & Containers | biomedical assignment4 (WDL/miniwdl variant workflow) + `software_installation/apptainer.md` |
| 6 | Build Tools for Science: Make & CMake | scicomp `software_installation/make_cmake.md` |

## Module 2 — Programming for Genomic Data *(source: scicomp R + intro2python)*
| # | Lesson | Source |
|---|---|---|
| 7 | R for Biologists: Getting Started | scicomp `R/intro_R.Rmd` |
| 8 | Data Structures & Functions in R | scicomp R (operators, data structures, functions) |
| 9 | The Apply Family: Thinking in Vectors | scicomp R (apply family) |
| 10 | Publication-Quality Plots with the Tidyverse | scicomp R (visualizations & tidyverse) |
| 11 | Python Interlude: Scripting for Bioinformatics | scicomp `base/intro2python.md` + biomedical prereq (Rosalind) |

## Module 3 — Genome Science in Practice *(source: biomedical lectures + assignments 1–2)*
| # | Lesson | Source |
|---|---|---|
| 12 | The Sequencing Revolution: Reads, Error Profiles & Platforms | `lectures/02.sequencing.pdf` |
| 13 | Genome Size & Structure Across the Tree of Life | assignment1 (chromosome structures of 8 species) |
| 14 | Assembling Genomes from Scratch | `03.assembly.pdf` + assignment2 (assemble a mystery pathogen, decode secret message) |
| 15 | Whole-Genome Amplification & Its Artifacts | `04.wga.pdf` |
| 16 | The Human Genome & the T2T telomere-to-telomere milestone | `05.humangenome.pdf`, `06.t2t.pdf` |
| 17 | Mapping Reads to a Reference | `07.readmapping.pdf` |
| 18 | Edit Distance & Alignment Algorithms | `08.editdistance.pdf` |
| 19 | Finding Variants: From BAM to VCF | `09.variantcalling.pdf` + assignment4 |

## Module 4 — Transcriptomics & Gene Regulation *(source: biomedical lectures 11/13/14/17 + assignment 5)*
| # | Lesson | Source |
|---|---|---|
| 20 | Annotating Genomes & Finding Genes | `11.annotation.pdf`, `13.genefinding.pdf` |
| 21 | RNA-seq: Measuring Gene Expression | `14.rnaseq.pdf` + assignment5 (time-series expression) |
| 22 | Regulation: How Genomes Control Cells | `17.regulation.pdf` |
| 23 | Cloud-Scale Analysis for Biomedicine | `12.cloudwdl.pdf` |

## Module 5 — Single-Cell RNA-Seq with Seurat *(source: scRNAseq repo)*
| # | Lesson | Source |
|---|---|---|
| 24 | From Tissue to Counts: scRNA-seq Experiment Design | `lectures/15/16.scRNAseq.pdf` + `data_reduction/filetypes.md` |
| 25 | Cellranger Outputs: Matrices, Web Summaries & QC Reports | `data_reduction/web_summary.html`, `Expression_Matrix.md` |
| 26 | Project Setup & Building the Seurat Object | `data_reduction/project_setup.md` + `01-create_object.Rmd` |
| 27 | Quality Control: Filtering Dead Cells & Doublet Clues | `02-filtering.Rmd` |
| 28 | Normalization & Scaling | `03-normalize_scale.Rmd` |
| 29 | Seeing Structure: PCA & UMAP Dimensionality Reduction | `04-dimensionality_reduction.Rmd` |
| 30 | Clustering & Assigning Cell Types | `05-clustering_celltype.Rmd` |
| 31 | Differential Expression & Enrichment | `06-de_enrichment.Rmd` |
| 32 | Doublet Detection | `07-doublet_detection.Rmd` + `SoupX.html` |
| 33 | Integrating Datasets Across Batches | `08-integration.Rmd` |
| 34 | Case Study: K-Means on Breast-Cancer Single-Cell Data | scicomp-adjacent notebook (optional) — or drop |

## Module 6 — Capstone: Your Research Project *(source: biomedical course structure)*
| # | Lesson | Source |
|---|---|---|
| 34 | Designing a Biomedical Research Project | biomedical README (course-project component), `01.Introduction.pdf` |
| 35 | Communicating Science: Proposals, Reports & Symposium Talks | biomedical grading/policies (proposal, interim report, final talk) |

**Total: ~35 lessons across 6 modules.** Each lesson's classroom generation will feed the mapped source files (lecture PDFs / Rmd / md) as `content`, so narration teaches the same material under the new headings.
