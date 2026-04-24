package traversal

import (
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
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
	mu           sync.Mutex
	done         atomic.Bool
	sem          chan struct{}
}

func NewSearchEngine(root *models.Node, selector, algo string, count int) *SearchEngine {
	limit := runtime.NumCPU() * 2
	if limit < 4 {
		limit = 4
	}
	return &SearchEngine{
		RootNode:     root,
		Selector:     selector,
		Algorithm:    algo,
		ResultCount:  count,
		NodesVisited: 0,
		Log:          make([]string, 0),
		Matches:      make([]*models.Node, 0),
		sem:          make(chan struct{}, limit),
	}
}

func (se *SearchEngine) Execute() {
	switch se.Algorithm {
	case "BFS":
		se.runBFS()
	case "DFS":
		se.runDFS()
	}
}

func (se *SearchEngine) recordVisit(node *models.Node, matched bool) bool {
	se.mu.Lock()
	defer se.mu.Unlock()

	se.NodesVisited++
	se.Log = append(se.Log, node.TagName)

	if matched {
		se.Matches = append(se.Matches, node)
		if se.ResultCount > 0 && len(se.Matches) >= se.ResultCount {
			se.done.Store(true)
			return true
		}
	}
	return false
}

func (se *SearchEngine) runBFS() {
	if se.RootNode == nil {
		return
	}

	currentLevel := []*models.Node{se.RootNode}

	for len(currentLevel) > 0 && !se.done.Load() {
		var wg sync.WaitGroup
		nextLevel := make([][]*models.Node, len(currentLevel))

		for i, node := range currentLevel {
			wg.Add(1)
			se.sem <- struct{}{} // mengambil slot worker
			go func(idx int, n *models.Node) {
				defer wg.Done()
				defer func() { <-se.sem }() // melepaskan slot worker

				if se.done.Load() {
					return
				}

				matched := se.isMatch(n, se.Selector)
				se.recordVisit(n, matched)
				nextLevel[idx] = n.Children
			}(i, node)
		}

		wg.Wait()
		total := 0
		for _, cs := range nextLevel {
			total += len(cs)
		}
		next := make([]*models.Node, 0, total)
		for _, cs := range nextLevel {
			next = append(next, cs...)
		}
		currentLevel = next
	}
}

func (se *SearchEngine) runDFS() {
	if se.RootNode == nil {
		return
	}
	var wg sync.WaitGroup
	wg.Add(1)
	se.dfsWorker(se.RootNode, &wg)
	wg.Wait()
}

func (se *SearchEngine) dfsWorker(node *models.Node, wg *sync.WaitGroup) {
	defer wg.Done()

	if node == nil || se.done.Load() {
		return
	}

	matched := se.isMatch(node, se.Selector)
	if se.recordVisit(node, matched) {
		return
	}

	for _, child := range node.Children {
		if se.done.Load() {
			return
		}
		wg.Add(1)
		select {
		case se.sem <- struct{}{}:
			go func(c *models.Node) {
				defer func() { <-se.sem }()
				se.dfsWorker(c, wg)
			}(child)
		default:
			se.dfsWorker(child, wg)
		}
	}
}

// FindFirstMatch (fitur LCA)
func FindFirstMatch(root *models.Node, selector string) *models.Node {
	if root == nil || strings.TrimSpace(selector) == "" {
		return nil
	}
	se := &SearchEngine{Selector: selector}
	stack := []*models.Node{root}
	for len(stack) > 0 {
		n := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if n == nil {
			continue
		}
		if se.isMatch(n, selector) {
			return n
		}
		for i := len(n.Children) - 1; i >= 0; i-- {
			stack = append(stack, n.Children[i])
		}
	}
	return nil
}

func FindFirstTwoMatches(root *models.Node, selectorA, selectorB string) (*models.Node, *models.Node) {
	if root == nil {
		return nil, nil
	}

	selectorA = strings.TrimSpace(selectorA)
	selectorB = strings.TrimSpace(selectorB)
	if selectorA == "" || selectorB == "" {
		return nil, nil
	}

	se := &SearchEngine{}
	stack := []*models.Node{root}

	var nodeA *models.Node
	var nodeB *models.Node
	sameSelector := selectorA == selectorB

	for len(stack) > 0 {
		n := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		if n == nil {
			continue
		}

		if nodeA == nil && se.isMatch(n, selectorA) {
			nodeA = n
			if sameSelector {
				nodeB = n
				break
			}
		}

		if nodeB == nil && se.isMatch(n, selectorB) {
			nodeB = n
		}

		if nodeA != nil && nodeB != nil {
			break
		}

		for i := len(n.Children) - 1; i >= 0; i-- {
			stack = append(stack, n.Children[i])
		}
	}

	return nodeA, nodeB
}

