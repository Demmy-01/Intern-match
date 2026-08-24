import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { GraphData, GraphNode, GraphEdge } from '../types';
import { Network, MousePointerClick } from 'lucide-react';

interface Props {
  data: GraphData | null;
  loading: boolean;
}

// ─── SaaS Node Color Palette ──────────────────────────────────────────────────
const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string; glow: string }> = {
  Student:    { fill: '#2563eb', stroke: '#3b82f6', text: '#1e293b', glow: 'rgba(37,99,235,0.4)' },
  Skill:      { fill: '#059669', stroke: '#10b981', text: '#1e293b', glow: 'rgba(5,150,105,0.4)' },
  Internship: { fill: '#7c3aed', stroke: '#8b5cf6', text: '#1e293b', glow: 'rgba(124,58,237,0.4)' },
  Company:    { fill: '#d97706', stroke: '#f59e0b', text: '#1e293b', glow: 'rgba(217,119,6,0.4)' },
  Domain:     { fill: '#4f46e5', stroke: '#6366f1', text: '#1e293b', glow: 'rgba(79,70,229,0.4)' },
  City:       { fill: '#64748b', stroke: '#94a3b8', text: '#1e293b', glow: 'rgba(100,116,139,0.4)' },
};

const NODE_RADIUS: Record<string, number> = {
  Student: 16,
  Skill: 9,
  Internship: 13,
  Company: 11,
  Domain: 10,
  City: 9,
};

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function initializePositions(nodes: GraphNode[], width: number, height: number): SimNode[] {
  const cx = width / 2;
  const cy = height / 2;
  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const radius = i === 0 ? 0 : 160 + Math.random() * 90;
    return {
      ...node,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });
}

function runSimulationStep(
  nodes: SimNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): SimNode[] {
  const damping = 0.82;
  const repulsion = 8500;
  const springLength = 130;
  const springStrength = 0.018;
  const centerGravity = 0.008;
  const cx = width / 2;
  const cy = height / 2;

  const nodeMap = new Map<string, number>();
  nodes.forEach((n, i) => nodeMap.set(n.id, i));

  const newNodes = nodes.map((n) => ({ ...n }));

  // Repulsion between node pairs
  for (let i = 0; i < newNodes.length; i++) {
    for (let j = i + 1; j < newNodes.length; j++) {
      const dx = newNodes[i].x - newNodes[j].x;
      const dy = newNodes[i].y - newNodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsion / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      newNodes[i].vx += fx;
      newNodes[i].vy += fy;
      newNodes[j].vx -= fx;
      newNodes[j].vy -= fy;
    }
  }

  // Edge springs
  for (const edge of edges) {
    const si = nodeMap.get(edge.source);
    const ti = nodeMap.get(edge.target);
    if (si === undefined || ti === undefined) continue;
    const dx = newNodes[ti].x - newNodes[si].x;
    const dy = newNodes[ti].y - newNodes[si].y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const displacement = dist - springLength;
    const force = springStrength * displacement;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    newNodes[si].vx += fx;
    newNodes[si].vy += fy;
    newNodes[ti].vx -= fx;
    newNodes[ti].vy -= fy;
  }

  // Center gravity
  for (const n of newNodes) {
    n.vx += (cx - n.x) * centerGravity;
    n.vy += (cy - n.y) * centerGravity;
  }

  const pad = 50;
  for (const n of newNodes) {
    n.vx *= damping;
    n.vy *= damping;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(pad, Math.min(width - pad, n.x));
    n.y = Math.max(pad, Math.min(height - pad, n.y));
  }

  return newNodes;
}

