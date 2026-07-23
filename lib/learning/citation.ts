/**
 * Citation Manager — adapted from DeepTutor
 * Source: deeptutor/agents/research/utils/citation_manager.py
 *
 * Tracks citations from AI tool results, deduplicates papers,
 * and formats references in APA style with in-text validation.
 */

// ==================== Types ====================

export type ToolType = 'rag' | 'web_search' | 'paper_search' | 'run_code' | string;

export interface CitationSource {
  title: string;
  content_preview: string;
  source_file?: string;
  page?: number;
  chunk_id?: string;
  score?: number;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export interface PaperSource {
  title: string;
  authors: string;
  authors_list?: string[];
  year?: string;
  url?: string;
  arxiv_id?: string;
  abstract?: string;
  doi?: string;
  venue?: string;
}

export interface Citation {
  citation_id: string;
  tool_type: ToolType;
  query: string;
  summary: string;
  timestamp: string;
  sources?: CitationSource[];
  web_sources?: WebSource[];
  papers?: PaperSource[];
  kb_name?: string;
  total_sources?: number;
  total_papers?: number;
}

// ==================== Citation Manager ====================

export class CitationManager {
  private citations = new Map<string, Citation>();
  private blockCounters: Record<string, number> = {};
  private planCounter = 0;

  /** Generate a plan-stage citation ID */
  nextPlanId(): string {
    this.planCounter++;
    return `PLAN-${String(this.planCounter).padStart(2, '0')}`;
  }

  /** Generate a research-stage citation ID */
  nextCitationId(blockId: string): string {
    const blockNum = blockId.split('_')[1] ?? '1';
    if (!(blockNum in this.blockCounters)) {
      this.blockCounters[blockNum] = 0;
    }
    this.blockCounters[blockNum]++;
    return `CIT-${blockNum}-${String(this.blockCounters[blockNum]).padStart(2, '0')}`;
  }

