// src/App.tsx
import React, { useState } from 'react';
import type { TraversalRequest, TraversalResponse, DOMNode } from './types';
import { traverseDOM } from './services/api';

const TreeNode: React.FC<{ node: DOMNode; matchedNodes: DOMNode[] }> = ({ node, matchedNodes }) => {
  const isMatch = matchedNodes.some(
    (matchedNode) => matchedNode.tag_name === node.tag_name && matchedNode.id === node.id
  );

  return (
    <div style={{ marginLeft: '20px', borderLeft: '1px solid #ccc', paddingLeft: '10px', marginTop: '5px' }}>
      <div style={{ 
        backgroundColor: isMatch ? '#ffeb3b' : 'transparent', 
        padding: '2px 5px', 
        borderRadius: '4px',
        display: 'inline-block'
      }}>
        <strong>&lt;{node.tag_name}</strong>
        {node.id && <span> id="{node.id}"</span>}
        {node.classes && node.classes.length > 0 && <span> class="{Array.isArray(node.classes) ? node.classes.join(' ') : node.classes}"</span>}
        <strong>&gt;</strong>
        {node.text_content && <span style={{ color: '#555', marginLeft: '10px' }}>{node.text_content}</span>}
      </div>

      {node.children && node.children.map((child, index) => (
        <TreeNode key={index} node={child} matchedNodes={matchedNodes} />
      ))}
    </div>
  );
};

function App() {
  const [response, setResponse] = useState<TraversalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State untuk form input
  const [url, setUrl] = useState('');
  const [rawHtml, setRawHtml] = useState('');
  const [selector, setSelector] = useState('');
  const [algorithm, setAlgorithm] = useState<'BFS' | 'DFS'>('BFS');
  const [resultCount, setResultCount] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);
    setError(null);
    setResponse(null);

    const request: TraversalRequest = {
      url,
      raw_html: rawHtml,
      selector,
      algorithm,
      result_count: resultCount,
    };

    try {
      const result = await traverseDOM(request);
      setResponse(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>DOM Traversal & CSS Selector Engine</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div>
          <label>URL Website (Prioritas): </label>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>Atau Raw HTML: </label>
          <textarea value={rawHtml} onChange={(e) => setRawHtml(e.target.value)} placeholder="<div>...</div>" style={{ width: '100%', padding: '8px', minHeight: '80px' }} />
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label>CSS Selector: </label>
            <input type="text" required value={selector} onChange={(e) => setSelector(e.target.value)} placeholder="div > .class" style={{ width: '100%', padding: '8px' }} />
          </div>
          <div>
            <label>Algoritma: </label>
            <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as 'BFS' | 'DFS')} style={{ width: '100%', padding: '8px' }}>
              <option value="BFS">BFS</option>
              <option value="DFS">DFS</option>
            </select>
          </div>
          <div>
            <label>Banyak Hasil (0 = Semua): </label>
            <input type="number" min="0" value={resultCount} onChange={(e) => setResultCount(Number(e.target.value))} style={{ width: '100%', padding: '8px' }} />
          </div>
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          {loading ? 'Mencari...' : 'Jalankan Traversal'}
        </button>
      </form>

      {error && <div style={{ color: 'red', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

      {response && (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          
          <div style={{ flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '8px', position: 'sticky', top: '20px' }}>
            <h3>Metrik Pencarian</h3>
            <p><strong>Waktu Eksekusi:</strong> {response.execution_time_ms} ms</p>
            <p><strong>Node Dikunjungi:</strong> {response.nodes_visited}</p>
            <p><strong>Node Ditemukan:</strong> {response.matched_nodes ? response.matched_nodes.length : 0}</p>

            <h3 style={{ marginTop: '20px' }}>Traversal Log</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', backgroundColor: '#f9f9f9', padding: '10px', border: '1px solid #eee' }}>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                {response.traversal_log && response.traversal_log.map((tag, idx) => (
                  <li key={idx}><code>{tag}</code></li>
                ))}
              </ol>
            </div>
          </div>

          <div style={{ flex: 2, border: '1px solid #ddd', padding: '15px', borderRadius: '8px', overflowX: 'auto' }}>
            <h3>Visualisasi DOM Tree</h3>
            <p style={{ fontSize: '0.9em', color: '#666' }}>Elemen yang di-highlight kuning adalah hasil kecocokan (matches).</p>
            <div style={{ backgroundColor: '#282c34', color: '#abb2bf', padding: '20px', borderRadius: '4px', minHeight: '400px' }}>
              {response.full_tree ? (
                <TreeNode node={response.full_tree} matchedNodes={response.matched_nodes} />
              ) : (
                <p style={{ color: '#e06c75' }}><em>Render area untuk Full DOM Tree...</em></p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;