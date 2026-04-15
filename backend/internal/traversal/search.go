package traversal

import (
	"tubes2-backend/internal/models"
)

type SearchEngine struct {
	RootNode     *models.Node
	Selector     string
	Algorithm    string
	ResultCount  int
	NodesVisited int
	Log          []string
	Matches      []*models.Node
}

func NewSearchEngine(root *models.Node, selector, algo string, count int) *SearchEngine {
	return &SearchEngine{
		RootNode:     root,
		Selector:     selector,
		Algorithm:    algo,
		ResultCount:  count,
		NodesVisited: 0,
		Log:          make([]string, 0),
		Matches:      make([]*models.Node, 0),
	}
}

func (se *SearchEngine) Execute() {
	if se.Algorithm == "BFS" {
		se.runBFS()
	} else if se.Algorithm == "DFS" {
		se.runDFS()
	}
}

func (se *SearchEngine) runBFS() {
	if se.RootNode == nil {
		return
	}

	queue := []*models.Node{se.RootNode}

	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]

		se.NodesVisited++
		se.Log = append(se.Log, curr.TagName)

		if se.isMatch(curr, se.Selector) {
			se.Matches = append(se.Matches, curr)
		}

		if se.ResultCount > 0 && len(se.Matches) >= se.ResultCount {
			break
		}

		for _, child := range curr.Children {
			queue = append(queue, child)
		}
	}
}

func (se *SearchEngine) runDFS() {
	if se.RootNode == nil {
		return
	}
	se.dfsRecursive(se.RootNode)
}

func (se *SearchEngine) dfsRecursive(node *models.Node) {
	if node == nil {
		return
	}

	if se.ResultCount > 0 && len(se.Matches) >= se.ResultCount {
		return
	}

	se.NodesVisited++
	se.Log = append(se.Log, node.TagName)

	if se.isMatch(node, se.Selector) {
		se.Matches = append(se.Matches, node)
	}

	for _, child := range node.Children {
		se.dfsRecursive(child)
	}
}

func (se *SearchEngine) isMatch(node *models.Node, selector string) bool {
	if selector == "*" {
		return true
	}

	return false
}
