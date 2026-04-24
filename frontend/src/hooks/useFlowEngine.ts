import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Edge, Node, ReactFlowInstance } from '@xyflow/react';
import { getParentCenteredElements, getNodeDepthFromId } from '../utils/flowUtils';
import { EDGE_COLOR_DEFAULT, EDGE_COLOR_HIGHLIGHT, type PlaybackSpeed } from '../constants/flow';

export function useFlowEngine(
  baseNodes: Node[],
  baseEdges: Edge[],
  algorithm: 'BFS' | 'DFS',
  resultCount: number,
  playbackEnabled: boolean = true
) {
  const [animatedNodes, setAnimatedNodes] = useState<Node[]>([]);
  const [hoveredFlowNodeId, setHoveredFlowNodeId] = useState<string | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [revealCursor, setRevealCursor] = useState<number>(0);
  const [isPlaybackActive, setIsPlaybackActive] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  const animationFrameRef = useRef<number | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const playbackRunIdRef = useRef<number>(0);

  const currentPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const prevRevealIdsRef = useRef<Set<string>>(new Set());

  const revealNodeOrder = useMemo(() => {
    const withIndex = baseNodes.map((node, index) => ({ node, index }));
    if (algorithm === 'BFS') {
      return withIndex
        .sort((first, second) => {
          const depthDelta = getNodeDepthFromId(first.node.id) - getNodeDepthFromId(second.node.id);
          if (depthDelta !== 0) return depthDelta;
          return first.index - second.index;
        })
        .map(({ node }) => node.id);
    }
    return withIndex.map(({ node }) => node.id);
  }, [baseNodes, algorithm]);

  const revealNodeIdSet = useMemo(() => {
    const visibleCount = Math.min(revealCursor, revealNodeOrder.length);
    return new Set(revealNodeOrder.slice(0, visibleCount));
  }, [revealCursor, revealNodeOrder]);

  const visibleFlowEdges = useMemo(
    () => baseEdges.filter((edge) => revealNodeIdSet.has(edge.source) && revealNodeIdSet.has(edge.target)),
    [baseEdges, revealNodeIdSet]
  );

  const visibleFlowNodes = useMemo(
    () => animatedNodes.filter((node) => revealNodeIdSet.has(node.id)),
    [animatedNodes, revealNodeIdSet]
  );

  const stopNodeAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stopPlaybackTimer = useCallback(() => {
    playbackRunIdRef.current += 1;
    if (playbackTimerRef.current !== null) {
      window.clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (baseNodes.length === 0) {
      setHoveredFlowNodeId(null);
      setRevealCursor(0);
      setIsPlaybackActive(false);
      return;
    }
    if (!playbackEnabled) {
      setRevealCursor(baseNodes.length);
      setIsPlaybackActive(false);
      setHoveredFlowNodeId(null);
      return;
    }
    setRevealCursor(1);
    setIsPlaybackActive(baseNodes.length > 1);
    setHoveredFlowNodeId(null);
  }, [baseNodes.length, playbackEnabled]);

  useEffect(() => {
    if (revealNodeOrder.length === 0) {
      setAnimatedNodes([]);
      currentPositionsRef.current.clear();
      prevRevealIdsRef.current.clear();
      stopNodeAnimation();
      return;
    }

    const visibleNodesBase = baseNodes.filter((n) => revealNodeIdSet.has(n.id));
    const targetNodes = getParentCenteredElements(visibleNodesBase, visibleFlowEdges);
    
    const parentMap = new Map<string, string>();
    for (const edge of visibleFlowEdges) {
      parentMap.set(edge.target, edge.source);
    }

    stopNodeAnimation();

    const startPosMap = new Map<string, { x: number; y: number }>();
    
    for (const targetNode of targetNodes) {
      const isNew = !prevRevealIdsRef.current.has(targetNode.id);
      const currentPos = currentPositionsRef.current.get(targetNode.id);

      if (!isNew && currentPos) {
        startPosMap.set(targetNode.id, { ...currentPos });
      } else {
        const parentId = parentMap.get(targetNode.id);
        const parentPos = parentId ? currentPositionsRef.current.get(parentId) : null;

        if (parentPos) {
          startPosMap.set(targetNode.id, { x: parentPos.x, y: parentPos.y });
        } else {
          startPosMap.set(targetNode.id, { x: targetNode.position.x, y: targetNode.position.y - 60 });
        }
        currentPositionsRef.current.set(targetNode.id, startPosMap.get(targetNode.id)!);
      }
    }

    prevRevealIdsRef.current = revealNodeIdSet;

    const startAt = performance.now();
    const duration = 260;

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - startAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      setAnimatedNodes((current) => {
        let changed = false;
        const sourceNodes = current.length > 0 ? current : baseNodes;

        const nextNodes = sourceNodes.map((node) => {
          const startPos = startPosMap.get(node.id);
          const targetPos = targetNodes.find(n => n.id === node.id)?.position;

          if (!startPos || !targetPos) return node;

          const newX = startPos.x + (targetPos.x - startPos.x) * eased;
          const newY = startPos.y + (targetPos.y - startPos.y) * eased;

          const currentPos = currentPositionsRef.current.get(node.id);
          if (currentPos?.x !== newX || currentPos?.y !== newY) {
            changed = true;
            currentPositionsRef.current.set(node.id, { x: newX, y: newY });
            return {
              ...node,
              position: { x: newX, y: newY },
            };
          }
          return node;
        });

        return changed ? nextNodes : current;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => stopNodeAnimation();
  }, [revealNodeIdSet, baseNodes, visibleFlowEdges, revealNodeOrder.length, stopNodeAnimation]);

  const matchedFlowNodeIdSet = useMemo(() => new Set(
    baseNodes.filter((node) => node.className?.includes('flow-node--matched')).map((node) => node.id)
  ), [baseNodes]);

  const revealedMatchedCount = useMemo(() => {
    let total = 0;
    for (const nodeId of revealNodeIdSet) {
      if (matchedFlowNodeIdSet.has(nodeId)) total += 1;
    }
    return total;
  }, [revealNodeIdSet, matchedFlowNodeIdSet]);

  const reachedResultLimit = resultCount > 0 && revealedMatchedCount >= resultCount;
  const playbackCompleted = revealNodeOrder.length > 0 && revealCursor >= revealNodeOrder.length;

  useEffect(() => {
    if (hoveredFlowNodeId && !revealNodeIdSet.has(hoveredFlowNodeId)) {
      setHoveredFlowNodeId(null);
    }
  }, [hoveredFlowNodeId, revealNodeIdSet]);

  useEffect(() => {
    stopPlaybackTimer();

    if (!playbackEnabled || !isPlaybackActive || playbackCompleted || reachedResultLimit || revealNodeOrder.length === 0) {
      if (isPlaybackActive && reachedResultLimit) setIsPlaybackActive(false);
      return;
    }

    const stepDelay = Math.max(120, Math.round(320 / playbackSpeed));
    const runId = playbackRunIdRef.current;

    playbackTimerRef.current = window.setTimeout(() => {
      if (runId !== playbackRunIdRef.current) return;

      setRevealCursor((previous) => {
        const next = Math.min(previous + 1, revealNodeOrder.length);
        if (next >= revealNodeOrder.length) setIsPlaybackActive(false);
        return next;
      });
    }, stepDelay);

    return () => stopPlaybackTimer();
  }, [isPlaybackActive, playbackCompleted, reachedResultLimit, revealCursor, revealNodeOrder.length, playbackSpeed, stopPlaybackTimer, playbackEnabled]);

  const highlightedEdgeIds = useMemo(() => {
    if (!hoveredFlowNodeId) return new Set<string>();

    const highlight = new Set<string>();
    const visited = new Set<string>();

    const visitAncestors = (nodeId: string) => {
      for (const edge of visibleFlowEdges) {
        if (edge.target === nodeId && !visited.has(edge.id)) {
          visited.add(edge.id);
          highlight.add(edge.id);
          visitAncestors(edge.source);
        }
      }
    };

    const visitDescendants = (nodeId: string) => {
      for (const edge of visibleFlowEdges) {
        if (edge.source === nodeId && !visited.has(edge.id)) {
          visited.add(edge.id);
          highlight.add(edge.id);
          visitDescendants(edge.target);
        }
      }
    };

    visitAncestors(hoveredFlowNodeId);
    visitDescendants(hoveredFlowNodeId);

    return highlight;
  }, [hoveredFlowNodeId, visibleFlowEdges]);

  const animatedFlowEdges = useMemo(() => visibleFlowEdges.map((edge) => {
    const isHighlighted = highlightedEdgeIds.has(edge.id);
    return {
      ...edge,
      animated: isHighlighted,
      style: {
        stroke: isHighlighted ? EDGE_COLOR_HIGHLIGHT : EDGE_COLOR_DEFAULT,
        strokeWidth: isHighlighted ? 2.8 : 1.3,
        strokeDasharray: isHighlighted ? '7 5' : '0',
      },
    };
  }), [visibleFlowEdges, highlightedEdgeIds]);

  useEffect(() => {
    if (!flowInstance || visibleFlowNodes.length === 0) return;
    const timeout = window.setTimeout(() => {
      flowInstance.fitView({ padding: 0.2, maxZoom: 1.1, duration: 220 });
    }, 20);
    return () => window.clearTimeout(timeout);
  }, [flowInstance, visibleFlowNodes.length]);

  const handleTogglePlayback = () => {
    if (playbackCompleted || reachedResultLimit) {
      stopPlaybackTimer();
      setRevealCursor(revealNodeOrder.length > 0 ? 1 : 0);
      setIsPlaybackActive(revealNodeOrder.length > 1);
      return;
    }
    setIsPlaybackActive(!isPlaybackActive);
  };

  const handleRestartPlayback = () => {
    stopPlaybackTimer();
    setRevealCursor(revealNodeOrder.length > 0 ? 1 : 0);
    setIsPlaybackActive(revealNodeOrder.length > 1);
    setHoveredFlowNodeId(null);
  };

  return {
    visibleFlowNodes,
    animatedFlowEdges,
    flowInstance,
    setFlowInstance,
    setHoveredFlowNodeId,
    isPlaybackActive,
    playbackCompleted,
    reachedResultLimit,
    playbackSpeed,
    setPlaybackSpeed,
    revealedMatchedCount,
    handleTogglePlayback,
    handleRestartPlayback,
  };
}