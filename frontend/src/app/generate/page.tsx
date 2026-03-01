"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MermaidDiagram from "@/components/MermaidDiagram";
import DocViewer from "@/components/DocViewer";
import ProgressBar from "@/components/ProgressBar";
import HealthScoreGauge from "@/components/HealthScoreGauge";
import VulnerabilityPanel from "@/components/VulnerabilityPanel";
import BadgeWall from "@/components/BadgeWall";
import ComplexityDashboard from "@/components/ComplexityDashboard";
import AICodeReview from "@/components/AICodeReview";
import NapkinGallery from "@/components/NapkinGallery";
import { getApiBase } from "@/lib/api";

interface DiagramData {
  title: string;
  mermaid_code: string;
  description: string;
}

interface DocSection {
  title: string;
  content: string;
  order: number;
}

interface GeneratedDocs {
  repo_name: string;
  overview: string;
  sections: DocSection[];
  diagrams: DiagramData[];
  tech_stack: string;
  setup_guide: string;
  api_docs: string | null;
  full_markdown?: string;
  performance_metrics?: Record<string, any>;
  health_score?: any;
  vulnerability_scan?: any;
  badges?: any[];
  complexity_metrics?: any;
  contributing_md?: string;
  ai_code_review?: string;
  napkin_visuals?: any[];
}

type Status =
  | "pending"
  | "cloning"
  | "analyzing"
  | "generating"
  | "complete"
  | "error";

interface TaskStatus {
  status: Status;
  progress: number;
  message: string;
}

const STATUS_LABELS: Record<Status, string> = {
  pending: "Queued",
  cloning: "Cloning Repository",
  analyzing: "Analyzing Codebase",
  generating: "Generating Documentation (AI)",
  complete: "Complete",
  error: "Error",
};

function GenerateContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId") || "";

  const [status, setStatus] = useState<TaskStatus>({
    status: "pending",
    progress: 0,
    message: "Starting...",
  });
  const [docs, setDocs] = useState<GeneratedDocs | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);

  // Poll status
  useEffect(() => {
    if (!taskId) return;
    if (status.status === "complete" || status.status === "error") return;

    const interval = setInterval(async () => {
      try {
        const base = getApiBase();
        const res = await fetch(`${base}/api/status/${taskId}`);
        if (!res.ok) return;
        const data: TaskStatus = await res.json();
        setStatus(data);

        if (data.status === "complete") {
          clearInterval(interval);
          const resultRes = await fetch(`${base}/api/result/${taskId}`);
          if (resultRes.ok) {
            const resultData = await resultRes.json();
            setDocs(resultData.result);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [taskId, status.status]);

  const copyMarkdown = useCallback(() => {
    if (docs?.full_markdown) {
      navigator.clipboard.writeText(docs.full_markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [docs]);

  // ── No task ID ───────────────────────────────
  if (!taskId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        No task ID provided.{" "}
        <a href="/" className="text-amd-red underline ml-2">
          Go back
        </a>
      </div>
    );
  }

  // ── Loading / Progress state ─────────────────
  if (status.status !== "complete" && status.status !== "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-lg w-full mx-4 p-8 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-amd-red/20 border border-amd-red/30 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-amd-red animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {STATUS_LABELS[status.status]}
            </h2>
            <p className="text-gray-400">{status.message}</p>
          </div>

          <ProgressBar progress={status.progress} />

          <div className="mt-6 space-y-3">
            {(
              ["cloning", "analyzing", "generating", "complete"] as Status[]
            ).map((step) => {
              const order = [
                "cloning",
                "analyzing",
                "generating",
                "complete",
              ];
              const currentIdx = order.indexOf(status.status);
              const stepIdx = order.indexOf(step);
              const isDone = stepIdx < currentIdx;
              const isCurrent = stepIdx === currentIdx;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-3 text-sm ${
                    isDone
                      ? "text-green-400"
                      : isCurrent
                      ? "text-amd-red"
                      : "text-gray-600"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                      isDone
                        ? "bg-green-500/20 border-green-500"
                        : isCurrent
                        ? "bg-amd-red/20 border-amd-red animate-pulse"
                        : "border-gray-700"
                    }`}
                  >
                    {isDone ? "✓" : isCurrent ? "►" : "○"}
                  </div>
                  {STATUS_LABELS[step]}
                </div>
              );
            })}
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            Powered by AMD ROCm GPU acceleration
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────
  if (status.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-lg w-full mx-4 p-8 rounded-2xl bg-red-900/30 backdrop-blur-sm border border-red-500/30 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">
            Generation Failed
          </h2>
          <p className="text-gray-400 mb-6">{status.message}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-xl bg-amd-red hover:bg-red-700 text-white font-semibold transition-all"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  // ── Success state — show docs ────────────────
  if (!docs) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading results...
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "📋 Overview" },
    { id: "health", label: "🏥 Health Score" },
    { id: "diagrams", label: "📊 Diagrams" },
    { id: "complexity", label: "🔬 Complexity" },
    { id: "vulns", label: "🛡️ Security" },
    { id: "review", label: "🤖 AI Review" },
    { id: "techstack", label: "⚙️ Tech Stack" },
    { id: "setup", label: "🚀 Setup Guide" },
    { id: "badges", label: "🏷️ Badges" },
    { id: "contributing", label: "🤝 Contributing" },
    { id: "api", label: "📡 API Docs" },
    { id: "sections", label: "📄 All Sections" },
    { id: "napkin", label: "🎨 Napkin Visuals" },
    { id: "markdown", label: "📝 Raw Markdown" },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {docs.repo_name}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Documentation generated successfully
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyMarkdown}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-amd-red/30 transition-all text-sm"
              >
                {copied ? "✓ Copied!" : "Copy Markdown"}
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded-lg bg-amd-red hover:bg-red-700 text-white text-sm transition-all"
              >
                New Repo
              </a>
            </div>
          </div>

          {/* Performance metrics */}
          {docs.performance_metrics &&
            docs.performance_metrics.tokens_per_second && (
              <div className="mt-4 flex gap-4 text-xs text-gray-500">
                <span>
                  ⚡ {docs.performance_metrics.tokens_per_second} tokens/sec
                </span>
                <span>🎯 {docs.performance_metrics.total_tokens} tokens</span>
                <span>
                  ⏱{" "}
                  {docs.performance_metrics.last_generation_time?.toFixed(1)}s
                </span>
                {docs.performance_metrics.gpu_accelerated && (
                  <span className="text-amd-red">🔴 AMD GPU Accelerated</span>
                )}
              </div>
            )}

          {/* Tabs */}
          <div className="mt-6 flex gap-1 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-amd-red text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "overview" && (
          <div className="doc-content">
            <DocViewer content={docs.overview} />
          </div>
        )}

        {activeTab === "health" && docs.health_score && (
          <div className="max-w-3xl mx-auto p-8 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                Code Health Report
              </h2>
              <p className="text-white/40 text-sm">
                Automated quality assessment of your repository
              </p>
            </div>
            <HealthScoreGauge data={docs.health_score} />
          </div>
        )}

        {activeTab === "diagrams" && (
          <div className="space-y-8">
            {docs.diagrams.map((d, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5"
              >
                <h3 className="text-xl font-semibold text-white mb-2">
                  {d.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{d.description}</p>
                <div className="bg-white rounded-xl p-6 mermaid-container">
                  <MermaidDiagram chart={d.mermaid_code} />
                </div>
                <details className="mt-4">
                  <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-300">
                    View Mermaid source
                  </summary>
                  <pre className="mt-2 p-4 rounded-lg bg-black/50 text-gray-300 text-sm overflow-x-auto">
                    {d.mermaid_code}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}

        {activeTab === "complexity" && docs.complexity_metrics && (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                Codebase Complexity
              </h2>
              <p className="text-white/40 text-sm">
                Deep dive into code structure and metrics
              </p>
            </div>
            <ComplexityDashboard data={docs.complexity_metrics} />
          </div>
        )}

        {activeTab === "vulns" && docs.vulnerability_scan && (
          <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                Security Scan
              </h2>
              <p className="text-white/40 text-sm">
                Dependency vulnerability analysis
              </p>
            </div>
            <VulnerabilityPanel data={docs.vulnerability_scan} />
          </div>
        )}

        {activeTab === "review" && docs.ai_code_review && (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5">
            <AICodeReview review={docs.ai_code_review} />
          </div>
        )}

        {activeTab === "techstack" && (
          <div className="doc-content">
            <DocViewer
              content={
                docs.tech_stack || "No tech stack information generated."
              }
            />
          </div>
        )}

        {activeTab === "setup" && (
          <div className="doc-content">
            <DocViewer
              content={docs.setup_guide || "No setup guide generated."}
            />
          </div>
        )}

        {activeTab === "badges" && docs.badges && (
          <div className="max-w-3xl mx-auto p-8 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                Auto-Generated Badges
              </h2>
              <p className="text-white/40 text-sm">
                Ready-to-use shields.io badges for your README
              </p>
            </div>
            <BadgeWall badges={docs.badges} />
          </div>
        )}

        {activeTab === "contributing" && docs.contributing_md && (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  CONTRIBUTING.md
                </h2>
                <p className="text-white/40 text-sm">
                  Auto-generated contribution guidelines
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(docs.contributing_md || "");
                }}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-all"
              >
                Copy
              </button>
            </div>
            <div className="doc-content">
              <DocViewer content={docs.contributing_md} />
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div className="doc-content">
            <DocViewer
              content={
                docs.api_docs ||
                "No API documentation detected for this project."
              }
            />
          </div>
        )}

        {activeTab === "sections" && (
          <div className="space-y-6">
            {docs.sections.map((sec, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5"
              >
                <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">
                  {sec.title}
                </h3>
                <div className="doc-content">
                  <DocViewer content={sec.content} />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "markdown" && (
          <div className="relative">
            <button
              onClick={copyMarkdown}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-amd-red/20 border border-amd-red/30 text-amd-red text-sm hover:bg-amd-red/30 transition-all"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <pre className="p-6 rounded-2xl bg-black/30 border border-white/5 text-gray-300 text-sm overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[80vh] overflow-y-auto">
              {docs.full_markdown || "Markdown not available."}
            </pre>
          </div>
        )}

        {activeTab === "napkin" && (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5">
            <NapkinGallery visuals={docs.napkin_visuals || []} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <GenerateContent />
    </Suspense>
  );
}
