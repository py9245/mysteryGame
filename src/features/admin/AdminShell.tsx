import { adminRuntimePanels, adminScaffoldSections } from "./adminContent";
import { buildAdminAiFlowGuide } from "./adminAiFlowData";
import type { AdminRuntimeData } from "./adminData";
import { getAdminScaffoldNotes } from "./adminData";
import { buildAdminReviewDashboard } from "./adminReviewData";

interface AdminShellProps {
  data: AdminRuntimeData;
}

export function AdminShell({ data }: AdminShellProps) {
  const notes = getAdminScaffoldNotes();
  const aiFlowGuide = buildAdminAiFlowGuide(
    data.aiReviewFlow,
    data.reviewQueue,
    data.overrideLog,
  );
  const reviewDashboard = buildAdminReviewDashboard(data.reviewQueue, data.overrideLog);
  const caseCatalog = data.caseCatalog;
  const aiRuntimeGuide = data.aiRuntimeGuide;
  const copyPack = data.copyPack as unknown as {
    categories: Record<string, Record<string, string | Record<string, string>>>;
  };
  const copyKeyMap = data.copyKeyMap as unknown as {
    slots: Record<string, Record<string, string>>;
  };

  return (
    <main className="page-shell">
      <section className="page-header">
        <p className="eyebrow">Admin Runtime</p>
        <h1 className="page-title">Mystery Time Control Surface</h1>
        <p className="page-kicker">
          운영자 화면은 review queue, override, 사건 카탈로그뿐 아니라 실제 AI runtime provider와
          route 구성을 읽기 전용으로 함께 보여준다.
        </p>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Text Runtime</span>
          <strong className="metric-value">
            {aiRuntimeGuide.textRuntime.provider} / {aiRuntimeGuide.textRuntime.model}
          </strong>
          <span className="metric-detail">{aiRuntimeGuide.textRuntime.route}</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Image Providers</span>
          <strong className="metric-value">{aiRuntimeGuide.imageRuntime.providers.length}</strong>
          <span className="metric-detail">
            default {aiRuntimeGuide.imageRuntime.defaultProvider}
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Manual Review</span>
          <strong className="metric-value">{reviewDashboard.activeCount}</strong>
          <span className="metric-detail">active queue items</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Case Catalog</span>
          <strong className="metric-value">{caseCatalog.totalCount}</strong>
          <span className="metric-detail">indexed case files</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Pending Override</span>
          <strong className="metric-value">{reviewDashboard.pendingOverrideCount}</strong>
          <span className="metric-detail">follow-up awaiting operator override</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">High Priority</span>
          <strong className="metric-value">{reviewDashboard.highPriorityCount}</strong>
          <span className="metric-detail">review items marked high priority</span>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel panel-accent" style={{ gridColumn: "span 7" }}>
          <h2 className="panel-title">AI Runtime Guide</h2>
          <div className="meta-row">
            <span>secret 값은 숨김</span>
            <span>env configured: {aiRuntimeGuide.envConfigured ? "yes" : "no"}</span>
          </div>
          <div className="metric-grid" style={{ marginTop: 18 }}>
            <div className="metric-card">
              <span className="metric-label">Text Provider</span>
              <strong className="metric-value">{aiRuntimeGuide.textRuntime.provider}</strong>
              <span className="metric-detail">{aiRuntimeGuide.textRuntime.transport}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Default Model</span>
              <strong className="metric-value">{aiRuntimeGuide.textRuntime.model}</strong>
              <span className="metric-detail">{aiRuntimeGuide.textRuntime.route}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Required Env</span>
              <strong className="metric-value">{aiRuntimeGuide.envKeys.join(", ")}</strong>
              <span className="metric-detail">key name only</span>
            </div>
          </div>
          <div className="panel-grid" style={{ marginTop: 18 }}>
            <div className="panel panel-muted" style={{ gridColumn: "span 6" }}>
              <h3>Text Route</h3>
              <div>route: {aiRuntimeGuide.textRuntime.route}</div>
              <div>upstream: {aiRuntimeGuide.textRuntime.upstreamEndpoint}</div>
            </div>
            <div className="panel panel-muted" style={{ gridColumn: "span 6" }}>
              <h3>Route Docs</h3>
              <div>{aiRuntimeGuide.notesDocumentPath}</div>
              <div>/src/lib/ai/catalog.ts</div>
              <div>/src/app/api/ai/README.md</div>
            </div>
          </div>
        </article>

        <article className="panel" style={{ gridColumn: "span 5" }}>
          <h2 className="panel-title">Image Provider Options</h2>
          <ul>
            {aiRuntimeGuide.imageRuntime.providers.map((provider) => (
              <li key={provider.provider}>
                <strong>{provider.provider}</strong>
                <div>model: {provider.model}</div>
                <div>route: {provider.route}</div>
                <div>endpoint: {provider.endpoint}</div>
                <div>auth header: {provider.auth}</div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel" style={{ gridColumn: "span 6" }}>
          <h2 className="panel-title">Feature to Client Mapping</h2>
          <ul>
            {aiRuntimeGuide.featureBindings.map((binding) => (
              <li key={binding.feature}>
                <strong>{binding.feature}</strong>
                <div>
                  client: {binding.client} / route: {binding.route}
                </div>
                <div className="muted">{binding.note}</div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel" style={{ gridColumn: "span 6" }}>
          <h2 className="panel-title">Provider Notes Excerpt</h2>
          <ul>
            {aiRuntimeGuide.notesExcerpt.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel" style={{ gridColumn: "span 4" }}>
          <h2 className="panel-title">Runtime Panels</h2>
          <ul>
            {adminRuntimePanels.map((panel) => (
              <li key={panel}>{panel}</li>
            ))}
          </ul>
        </article>
        <article className="panel" style={{ gridColumn: "span 4" }}>
          <h2 className="panel-title">Copy Pack Categories</h2>
          <ul>
            {Object.keys(copyPack.categories).map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </article>
        <article className="panel" style={{ gridColumn: "span 4" }}>
          <h2 className="panel-title">Copy Key Map Slots</h2>
          <ul>
            {Object.entries(copyKeyMap.slots).map(([slot, mapping]) => (
              <li key={slot}>
                <strong>{slot}</strong>
                <div className="muted">{Object.keys(mapping).length} mapped fields</div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel panel-accent">
        <h2 className="panel-title">Case Index</h2>
        <div className="meta-row">
          <span>total {caseCatalog.totalCount}</span>
          <span>files {data.caseIndex.cases.length}</span>
        </div>
        <div className="metric-grid" style={{ marginTop: 18 }}>
          {caseCatalog.difficultyCounts.map((bucket) => (
            <div key={bucket.key} className="metric-card">
              <span className="metric-label">{bucket.label}</span>
              <strong className="metric-value">{bucket.count}</strong>
            </div>
          ))}
          {caseCatalog.statusCounts.map((bucket) => (
            <div key={bucket.key} className="metric-card">
              <span className="metric-label">{bucket.label}</span>
              <strong className="metric-value">{bucket.count}</strong>
            </div>
          ))}
        </div>
        <div className="panel-grid" style={{ marginTop: 18 }}>
          {caseCatalog.cases.map((caseEntry) => (
            <article key={caseEntry.id} className="panel panel-muted" style={{ gridColumn: "span 6" }}>
              <h3>
                {caseEntry.title} ({caseEntry.id})
              </h3>
              <div className="meta-row">
                <span>stage {caseEntry.stageNumber}</span>
                <span>difficulty {caseEntry.difficultyLabel}</span>
                <span>status {caseEntry.statusLabel}</span>
              </div>
              <div className="muted">file: {caseEntry.file}</div>
              <p>{caseEntry.publicDescription}</p>
              <div>question: {caseEntry.question}</div>
              <div>requiredKeywords: {caseEntry.requiredKeywords.join(", ")}</div>
              <div>bonusKeywords: {caseEntry.bonusKeywords.join(", ")}</div>
              <div>hints: {caseEntry.hintCount}</div>
              <ul>
                {caseEntry.hints.map((hint) => (
                  <li key={hint.hintId}>
                    #{hint.order} / {hint.triggerType} / {hint.strength}
                    <div>{hint.publicText}</div>
                  </li>
                ))}
              </ul>
              {caseEntry.reviewNotes ? <div>reviewNotes: {caseEntry.reviewNotes}</div> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">AI Route Review Flow</h2>
        <div className="meta-row">
          <span>{data.aiReviewFlow.routeReference.textRoute}</span>
          <span>default provider {data.aiReviewFlow.routeReference.defaultProvider}</span>
          <span>default model {data.aiReviewFlow.routeReference.defaultModel}</span>
        </div>
        <div className="muted">runtimeDoc: {data.aiReviewFlow.routeReference.runtimeDoc}</div>
        <p>
          route samples {aiFlowGuide.totalRouteSamples} / review creation rules{" "}
          {aiFlowGuide.reviewCreationRuleCount} / override transitions{" "}
          {aiFlowGuide.overrideTransitionCount}
        </p>
        <h3>Operator Checklist</h3>
        <ul>
          {data.aiReviewFlow.operatorChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3>Route Samples</h3>
        <ul>
          {aiFlowGuide.routeSamples.map((sample) => (
            <li key={sample.id}>
              <strong>{sample.label}</strong>
              <div>purpose: {sample.purpose}</div>
              <div>
                request: {sample.request.provider} / {sample.request.model} / messages{" "}
                {sample.request.messages.length}
              </div>
              <ul>
                {sample.request.messages.map((message, index) => (
                  <li key={`${sample.id}-${message.role}-${index}`}>
                    {message.role}: {message.content}
                  </li>
                ))}
              </ul>
              <div>
                model: {sample.normalizedResponse.model} / finishReason:{" "}
                {sample.normalizedResponse.finishReason ?? "-"}
              </div>
              <div>normalizedText: {sample.normalizedResponse.text}</div>
              <div>
                usage: prompt {sample.normalizedResponse.usage?.promptTokens ?? "-"} / completion{" "}
                {sample.normalizedResponse.usage?.completionTokens ?? "-"} / total{" "}
                {sample.normalizedResponse.usage?.totalTokens ?? "-"}
              </div>
              <div>reasonCode: {sample.parsedJudgement.reasonCode}</div>
              <div>publicSummary: {sample.parsedJudgement.publicSummary}</div>
              <div>
                manualReviewRequired: {String(sample.parsedJudgement.manualReviewRequired)} /
                needsOperatorOverride: {String(sample.parsedJudgement.needsOperatorOverride)}
              </div>
              <div>operatorFocus: {sample.operatorFocus.join(", ")}</div>
              <div>
                queueAction: {sample.queueAction.result} / targetCategory{" "}
                {sample.queueAction.targetCategory ?? "-"}
              </div>
              <div>{sample.queueAction.note}</div>
              <div>
                linkedQueueItem:{" "}
                {sample.linkedQueueItem
                  ? `${sample.linkedQueueItem.id} (${sample.linkedQueueItem.queueStatus})`
                  : "-"}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel panel-accent">
        <h2 className="panel-title">Manual Review Dashboard</h2>
        <p className="panel-copy">
          review queue와 override log를 카테고리, 상태, follow-up, override 결과 기준으로 읽기
          전용 요약한 운영 대시보드다.
        </p>
        <div className="metric-grid" style={{ marginTop: 18 }}>
          <article className="metric-card">
            <span className="metric-label">Total Queue</span>
            <strong className="metric-value">{reviewDashboard.totalCount}</strong>
            <span className="metric-detail">all review items</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Active</span>
            <strong className="metric-value">{reviewDashboard.activeCount}</strong>
            <span className="metric-detail">pending + escalated</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Resolved</span>
            <strong className="metric-value">{reviewDashboard.resolvedCount}</strong>
            <span className="metric-detail">queue status resolved</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Linked Override</span>
            <strong className="metric-value">{reviewDashboard.linkedOverrideCount}</strong>
            <span className="metric-detail">queue items with override log link</span>
          </article>
        </div>

        <div className="panel-grid" style={{ marginTop: 18 }}>
          <article className="panel panel-muted" style={{ gridColumn: "span 4" }}>
            <h3>By Category</h3>
            <ul>
              {reviewDashboard.categoryCounts.map((bucket) => (
                <li key={bucket.key}>
                  <strong>{bucket.count}</strong> {bucket.label}
                </li>
              ))}
            </ul>
          </article>
          <article className="panel panel-muted" style={{ gridColumn: "span 4" }}>
            <h3>By Status</h3>
            <ul>
              {reviewDashboard.statusCounts.map((bucket) => (
                <li key={bucket.key}>
                  <strong>{bucket.count}</strong> {bucket.label}
                </li>
              ))}
            </ul>
          </article>
          <article className="panel panel-muted" style={{ gridColumn: "span 4" }}>
            <h3>Follow-Up</h3>
            <ul>
              {reviewDashboard.followUpCounts.map((bucket) => (
                <li key={bucket.key}>
                  <strong>{bucket.count}</strong> {bucket.label}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="panel-grid" style={{ marginTop: 18 }}>
          <article className="panel" style={{ gridColumn: "span 6" }}>
            <h3>Override Actions</h3>
            <ul>
              {reviewDashboard.overrideActionCounts.map((bucket) => (
                <li key={bucket.key}>
                  <strong>{bucket.count}</strong> {bucket.label}
                </li>
              ))}
            </ul>
          </article>
          <article className="panel" style={{ gridColumn: "span 6" }}>
            <h3>Override Outcomes</h3>
            <ul>
              {reviewDashboard.overrideOutcomeCounts.map((bucket) => (
                <li key={bucket.key}>
                  <strong>{bucket.count}</strong> {bucket.label}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="panel-grid" style={{ marginTop: 18 }}>
          {reviewDashboard.groupedItems.map((group) => (
            <section key={group.category} className="panel panel-muted" style={{ gridColumn: "span 4" }}>
              <div className="meta-row">
                <span>{group.label}</span>
                <span>{group.count} items</span>
              </div>
              <div className="metric-grid" style={{ marginTop: 12 }}>
                <div className="metric-card">
                  <span className="metric-label">Pending</span>
                  <strong className="metric-value">
                    {group.items.filter((item) => item.queueStatus === "pending").length}
                  </strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Escalated</span>
                  <strong className="metric-value">
                    {group.items.filter((item) => item.queueStatus === "escalated").length}
                  </strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Awaiting Override</span>
                  <strong className="metric-value">
                    {group.items.filter((item) => item.followUp.state === "awaiting_override").length}
                  </strong>
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Manual Review Queue Detail</h2>
        {reviewDashboard.groupedItems.map((group) => (
          <section key={group.category}>
            <h3>
              {group.label} ({group.count})
            </h3>
            <ul>
              {group.items.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.kind}</strong> {entry.id} - {entry.caseId} / stage{" "}
                  {entry.stageNumber} / {entry.player.nickname}
                  <div>
                    status: {entry.queueStatusLabel} / priority: {entry.priorityLabel}
                  </div>
                  <div>{entry.status.publicLabel}</div>
                  <div>internal: {entry.status.internalCode}</div>
                  <div>reasonCode: {entry.reasonCode}</div>
                  <div>{entry.summary}</div>
                  <div>blocker: {entry.blockingField}</div>
                  <div>
                    nextAction: {entry.nextAction.label} ({entry.nextAction.owner})
                  </div>
                  <div>followUp: {entry.followUp.state}</div>
                  <div>{entry.followUp.note}</div>
                  <div>
                    links: review {entry.links.reviewId} / judgement {entry.links.judgementId} /
                    override {entry.links.overrideId ?? "-"}
                  </div>
                  <div>
                    linkedOverride:{" "}
                    {entry.linkedOverride
                      ? `${entry.linkedOverride.id} (${entry.linkedOverride.action})`
                      : "-"}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>

      <section className="panel-grid">
        <article className="panel" style={{ gridColumn: "span 6" }}>
          <h2 className="panel-title">Review Queue Snapshot</h2>
          <ul>
            {reviewDashboard.items.map((entry) => {
              return (
                <li key={entry.id}>
                  <strong>{entry.categoryLabel}</strong> {entry.id}
                  <div>
                    {entry.caseId} / stage {entry.stageNumber} / {entry.player.nickname}
                  </div>
                  <div>
                    {entry.queueStatusLabel} / {entry.status.publicLabel}
                  </div>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="panel" style={{ gridColumn: "span 6" }}>
          <h2 className="panel-title">Override Log</h2>
          <ul>
            {data.overrideLog.items.map((entry) => {
              return (
                <li key={entry.id}>
                  <strong>{entry.kind}</strong> {entry.id} - review {entry.reviewId}
                  <div>action: {entry.action}</div>
                  <div>operator: {entry.operator.label}</div>
                  <div>publicOutcome: {entry.result.publicOutcome}</div>
                  <div>{entry.result.publicSummary}</div>
                  <div>{entry.result.internalNote}</div>
                  <div>queueItem: {entry.links.queueItemId}</div>
                </li>
              );
            })}
          </ul>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel" style={{ gridColumn: "span 8" }}>
          <h2 className="panel-title">Judgement Examples</h2>
          <ul>
            {data.judgementExamples.items.map((item) => {
              const entry = item as {
                id: string;
                kind: string;
                response?: {
                  publicReply?: string;
                  publicOutcome?: string;
                  publicSummary?: string;
                  manualReviewRequired?: boolean;
                  needsOperatorOverride?: boolean;
                  reasonCode?: string;
                };
                publicPayload?: {
                  publicReply?: string;
                  publicOutcome?: string;
                  publicSummary?: string;
                };
                internalPayload?: {
                  judgement?: string;
                  reasonCode?: string;
                  matchedRequiredKeywords?: string[];
                  missingRequiredKeywords?: string[];
                  matchedBonusKeywords?: string[];
                };
              };
              return (
                <li key={entry.id}>
                  <strong>{entry.kind}</strong> {entry.id}
                  <div>
                    publicReply:{" "}
                    {entry.response?.publicReply ?? entry.publicPayload?.publicReply ?? "-"}
                  </div>
                  <div>
                    publicOutcome:{" "}
                    {entry.response?.publicOutcome ?? entry.publicPayload?.publicOutcome ?? "-"}
                  </div>
                  <div>
                    publicSummary:{" "}
                    {entry.response?.publicSummary ?? entry.publicPayload?.publicSummary ?? "-"}
                  </div>
                  <div>
                    manualReviewRequired:{" "}
                    {String(entry.response?.manualReviewRequired ?? false)}
                  </div>
                  <div>
                    needsOperatorOverride:{" "}
                    {String(entry.response?.needsOperatorOverride ?? false)}
                  </div>
                  <div>
                    reasonCode: {entry.response?.reasonCode ?? entry.internalPayload?.reasonCode ?? "-"}
                  </div>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="panel" style={{ gridColumn: "span 4" }}>
          <h2 className="panel-title">Current Scaffold Sections</h2>
          <ul>
            {adminScaffoldSections.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
          <h3>Placeholder Notes</h3>
          <ul>
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
