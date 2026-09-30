import { t } from '../../i18n/translate.js';
import type { SupportedLocale } from '../../i18n/schema.js';
import type { MessageKey } from '../../i18n/locales/index.js';

export interface TranscriptToolDefinition {
  readonly names: readonly string[];
  readonly family?:
    | 'shell'
    | 'read'
    | 'search'
    | 'write'
    | 'edit'
    | 'task'
    | 'task-control'
    | 'mcp';
  /**
   * Invariant tool name, bolded inside the action sentence.
   *
   * `view.ts` locates it with `indexOf` to colour it, so a translation that
   * dropped or altered the name would make the highlight silently stop
   * matching. Tool names are identifiers the agent emits and the user types, so
   * they stay identical in every locale — and every translation of the three
   * action strings below must still contain this exact substring.
   */
  readonly accentLabel?: string;
  readonly summaryStyle?: 'parenthetical' | 'dot';
  readonly succeededMarker?: 'check';
  readonly runningActionKey: MessageKey;
  readonly completedActionKey: MessageKey;
  readonly failedActionKey?: MessageKey;
  readonly failedActionKeysByCode?: Readonly<Record<string, MessageKey>>;
  readonly previewLines?: {
    readonly running: number;
    readonly completed: number;
    readonly failed: number;
  };
}

const BUILTIN_TOOL_DEFINITIONS: readonly TranscriptToolDefinition[] = [
  {
    names: ['bash'],
    family: 'shell',
    runningActionKey: 'transcript.tool.bash.running',
    completedActionKey: 'transcript.tool.bash.completed',
    failedActionKey: 'transcript.tool.bash.failed',
    previewLines: { running: 3, completed: 3, failed: 8 },
  },
  {
    names: ['edit', 'edit_file', 'apply_patch'],
    family: 'edit',
    runningActionKey: 'transcript.tool.edit.running',
    completedActionKey: 'transcript.tool.edit.completed',
    failedActionKey: 'transcript.tool.edit.failed',
    previewLines: { running: 3, completed: 3, failed: 8 },
  },
  {
    names: ['grep', 'search'],
    family: 'search',
    runningActionKey: 'transcript.tool.search.running',
    completedActionKey: 'transcript.tool.search.completed',
    failedActionKey: 'transcript.tool.search.failed',
    failedActionKeysByCode: { invalid_regex: 'transcript.tool.search.failed.invalidRegex' },
    previewLines: { running: 3, completed: 3, failed: 6 },
  },
  {
    names: ['glob', 'list', 'list_files'],
    family: 'search',
    runningActionKey: 'transcript.tool.list.running',
    completedActionKey: 'transcript.tool.list.completed',
    failedActionKey: 'transcript.tool.list.failed',
  },
  {
    names: ['memory'],
    runningActionKey: 'transcript.tool.memory.running',
    completedActionKey: 'transcript.tool.memory.completed',
    failedActionKey: 'transcript.tool.memory.failed',
  },
  {
    names: ['read', 'read_file', 'readfile'],
    family: 'read',
    runningActionKey: 'transcript.tool.read.running',
    completedActionKey: 'transcript.tool.read.completed',
    failedActionKey: 'transcript.tool.read.failed',
  },
  {
    names: ['write', 'write_file'],
    family: 'write',
    runningActionKey: 'transcript.tool.write.running',
    completedActionKey: 'transcript.tool.write.completed',
    failedActionKey: 'transcript.tool.write.failed',
    previewLines: { running: 3, completed: 3, failed: 8 },
  },
  {
    names: ['task', 'delegate', 'spawn_agent'],
    family: 'task',
    runningActionKey: 'transcript.tool.task.running',
    completedActionKey: 'transcript.tool.task.completed',
    failedActionKey: 'transcript.tool.task.failed',
    previewLines: { running: 3, completed: 3, failed: 8 },
  },
  {
    names: ['task_output'],
    family: 'task-control',
    summaryStyle: 'dot',
    succeededMarker: 'check',
    runningActionKey: 'transcript.tool.taskOutput.running',
    completedActionKey: 'transcript.tool.taskOutput.completed',
    failedActionKey: 'transcript.tool.taskOutput.failed',
  },
  {
    names: ['task_query'],
    family: 'task-control',
    summaryStyle: 'dot',
    succeededMarker: 'check',
    runningActionKey: 'transcript.tool.taskQuery.running',
    completedActionKey: 'transcript.tool.taskQuery.completed',
    failedActionKey: 'transcript.tool.taskQuery.failed',
  },
  {
    names: ['web_search', 'matrix_web_search', 'mcp__matrix__web_search'],
    runningActionKey: 'transcript.tool.webSearch.running',
    completedActionKey: 'transcript.tool.webSearch.completed',
    failedActionKey: 'transcript.tool.webSearch.failed',
    accentLabel: 'WebSearch',
  },
  {
    names: ['web_fetch'],
    runningActionKey: 'transcript.tool.webFetch.running',
    completedActionKey: 'transcript.tool.webFetch.completed',
    failedActionKey: 'transcript.tool.webFetch.failed',
    accentLabel: 'WebFetch',
  },
  {
    names: ['mcp'],
    family: 'mcp',
    runningActionKey: 'transcript.tool.mcp.running',
    completedActionKey: 'transcript.tool.mcp.completed',
    failedActionKey: 'transcript.tool.mcp.failed',
    previewLines: { running: 3, completed: 3, failed: 8 },
  },
];

