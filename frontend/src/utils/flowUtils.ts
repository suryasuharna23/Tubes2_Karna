import { type Edge, type Node, MarkerType, Position } from '@xyflow/react';
import type { DOMNode } from '../types';
import {
  MAX_LABEL_TEXT_LENGTH,
  FLOW_NODE_CHAR_WIDTH,
  FLOW_NODE_HORIZONTAL_PADDING,
  FLOW_NODE_MAX_WIDTH,
  FLOW_NODE_MIN_WIDTH,
  MAX_FLOW_NODES,
  INITIAL_ROW_GAP,
  INITIAL_DEPTH_GAP,
  HORIZONTAL_NODE_GAP,
  TARGET_DEPTH_GAP,
} from '../constants/flow';

export const normalizeClasses = (node?: DOMNode): string => {
  const classes = node?.classes ?? node?.class;
  if (!classes) return '';
  return Array.isArray(classes) ? classes.join(' ') : classes;
};

export const getNodeSignature = (node: DOMNode): string => {
  return [node.tag_name, node.id ?? '', normalizeClasses(node), node.text_content ?? ''].join('|');
};

export const getNodeLabel = (node: DOMNode): string => {
  const classes = normalizeClasses(node)
    .split(' ')
    .filter(Boolean)
    .map((className) => `.${className}`)
    .join('');
  const identifier = node.id ? `#${node.id}` : '';
  return `${node.tag_name}${identifier}${classes}`;
};

export const getNodePreviewText = (node: DOMNode): string => {
  const text = node.text_content?.replace(/\s+/g, ' ').trim() ?? '';
  if (!text) return '';
  return text.length <= MAX_LABEL_TEXT_LENGTH ? text : `${text.slice(0, MAX_LABEL_TEXT_LENGTH)}...`;
};

export const estimateFlowNodeWidth = (label: string): number => {
  const estimated = Math.round(label.length * FLOW_NODE_CHAR_WIDTH + FLOW_NODE_HORIZONTAL_PADDING);
  return Math.min(FLOW_NODE_MAX_WIDTH, Math.max(FLOW_NODE_MIN_WIDTH, estimated));
};

export const getFlowNodeWidth = (node: Node): number => {
  const width = node.style?.width;
  if (typeof width === 'number' && Number.isFinite(width)) return width;
  if (typeof width === 'string') {
    const parsed = Number.parseFloat(width);
    if (Number.isFinite(parsed)) return parsed;
  }
  return FLOW_NODE_MIN_WIDTH;
};

export const getNodeDepthFromId = (nodeId: string): number => {
  const [depthToken] = nodeId.split('-');
  const parsedDepth = Number(depthToken);
  return Number.isFinite(parsedDepth) ? parsedDepth : 0;
};

export const calculateMaxDepth = (node?: DOMNode): number => {
  if (!node) return 0;
  if (!node.children || node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(calculateMaxDepth));
};

