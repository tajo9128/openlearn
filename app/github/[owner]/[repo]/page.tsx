'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Github, Star, GitFork, ExternalLink, ArrowLeft, BookOpen, Loader2, Sparkles, FlaskConical, Play } from 'lucide-react';
import { nanoid } from 'nanoid';

function formatStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export default function GitHubRepoPage() {
  const { owner, repo } = useParams();
  const router = useRouter();
  const [repoData, setRepoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!owner || !repo) return;

    fetch(`/api/learning/github/${owner}/${repo}`)
      .then((r) => r.json())
      .then((d) => setRepoData(d.repo))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [owner, repo]);

  /**
   * Generate a classroom from this repo's README using OpenMAIC's pipeline.
   * Creates a GenerationSessionState and navigates to /generation-preview.
   */
  const handleGenerateClassroom = async () => {
    if (!repoData) return;
    setGenerating(true);

    try {
      // Fetch README if not already loaded
      let readme = repoData.readme;
      if (!readme) {
        const res = await fetch(`/api/learning/github/${owner}/${repo}`);
        const data = await res.json();
        readme = data.repo?.readme ?? '';
      }

      if (!readme) {
        alert('Could not fetch README content for this repository.');
        setGenerating(false);
        return;
      }

      // Build the requirement prompt
      const requirement = `Create an interactive, educational classroom about the GitHub repository "${repoData.full_name}".

Repository Description: ${repoData.description ?? 'No description'}
Language: ${repoData.language ?? 'Unknown'}
Stars: ${repoData.stars ?? 0}

Use the following README content as the primary source material to create a comprehensive learning experience:

---

${readme.substring(0, 50000)}

---

Create slides that cover:
1. What this project is and why it matters
2. Key concepts and architecture
3. How to get started and install
4. Core features and usage examples
5. Code examples with explanations
6. Best practices and common patterns
7. Practice exercises and quizzes

Make it interactive with quizzes and code examples. Target audience: developers and researchers learning this technology.`;

      // Create the session state (same shape as OpenMAIC's home page)
      const sessionState = {
        sessionId: nanoid(),
        requirements: {
          requirement,
          userNickname: 'BioDockify Student',
          interactiveMode: true,
        },
        pdfText: readme,
        currentStep: 'generating' as const,
        courseTitle: `${repoData.repo} — Interactive Course`,
      };

      // Store in sessionStorage (same key as OpenMAIC uses)
      sessionStorage.setItem('generationSession', JSON.stringify(sessionState));

      // Navigate to generation preview
      router.push('/generation-preview');
    } catch (err) {
      console.error('Failed to generate classroom:', err);
      alert('Failed to start classroom generation. Please try again.');
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!repoData) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Github className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">Repository not found</p>
          <Link href="/github" className="text-emerald-600 hover:underline mt-2 inline-block">
            Back to GitHub Learning
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/github" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to GitHub Learning
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Github className="w-5 h-5" />
                <span className="text-sm text-neutral-400 font-mono">{repoData.full_name}</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">{repoData.description ?? repoData.repo}</h1>

              <div className="flex items-center gap-4 text-sm text-neutral-300 mt-4">
                {repoData.language && (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    {repoData.language}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4" /> {formatStars(repoData.stars ?? 0)}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-4 h-4" /> {formatStars(repoData.forks ?? 0)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={repoData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-neutral-700 rounded-lg hover:bg-neutral-600 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" /> GitHub
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            {/* Generate Classroom/Video */}
            <button
              onClick={handleGenerateClassroom}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Preparing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Interactive Classroom
                </>
              )}
            </button>

            {/* Practice with Workspace */}
            <Link
              href="/workspace"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <FlaskConical className="w-4 h-4" /> Practice in Workspace
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">README.md</span>
            </div>
          </div>

          <div className="p-6">
            {repoData.readme ? (
              <div
                className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-code:text-emerald-600 dark:prose-code:text-emerald-400"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(repoData.readme) }}
              />
            ) : (
              <p className="text-neutral-500">README not available. Visit the GitHub repository for details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Basic markdown to HTML renderer (no npm dependency).
 */
function renderMarkdown(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^######\s(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s(.+)$/gm, '<h5>$1</h5>')
    .replace(/^####\s(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s(.+)$/gm, '<h1>$1</h1>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^\s*[-*]\s(.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^(?!<|$|\s*$)(.+)$/gm, '<p>$1</p>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '');

  return html;
}
