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
		RootNode:    root,
		Selector:    selector,
		Algorithm:   algo,
		ResultCount: count,
		Log:         make([]string, 0),
		Matches:     make([]*models.Node, 0),
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
}

func (se *SearchEngine) runDFS() {
}
