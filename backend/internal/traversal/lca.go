package traversal

import (
	"math/bits"
	"tubes2-backend/internal/models"
)

type LCABuilder struct {
	id     map[*models.Node]int
	nodes  []*models.Node
	tin    []int
	tout   []int
	up     [][]int
	maxLog int
}

func NewLCABuilder() *LCABuilder {
	return &LCABuilder{}
}

// Preprocess membangun tabel "up"
func (b *LCABuilder) Preprocess(root *models.Node) {
	*b = LCABuilder{}
	if root == nil {
		return
	}

	n := countNodes(root)
	maxLog := bits.Len(uint(n))
	if maxLog == 0 {
		maxLog = 1
	}

	// Alokasi memori di awal untuk efisiensi
	b.id = make(map[*models.Node]int, n)
	b.nodes = make([]*models.Node, 0, n)
	b.tin = make([]int, 0, n)
	b.tout = make([]int, 0, n)
	b.up = make([][]int, 0, n)
	b.maxLog = maxLog

	type frame struct {
		node     *models.Node
		id       int
		childIdx int
	}
	stack := make([]frame, 0, 64)

	timer := 0
	assign := func(node *models.Node, parentID int) int {
		id := len(b.nodes)
		b.id[node] = id
		b.nodes = append(b.nodes, node)
		b.tin = append(b.tin, 0)
		b.tout = append(b.tout, 0)

		row := make([]int, maxLog+1)
		if parentID < 0 {
			for j := 0; j <= maxLog; j++ {
				row[j] = id
			}
		} else {
			row[0] = parentID
			for j := 1; j <= maxLog; j++ {
				row[j] = b.up[row[j-1]][j-1]
			}
		}
		b.up = append(b.up, row)
		return id
	}

	timer++
	rootID := assign(root, -1)
	b.tin[rootID] = timer
	stack = append(stack, frame{node: root, id: rootID})

	for len(stack) > 0 {
		top := &stack[len(stack)-1]
		if top.childIdx >= len(top.node.Children) {
			timer++
			b.tout[top.id] = timer
			stack = stack[:len(stack)-1]
			continue
		}
		child := top.node.Children[top.childIdx]
		top.childIdx++
		if child == nil {
			continue
		}
		parentID := top.id
		timer++
		childID := assign(child, parentID)
		b.tin[childID] = timer
		stack = append(stack, frame{node: child, id: childID})
	}
}

func (b *LCABuilder) GetLCA(u, v *models.Node) *models.Node {
	if u == nil || v == nil || len(b.nodes) == 0 {
		return nil
	}
	ui, ok1 := b.id[u]
	vi, ok2 := b.id[v]
	if !ok1 || !ok2 {
		return nil
	}
	// Cek apakah salah satu node adalah ancestor dari node lainnya
	if b.isAncestor(ui, vi) {
		return b.nodes[ui]
	}
	if b.isAncestor(vi, ui) {
		return b.nodes[vi]
	}
	for j := b.maxLog; j >= 0; j-- {
		anc := b.up[ui][j]
		if !b.isAncestor(anc, vi) {
			ui = anc
		}
	}
	return b.nodes[b.up[ui][0]]
}

func (b *LCABuilder) isAncestor(u, v int) bool {
	return b.tin[u] <= b.tin[v] && b.tout[u] >= b.tout[v]
}

func countNodes(root *models.Node) int {
	if root == nil {
		return 0
	}
	n := 0
	stack := []*models.Node{root}
	for len(stack) > 0 {
		v := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		n++
		for _, c := range v.Children {
			if c != nil {
				stack = append(stack, c)
			}
		}
	}
	return n
}