export const getSiblingOrder = (nodeId: string): number => {
  const parts = nodeId.split('-');
  const parsed = Number(parts[parts.length - 1]);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const buildFlowTree = (
  root: DOMNode,
  matchedSignatures: Set<string>,
): { nodes: Node[]; edges: Edge[]; truncated: boolean; renderedNodes: number } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const rowByDepth = new Map<number, number>();
  let truncated = false;

  const visit = (node: DOMNode, depth: number, parentId?: string, path = '0') => {
    if (nodes.length >= MAX_FLOW_NODES) {
      truncated = true;
      return;
    }

    const row = rowByDepth.get(depth) ?? 0;
    rowByDepth.set(depth, row + 1);

    const nodeId = `${depth}-${path}`;
    const isMatched = matchedSignatures.has(getNodeSignature(node));
    const previewText = getNodePreviewText(node);
    const baseLabel = previewText ? `${getNodeLabel(node)} — "${previewText}"` : getNodeLabel(node);
    const nodeLabel = baseLabel;

    nodes.push({
      id: nodeId,
      position: { x: row * INITIAL_ROW_GAP, y: depth * INITIAL_DEPTH_GAP },
      draggable: false,
      selectable: false,
      className: isMatched ? 'flow-node flow-node--matched' : 'flow-node',
      data: { label: nodeLabel },
      style: { width: estimateFlowNodeWidth(nodeLabel) },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    if (parentId) {
      edges.push({
        id: `${parentId}->${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        animated: false,
      });
    }

    node.children?.forEach((child, index) => visit(child, depth + 1, nodeId, `${path}-${index}`));
  };

  visit(root, 0);
  return { nodes, edges, truncated, renderedNodes: nodes.length };
};

export const getParentCenteredElements = (nodes: Node[], edges: Edge[]): Node[] => {
  const nodesById = new Map(nodes.map((node) => [node.id, { ...node, position: { ...node.position } }]));
  const childrenByParent = new Map<string, string[]>();
  const indegreeById = new Map<string, number>(nodes.map((n) => [n.id, 0]));

  for (const edge of edges) {
    const siblings = childrenByParent.get(edge.source) ?? [];
    siblings.push(edge.target);
    childrenByParent.set(edge.source, siblings);
    indegreeById.set(edge.target, (indegreeById.get(edge.target) ?? 0) + 1);
  }

  for (const [parentId, siblingIds] of childrenByParent.entries()) {
    siblingIds.sort((a, b) => getSiblingOrder(a) - getSiblingOrder(b));
    childrenByParent.set(parentId, siblingIds);
  }

  const rootNodes = nodes.filter((node) => (indegreeById.get(node.id) ?? 0) === 0);
  if (rootNodes.length === 0) return nodes;

  const subtreeWidths = new Map<string, number>();

  const calculateSubtreeWidth = (nodeId: string): number => {
    const node = nodesById.get(nodeId);
    if (!node) return 0;
    
    const nodeWidth = getFlowNodeWidth(node);
    const children = childrenByParent.get(nodeId) ?? [];

    if (children.length === 0) {
      subtreeWidths.set(nodeId, nodeWidth);
      return nodeWidth;
    }

    let currentX = 0;
    const unshiftedCenters: number[] = [];
    const unshiftedLeftEdges: number[] = [];
    const unshiftedRightEdges: number[] = [];

    for (const childId of children) {
      const childSubTreeWidth = calculateSubtreeWidth(childId);
      unshiftedLeftEdges.push(currentX);
      unshiftedCenters.push(currentX + childSubTreeWidth / 2);
      unshiftedRightEdges.push(currentX + childSubTreeWidth);
      currentX += childSubTreeWidth + HORIZONTAL_NODE_GAP;
    }

    const childrenMidpoint = children.length === 1
      ? unshiftedCenters[0]
      : (unshiftedCenters[0] + unshiftedCenters[unshiftedCenters.length - 1]) / 2;

    const leftExtent = childrenMidpoint - unshiftedLeftEdges[0];
    const rightExtent = unshiftedRightEdges[unshiftedRightEdges.length - 1] - childrenMidpoint;
    const symmetricExtent = Math.max(leftExtent, rightExtent);
    
    const childrenTotalWidth = symmetricExtent * 2;
    const totalWidth = Math.max(nodeWidth, childrenTotalWidth);
    
    subtreeWidths.set(nodeId, totalWidth);
    return totalWidth;
  };

  let totalRootsWidth = 0;
  for (const root of rootNodes) {
    totalRootsWidth += calculateSubtreeWidth(root.id);
  }
  totalRootsWidth += Math.max(0, rootNodes.length - 1) * HORIZONTAL_NODE_GAP;

  const assignPositions = (nodeId: string, centerX: number, depthY: number) => {
    const node = nodesById.get(nodeId);
    if (!node) return;
    
    const nodeWidth = getFlowNodeWidth(node);
    node.position = { x: centerX - nodeWidth / 2, y: depthY };
    
    const children = childrenByParent.get(nodeId) ?? [];
    if (children.length === 0) return;

    let currentX = 0;
    const unshiftedCenters: number[] = [];
    
    for (const childId of children) {
      const childSubtreeWidth = subtreeWidths.get(childId) ?? 0;
      unshiftedCenters.push(currentX + childSubtreeWidth / 2);
      currentX += childSubtreeWidth + HORIZONTAL_NODE_GAP;
    }

    const childrenMidpoint = children.length === 1
      ? unshiftedCenters[0]
      : (unshiftedCenters[0] + unshiftedCenters[unshiftedCenters.length - 1]) / 2;

    const shift = centerX - childrenMidpoint;

    children.forEach((childId, index) => {
      const childCenterX = unshiftedCenters[index] + shift;
      assignPositions(childId, childCenterX, depthY + TARGET_DEPTH_GAP);
    });
  };

  let currentRootX = -totalRootsWidth / 2;
  for (const root of rootNodes) {
    const rootWidth = subtreeWidths.get(root.id) ?? 0;
    const rootCenterX = currentRootX + rootWidth / 2;
    assignPositions(root.id, rootCenterX, 0);
    currentRootX += rootWidth + HORIZONTAL_NODE_GAP;
  }

  return Array.from(nodesById.values());
};