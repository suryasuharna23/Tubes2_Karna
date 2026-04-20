export interface DOMNode {
  tag_name: string;
  id?: string;
  class?: string;
  classes?: string | string[];
  attributes?: Record<string, string>;
  text_content?: string;
  children: DOMNode[];
}

export interface TraversalRequest {
  url: string;
  raw_html?: string;
  selector: string;
  algorithm: 'BFS' | 'DFS';
  result_count: number;
}

export interface TraversalResponse {
  execution_time_ms: number;
  nodes_visited: number;
  nodes_found?: number;
  matched_nodes: DOMNode[];
  traversal_log: string[];
  full_tree?: DOMNode;
}