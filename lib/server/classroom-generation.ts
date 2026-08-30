import { nanoid } from 'nanoid';
import { callLLM } from '@/lib/ai/llm';
import { createStageAPI } from '@/lib/api/stage-api';
import type { StageStore } from '@/lib/api/stage-api-types';
import {
  applyOutlineFallbacks,
  generateSceneOutlinesFromRequirements,
} from '@/lib/generation/outline-generator';
import {
  createSceneWithActions,
  generateSceneActions,
  generateSceneContent,
} from '@/lib/generation/scene-generator';
import type { AICallFn } from '@/lib/generation/pipeline-types';
import type { AgentInfo } from '@/lib/generation/pipeline-types';
import { getDefaultAgents } from '@/lib/orchestration/registry/store';
import { createLogger } from '@/lib/logger';
import { isProviderKeyRequired } from '@/lib/ai/providers';
import { resolveClassroomWebSearchConfig } from '@/lib/server/web-search-config';
import { resolveModel } from '@/lib/server/resolve-model';
import { getStageModel } from '@/lib/server/model-routes';
import { resolveVocationalActive } from '@/lib/config/feature-flags';
import { buildSearchQuery } from '@/lib/server/search-query-builder';
import { formatSearchResultsAsContext, searchWeb } from '@/lib/web-search';
import type { BaiduSubSources, WebSearchProviderId } from '@/lib/web-search/types';
import { persistClassroom, CLASSROOMS_DIR } from '@/lib/server/classroom-storage';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import {
  generateMediaForClassroom,
  replaceMediaPlaceholders,
  generateTTSForClassroom,
} from '@/lib/server/classroom-media-generation';
import { withGenerationRetry } from '@/lib/generation/generation-retry';
import { buildVideoManifestFromOutlines } from '@/lib/media/video-manifest';
import type { UserRequirements } from '@/lib/types/generation';
import type { Scene, Stage } from '@/lib/types/stage';
import { AGENT_COLOR_PALETTE, AGENT_DEFAULT_AVATARS } from '@/lib/constants/agent-defaults';

const log = createLogger('Classroom');

export interface GenerateClassroomInput {
  requirement: string;
  pdfContent?: { text: string; images: string[] };
  enableWebSearch?: boolean;
  webSearchProviderId?: WebSearchProviderId;
  webSearchApiKey?: string;
  baiduSubSources?: BaiduSubSources;
  enableImageGeneration?: boolean;
  enableVideoGeneration?: boolean;
  enableTTS?: boolean;
  agentMode?: 'default' | 'generate';
}

export type ClassroomGenerationStep =
  | 'initializing'
  | 'researching'
  | 'generating_outlines'
  | 'generating_scenes'
  | 'generating_media'
  | 'generating_tts'
  | 'persisting'
  | 'completed';

export interface ClassroomGenerationProgress {
  step: ClassroomGenerationStep;
  progress: number;
  message: string;
  scenesGenerated: number;
  totalScenes?: number;
}

export interface GenerateClassroomResult {
  id: string;
  url: string;
  stage: Stage;
  scenes: Scene[];
  scenesCount: number;
  createdAt: string;
}

function createInMemoryStore(stage: Stage): StageStore {
  let state = {
    stage: stage as Stage | null,
    scenes: [] as Scene[],
    currentSceneId: null as string | null,
    mode: 'playback' as const,
  };

  const listeners: Array<(s: typeof state, prev: typeof state) => void> = [];

  return {
    getState: () => state,
    setState: (partial: Partial<typeof state>) => {
      const prev = state;
      state = { ...state, ...partial };
      listeners.forEach((fn) => fn(state, prev));
    },
    subscribe: (listener: (s: typeof state, prev: typeof state) => void) => {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
  };
}

function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return cleaned.trim();
}

