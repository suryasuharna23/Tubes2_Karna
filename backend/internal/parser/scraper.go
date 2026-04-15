package parser

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

// FetchHTML melakukan HTTP GET ke target URL dan mengembalikan teks mentahnya
func FetchHTML(targetURL string) (string, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(targetURL)
	if err != nil {
		return "", fmt.Errorf("gagal mengakses URL: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status HTTP tidak OK: %d", resp.StatusCode)
	}

	// Membaca seluruh isi response menjadi byte, lalu di-cast ke string
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("gagal membaca isi halaman: %v", err)
	}

	return string(bodyBytes), nil
}
