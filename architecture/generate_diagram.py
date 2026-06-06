"""
Clean compact architecture diagram for the Medical Equipment Reliability AI.
Run:  python architecture/generate_diagram.py
Out:  architecture/architecture_diagram.pdf
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os

OUT = os.path.join(os.path.dirname(__file__), "architecture_diagram.pdf")

# ── Palette ────────────────────────────────────────────────────────────────
P = {
    "bg":       "#F7F9FC",
    "hdr":      "#1B2631",
    "hdr_txt":  "#FFFFFF",
    "lane":     "#EEF2F7",
    "lane_bd":  "#CDD5E0",
    "lane_lbl": "#4A5568",

    # box fills
    "user":   "#2C7BB6",   # blue   – user/frontend
    "api":    "#1A8A4A",   # green  – API gateway
    "orch":   "#6B3FA0",   # purple – orchestrator
    "agent":  "#7E5FBB",   # violet – agents
    "search": "#C07000",   # amber  – search
    "store":  "#1F6494",   # teal   – storage
    "embed":  "#1A7A50",   # teal-g – embedding
    "llm":    "#B03A2E",   # red    – LLM
    "data":   "#2471A3",   # blue   – data
    "eval":   "#CA6F1E",   # orange – evaluation

    "white":  "#FFFFFF",
    "arr":    "#555E6B",
    "sub":    "#D6E4F0",
}

FW, FH = 20, 13
plt.rcParams.update({"font.family": "DejaVu Sans"})


# ── Primitives ─────────────────────────────────────────────────────────────

def _box(ax, x, y, w, h, label, sub="", fill=P["user"], fs=8.5, sfs=6.8):
    """Draw a small rounded rectangle with label and optional subtitle."""
    rect = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.015",
        linewidth=0.8,
        edgecolor=fill,
        facecolor=fill,
        zorder=3,
        clip_on=False,
    )
    ax.add_patch(rect)
    cy = y + h / 2
    if sub:
        ax.text(x + w / 2, cy + h * 0.15, label,
                ha="center", va="center", fontsize=fs, fontweight="bold",
                color=P["white"], zorder=4, clip_on=False)
        ax.text(x + w / 2, cy - h * 0.22, sub,
                ha="center", va="center", fontsize=sfs,
                color=P["sub"], zorder=4, clip_on=False)
    else:
        ax.text(x + w / 2, cy, label,
                ha="center", va="center", fontsize=fs, fontweight="bold",
                color=P["white"], zorder=4, clip_on=False)


def _lane(ax, x, y, w, h, label):
    """Light background lane with left-side label."""
    r = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.005",
        linewidth=0.6,
        edgecolor=P["lane_bd"],
        facecolor=P["lane"],
        zorder=1,
        clip_on=False,
    )
    ax.add_patch(r)
    ax.text(x + 0.007, y + h - 0.007, label,
            ha="left", va="top",
            fontsize=6.5, fontweight="bold", color=P["lane_lbl"],
            fontstyle="italic", zorder=2, clip_on=False)


def _arr(ax, x1, y1, x2, y2):
    """Simple horizontal or vertical arrow."""
    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(
            arrowstyle="-|>",
            color=P["arr"],
            lw=1.0,
            mutation_scale=8,
            connectionstyle="arc3,rad=0.0",
        ),
        zorder=5,
    )


def _vdash(ax, x, y1, y2):
    """Thin dashed vertical connector (no arrowhead)."""
    ax.plot([x, x], [y1, y2], color=P["arr"], lw=0.7,
            linestyle="--", zorder=2)


# ── Layout constants ───────────────────────────────────────────────────────
LX  = 0.015   # left margin
RX  = 0.985   # right margin
LW  = RX - LX # usable width
BH  = 0.060   # standard box height
GAP = 0.010   # gap between boxes in same row
LH  = 0.098   # lane height (inner content)
LG  = 0.018   # gap between lanes

# Row bottom-edges (y of lane bottom), top → bottom
R = {}
R[1] = 0.848   # Presentation
R[2] = 0.732   # Orchestration
R[3] = 0.602   # Agents
R[4] = 0.474   # Hybrid Search + LLM
R[5] = 0.346   # Storage & Embeddings
R[6] = 0.200   # Data Pipeline
R[7] = 0.065   # Evaluation
LANE_H = LH


def build():
    fig = plt.figure(figsize=(FW, FH), facecolor=P["bg"])
    ax  = fig.add_axes([0.0, 0.0, 1.0, 1.0])
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    ax.axis("off"); ax.set_facecolor(P["bg"])

    # ── Title ────────────────────────────────────────────────────────────
    hdr = FancyBboxPatch((LX, 0.952), LW, 0.040,
                         boxstyle="round,pad=0.005",
                         facecolor=P["hdr"], edgecolor=P["hdr"], zorder=2)
    ax.add_patch(hdr)
    ax.text(0.5, 0.972,
            "AI-Powered Medical Equipment Reliability Intelligence Assistant — System Architecture",
            ha="center", va="center", fontsize=12, fontweight="bold",
            color=P["hdr_txt"], zorder=3)
    ax.text(0.5, 0.957,
            "Multi-Agent RAG  ·  Hybrid Search (Vector + BM25)  ·  LLM-as-Judge  ·  FastAPI  ·  Render",
            ha="center", va="center", fontsize=8, color="#9BB8D4", zorder=3)

    # ═══════════════════════════════════════════════════════════════════════
    # ROW 1 — Presentation
    # ═══════════════════════════════════════════════════════════════════════
    ry = R[1]
    _lane(ax, LX, ry, LW, LANE_H, "PRESENTATION LAYER")

    bw, by = 0.155, ry + 0.020
    boxes_r1 = [
        (LX + 0.005,       "Biomedical\nEngineer",    "Web Browser",   P["user"]),
        (LX + 0.005 + (bw+GAP)*1, "Web Frontend",    "SPA / HTML",    P["user"]),
        (LX + 0.005 + (bw+GAP)*2, "FastAPI\nREST API", "/query /ingest", P["api"]),
        (LX + 0.005 + (bw+GAP)*3, "Swagger\n/ ReDoc", "/docs  /redoc", P["api"]),
        (LX + 0.005 + (bw+GAP)*4, "CORS\nMiddleware", "allow all",     P["api"]),
        (LX + 0.005 + (bw+GAP)*5, "Health\nEndpoint", "/health status",P["api"]),
    ]
    for bx, lbl, sub, col in boxes_r1:
        _box(ax, bx, by, bw, BH, lbl, sub, fill=col)

    for i in range(len(boxes_r1) - 1):
        bx_cur = boxes_r1[i][0] + bw
        bx_nxt = boxes_r1[i+1][0]
        _arr(ax, bx_cur, by + BH/2, bx_nxt, by + BH/2)

    # ═══════════════════════════════════════════════════════════════════════
    # ROW 2 — Orchestration
    # ═══════════════════════════════════════════════════════════════════════
    ry = R[2]
    _lane(ax, LX, ry, LW, LANE_H, "ORCHESTRATION LAYER")

    # One wide orchestrator box + 4 small trigger boxes
    by = ry + 0.020
    ow = 0.300
    ox = 0.5 - ow/2
    _box(ax, ox, by, ow, BH, "Agent Orchestrator",
         "Pipeline coordinator · token reset", fill=P["orch"], fs=9)

    # mini boxes left side: inputs
    mini_w = 0.110
    inputs = [
        (LX + 0.010, "Query\nRequest",   P["search"]),
        (LX + 0.010 + (mini_w+GAP), "Metadata\nFilters", P["search"]),
    ]
    for bx, lbl, col in inputs:
        _box(ax, bx, by, mini_w, BH, lbl, fill=col, fs=7.5)

    # Connect last input to orchestrator
    _arr(ax, LX + 0.010 + (mini_w+GAP) + mini_w, by + BH/2, ox, by + BH/2)

    # mini boxes right side: outputs
    outputs = [
        (ox + ow + GAP,                  "Query\nResponse", P["search"]),
        (ox + ow + GAP + (mini_w+GAP),   "Token\nUsage",    P["search"]),
    ]
    for bx, lbl, col in outputs:
        _box(ax, bx, by, mini_w, BH, lbl, fill=col, fs=7.5)
    _arr(ax, ox + ow, by + BH/2, ox + ow + GAP, by + BH/2)

    # Down arrow from row1 to row2
    _arr(ax, 0.5, R[1], 0.5, R[2] + LANE_H)

    # ═══════════════════════════════════════════════════════════════════════
    # ROW 3 — Agents
    # ═══════════════════════════════════════════════════════════════════════
    ry = R[3]
    _lane(ax, LX, ry, LW, LANE_H, "MULTI-AGENT INTELLIGENCE PIPELINE")

    by  = ry + 0.018
    bw4 = (LW - 5*GAP) / 4
    agents = [
        ("① Retrieval\nAgent",    "Query validation\nHybrid dispatch",   P["agent"]),
        ("② Reliability\nAgent",  "Pattern analysis\nAnomaly detection", P["agent"]),
        ("③ Maintenance\nAgent",  "Risk planning\nDowntime estimate",    P["agent"]),
        ("④ Recommendation\nAgent","Context synthesis\nLLM-as-judge",   P["agent"]),
    ]
    agent_xs = []
    for i, (lbl, sub, col) in enumerate(agents):
        bx = LX + GAP + i * (bw4 + GAP)
        _box(ax, bx, by, bw4, BH, lbl, sub, fill=col)
        agent_xs.append(bx)

    for i in range(len(agents) - 1):
        _arr(ax, agent_xs[i] + bw4, by + BH/2, agent_xs[i+1], by + BH/2)

    # Down arrow into agents from orchestrator
    _arr(ax, 0.5, R[2], 0.5, R[3] + LANE_H)

    # ═══════════════════════════════════════════════════════════════════════
    # ROW 4 — Hybrid Search  +  LLM Service  (side by side)
    # ═══════════════════════════════════════════════════════════════════════
    ry = R[4]
    split = 0.63

    # LEFT: Hybrid Search lane
    _lane(ax, LX, ry, split - LX - 0.008, LANE_H, "HYBRID RETRIEVAL")
    by = ry + 0.020
    sbw = (split - LX - 0.008 - 5*GAP) / 4
    search_items = [
        ("Query\nExpander",    "LLM expansion",  P["search"]),
        ("Vector\nSearch",     "ChromaDB HNSW",  P["store"]),
        ("BM25\nSearch",       "Okapi ranking",  P["store"]),
        ("RRF\nFusion",        "k=60 blend",     P["search"]),
    ]
    sx_list = []
    for i, (lbl, sub, col) in enumerate(search_items):
        bx = LX + GAP + i * (sbw + GAP)
        _box(ax, bx, by, sbw, BH, lbl, sub, fill=col)
        sx_list.append(bx)
    for i in range(len(search_items) - 1):
        _arr(ax, sx_list[i] + sbw, by + BH/2, sx_list[i+1], by + BH/2)

    # RIGHT: LLM Service lane
    llm_lx = split + 0.002
    _lane(ax, llm_lx, ry, RX - llm_lx, LANE_H, "LLM SERVICE")
    lbw = (RX - llm_lx - 3*GAP) / 2
    _box(ax, llm_lx + GAP,        by, lbw, BH, "GPT-4o-mini", "keygateway proxy", fill=P["llm"])
    _box(ax, llm_lx + GAP + lbw + GAP, by, lbw, BH, "Token\nOptimizer", "context capping",  fill=P["llm"])
    _arr(ax, llm_lx + GAP + lbw, by + BH/2, llm_lx + GAP + lbw + GAP, by + BH/2)

    # Down connectors
    _arr(ax, agent_xs[0] + bw4/2, R[3], agent_xs[0] + bw4/2, R[4] + LANE_H)
    _arr(ax, agent_xs[3] + bw4/2, R[3], agent_xs[3] + bw4/2, R[4] + LANE_H)

    # ═══════════════════════════════════════════════════════════════════════
    # ROW 5 — Storage & Embeddings
    # ═══════════════════════════════════════════════════════════════════════
    ry = R[5]
    _lane(ax, LX, ry, LW, LANE_H, "STORAGE & EMBEDDINGS LAYER")

    by  = ry + 0.020
    bw5 = (LW - 4*GAP) / 3
    store_items = [
        ("ChromaDB\nVector Store",  "Persistent HNSW\ncosine similarity",    P["store"]),
        ("Embedding\nService",      "text-embedding-3-small\nbatch + retry",  P["embed"]),
        ("BM25\nIn-Memory Index",   "rank-bm25 Okapi\nrebuilt on startup",   P["store"]),
    ]
    sx5 = []
    for i, (lbl, sub, col) in enumerate(store_items):
        bx = LX + GAP + i * (bw5 + GAP)
        _box(ax, bx, by, bw5, BH, lbl, sub, fill=col)
        sx5.append(bx)

    # Down connectors from search layer
    mid_search = sx_list[1] + sbw / 2
    _arr(ax, mid_search, R[4], mid_search, R[5] + LANE_H)
    mid_bm25 = sx_list[2] + sbw / 2
    _arr(ax, mid_bm25, R[4], mid_bm25 + 0.05, R[5] + LANE_H)

    # ═══════════════════════════════════════════════════════════════════════
    # ROW 6 — Data Pipeline
    # ═══════════════════════════════════════════════════════════════════════
    ry = R[6]
    _lane(ax, LX, ry, LW, LANE_H, "DATA INGESTION PIPELINE")

    by  = ry + 0.020
    bw6 = (LW - 6*GAP) / 5
    data_items = [
        ("AI4I\nDataset",      "ai4i2020.csv\nUCI ML Repo",        P["data"]),
        ("Synthetic\nGen",     "3000 records\nfallback generator",  P["data"]),
        ("Data\nPreprocessor", "Equipment map\nNarrative gen",      P["data"]),
        ("Batch\nEmbedding",   "50/batch\n3-retry logic",           P["embed"]),
        ("ChromaDB\nStorage",  "HNSW + BM25\nindex build",         P["store"]),
    ]
    dx6 = []
    for i, (lbl, sub, col) in enumerate(data_items):
        bx = LX + GAP + i * (bw6 + GAP)
        _box(ax, bx, by, bw6, BH, lbl, sub, fill=col)
        dx6.append(bx)
    for i in range(len(data_items) - 1):
        _arr(ax, dx6[i] + bw6, by + BH/2, dx6[i+1], by + BH/2)

    # Connector up from storage to vector store
    _arr(ax, dx6[4] + bw6/2, R[6] + LANE_H, sx5[0] + bw5/2, R[5])

    # ═══════════════════════════════════════════════════════════════════════
    # ROW 7 — Evaluation
    # ═══════════════════════════════════════════════════════════════════════
    ry = R[7]
    _lane(ax, LX, ry, LW, LANE_H, "EVALUATION LAYER  (DeepEval-Inspired LLM-as-Judge)")

    by  = ry + 0.020
    bw7 = (LW - 5*GAP) / 4
    eval_items = [
        ("Answer\nRelevancy",     "Query ↔ Answer\nalignment",           P["eval"]),
        ("Faithfulness\nScore",   "Context grounding\nno hallucination",  P["eval"]),
        ("Maintenance\nQuality",  "Actionable, safe\nprioritised",        P["eval"]),
        ("LLM-as-Judge\nVerdict", "Accept / Reject\n0.0 – 1.0 score",    P["eval"]),
    ]
    ex7 = []
    for i, (lbl, sub, col) in enumerate(eval_items):
        bx = LX + GAP + i * (bw7 + GAP)
        _box(ax, bx, by, bw7, BH, lbl, sub, fill=col)
        ex7.append(bx)

    # Small "→" connectors between eval boxes
    for i in range(len(eval_items) - 1):
        ax.annotate("", xy=(ex7[i+1], by + BH/2), xytext=(ex7[i] + bw7, by + BH/2),
                    arrowprops=dict(arrowstyle="-|>", color=P["arr"], lw=0.8, mutation_scale=7))

    # Connector from recommendation agent down to evaluation
    _vdash(ax, agent_xs[3] + bw4/2, R[7] + LANE_H, R[3])

    # ═══════════════════════════════════════════════════════════════════════
    # Legend
    # ═══════════════════════════════════════════════════════════════════════
    legend = [
        (P["user"],   "Frontend / User"),
        (P["api"],    "API / Gateway"),
        (P["agent"],  "AI Agents"),
        (P["search"], "Search / Fusion"),
        (P["store"],  "Storage"),
        (P["embed"],  "Embeddings"),
        (P["llm"],    "LLM Service"),
        (P["data"],   "Data Pipeline"),
        (P["eval"],   "Evaluation"),
    ]
    lx_start = LX + 0.01
    ly = 0.012
    lbw, lbh = 0.090, 0.022
    for i, (col, lbl) in enumerate(legend):
        lbx = lx_start + i * (lbw + 0.006)
        r = FancyBboxPatch((lbx, ly), lbw, lbh,
                           boxstyle="round,pad=0.003",
                           facecolor=col, edgecolor=col, zorder=3)
        ax.add_patch(r)
        ax.text(lbx + lbw/2, ly + lbh/2, lbl,
                ha="center", va="center", fontsize=6.0,
                color=P["white"], fontweight="bold", zorder=4)

    # Footer
    ax.text(0.5, 0.005,
            "LLM: gpt-4o-mini  ·  Embeddings: text-embedding-3-small  ·  "
            "Vector DB: ChromaDB  ·  Keyword: BM25 Okapi  ·  "
            "Proxy: keygateway.arshnivlabs.com  ·  Deploy: Render",
            ha="center", va="bottom", fontsize=6.5, color="#7F8C8D")

    plt.savefig(OUT, format="pdf", bbox_inches="tight", dpi=180, facecolor=P["bg"])
    plt.close(fig)
    print(f"Saved: {OUT}")


if __name__ == "__main__":
    build()
