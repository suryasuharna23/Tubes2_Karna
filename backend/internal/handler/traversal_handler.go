package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"tubes2-backend/internal/models"
	"tubes2-backend/internal/parser"
	"tubes2-backend/internal/traversal"
)

func HandleTraversal(w http.ResponseWriter, r *http.Request) {
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

	var req models.TraversalRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Format JSON tidak valid: "+err.Error(), http.StatusBadRequest)
		return
	}

	startTime := time.Now()

	var rawHTML string
	if req.URL != "" {
		rawHTML, err = parser.FetchHTML(req.URL)
		if err != nil {
			http.Error(w, fmt.Sprintf("Gagal fetch URL: %v", err), http.StatusInternalServerError)
			return
		}
	} else if req.RawHTML != "" {
		rawHTML = req.RawHTML
	} else {
		http.Error(w, "URL atau RawHTML tidak boleh kosong", http.StatusBadRequest)
		return
	}

	domTree, err := parser.ParseHTML(rawHTML)
	if err != nil {
		http.Error(w, fmt.Sprintf("Gagal parsing HTML: %v", err), http.StatusInternalServerError)
		return
	}

	engine := traversal.NewSearchEngine(domTree, req.Selector, req.Algorithm, req.ResultCount)
	engine.Execute()

	executionTime := float64(time.Since(startTime).Microseconds()) / 1000.0

	resp := models.TraversalResponse{
		ExecutionTimeMs: executionTime,
		NodesVisited:    engine.NodesVisited,
		MatchedNodes:    engine.Matches,
		TraversalLog:    engine.Log,
		FullTree:        domTree,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Gagal menyusun response JSON", http.StatusInternalServerError)
	}
}