func parseSelector(sel string) []string {
	sel = strings.TrimSpace(sel)
	if sel == "" {
		return nil
	}

	sel = strings.ReplaceAll(sel, " > ", ">")
	sel = strings.ReplaceAll(sel, " + ", "+")
	sel = strings.ReplaceAll(sel, " ~ ", "~")

	sel = strings.ReplaceAll(sel, ">", " > ")
	sel = strings.ReplaceAll(sel, "+", " + ")
	sel = strings.ReplaceAll(sel, "~", " ~ ")

	parts := strings.Fields(sel)
	if len(parts) == 0 {
		return nil
	}

	result := make([]string, 0, len(parts)*2)
	isOperator := func(s string) bool { return s == ">" || s == "+" || s == "~" }

	for i, p := range parts {
		if i > 0 && !isOperator(p) && !isOperator(parts[i-1]) {
			result = append(result, " ")
		}
		result = append(result, p)
	}

	return result
}

func (se *SearchEngine) isMatch(node *models.Node, fullSelector string) bool {
	if node == nil {
		return false
	}

	parts := parseSelector(fullSelector)
	if len(parts) == 0 {
		return false
	}

	if len(parts) == 1 {
		return se.matchSingle(node, parts[0])
	}

	targetKanan := parts[len(parts)-1]
	if !se.matchSingle(node, targetKanan) {
		return false
	}

	currentNode := node

	for i := len(parts) - 2; i > 0; i -= 2 {
		operator := parts[i]
		elemenKiri := parts[i-1]
		matched := false

		switch operator {
		case ">":
			if currentNode.Parent != nil && se.matchSingle(currentNode.Parent, elemenKiri) {
				matched = true
				currentNode = currentNode.Parent
			}
		case " ":
			tempNode := currentNode.Parent
			for tempNode != nil {
				if se.matchSingle(tempNode, elemenKiri) {
					matched = true
					currentNode = tempNode
					break
				}
				tempNode = tempNode.Parent
			}
		case "+":
			if currentNode.Parent != nil {
				siblings := currentNode.Parent.Children
				for idx := range siblings {
					if siblings[idx] == currentNode {
						if idx-1 >= 0 && se.matchSingle(siblings[idx-1], elemenKiri) {
							matched = true
							currentNode = siblings[idx-1]
						}
						break
					}
				}
			}
		case "~":
			if currentNode.Parent != nil {
				siblings := currentNode.Parent.Children
				for idx := range siblings {
					if siblings[idx] == currentNode {
						for j := idx - 1; j >= 0; j-- {
							if se.matchSingle(siblings[j], elemenKiri) {
								matched = true
								currentNode = siblings[j]
								break
							}
						}
						break
					}
				}
			}
		}

		if !matched {
			return false
		}
	}

	return true
}

func (se *SearchEngine) matchSingle(node *models.Node, selector string) bool {
	if node == nil {
		return false
	}

	selector = strings.TrimSpace(selector)
	if selector == "" {
		return false
	}
	if selector == "*" {
		return true
	}

	remaining := selector
	tag := ""
	id := ""
	classes := make([]string, 0)

	// Ambil tag di awal jika ada
	if remaining[0] != '#' && remaining[0] != '.' {
		idx := strings.IndexAny(remaining, "#.")
		if idx == -1 {
			tag = remaining
			remaining = ""
		} else {
			tag = remaining[:idx]
			remaining = remaining[idx:]
		}
	}

	for len(remaining) > 0 {
		switch remaining[0] {
		case '#':
			remaining = remaining[1:]
			idx := strings.IndexAny(remaining, "#.")
			if idx == -1 {
				id = remaining
				remaining = ""
			} else {
				id = remaining[:idx]
				remaining = remaining[idx:]
			}
		case '.':
			remaining = remaining[1:]
			idx := strings.IndexAny(remaining, "#.")
			if idx == -1 {
				classes = append(classes, remaining)
				remaining = ""
			} else {
				classes = append(classes, remaining[:idx])
				remaining = remaining[idx:]
			}
		default:
			return false
		}
	}

	if tag != "" && node.TagName != tag {
		return false
	}
	if id != "" && node.ID != id {
		return false
	}

	if len(classes) > 0 {
		nodeClasses := strings.Fields(node.Classes)
		classSet := make(map[string]struct{}, len(nodeClasses))
		for _, c := range nodeClasses {
			classSet[c] = struct{}{}
		}
		for _, needed := range classes {
			if _, ok := classSet[needed]; !ok {
				return false
			}
		}
	}

	return true
}