async function generateAgentProfiles(
  requirement: string,
  languageDirective: string,
  aiCall: AICallFn,
): Promise<AgentInfo[]> {
  const systemPrompt =
    'You are an expert instructional designer. Generate agent profiles for a multi-agent classroom simulation. Return ONLY valid JSON, no markdown or explanation.';

  const userPrompt = `Generate agent profiles for a course with this requirement:
${requirement}

Requirements:
- Decide the appropriate number of agents based on the course content (typically 3-5)
- Exactly 1 agent must have role "teacher", the rest can be "assistant" or "student"
- Each agent needs: name, role, persona (2-3 sentences describing personality and teaching/learning style)
- Language directive for this course: ${languageDirective}
  Agent names and personas must follow this language directive.

Return a JSON object with this exact structure:
{
  "agents": [
    {
      "name": "string",
      "role": "teacher" | "assistant" | "student",
      "persona": "string (2-3 sentences)"
    }
  ]
}`;

  const response = await aiCall(systemPrompt, userPrompt);
  const rawText = stripCodeFences(response);
  const parsed = JSON.parse(rawText) as {
    agents: Array<{ name: string; role: string; persona: string }>;
  };

  if (!parsed.agents || !Array.isArray(parsed.agents) || parsed.agents.length < 2) {
    throw new Error(`Expected at least 2 agents, got ${parsed.agents?.length ?? 0}`);
  }

  const teacherCount = parsed.agents.filter((a) => a.role === 'teacher').length;
  if (teacherCount !== 1) {
    throw new Error(`Expected exactly 1 teacher, got ${teacherCount}`);
  }

  return parsed.agents.map((a, i) => ({
    id: `gen-server-${i}`,
    name: a.name,
    role: a.role,
    persona: a.persona,
  }));
}

