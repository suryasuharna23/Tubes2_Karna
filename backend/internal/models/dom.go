package models

type Node struct {
	TagName     string            `json:"tag_name"`
	ID          string            `json:"id,omitempty"`
	Classes     string            `json:"class,omitempty"`
	Attributes  map[string]string `json:"attributes,omitempty"`
	TextContent string            `json:"text_content,omitempty"`
	Children    []*Node           `json:"children,omitempty"` // children nodes from the DOM tree
}

// Input from the frontend for DOM traversal
type TraversalRequest struct {
	URL         string `json:"url"`
	RawHTML     string `json:"raw_html"`
	Selector    string `json:"selector"`
	Algorithm   string `json:"algorithm"`
	ResultCount int    `json:"result_count"`
}

// Output to the frontend after DOM traversal
type TraversalResponse struct {
	ExecutionTimeMs float64  `json:"execution_time_ms"`
	NodesVisited    int      `json:"nodes_visited"`
	MatchedNodes    []*Node  `json:"matched_nodes"`
	TraversalLog    []string `json:"traversal_log"`
}
