"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "@/lib/api";

const FEATURES = [
  {
    icon: "🏥",
    title: "Code Health Score",
    desc: "A-F grade with animated gauge — tests, CI, license, Docker, docs density.",
    tag: "NEW",
  },
  {
    icon: "🛡️",
    title: "Vulnerability Scanner",
    desc: "Auto-scan dependencies for known CVEs with severity breakdown.",
    tag: "NEW",
  },
  {
    icon: "🤖",
    title: "AI Code Review",
    desc: "LLM-powered review: security, performance, architecture rated 1-10.",
    tag: "NEW",
  },
  {
    icon: "🔬",
    title: "Complexity Metrics",
    desc: "Language distribution charts, file stats, dependency breakdown.",
    tag: "NEW",
  },
  {
    icon: "🏷️",
    title: "Badge Generator",
    desc: "Auto-create shields.io badges — language, health, CI, Docker.",
    tag: "NEW",
  },
  {
    icon: "🤝",
    title: "Auto CONTRIBUTING.md",
    desc: "Language-aware contribution guidelines generated from codebase.",
    tag: "NEW",
  },
  {
    icon: "📄",
    title: "README & Overview",
    desc: "Auto-generate project description, purpose, and key features.",
  },
  {
    icon: "🏗️",
    title: "Architecture Diagrams",
    desc: "Mermaid.js diagrams showing components, data flow, and structure.",
  },
  {
    icon: "🔌",
    title: "API Documentation",
    desc: "Detect and document REST endpoints, methods, and payloads.",
  },
  {
    icon: "🚀",
    title: "Setup Guide",
    desc: "Step-by-step installation, configuration, and run instructions.",
  },
  {
    icon: "🧩",
    title: "Tech Stack Breakdown",
    desc: "Every framework, library, and tool — explained.",
  },
  {
    icon: "⚡",
    title: "AMD GPU Accelerated",
    desc: "LLM inference powered by AMD ROCm for blazing-fast generation.",
  },
];

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    // Basic validation
    if (!repoUrl.includes("github.com")) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${getApiBase()}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });

      if (!res.ok) throw new Error("Failed to start generation");
      const data = await res.json();
      router.push(`/generate?taskId=${data.task_id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-amd min-h-screen">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-amd-red/10 border border-amd-red/30 text-amd-red text-sm font-medium mb-6">
          AMD Slingshot 2026 &mdash; Generative AI for Everyone
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
          Turn any GitHub repo into
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amd-red to-orange-500">
            beautiful documentation
          </span>
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
          Paste a GitHub link. Our AI scans every file, understands the
          architecture, and generates complete docs — README, diagrams, API
          reference, setup guide — in seconds. Powered by local LLMs on AMD
          GPUs.
        </p>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3"
        >
          <div className="flex-1 relative">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amd-red focus:ring-1 focus:ring-amd-red transition-all text-lg"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 rounded-xl bg-amd-red hover:bg-red-700 text-white font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 glow-border"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
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
                Generating…
              </>
            ) : (
              <>Generate Docs</>
            )}
          </button>
        </form>

        {error && (
          <p className="text-red-400 mt-3 text-sm">{error}</p>
        )}

        <p className="text-gray-600 text-sm mt-4">
          Works with any public repository. Private repos need a GitHub token.
        </p>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-white text-center mb-4">
          12 Powerful Features
        </h2>
        <p className="text-gray-400 text-center mb-12 text-sm">
          Way more than just docs — full codebase intelligence.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f: any) => (
            <div
              key={f.title}
              className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-amd-red/30 transition-all group"
            >
              {f.tag && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amd-red/20 border border-amd-red/50 text-amd-red text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  {f.tag}
                </span>
              )}
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amd-red transition-colors">
                {f.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          How It Works
        </h2>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {[
            {
              step: "1",
              title: "Paste Repo URL",
              desc: "Enter any public GitHub repository link.",
            },
            {
              step: "2",
              title: "AI Analyzes Code",
              desc: "We clone, parse files, detect frameworks, and understand architecture.",
            },
            {
              step: "3",
              title: "Generate Docs",
              desc: "LLM generates README, diagrams, API docs, setup guide — everything.",
            },
            {
              step: "4",
              title: "Download & Use",
              desc: "Copy markdown, view diagrams, or download the full documentation.",
            },
          ].map((s) => (
            <div key={s.step} className="flex-1 text-center">
              <div className="w-12 h-12 rounded-full bg-amd-red/20 border border-amd-red/40 text-amd-red font-bold text-xl flex items-center justify-center mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="text-white font-semibold mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AMD Section */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-2xl bg-gradient-to-r from-amd-red/10 to-amd-accent/30 border border-amd-red/20 p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Powered by AMD
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto mb-6">
            RepoDocAI runs local LLM inference on{" "}
            <strong className="text-amd-red">AMD Radeon / Instinct GPUs</strong>{" "}
            using <strong className="text-amd-red">ROCm</strong> — AMD&apos;s open-source GPU
            compute platform. No data leaves your machine. Fast, private, and
            fully accelerated.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {["ROCm", "Ollama", "AMD EPYC", "Radeon GPUs", "DeepSeek Coder"].map(
              (tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300"
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