  /** Add a citation from a tool result */
  addCitation(
    citationId: string,
    toolType: ToolType,
    query: string,
    rawAnswer: string,
    toolMetadata?: Record<string, unknown>,
    kbName?: string,
  ): Citation {
    const lcType = toolType.toLowerCase();
    let citation: Citation;

    if (lcType === 'rag' || lcType === 'rag_naive' || lcType === 'rag_hybrid') {
      citation = this.extractRagCitation(citationId, query, rawAnswer, toolMetadata, kbName);
    } else if (lcType === 'web_search') {
      citation = this.extractWebCitation(citationId, query, rawAnswer, toolMetadata);
    } else if (lcType === 'paper_search') {
      citation = this.extractPaperCitation(citationId, query, rawAnswer, toolMetadata);
    } else {
      citation = {
        citation_id: citationId,
        tool_type: lcType,
        query,
        summary: rawAnswer.substring(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    this.citations.set(citationId, citation);
    return citation;
  }

  private extractRagCitation(
    id: string, query: string, raw: string,
    meta?: Record<string, unknown>, kbName?: string,
  ): Citation {
    const sources: CitationSource[] = Array.isArray(meta?.sources) ? (meta!.sources as any[]) : [];
    const processed: CitationSource[] = sources.slice(0, 10).map((s: any) => ({
      title: s.title ?? s.source_file ?? 'Document',
      content_preview: (s.content ?? s.content_preview ?? '').substring(0, 200),
      source_file: s.source_file ?? s.source ?? s.title,
      page: s.page,
      chunk_id: s.chunk_id,
      score: s.score,
    }));

    return {
      citation_id: id,
      tool_type: 'rag',
      query,
      summary: raw.substring(0, 300),
      timestamp: new Date().toISOString(),
      sources: processed,
      kb_name: kbName ?? '',
      total_sources: processed.length,
    };
  }

  private extractWebCitation(
    id: string, query: string, raw: string,
    meta?: Record<string, unknown>,
  ): Citation {
    let webSources: WebSource[] = [];

    // Prefer structured metadata
    const rawResults = meta?.citations ?? meta?.results ?? meta?.web_results ?? meta?.search_results;
    if (Array.isArray(rawResults)) {
      webSources = (rawResults as any[]).slice(0, 5).map((r: any) => ({
        title: r.title ?? 'Web Result',
        url: r.url ?? r.link ?? '#',
        snippet: (r.snippet ?? r.content ?? '').substring(0, 200),
        domain: r.domain ?? this.extractDomain(r.url ?? r.link ?? ''),
      }));
    }

    return {
      citation_id: id,
      tool_type: 'web_search',
      query,
      summary: raw.substring(0, 300),
      timestamp: new Date().toISOString(),
      web_sources: webSources,
      total_sources: webSources.length,
    };
  }

  private extractPaperCitation(
    id: string, query: string, raw: string,
    meta?: Record<string, unknown>,
  ): Citation {
    let papers: PaperSource[] = [];

    const rawPapers = meta?.papers;
    if (Array.isArray(rawPapers)) {
      papers = (rawPapers as any[]).slice(0, 5).map((p: any) => ({
        title: p.title ?? 'Untitled',
        authors: this.formatAuthors(p.authors ?? p.authors_list ?? []),
        authors_list: Array.isArray(p.authors_list) ? p.authors_list : undefined,
        year: p.year,
        url: p.url ?? (p.arxiv_id ? `https://arxiv.org/abs/${p.arxiv_id}` : undefined),
        arxiv_id: p.arxiv_id,
        abstract: (p.abstract ?? '').substring(0, 300),
        doi: p.doi,
        venue: p.venue,
      }));
    }

    const first = papers[0];
    return {
      citation_id: id,
      tool_type: 'paper_search',
      query,
      summary: raw.substring(0, 300),
      timestamp: new Date().toISOString(),
      papers,
      total_papers: papers.length,
      title: first?.title,
      authors: first?.authors,
      year: first?.year,
      url: first?.url,
      arxiv_id: first?.arxiv_id,
    } as Citation;
  }

  // ==================== Dedup + Reference Numbers ====================

  /** Build stable reference number mapping (1-based) */
  buildRefNumberMap(): Record<string, number> {
    const sortedIds = Array.from(this.citations.keys()).sort((a, b) =>
      this.extractSortKey(a).localeCompare(this.extractSortKey(b)),
    );

    const seenKeys: Record<string, number> = {};
    let refIdx = 0;
    const refMap: Record<string, number> = {};

    for (const citationId of sortedIds) {
      const citation = this.citations.get(citationId)!;
      const lcType = citation.tool_type.toLowerCase();

      if (lcType === 'paper_search' && citation.papers?.length) {
        for (let i = 0; i < citation.papers.length; i++) {
          const paper = citation.papers[i];
          const dedupKey = this.getDedupKey(citation, paper);
          if (dedupKey in seenKeys) {
            refMap[`${citationId}-${i + 1}`] = seenKeys[dedupKey];
            if (i === 0) refMap[citationId] = seenKeys[dedupKey];
          } else {
            refIdx++;
            seenKeys[dedupKey] = refIdx;
            refMap[`${citationId}-${i + 1}`] = refIdx;
            if (i === 0) refMap[citationId] = refIdx;
          }
        }
      } else {
        const dedupKey = this.getDedupKey(citation);
        if (dedupKey in seenKeys) {
          refMap[citationId] = seenKeys[dedupKey];
        } else {
          refIdx++;
          seenKeys[dedupKey] = refIdx;
          refMap[citationId] = refIdx;
        }
      }
    }

    return refMap;
  }

  private getDedupKey(citation: Citation, paper?: PaperSource): string {
    if (citation.tool_type.toLowerCase() === 'paper_search' && paper?.title) {
      const firstAuthor = (paper.authors ?? '').split(',')[0].trim();
      return `paper:${paper.title.toLowerCase().trim()}|${firstAuthor}`;
    }
    return `unique:${citation.citation_id}`;
  }

  private extractSortKey(id: string): string {
    if (id.startsWith('PLAN-')) {
      const num = parseInt(id.split('-')[1] ?? '0');
      return `0_0_${String(num).padStart(4, '0')}`;
    }
    if (id.startsWith('CIT-')) {
      const parts = id.split('-');
      return `1_${parts[1] ?? '0'}_${parts[2] ?? '00'}`;
    }
    return `9_9_9999`;
  }

  // ==================== APA Formatting ====================

  formatCitation(citation: Citation): string {
    const type = citation.tool_type.toLowerCase();

    if (type === 'paper_search' && citation.papers?.length) {
      return citation.papers.map(p => this.formatOneApa(p)).join('<br>');
    }
    if (type === 'rag') {
      let result = `RAG: ${this.escapeHtml(citation.query)}`;
      if (citation.kb_name) result += ` [KB: ${this.escapeHtml(citation.kb_name)}]`;
      if (citation.sources?.length) {
        const srcs = citation.sources.slice(0, 3).map(s => s.title || s.source_file).join(', ');
        result += ` [Sources: ${this.escapeHtml(srcs)}]`;
      }
      return result;
    }
    if (type === 'web_search' && citation.web_sources?.length) {
      let result = `Web Search: ${this.escapeHtml(citation.query)}`;
      result += '<br>' + citation.web_sources.map(s =>
        `<a href="${this.escapeHtml(s.url)}" target="_blank">${this.escapeHtml(s.title)}</a>`,
      ).join('<br>');
      return result;
    }
    if (type === 'run_code') {
      return `Code Execution: ${this.escapeHtml(citation.query)}`;
    }
    return citation.tool_type;
  }

  private formatOneApa(paper: PaperSource): string {
    const parts: string[] = [];
    if (paper.authors) parts.push(this.escapeHtml(paper.authors));
    if (paper.year) parts.push(`(${paper.year})`);
    if (paper.title) parts.push(`<em>${this.escapeHtml(paper.title)}</em>`);

    const url = paper.url ?? (paper.arxiv_id ? `https://arxiv.org/abs/${paper.arxiv_id}` : null);
    if (url) parts.push(`<a href="${this.escapeHtml(url)}" target="_blank">${this.escapeHtml(url)}</a>`);

    return parts.join('. ') + '.';
  }

  // ==================== Validation ====================

  /** Validate that [[CIT-X-XX]] markers in text reference existing citations */
  validateCitations(text: string): { valid: boolean; validRefs: string[]; invalidRefs: string[] } {
    const refs = text.match(/\[\[([A-Z]+-\d+-?\d*)\]\]/g) ?? [];
    const ids = refs.map(r => r.replace(/\[\[|\]\]/g, ''));

    const validRefs: string[] = [];
    const invalidRefs: string[] = [];

    for (const id of ids) {
      if (this.citations.has(id)) {
        validRefs.push(id);
      } else {
        invalidRefs.push(id);
      }
    }

    return { valid: invalidRefs.length === 0, validRefs, invalidRefs };
  }

  /** Remove invalid citation markers from text */
  fixInvalidCitations(text: string): string {
    return text.replace(
      /\[\[([A-Z]+-\d+-?\d*)\]\]\(#ref-[a-z]+-\d+-?\d*\)/g,
      (match, id) => {
        return this.citations.has(id) ? match : '';
      },
    );
  }

  // ==================== Helpers ====================

  citationExists(id: string): boolean {
    return this.citations.has(id);
  }

  getAllCitations(): Citation[] {
    return Array.from(this.citations.values());
  }

  toJSON(): Record<string, Citation> {
    return Object.fromEntries(this.citations);
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private formatAuthors(authors: string | string[]): string {
    if (Array.isArray(authors)) {
      if (authors.length <= 3) return authors.join(', ');
      return authors.slice(0, 3).join(', ') + ' et al.';
    }
    return authors;
  }
}