const TOOL_DEFINITIONS: ReadonlyMap<string, TranscriptToolDefinition> = new Map(
  BUILTIN_TOOL_DEFINITIONS.flatMap((definition) =>
    definition.names.map((name) => [normalizeToolName(name), definition] as const),
  ),
);

export function resolveTranscriptToolDefinition(
  title: string | undefined,
): TranscriptToolDefinition | undefined {
  const normalized = normalizeToolName(title);
  return (
    TOOL_DEFINITIONS.get(normalized) ??
    (isMcpToolName(normalized) ? TOOL_DEFINITIONS.get('mcp') : undefined)
  );
}

/**
 * The action sentence for a tool, resolved in the active locale.
 *
 * The table holds keys rather than text so the transcript can follow a language
 * switch. A missing locale entry falls back to English inside `translate.ts`.
 */
export function transcriptToolAction(
  definition: TranscriptToolDefinition,
  phase: 'running' | 'completed',
  locale?: SupportedLocale,
): string {
  const key = phase === 'running' ? definition.runningActionKey : definition.completedActionKey;
  return locale === undefined ? t(key) : t(key, locale);
}

export function resolveTranscriptToolFailedAction(
  definition: TranscriptToolDefinition,
  errorCode: string | undefined,
  locale?: SupportedLocale,
): string {
  const byCode = errorCode ? definition.failedActionKeysByCode?.[errorCode] : undefined;
  const key = byCode ?? definition.failedActionKey ?? definition.completedActionKey;
  return locale === undefined ? t(key) : t(key, locale);
}

export function normalizeToolName(title: string | undefined): string {
  return title?.trim().toLocaleLowerCase().replaceAll('-', '_') || 'tool';
}

export function formatTranscriptToolIdentity(
  title: string | undefined,
  definition: TranscriptToolDefinition | undefined,
): string | undefined {
  if (definition?.family !== 'mcp') return undefined;
  const normalized = normalizeToolName(title);
  if (normalized.startsWith('mcp__')) {
    const [, server, ...tool] = normalized.split('__');
    return server && tool.length > 0 ? `${server}.${tool.join('.')}` : normalized;
  }
  if (normalized.startsWith('mcp_')) return normalized.slice(4).replaceAll('__', '.');
  return normalized === 'mcp' ? undefined : normalized;
}

function isMcpToolName(name: string): boolean {
  return name === 'mcp' || name.startsWith('mcp__') || name.startsWith('mcp_');
}
