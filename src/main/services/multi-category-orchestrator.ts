import type { ResearchOrchestrator } from './orchestrator'
import type { TopIssuePicker } from './top-issue-picker'
import type { AppConfig, ResearchResult, TopIssue } from '../../shared/types'

export class MultiCategoryOrchestrator {
  constructor(
    private orchestrator: Pick<ResearchOrchestrator, 'run'>,
    private picker: Pick<TopIssuePicker, 'pick'>,
  ) {}

  async run(
    config: AppConfig,
    existingByCategory: Record<string, ResearchResult[]> = {},
  ): Promise<{ results: ResearchResult[]; topIssue: TopIssue }> {
    const settled = await Promise.allSettled(
      config.categories.map(cat =>
        this.orchestrator.run(config, cat, existingByCategory[cat.name] || []),
      ),
    )
    const results = settled
      .filter((s): s is PromiseFulfilledResult<ResearchResult> => s.status === 'fulfilled')
      .map(s => s.value)
    if (results.length === 0) throw new Error('All categories failed')
    const topIssue = await this.picker.pick(results)
    return { results, topIssue }
  }
}
