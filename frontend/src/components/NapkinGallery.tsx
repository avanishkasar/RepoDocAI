"use client";

import { useState } from "react";

interface NapkinVisual {
  title: string;
  description: string;
  category: string;
  format: string;
  content_data: string;
  visual_id?: string;
  style?: string;
}

interface Props {
  visuals: NapkinVisual[];
}

const CATEGORY_ICONS: Record<string, string> = {
  architecture: "🏗️",
  tech_stack: "⚙️",
  flow: "🔄",
  overview: "📋",
  security: "🛡️",
  complexity: "🔬",
  default: "🎨",
};

export default function NapkinGallery({ visuals }: Props) {
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!visuals || visuals.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-4xl mb-3">🎨</div>
        <p className="text-lg">No Napkin visuals generated</p>
        <p className="text-sm mt-1 text-gray-600">
          Napkin AI creates professional diagrams from your documentation
        </p>
      </div>
    );
  }

  const current = visuals[selected];
  const icon = CATEGORY_ICONS[current.category] || CATEGORY_ICONS.default;

  const renderVisual = (visual: NapkinVisual, className?: string) => {
    if (visual.format === "svg") {
      return (
        <div
          className={`napkin-svg-container ${className || ""}`}
          dangerouslySetInnerHTML={{ __html: visual.content_data }}
        />
      );
    }
    // PNG as base64
    return (
      <img
        src={`data:image/png;base64,${visual.content_data}`}
        alt={visual.title}
        className={`max-w-full h-auto rounded-lg ${className || ""}`}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-lg">
          🎨
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Napkin AI Visuals
          </h3>
          <p className="text-xs text-gray-500">
            {visuals.length} visual{visuals.length !== 1 ? "s" : ""} generated
            by Napkin AI
          </p>
        </div>
      </div>

      {/* Thumbnail strip */}
      {visuals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {visuals.map((v, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm transition-all ${
                i === selected
                  ? "bg-purple-500/20 border border-purple-500/50 text-purple-300"
                  : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              <span className="mr-1.5">
                {CATEGORY_ICONS[v.category] || "🎨"}
              </span>
              {v.title}
            </button>
          ))}
        </div>
      )}

      {/* Main visual display */}
      <div className="relative group">
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{icon}</span>
              <div>
                <h4 className="text-white font-semibold">{current.title}</h4>
                <p className="text-gray-500 text-xs">{current.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-500/20 border border-purple-500/30 text-purple-400">
                Napkin AI
              </span>
              <button
                onClick={() => setLightbox(true)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-xs transition-all"
                title="Full screen"
              >
                ⛶ Expand
              </button>
            </div>
          </div>

          {/* Rendered visual */}
          <div className="bg-[#0a0a0a] rounded-xl p-6 flex items-center justify-center min-h-[320px] overflow-auto">
            {renderVisual(current)}
          </div>

          {/* Meta */}
          <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-600">
            <span>Category: {current.category}</span>
            <span>Format: {current.format.toUpperCase()}</span>
            {current.visual_id && (
              <span>ID: {current.visual_id.slice(0, 12)}…</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid view for all visuals */}
      {visuals.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            All Visuals
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visuals.map((v, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelected(i);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`p-4 rounded-xl border transition-all text-left ${
                  i === selected
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-white/[0.02] border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{CATEGORY_ICONS[v.category] || "🎨"}</span>
                  <span className="text-sm font-medium text-white">
                    {v.title}
                  </span>
                </div>
                <div className="bg-black/40 rounded-lg p-3 overflow-hidden max-h-[160px]">
                  {renderVisual(v, "scale-[0.6] origin-top-left")}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setLightbox(false)}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] overflow-auto bg-[#0d0d0d] rounded-2xl border border-white/10 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-white mb-1">
              {current.title}
            </h3>
            <p className="text-gray-500 text-sm mb-6">{current.description}</p>
            <div className="flex items-center justify-center">
              {renderVisual(current)}
            </div>
          </div>
        </div>
      )}

      {/* Napkin credit */}
      <div className="text-center text-[11px] text-gray-600 pt-2">
        Visuals powered by{" "}
        <a
          href="https://www.napkin.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-500 hover:text-purple-400 transition-all"
        >
          Napkin AI
        </a>{" "}
        — AI visual generation platform
      </div>
    </div>
  );
}
