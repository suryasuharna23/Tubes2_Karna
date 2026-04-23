import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import type { TraversalRequest, TraversalResponse } from './types';
import { traverseDOM } from './services/api';

// Extracted Hooks & Utils
import { useFlowEngine } from './hooks/useFlowEngine';
import { calculateMaxDepth, buildFlowTree, getNodeSignature } from './utils/flowUtils';
import { PLAYBACK_SPEED_OPTIONS, type PlaybackSpeed } from './constants/flow';

import '@xyflow/react/dist/style.css';
import './App.css';

type InputMode = 'url' | 'html';

function App() {
  const [response, setResponse] = useState<TraversalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [rawHtml, setRawHtml] = useState('');
  const [selector, setSelector] = useState('');
  const [algorithm, setAlgorithm] = useState<'BFS' | 'DFS'>('DFS');
  const [resultCount, setResultCount] = useState<number>(0);

  const matchedCount = useMemo(() => {
    if (!response) return 0;
    const matchedNodesCount = response.matched_nodes?.length ?? 0;
    return (typeof response.nodes_found === 'number' && response.nodes_found > 0) 
      ? response.nodes_found 
      : matchedNodesCount;
  }, [response]);

  const matchedSignatures = useMemo(() => {
    const signatures = new Set<string>();
    for (const node of response?.matched_nodes ?? []) {
      signatures.add(getNodeSignature(node));
    }
    return signatures;
  }, [response]);

  const maximumDepth = useMemo(() => calculateMaxDepth(response?.full_tree), [response]);

  const { baseNodes, baseEdges, truncated, renderedNodes } = useMemo(() => {
    if (!response?.full_tree) {
      return { baseNodes: [], baseEdges: [], truncated: false, renderedNodes: 0 };
    }
    
    const tree = buildFlowTree(response.full_tree, matchedSignatures);
    
    return { 
      baseNodes: tree.nodes, 
      baseEdges: tree.edges, 
      truncated: tree.truncated, 
      renderedNodes: tree.renderedNodes 
    };
  }, [response, matchedSignatures]);

  const {
    visibleFlowNodes,
    animatedFlowEdges,
    setFlowInstance,
    setHoveredFlowNodeId,
    isPlaybackActive,
    playbackCompleted,
    reachedResultLimit,
    playbackSpeed,
    setPlaybackSpeed,
    revealedMatchedCount,
    handleTogglePlayback,
    handleRestartPlayback,
  } = useFlowEngine(baseNodes, baseEdges, algorithm, resultCount);

  const isLargeFlow = renderedNodes > 500;
  const visibleFlowNodeCount = visibleFlowNodes.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMode === 'url' && !url.trim()) {
      setError('Masukkan URL target terlebih dahulu.');
      return;
    }
    if (inputMode === 'html' && !rawHtml.trim()) {
      setError('Masukkan raw HTML terlebih dahulu.');
      return;
    }
    if (!selector.trim()) {
      setError('CSS selector wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    const request: TraversalRequest = {
      url: inputMode === 'url' ? url : '',
      raw_html: inputMode === 'html' ? rawHtml : '',
      selector,
      algorithm,
      result_count: resultCount,
    };

    try {
      const result = await traverseDOM(request);
      setResponse(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace">
      <header className="page-header">
        <h1 className="page-header__title">DOM Traversal & CSS Selector Engine</h1>
        <p className="page-header__subtitle">
          A visual tool to parse HTML documents, traverse DOM trees using BFS/DFS, and pinpoint elements.
        </p>
      </header>

      <div className="top-grid">
        <section className="panel origin-panel">
          <div className="panel__header-row">
            <h3 className="panel__title">Origin Payload</h3>
            <div className="switcher">
              <button
                type="button"
                className={inputMode === 'url' ? 'switcher__btn switcher__btn--active' : 'switcher__btn'}
                onClick={() => setInputMode('url')}
              >
                URL
              </button>
              <button
                type="button"
                className={inputMode === 'html' ? 'switcher__btn switcher__btn--active' : 'switcher__btn'}
                onClick={() => setInputMode('html')}
              >
                HTML
              </button>
            </div>
          </div>

          {inputMode === 'url' ? (
            <div className="form-field">
              <label htmlFor="url">TARGET ENDPOINT</label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/data"
              />
              <p className="form-note">Note: Dont forget to include the protocol in the url</p>
            </div>
          ) : (
            <div className="form-field">
              <label htmlFor="rawHtml">RAW HTML</label>
              <textarea
                id="rawHtml"
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                placeholder={'<div class="product-card"><h2 class="title">...</h2></div>'}
              />
            </div>
          )}
        </section>

        <section className="panel traversal-panel">
          <h3 className="panel__title">Traversal Matrix</h3>
          <form onSubmit={handleSubmit} className="traversal-form">
            <div className="traversal-form__grid">
              <div className="form-field">
                <label htmlFor="selector">CSS SELECTOR TARGET</label>
                <input
                  id="selector"
                  type="text"
                  required
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                  placeholder="div.product-card > h2.title"
                />
              </div>

              <div className="form-field">
                <label htmlFor="algorithm">ALGORITHM</label>
                <select
                  id="algorithm"
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as 'BFS' | 'DFS')}
                >
                  <option value="DFS">Depth-First (DFS)</option>
                  <option value="BFS">Breadth-First (BFS)</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="resultCount">RESULT LIMIT</label>
                <input
                  id="resultCount"
                  type="number"
                  min="0"
                  value={resultCount}
                  onChange={(e) => setResultCount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="traversal-form__footer">
              <button type="submit" className="execute-btn" disabled={loading}>
                {loading ? 'PROCESSING...' : 'EXECUTE TRAVERSAL'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="bottom-grid">
        <aside className="left-stack">
          <section className="panel metrics-panel">
            <h3 className="panel__title">Execution Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <p className="metric-item__label">EXECUTION TIME</p>
                <p className="metric-item__value metric-item__value--accent">{response?.execution_time_ms ?? 0}ms</p>
              </div>
              <div className="metric-item">
                <p className="metric-item__label">NODES VISITED</p>
                <p className="metric-item__value">{(response?.nodes_visited ?? 0).toLocaleString('en-US')}</p>
              </div>
              <div className="metric-item">
                <p className="metric-item__label">NODES FOUND</p>
                <p className="metric-item__value">{matchedCount}</p>
              </div>
              <div className="metric-item">
                <p className="metric-item__label">MAXIMUM DEPTH</p>
                <p className="metric-item__value">{maximumDepth}</p>
              </div>
            </div>
          </section>

          <section className="panel log-panel">
            <div className="log-panel__header">
              <h3 className="panel__title">Traversal Log</h3>
            </div>
            <div className="log-panel__body">
              {response?.traversal_log?.length ? (
                <ul>
                  {response.traversal_log.map((tag, index) => (
                    <li key={`${tag}-${index}`}>
                      <span className="log-bullet">▹</span>
                      <span>{tag}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="log-empty">Traversal log will be displayed here after the execution is completed.</p>
              )}
            </div>
          </section>
        </aside>

        <section className="results-panel">
          <header className="results-panel__header">
            <div className="results-panel__left">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="11" viewBox="0 0 12 11" fill="none">
                <path d="M7.58333 10.5V8.75H5.25V2.91667H4.08333V4.66667H0V0H4.08333V1.75H7.58333V0H11.6667V4.66667H7.58333V2.91667H6.41667V7.58333H7.58333V5.83333H11.6667V10.5H7.58333ZM1.16667 1.16667V3.5V1.16667ZM8.75 7V9.33333V7ZM8.75 1.16667V3.5V1.16667ZM8.75 3.5H10.5V1.16667H8.75V3.5ZM8.75 9.33333H10.5V7H8.75V9.33333ZM1.16667 3.5H2.91667V1.16667H1.16667V3.5Z" fill="#EFBC94"/>
              </svg>
              <h3>DOM Output Tree</h3>
              <span className="results-panel__count">{matchedCount}</span>
              <span className="results-panel__meta">NODES CAPTURED</span>
            </div>
          </header>

          <div className="results-panel__canvas">
            {baseNodes.length > 0 ? (
              <div className="flow-tree-wrapper">
                <div className="flow-tree-hint">
                  Rendered: {visibleFlowNodeCount}/{renderedNodes} nodes
                  {resultCount > 0 && ` · Matches ${revealedMatchedCount}/${resultCount}`}
                </div>
                <div className="flow-playback-controls">
                  <button type="button" className="flow-playback-controls__btn" onClick={handleTogglePlayback}>
                    {playbackCompleted || reachedResultLimit ? 'Replay' : isPlaybackActive ? 'Pause' : 'Play'}
                  </button>
                  <button type="button" className="flow-playback-controls__btn" onClick={handleRestartPlayback}>
                    Restart
                  </button>
                  <label htmlFor="playbackSpeed" className="flow-playback-controls__label">
                    Speed
                  </label>
                  <select
                    id="playbackSpeed"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value) as PlaybackSpeed)}
                    className="flow-playback-controls__select"
                  >
                    {PLAYBACK_SPEED_OPTIONS.map((speed) => (
                      <option key={speed} value={speed}>
                        {speed}x
                      </option>
                    ))}
                  </select>
                </div>
                {truncated && (
                  <p className="results-warning">
                    Showing first {renderedNodes} nodes for performance. Use a smaller HTML or narrower selector for full detail.
                  </p>
                )}
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={visibleFlowNodes}
                    edges={animatedFlowEdges}
                    style={{ width: '100%', height: '100%' }}
                    fitView
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnDrag
                    zoomOnScroll
                    fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
                    minZoom={0.05}
                    maxZoom={2}
                    onInit={setFlowInstance}
                    onNodeMouseEnter={(_, node) => setHoveredFlowNodeId(node.id)}
                    onNodeMouseLeave={() => setHoveredFlowNodeId(null)}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background color="rgba(239, 188, 148, 0.22)" gap={20} />
                    {!isLargeFlow && (
                      <MiniMap
                        pannable
                        zoomable
                        maskColor="rgba(15, 14, 14, 0.55)"
                        nodeColor={(node) => (node.className?.includes('flow-node--matched') ? '#efbc94' : '#6b7280')}
                      />
                    )}
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>
            ) : (
              <p className="log-empty">Run traversal to generate and visualize the full DOM tree.</p>
            )}
          </div>

          <footer className="results-panel__status">
            <span>EXECUTION TIME: {response?.execution_time_ms ?? 0}MS</span>
            <span>CHARSET: UTF-8</span>
            <span className="status-ok">
              TRAVERSAL{' '}
              {response
                ? !playbackCompleted && !reachedResultLimit
                  ? isPlaybackActive
                    ? 'ANIMATING'
                    : 'PAUSED'
                  : reachedResultLimit
                    ? 'LIMIT REACHED'
                  : 'COMPLETE'
                : 'IDLE'}
            </span>
          </footer>
        </section>
      </div>

      {error && <div className="error-banner">{error}</div>}
      <div className="sr-only" aria-hidden="true">DOM Traversal & CSS Selector Engine</div>
    </div>
  );
}

export default App;