export async function generateClassroom(
  input: GenerateClassroomInput,
  options: {
    baseUrl: string;
    onProgress?: (progress: ClassroomGenerationProgress) => Promise<void> | void;
  },
): Promise<GenerateClassroomResult> {
  const { requirement, pdfContent } = input;

  await options.onProgress?.({
    step: 'initializing',
    progress: 5,
    message: 'Initializing classroom generation',
    scenesGenerated: 0,
  });

  const {
    model: languageModel,
    modelInfo,
    modelString,
    providerId,
    apiKey,
    thinkingConfig: classroomThinking,
  } = await resolveModel({ stage: 'generate-classroom' });
  log.info(`Using server-configured model: ${modelString}`);

  // Fail fast if the resolved provider has no API key configured
  if (isProviderKeyRequired(providerId) && !apiKey) {
    throw new Error(
      `No API key configured for provider "${providerId}". ` +
        `Set the appropriate key in .env.local or server-providers.yml (e.g. ${providerId.toUpperCase()}_API_KEY).`,
    );
  }

  // The web-search query rewrite is a light, separable stage operators may route
  // to a cheaper model. It defaults to the classroom model and is only
  // re-resolved lazily (inside the web-search branch, and only when a route is
  // configured). This keeps a misconfigured optional route from aborting all
  // classroom generation, and skips the extra resolution when web search is off.
  let searchQueryModel = languageModel;
  let searchQueryThinking = classroomThinking;

  const aiCall: AICallFn = async (systemPrompt, userPrompt, _images) => {
    const result = await callLLM(
      {
        model: languageModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxOutputTokens: modelInfo?.outputWindow,
      },
      'generate-classroom',
      undefined,
      classroomThinking,
    );
    return result.text;
  };

  const sceneAiCall: AICallFn = async (systemPrompt, userPrompt, _images) => {
    const result = await callLLM(
      {
        model: languageModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxOutputTokens: modelInfo?.outputWindow,
        maxRetries: 0,
      },
      'generate-classroom-scene',
      undefined,
      classroomThinking,
    );
    return result.text;
  };

  const searchQueryAiCall: AICallFn = async (systemPrompt, userPrompt, _images) => {
    const result = await callLLM(
      {
        model: searchQueryModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxOutputTokens: 256,
      },
      'web-search-query-rewrite',
      undefined,
      searchQueryThinking,
    );
    return result.text;
  };

  const requirements: UserRequirements = {
    requirement,
  };
  const vocationalActive = resolveVocationalActive(requirements);
  const pdfText = pdfContent?.text || undefined;

  await options.onProgress?.({
    step: 'researching',
    progress: 10,
    message: 'Researching topic',
    scenesGenerated: 0,
  });

  // Web search (optional, graceful degradation)
  let researchContext: string | undefined;
  if (input.enableWebSearch) {
    const webSearchConfig = resolveClassroomWebSearchConfig(input);
    if (webSearchConfig) {
      // Re-resolve the query-rewrite model only when explicitly routed. If
      // resolution itself fails (e.g. unknown provider in the route), fall back
      // to the classroom model here; a route with a missing key resolves fine
      // and surfaces only later in callLLM, which the outer try/catch below
      // degrades gracefully — either way the pipeline still works.
      const rewriteRoute = getStageModel('web-search-query-rewrite');
      if (rewriteRoute) {
        try {
          const rewriteResolved = await resolveModel({ stage: 'web-search-query-rewrite' });
          searchQueryModel = rewriteResolved.model;
          searchQueryThinking = rewriteResolved.thinkingConfig;
        } catch (err) {
          log.warn(
            `web-search-query-rewrite route "${rewriteRoute}" unavailable; using classroom model for query rewrite`,
            err,
          );
        }
      }
      try {
        const searchQuery = await buildSearchQuery(requirement, pdfText, searchQueryAiCall);

        log.info('Running web search for classroom generation', {
          hasPdfContext: searchQuery.hasPdfContext,
          rawRequirementLength: searchQuery.rawRequirementLength,
          rewriteAttempted: searchQuery.rewriteAttempted,
          finalQueryLength: searchQuery.finalQueryLength,
        });

        const searchResult = await searchWeb({
          providerId: webSearchConfig.providerId,
          query: searchQuery.query,
          apiKey: webSearchConfig.apiKey,
          baseUrl: webSearchConfig.baseUrl,
          baiduSubSources: webSearchConfig.baiduSubSources,
        });
        researchContext = formatSearchResultsAsContext(searchResult);
        if (researchContext) {
          log.info(`Web search returned ${searchResult.sources.length} sources`);
        }
      } catch (e) {
        log.warn('Web search failed, continuing without search context:', e);
      }
    } else {
      log.warn('enableWebSearch is true but no web search API key configured, skipping web search');
    }
  }

  await options.onProgress?.({
    step: 'generating_outlines',
    progress: 15,
    message: 'Generating scene outlines',
    scenesGenerated: 0,
  });

  // ── Lesson checkpoint ──
  // Gateway LLM calls fail intermittently; without persistence a failure at
  // scene N discarded outlines, agents and scenes 1..N-1 on every retry.
  // Keyed by a hash of the requirement (stable per lesson, unlike the
  // per-attempt stageId). On retry we reuse the stored outlines and agents
  // and rebuild only the missing scenes.
  const partialKey = createHash('sha1').update(requirement).digest('hex').slice(0, 16);
  const partialPath = path.join(CLASSROOMS_DIR, `_partial_${partialKey}.json`);

  interface LessonCheckpoint {
    outlines?: unknown[];
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    agents?: any[];
    languageDirective?: string;
    courseTitle?: string;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    entries?: any[];
  }
  let checkpoint: LessonCheckpoint | null = null;
  try {
    const raw = await fs.readFile(partialPath, 'utf8');
    const parsed = JSON.parse(raw) as LessonCheckpoint;
    if (parsed && Array.isArray(parsed.outlines) && parsed.outlines.length > 0) {
      checkpoint = parsed;
      log.info(
        `Lesson checkpoint found: ${parsed.outlines?.length ?? 0} outlines, ${parsed.entries?.length ?? 0} banked scenes — resuming`,
      );
    }
  } catch {
    // no checkpoint — normal first attempt
  }

  const saveCheckpoint = async (data: LessonCheckpoint) => {
    try {
      await fs.mkdir(CLASSROOMS_DIR, { recursive: true });
      await fs.writeFile(partialPath, JSON.stringify(data));
    } catch (e) {
      log.warn('Failed to write lesson checkpoint:', e);
    }
  };

  let outlinesResult;
  if (checkpoint?.outlines?.length) {
    log.info(`Using ${checkpoint.outlines.length} outlines from lesson checkpoint`);
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    outlinesResult = {
      success: true,
      data: {
        outlines: checkpoint.outlines,
        languageDirective: checkpoint.languageDirective || '',
        courseTitle: checkpoint.courseTitle,
      },
    } as any;
  } else {
    outlinesResult = await generateSceneOutlinesFromRequirements(
      requirements,
      pdfText,
      undefined,
      aiCall,
      {
        imageGenerationEnabled: input.enableImageGeneration,
        videoGenerationEnabled: input.enableVideoGeneration,
        researchContext,
        // NO teacherContext — agents haven't been generated yet
      },
    );
  }

  if (!outlinesResult.success || !outlinesResult.data) {
    log.error('Failed to generate outlines:', outlinesResult.error);
    throw new Error(outlinesResult.error || 'Failed to generate scene outlines');
  }

  if (!checkpoint?.outlines?.length) {
    checkpoint = {
      outlines: outlinesResult.data.outlines,
      languageDirective: outlinesResult.data.languageDirective,
      courseTitle: outlinesResult.data.courseTitle,
      entries: [],
    };
    await saveCheckpoint(checkpoint);
  }

  const { languageDirective, courseTitle, outlines } = outlinesResult.data;
  log.info(
    `Generated ${outlines.length} scene outlines (languageDirective: ${languageDirective}, courseTitle: ${courseTitle ?? 'n/a'})`,
  );

  await options.onProgress?.({
    step: 'generating_outlines',
    progress: 30,
    message: `Generated ${outlines.length} scene outlines`,
    scenesGenerated: 0,
    totalScenes: outlines.length,
  });

  // Resolve agents based on agentMode — now AFTER outlines so we can use languageDirective
  let agents: AgentInfo[];
  const agentMode = input.agentMode || 'default';
  if (agentMode === 'generate') {
    log.info('Generating custom agent profiles via LLM...');
    try {
      agents = await generateAgentProfiles(requirement, languageDirective, aiCall);
      log.info(`Generated ${agents.length} agent profiles`);
    } catch (e) {
      log.warn('Agent profile generation failed, falling back to defaults:', e);
      agents = getDefaultAgents();
    }
  } else {
    agents = getDefaultAgents();
  }

  if (checkpoint && !checkpoint.agents?.length) {
    checkpoint.agents = agents;
    await saveCheckpoint(checkpoint);
  }

  const stageId = nanoid(10);
  const stage: Stage = {
    id: stageId,
    name: courseTitle || outlines[0]?.title || requirement.slice(0, 50),
    description: undefined,
    languageDirective,
    videoManifest: buildVideoManifestFromOutlines(outlines),
    style: 'interactive',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    // For LLM-generated agents, embed full configs so the client can
    // hydrate the agent registry without prior IndexedDB data.
    // For default agents, just record IDs — the client already has them.
    ...(agentMode === 'generate'
      ? {
          generatedAgentConfigs: agents.map((a, i) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            persona: a.persona || '',
            avatar: AGENT_DEFAULT_AVATARS[i % AGENT_DEFAULT_AVATARS.length],
            color: AGENT_COLOR_PALETTE[i % AGENT_COLOR_PALETTE.length],
            priority: a.role === 'teacher' ? 10 : a.role === 'assistant' ? 7 : 5,
          })),
        }
      : {
          agentIds: agents.map((a) => a.id),
        }),
  };

  const store = createInMemoryStore(stage);
  const api = createStageAPI(store);

  log.info('Stage 2: Generating scene content and actions...');
  let generatedScenes = 0;
  const checkpointEntries = checkpoint?.entries ?? [];


  for (const [index, outline] of outlines.entries()) {
    const safeOutline = applyOutlineFallbacks(outline, true, {
      allowProceduralSkill: vocationalActive,
    });

    // Rebuild previously completed scenes instead of regenerating them.
    const checkpointed = checkpointEntries[index];
    if (checkpointed) {
      const restoredId = createSceneWithActions(
        safeOutline,
        checkpointed.content,
        checkpointed.actions,
        api,
      );
      if (restoredId) {
        generatedScenes += 1;
        continue;
      }
      log.warn(`Checkpoint scene ${index + 1} could not be restored; regenerating`);
    }
    const progressStart = 30 + Math.floor((index / Math.max(outlines.length, 1)) * 60);

    await options.onProgress?.({
      step: 'generating_scenes',
      progress: Math.max(progressStart, 31),
      message: `Generating scene ${index + 1}/${outlines.length}: ${safeOutline.title}`,
      scenesGenerated: generatedScenes,
      totalScenes: outlines.length,
    });

    const reportSceneRetry = async (
      phase: 'content' | 'actions',
      event: { attempt: number; maxAttempts: number; reason: string },
    ) => {
      const nextAttempt = Math.min(event.attempt + 1, event.maxAttempts);
      const message = `Retrying scene ${index + 1}/${outlines.length} ${phase} (${nextAttempt}/${event.maxAttempts}): ${safeOutline.title}`;
      log.warn(`${message} — ${event.reason}`);
      await options.onProgress?.({
        step: 'generating_scenes',
        progress: Math.max(progressStart, 31),
        message,
        scenesGenerated: generatedScenes,
        totalScenes: outlines.length,
      });
    };

    const content = await withGenerationRetry(
      () =>
        generateSceneContent(safeOutline, sceneAiCall, {
          agents,
          languageDirective,
          allowProceduralSkill: vocationalActive,
        }),
      {
        label: `scene ${index + 1}/${outlines.length} content`,
        shouldRetryResult: (result) => result === null,
        onRetry: (event) => reportSceneRetry('content', event),
      },
    );
    if (!content) {
      log.warn(`Skipping scene "${safeOutline.title}" — content generation failed`);
      continue;
    }

    const actions = await withGenerationRetry(
      () =>
        generateSceneActions(safeOutline, content, sceneAiCall, {
          agents,
          languageDirective,
        }),
      {
        label: `scene ${index + 1}/${outlines.length} actions`,
        onRetry: (event) => reportSceneRetry('actions', event),
      },
    );
    log.info(`Scene "${safeOutline.title}": ${actions.length} actions`);

    const sceneId = createSceneWithActions(safeOutline, content, actions, api);
    if (!sceneId) {
      log.warn(`Skipping scene "${safeOutline.title}" — scene creation failed`);
      continue;
    }

    generatedScenes += 1;
    try {
      checkpointEntries[index] = { outline: safeOutline, content, actions };
      if (checkpoint) {
        checkpoint.entries = checkpointEntries;
        await saveCheckpoint(checkpoint);
      }
    } catch {
      // checkpointing is best-effort
    }
    const progressEnd = 30 + Math.floor(((index + 1) / Math.max(outlines.length, 1)) * 60);
    await options.onProgress?.({
      step: 'generating_scenes',
      progress: Math.min(progressEnd, 90),
      message: `Generated ${generatedScenes}/${outlines.length} scenes`,
      scenesGenerated: generatedScenes,
      totalScenes: outlines.length,
    });
  }

  const scenes = store.getState().scenes;
  log.info(`Pipeline complete: ${scenes.length} scenes generated`);

  if (scenes.length === 0) {
    throw new Error('No scenes were generated');
  }

  // Phase: Media generation (after all scenes generated)
  if (input.enableImageGeneration || input.enableVideoGeneration) {
    await options.onProgress?.({
      step: 'generating_media',
      progress: 90,
      message: 'Generating media files',
      scenesGenerated: scenes.length,
      totalScenes: outlines.length,
    });

    try {
      const mediaMap = await generateMediaForClassroom(outlines, stageId, options.baseUrl);
      replaceMediaPlaceholders(scenes, mediaMap);
      log.info(`Media generation complete: ${Object.keys(mediaMap).length} files`);
    } catch (err) {
      log.warn('Media generation phase failed, continuing:', err);
    }
  }

  // Phase: TTS generation
  if (input.enableTTS) {
    await options.onProgress?.({
      step: 'generating_tts',
      progress: 94,
      message: 'Generating TTS audio',
      scenesGenerated: scenes.length,
      totalScenes: outlines.length,
    });

    try {
      await generateTTSForClassroom(scenes, stageId, options.baseUrl);
      log.info('TTS generation complete');
    } catch (err) {
      log.warn('TTS generation phase failed, continuing:', err);
    }
  }

  await options.onProgress?.({
    step: 'persisting',
    progress: 98,
    message: 'Persisting classroom data',
    scenesGenerated: scenes.length,
    totalScenes: outlines.length,
  });

  const persisted = await persistClassroom(
    {
      id: stageId,
      stage,
      scenes,
    },
    options.baseUrl,
  );

  log.info(`Classroom persisted: ${persisted.id}, URL: ${persisted.url}`);

  // Lesson fully generated — clear its checkpoint.
  try {
    await fs.unlink(partialPath);
  } catch {
    // nothing to clean up
  }

  await options.onProgress?.({
    step: 'completed',
    progress: 100,
    message: 'Classroom generation completed',
    scenesGenerated: scenes.length,
    totalScenes: outlines.length,
  });

  return {
    id: persisted.id,
    url: persisted.url,
    stage,
    scenes,
    scenesCount: scenes.length,
    createdAt: persisted.createdAt,
  };
}
