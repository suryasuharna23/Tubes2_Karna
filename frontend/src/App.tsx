import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
} from '@xyflow/react';
import type { TraversalRequest, TraversalResponse, LCARequest, LCAResponse } from './types';
import { traverseDOM, findLCA } from './services/api';

// Extracted Hooks & Utils
import { useFlowEngine } from './hooks/useFlowEngine';
import {
  calculateMaxDepth,
  buildFlowTree,
  getNodeSignature,
  getNodeLabel,
  type NodeHighlightRole,
} from './utils/flowUtils';
import { PLAYBACK_SPEED_OPTIONS, type PlaybackSpeed } from './constants/flow';

import '@xyflow/react/dist/style.css';
import './App.css';

type InputMode = 'url' | 'html';
type FeatureMode = 'search' | 'lca';

function App() {
  const [featureMode, setFeatureMode] = useState<FeatureMode>('search');

  const [response, setResponse] = useState<TraversalResponse | null>(null);
  const [lcaResponse, setLcaResponse] = useState<LCAResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [rawHtml, setRawHtml] = useState('');
  const [selector, setSelector] = useState('');
  const [selectorA, setSelectorA] = useState('');
  const [selectorB, setSelectorB] = useState('');
  const [algorithm, setAlgorithm] = useState<'BFS' | 'DFS'>('DFS');
  const [resultCount, setResultCount] = useState<number>(0);

  const matchedCount = useMemo(() => {
    if (!response) return 0;
    const matchedNodesCount = response.matched_nodes?.length ?? 0;
    return (typeof response.nodes_found === 'number' && response.nodes_found > 0)
      ? response.nodes_found
      : matchedNodesCount;
  }, [response]);

  const activeTree = featureMode === 'lca' ? lcaResponse?.full_tree : response?.full_tree;

  const highlightMap = useMemo(() => {
    const map = new Map<string, NodeHighlightRole>();
    if (featureMode === 'search') {
      for (const node of response?.matched_nodes ?? []) {
        map.set(getNodeSignature(node), 'matched');
      }
    } else if (featureMode === 'lca' && lcaResponse) {
      if (lcaResponse.node_a) map.set(getNodeSignature(lcaResponse.node_a), 'node-a');
      if (lcaResponse.node_b) map.set(getNodeSignature(lcaResponse.node_b), 'node-b');
      if (lcaResponse.lca) map.set(getNodeSignature(lcaResponse.lca), 'lca');
    }
    return map;
  }, [featureMode, response, lcaResponse]);

  const maximumDepth = useMemo(() => calculateMaxDepth(activeTree), [activeTree]);

  const { baseNodes, baseEdges, truncated, renderedNodes } = useMemo(() => {
    if (!activeTree) {
      return { baseNodes: [], baseEdges: [], truncated: false, renderedNodes: 0 };
    }

    const tree = buildFlowTree(activeTree, highlightMap);

    return {
      baseNodes: tree.nodes,
      baseEdges: tree.edges,
      truncated: tree.truncated,
      renderedNodes: tree.renderedNodes,
    };
  }, [activeTree, highlightMap]);

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
  } = useFlowEngine(baseNodes, baseEdges, algorithm, resultCount, featureMode === 'search');

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

    if (featureMode === 'search') {
      if (!selector.trim()) {
        setError('CSS selector wajib diisi.');
        return;
      }
    } else {
      if (!selectorA.trim() || !selectorB.trim()) {
        setError('Selector A dan Selector B wajib diisi.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setLcaResponse(null);

    try {
      if (featureMode === 'search') {
        const request: TraversalRequest = {
          url: inputMode === 'url' ? url : '',
          raw_html: inputMode === 'html' ? rawHtml : '',
          selector,
          algorithm,
          result_count: resultCount,
        };
        const result = await traverseDOM(request);
        setResponse(result);
      } else {
        const request: LCARequest = {
          url: inputMode === 'url' ? url : '',
          raw_html: inputMode === 'html' ? rawHtml : '',
          selector_a: selectorA,
          selector_b: selectorB,
        };
        const result = await findLCA(request);
        setLcaResponse(result);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses request.');
    } finally {
      setLoading(false);
    }
  };

  const executionTimeMs = featureMode === 'lca'
    ? lcaResponse?.execution_time_ms ?? 0
    : response?.execution_time_ms ?? 0;

  const hasActiveResponse = featureMode === 'lca' ? lcaResponse !== null : response !== null;

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
          <div className="panel__header-row">
            <h3 className="panel__title">{featureMode === 'lca' ? 'LCA Matrix' : 'Traversal Matrix'}</h3>
            <div className="switcher">
              <button
                type="button"
                className={featureMode === 'search' ? 'switcher__btn switcher__btn--active' : 'switcher__btn'}
                onClick={() => setFeatureMode('search')}
              >
                Search
              </button>
              <button
                type="button"
                className={featureMode === 'lca' ? 'switcher__btn switcher__btn--active' : 'switcher__btn'}
                onClick={() => setFeatureMode('lca')}
              >
                LCA
              </button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="traversal-form">
            {featureMode === 'search' ? (
              <div className="traversal-form__grid">
                <div className="form-field">
                  <label htmlFor="selector">CSS SELECTOR TARGET</label>
                  <input
                    id="selector"
                    type="text"
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
            ) : (
              <div className="traversal-form__grid traversal-form__grid--lca">
                <div className="form-field">
                  <label htmlFor="selectorA">SELECTOR A</label>
                  <input
                    id="selectorA"
                    type="text"
                    value={selectorA}
                    onChange={(e) => setSelectorA(e.target.value)}
                    placeholder="div.card#first"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="selectorB">SELECTOR B</label>
                  <input
                    id="selectorB"
                    type="text"
                    value={selectorB}
                    onChange={(e) => setSelectorB(e.target.value)}
                    placeholder="span.price.big"
                  />
                </div>
              </div>
            )}

            <div className="traversal-form__footer">
              <button type="submit" className="execute-btn" disabled={loading}>
                {loading
                  ? 'PROCESSING...'
                  : featureMode === 'lca'
                    ? 'COMPUTE LCA'
                    : 'EXECUTE TRAVERSAL'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="bottom-grid">
        <aside className="left-stack">
          <section className="panel metrics-panel">
            <h3 className="panel__title">Execution Metrics</h3>
            {featureMode === 'search' ? (
              <div className="metrics-grid">
                <div className="metric-item">
                  <p className="metric-item__label">EXECUTION TIME</p>
                  <p className="metric-item__value metric-item__value--accent">{executionTimeMs}ms</p>
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
            ) : (
              <div className="metrics-grid metrics-grid--lca">
                <div className="metric-item">
                  <p className="metric-item__label">EXECUTION TIME</p>
                  <p className="metric-item__value metric-item__value--accent">{executionTimeMs}ms</p>
                </div>
                <div className="metric-item">
                  <p className="metric-item__label">MAX DEPTH</p>
                  <p className="metric-item__value">{maximumDepth}</p>
                </div>
                <div className="metric-item">
                  <p className="metric-item__label">NODE A</p>
                  <p className="metric-item__value">
                    {lcaResponse?.node_a ? getNodeLabel(lcaResponse.node_a) : '—'}
                  </p>
                </div>
                <div className="metric-item">
                  <p className="metric-item__label">NODE B</p>
                  <p className="metric-item__value">
                    {lcaResponse?.node_b ? getNodeLabel(lcaResponse.node_b) : '—'}
                  </p>
                </div>
                <div className="metric-item metric-item--full">
                  <p className="metric-item__label">LCA</p>
                  <p className="metric-item__value">
                    {lcaResponse?.lca ? getNodeLabel(lcaResponse.lca) : '—'}
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="panel log-panel">
            <div className="log-panel__header">
              <h3 className="panel__title">{featureMode === 'lca' ? 'LCA Detail' : 'Traversal Log'}</h3>
            </div>
            <div className="log-panel__body">
              {featureMode === 'search' ? (
                response?.traversal_log?.length ? (
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
                )
              ) : lcaResponse ? (
                <ul className="lca-legend">
                  <li>
                    <span className="lca-legend__chip lca-legend__chip--node-a" />
                    <span>Node A: {lcaResponse.node_a ? getNodeLabel(lcaResponse.node_a) : '—'}</span>
                  </li>
                  <li>
                    <span className="lca-legend__chip lca-legend__chip--node-b" />
                    <span>Node B: {lcaResponse.node_b ? getNodeLabel(lcaResponse.node_b) : '—'}</span>
                  </li>
                  <li>
                    <span className="lca-legend__chip lca-legend__chip--lca" />
                    <span>LCA: {lcaResponse.lca ? getNodeLabel(lcaResponse.lca) : 'tidak ditemukan'}</span>
                  </li>
                </ul>
              ) : (
                <p className="log-empty">Run LCA to see the common ancestor detail.</p>
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
              <span className="results-panel__count">
                {featureMode === 'lca'
                  ? (lcaResponse?.lca ? 1 : 0)
                  : matchedCount}
              </span>
              <span className="results-panel__meta">
                {featureMode === 'lca' ? 'LCA RESOLVED' : 'NODES CAPTURED'}
              </span>
            </div>
          </header>

          <div className="results-panel__canvas">
            {baseNodes.length > 0 ? (
              <div className="flow-tree-wrapper">
                <div className="flow-tree-hint">
                  Rendered: {visibleFlowNodeCount}/{renderedNodes} nodes
                  {featureMode === 'search' && resultCount > 0 && ` · Matches ${revealedMatchedCount}/${resultCount}`}
                </div>
                {featureMode === 'search' && (
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
                )}
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
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>
            ) : (
              <p className="log-empty">
                {featureMode === 'lca'
                  ? 'Run LCA to visualize the DOM tree with highlighted ancestors.'
                  : 'Run traversal to generate and visualize the full DOM tree.'}
              </p>
            )}
          </div>

          <footer className="results-panel__status">
            <span>EXECUTION TIME: {executionTimeMs}MS</span>
            <span>CHARSET: UTF-8</span>
            <span className="status-ok">
              {featureMode === 'lca'
                ? hasActiveResponse
                  ? lcaResponse?.lca
                    ? 'LCA RESOLVED'
                    : 'LCA NOT FOUND'
                  : 'LCA IDLE'
                : response
                  ? !playbackCompleted && !reachedResultLimit
                    ? isPlaybackActive
                      ? 'TRAVERSAL ANIMATING'
                      : 'TRAVERSAL PAUSED'
                    : reachedResultLimit
                      ? 'TRAVERSAL LIMIT REACHED'
                      : 'TRAVERSAL COMPLETE'
                  : 'TRAVERSAL IDLE'}
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