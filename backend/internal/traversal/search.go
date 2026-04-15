package traversal

import (
	"strings"

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
	switch se.Algorithm {
	case "BFS":
		se.runBFS()
	case "DFS":
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

	// Ambil tag di awal jika ada.
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
