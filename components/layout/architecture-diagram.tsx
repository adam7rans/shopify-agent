export function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 920 620"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      className="w-full"
    >
      <title>Kandwii Architecture Diagram</title>
      <desc>
        Shows the frontend React app connecting to the Next.js API route, which
        runs the agent loop with OpenAI and tool executors. Tool results and
        full responses are cached in-memory. Conversations persist to Convex.
      </desc>

      <defs>
        <marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#94a3b8" />
        </marker>
        <marker id="ah-plum" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#7c3aed" />
        </marker>
      </defs>

      {/* ── FRONTEND TIER ── */}
      <rect x="20" y="16" width="880" height="130" rx="16" fill="#faf8f5" stroke="#e8e4dd" strokeWidth="1" />
      <text x="40" y="40" fontSize="10" fill="#94a3b8" fontFamily="system-ui" fontWeight="600" letterSpacing="0.12em">FRONTEND — NEXT.JS + REACT</text>

      <rect x="40" y="54" width="150" height="76" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
      <text x="115" y="78" textAnchor="middle" fontSize="13" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Chat UI</text>
      <text x="115" y="96" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">best-sellers-shell</text>
      <text x="115" y="112" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">workspace-panel</text>

      <rect x="210" y="54" width="150" height="76" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
      <text x="285" y="78" textAnchor="middle" fontSize="13" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Sidebar</text>
      <text x="285" y="96" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Mode toggle</text>
      <text x="285" y="112" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Recents dropdown</text>

      <rect x="380" y="54" width="170" height="76" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
      <text x="465" y="78" textAnchor="middle" fontSize="13" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Structured Renderer</text>
      <text x="465" y="96" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Cards, tables, charts</text>
      <text x="465" y="112" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Liquid preview, pie/bar/line</text>

      <rect x="570" y="54" width="150" height="76" rx="12" fill="#f3f0ff" stroke="#c4b5fd" strokeWidth="1" />
      <text x="645" y="78" textAnchor="middle" fontSize="13" fill="#7c3aed" fontFamily="system-ui" fontWeight="600">Convex Client</text>
      <text x="645" y="96" textAnchor="middle" fontSize="10" fill="#7c3aed" fontFamily="system-ui">Save/load messages</text>
      <text x="645" y="112" textAnchor="middle" fontSize="10" fill="#7c3aed" fontFamily="system-ui">List recent chats</text>

      <rect x="740" y="54" width="150" height="76" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
      <text x="815" y="78" textAnchor="middle" fontSize="13" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Activity Log</text>
      <text x="815" y="96" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Tool traces</text>
      <text x="815" y="112" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Diagnostics panel</text>

      {/* ── Arrow: Frontend → API ── */}
      <line x1="115" y1="146" x2="115" y2="188" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)" />
      <text x="128" y="172" fontSize="9" fill="#94a3b8" fontFamily="system-ui">SSE stream</text>

      {/* ── Arrow: Frontend → Convex ── */}
      <line x1="645" y1="146" x2="645" y2="542" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 3" markerEnd="url(#ah-plum)" />

      {/* ── API TIER ── */}
      <rect x="20" y="192" width="880" height="100" rx="16" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
      <text x="40" y="216" fontSize="10" fill="#16a34a" fontFamily="system-ui" fontWeight="600" letterSpacing="0.12em">API LAYER — NEXT.JS ROUTE HANDLER</text>

      <rect x="40" y="230" width="200" height="48" rx="10" fill="#fff" stroke="#bbf7d0" strokeWidth="1" />
      <text x="140" y="254" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">/api/agent/stream</text>
      <text x="140" y="268" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">SSE streaming + sessionId</text>

      <rect x="260" y="230" width="200" height="48" rx="10" fill="#fff" stroke="#bbf7d0" strokeWidth="1" />
      <text x="360" y="254" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">enhanceAgentResponse</text>
      <text x="360" y="268" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Chart data injection</text>

      {/* ── Arrow: API → Agent Loop ── */}
      <line x1="140" y1="292" x2="140" y2="328" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)" />

      {/* ── AGENT LOOP TIER ── */}
      <rect x="20" y="332" width="600" height="200" rx="16" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="40" y="356" fontSize="10" fill="#2563eb" fontFamily="system-ui" fontWeight="600" letterSpacing="0.12em">AGENT LOOP — LIB/AGENT</text>

      {/* Response cache */}
      <rect x="40" y="370" width="170" height="56" rx="10" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1" />
      <text x="125" y="394" textAnchor="middle" fontSize="12" fill="#92400e" fontFamily="system-ui" fontWeight="600">Response Cache</text>
      <text x="125" y="410" textAnchor="middle" fontSize="10" fill="#92400e" fontFamily="system-ui">Same prompt → instant</text>

      {/* OpenAI */}
      <rect x="230" y="370" width="170" height="56" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="315" y="394" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">OpenAI gpt-4.1-mini</text>
      <text x="315" y="410" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Multi-turn tool calling</text>

      {/* Tool cache */}
      <rect x="40" y="444" width="170" height="56" rx="10" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1" />
      <text x="125" y="468" textAnchor="middle" fontSize="12" fill="#92400e" fontFamily="system-ui" fontWeight="600">Tool Result Cache</text>
      <text x="125" y="484" textAnchor="middle" fontSize="10" fill="#92400e" fontFamily="system-ui">5-min TTL per tool+args</text>

      {/* Tool executors */}
      <rect x="230" y="444" width="170" height="56" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="315" y="468" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Tool Executors</text>
      <text x="315" y="484" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">7 tools, structured output</text>

      {/* System prompt + validator */}
      <rect x="420" y="370" width="180" height="56" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="510" y="394" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">System Prompt</text>
      <text x="510" y="410" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">AgentUiResponse schema</text>

      <rect x="420" y="444" width="180" height="56" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1" />
      <text x="510" y="468" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Response Validator</text>
      <text x="510" y="484" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">Parse + normalize JSON</text>

      {/* Arrows inside agent loop */}
      <line x1="210" y1="398" x2="227" y2="398" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />
      <line x1="210" y1="472" x2="227" y2="472" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />
      <line x1="315" y1="426" x2="315" y2="441" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#ah)" />

      {/* ── EXTERNAL SERVICES ── */}
      <rect x="640" y="332" width="260" height="200" rx="16" fill="#faf8f5" stroke="#e8e4dd" strokeWidth="1" />
      <text x="660" y="356" fontSize="10" fill="#94a3b8" fontFamily="system-ui" fontWeight="600" letterSpacing="0.12em">EXTERNAL SERVICES</text>

      <rect x="660" y="370" width="220" height="48" rx="10" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
      <text x="770" y="392" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Shopify Admin API</text>
      <text x="770" y="406" textAnchor="middle" fontSize="10" fill="#16a34a" fontFamily="system-ui">Products, inventory, orders</text>

      <rect x="660" y="430" width="220" height="48" rx="10" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
      <text x="770" y="452" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontFamily="system-ui" fontWeight="600">Mock Ops Data</text>
      <text x="770" y="466" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="system-ui">Distributors, warehouse, fulfillment</text>

      <rect x="660" y="490" width="220" height="48" rx="10" fill="#f3f0ff" stroke="#c4b5fd" strokeWidth="1" />
      <text x="770" y="512" textAnchor="middle" fontSize="12" fill="#7c3aed" fontFamily="system-ui" fontWeight="600">Convex Cloud DB</text>
      <text x="770" y="526" textAnchor="middle" fontSize="10" fill="#7c3aed" fontFamily="system-ui">Conversations + messages</text>

      {/* Arrow: Tools → Shopify */}
      <line x1="400" y1="472" x2="420" y2="472" stroke="#94a3b8" strokeWidth="1" />
      <line x1="420" y1="472" x2="420" y2="520" stroke="#94a3b8" strokeWidth="1" />
      <line x1="420" y1="520" x2="620" y2="394" stroke="#94a3b8" strokeWidth="0" />

      <line x1="400" y1="460" x2="657" y2="394" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)" />
      <line x1="400" y1="480" x2="657" y2="454" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ah)" />

      {/* ── LEGEND ── */}
      <rect x="20" y="556" width="880" height="50" rx="12" fill="#fff" stroke="#e8e4dd" strokeWidth="1" />
      <line x1="40" y1="582" x2="70" y2="582" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)" />
      <text x="78" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Data flow</text>
      <line x1="160" y1="582" x2="190" y2="582" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ah)" />
      <text x="198" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Mock data</text>
      <line x1="280" y1="582" x2="310" y2="582" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="6 3" markerEnd="url(#ah-plum)" />
      <text x="318" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Convex persistence</text>
      <rect x="440" y="574" width="16" height="16" rx="4" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1" />
      <text x="464" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Cache layer (5-min TTL)</text>
      <rect x="620" y="574" width="16" height="16" rx="4" fill="#f3f0ff" stroke="#c4b5fd" strokeWidth="1" />
      <text x="644" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">Convex (new)</text>
      <rect x="760" y="574" width="16" height="16" rx="4" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
      <text x="784" y="586" fontSize="10" fill="#64748b" fontFamily="system-ui">API layer</text>
    </svg>
  );
}
