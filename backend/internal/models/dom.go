package models

type Node struct {
	TagName     string            `json:"tag_name"`
	ID          string            `json:"id,omitempty"`
	Classes     string            `json:"class,omitempty"`
	Attributes  map[string]string `json:"attributes,omitempty"`
	TextContent string            `json:"text_content,omitempty"`
	Children    []*Node           `json:"children,omitempty"` 
	Parent      *Node             `json:"-"`
}

// payload input (fitur pencarian elemen)
type TraversalRequest struct {
	URL         string `json:"url"`
	RawHTML     string `json:"raw_html"`
	Selector    string `json:"selector"`
	Algorithm   string `json:"algorithm"`
	ResultCount int    `json:"result_count"`
}

// format data Output (metrik pencarian dan hasil traverse)
type TraversalResponse struct {
	ExecutionTimeMs float64  `json:"execution_time_ms"`
	NodesVisited    int      `json:"nodes_visited"`
	NodesFound      int      `json:"nodes_found"`
	MatchedNodes    []*Node  `json:"matched_nodes"`
	TraversalLog    []string `json:"traversal_log"`
	FullTree        *Node    `json:"full_tree"`
}

// payload input (fitur pencarian Lowest Common Ancestor)
type LCARequest struct {
	URL       string `json:"url"`
	RawHTML   string `json:"raw_html"`
	SelectorA string `json:"selector_a"`
	SelectorB string `json:"selector_b"`
}

// format data Output (hasil perhitungan LCA)
type LCAResponse struct {
	ExecutionTimeMs float64 `json:"execution_time_ms"`
	NodeA           *Node   `json:"node_a"`
	NodeB           *Node   `json:"node_b"`
	LCA             *Node   `json:"lca"`
	FullTree        *Node   `json:"full_tree"`
}