export default function GraphVisualizer({ data, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [dimensions, setDimensions] = useState({ width: 700, height: 480 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const frameRef = useRef<number>(0);
  const iterRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height: Math.max(height, 440) });
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!data || data.nodes.length === 0) {
      setSimNodes([]);
      return;
    }
    const initialized = initializePositions(data.nodes, dimensions.width, dimensions.height);
    setSimNodes(initialized);
    iterRef.current = 0;
  }, [data, dimensions.width, dimensions.height]);

  useEffect(() => {
    if (!data || simNodes.length === 0) return;

    const maxIterations = 180;
    let running = true;

    const tick = () => {
      if (!running || iterRef.current >= maxIterations) return;
      iterRef.current++;
      setSimNodes((prev) => runSimulationStep(prev, data.edges, dimensions.width, dimensions.height));
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [data, simNodes.length, dimensions.width, dimensions.height]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, SimNode>();
    for (const n of simNodes) map.set(n.id, n);
    return map;
  }, [simNodes]);

  // Compute set of connected node IDs when hovering a node
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNode || !data) return new Set<string>();
    const set = new Set<string>([hoveredNode]);
    for (const edge of data.edges) {
      if (edge.source === hoveredNode) set.add(edge.target);
      if (edge.target === hoveredNode) set.add(edge.source);
    }
    return set;
  }, [hoveredNode, data]);

  // Click handler to smooth scroll to internship card
  const handleNodeClick = (node: SimNode) => {
    if (node.type === 'Internship') {
      const el = document.getElementById(`internship-${node.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight card briefly
        el.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500'), 1800);
      }
    }
  };

  const getTooltip = useCallback(
    (node: SimNode) => {
      const lines = [`${node.label} (${node.type})`];
      if (node.type === 'Internship') lines.push('💡 Click node to scroll to role');
      if (node.category) lines.push(`Category: ${node.category}`);
      if (node.stipend) lines.push(`Stipend: $${node.stipend}/mo`);
      if (node.mode) lines.push(`Mode: ${node.mode}`);
      if (node.industry) lines.push(`Industry: ${node.industry}`);
      return lines.join('\n');
    },
    []
  );

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Network size={14} className="text-indigo-600" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Knowledge Graph Visualizer
          </h2>
        </div>
        <div className="skeleton w-full h-[400px] rounded-lg" />
      </div>
    );
  }

  if (!data || data.nodes.length === 0) return null;

  return (
    <section id="graph-visualizer" className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Network size={14} className="text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Interactive Knowledge Graph
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <MousePointerClick size={11} className="text-indigo-500" />
            Hover node to highlight paths · Click internship node to focus
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2.5">
          {Object.entries(NODE_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: colors.fill }}
              />
              <span>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-slate-100 relative"
        style={{ height: '440px', backgroundColor: '#fafafa' }}
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="w-full h-full"
        >
          {/* Subtle Grid Pattern */}
          <pattern id="graphGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f1f5f9" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#graphGrid)" />

          {/* Edges */}
          {data.edges.map((edge, i) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) return null;

            const isConnectedToHovered =
              hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);

            return (
              <line
                key={`edge-${i}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isConnectedToHovered ? '#4f46e5' : '#cbd5e1'}
                strokeWidth={isConnectedToHovered ? 2.5 : 1}
                strokeOpacity={
                  hoveredNode
                    ? isConnectedToHovered
                      ? 1
                      : 0.15
                    : 0.6
                }
                style={{ transition: 'all 0.2s ease-out' }}
              />
            );
          })}

          {/* Nodes */}
          {simNodes.map((node) => {
            const colors = NODE_COLORS[node.type] || NODE_COLORS.Skill;
            const r = NODE_RADIUS[node.type] || 10;
            const isHovered = hoveredNode === node.id;
            const isConnected = hoveredNode ? connectedNodeIds.has(node.id) : true;
            const isStudentNode = node.type === 'Student';

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node)}
                opacity={hoveredNode ? (isConnected ? 1 : 0.2) : 1}
                style={{ transition: 'opacity 0.2s ease-out' }}
              >
                <title>{getTooltip(node)}</title>

                {/* Pulsating outer ring for Student anchor node */}
                {isStudentNode && (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r + 8}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                      opacity="0.3"
                    >
                      <animate
                        attributeName="r"
                        values={`${r + 4};${r + 14};${r + 4}`}
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.4;0.05;0.4"
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}

                {/* Glowing Glassmorphism Outer Ring on Hover */}
                {isHovered && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r + 6}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="2.5"
                    opacity="0.5"
                  />
                )}

                {/* Glassmorphism Node Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={colors.fill}
                  fillOpacity="0.9"
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }}
                />

                {/* Crisp Label BESIDE node */}
                <text
                  x={node.x + r + 6}
                  y={node.y + 4}
                  fill={colors.text}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                  fontWeight={isStudentNode || isHovered ? '700' : '500'}
                  className="select-none"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
