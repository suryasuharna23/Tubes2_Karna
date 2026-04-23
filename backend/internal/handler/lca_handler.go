package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"tubes2-backend/internal/models"
	"tubes2-backend/internal/parser"
	"tubes2-backend/internal/traversal"
)

func HandleLCA(w http.ResponseWriter, r *http.Request) {
	// Setup CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LCARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Format JSON tidak valid: "+err.Error(), http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.SelectorA) == "" || strings.TrimSpace(req.SelectorB) == "" {
		http.Error(w, "selector_a dan selector_b wajib diisi", http.StatusBadRequest)
		return
	}

	start := time.Now()

	var rawHTML string
	var err error
	switch {
	case req.URL != "":
		rawHTML, err = parser.FetchHTML(req.URL)
		if err != nil {
			http.Error(w, fmt.Sprintf("Gagal fetch URL: %v", err), http.StatusInternalServerError)
			return
		}
	case req.RawHTML != "":
		rawHTML = req.RawHTML
	default:
		http.Error(w, "URL atau RawHTML tidak boleh kosong", http.StatusBadRequest)
		return
	}

	domTree, err := parser.ParseHTML(rawHTML)
	if err != nil {
		http.Error(w, fmt.Sprintf("Gagal parsing HTML: %v", err), http.StatusInternalServerError)
		return
	}

	nodeA := traversal.FindFirstMatch(domTree, req.SelectorA)
	if nodeA == nil {
		http.Error(w, fmt.Sprintf("Tidak ada node yang cocok dengan selector_a: %q", req.SelectorA), http.StatusNotFound)
		return
	}
	nodeB := traversal.FindFirstMatch(domTree, req.SelectorB)
	if nodeB == nil {
		http.Error(w, fmt.Sprintf("Tidak ada node yang cocok dengan selector_b: %q", req.SelectorB), http.StatusNotFound)
		return
	}

	builder := traversal.NewLCABuilder()
	builder.Preprocess(domTree)
	lcaNode := builder.GetLCA(nodeA, nodeB)

	executionTime := float64(time.Since(start).Microseconds()) / 1000.0

	resp := models.LCAResponse{
		ExecutionTimeMs: executionTime,
		NodeA:           nodeA,
		NodeB:           nodeB,
		LCA:             lcaNode,
		FullTree:        domTree,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Gagal menyusun response JSON", http.StatusInternalServerError)
	}
}