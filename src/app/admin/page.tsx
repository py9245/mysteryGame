export const dynamic = "force-dynamic";

function buildAdminBuildFallbackData() {
  return {
    caseIndex: {
      version: "build-fallback",
      cases: [],
    },
    caseCatalog: {
      totalCount: 0,
      difficultyCounts: [],
      statusCounts: [],
      cases: [],
    },
    copyPack: {
      categories: {},
    },
    copyKeyMap: {
      slots: {},
    },
    aiReviewFlow: {
      version: "build-fallback",
      routeReference: {
        textRoute: "/api/ai/text",
        runtimeDoc: "/api/ai/README.md",
        defaultProvider: "openai",
        defaultModel: "gpt-5-mini",
      },
      operatorChecklist: [],
      routeSamples: [],
      reviewRoutingRules: [],
      overrideTransitions: [],
    },
    reviewQueue: {
      version: "build-fallback",
      items: [],
    },
    overrideLog: {
      version: "build-fallback",
      items: [],
    },
    aiRuntimeGuide: {
      envKeys: [],
      envConfigured: false,
      textRuntime: {
        provider: "openai",
        model: "gpt-5-mini",
        route: "/api/ai/text",
        transport: "runtime",
        upstreamEndpoint: "",
      },
      imageRuntime: {
        defaultProvider: "openai_gpt_image",
        providers: [],
      },
      featureBindings: [],
      notesDocumentPath: "",
      notesExcerpt: [],
    },
    judgementExamples: {
      version: "build-fallback",
      items: [],
    },
  };
}

export default async function AdminPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return (
      <main className="page-shell">
        <section className="page-header">
          <p className="eyebrow">Admin Runtime</p>
          <h1 className="page-title">Mystery Time Control Surface</h1>
          <p className="page-kicker">빌드 단계에서는 관리자 데이터를 로드하지 않습니다.</p>
        </section>
      </main>
    );
  }

  try {
    const [{ AdminShell }, { loadAdminRuntimeData }] = await Promise.all([
      import("@/features/admin"),
      import("@/features/admin/adminData"),
    ]);
    const data = await loadAdminRuntimeData();
    return <AdminShell data={data} />;
  } catch {
    const { AdminShell } = await import("@/features/admin");
    return <AdminShell data={buildAdminBuildFallbackData()} />;
  }
}
