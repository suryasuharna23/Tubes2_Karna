// src/App.tsx
import React, { useMemo, useState } from 'react';
import type { TraversalRequest, TraversalResponse, DOMNode } from './types';
import { traverseDOM } from './services/api';
import './App.css';

type InputMode = 'url' | 'html';

const normalizeClasses = (node?: DOMNode): string => {
  const classes = node?.classes ?? node?.class;

  if (!classes) {
    return '';
  }

  return Array.isArray(classes) ? classes.join(' ') : classes;
};

const isSameNode = (first: DOMNode, second: DOMNode): boolean => {
  return first.tag_name === second.tag_name
    && (first.id ?? '') === (second.id ?? '')
    && normalizeClasses(first) === normalizeClasses(second)
    && (first.text_content ?? '') === (second.text_content ?? '');
};

const getNodeLabel = (node: DOMNode): string => {
  const classes = normalizeClasses(node)
    .split(' ')
    .filter(Boolean)
    .map((className) => `.${className}`)
    .join('');

  const identifier = node.id ? `#${node.id}` : '';
  return `${node.tag_name}${identifier}${classes}`;
};

const findPathToTarget = (node: DOMNode, target: DOMNode, path: DOMNode[] = []): DOMNode[] | null => {
  const nextPath = [...path, node];

  if (isSameNode(node, target)) {
    return nextPath;
  }

  for (const child of node.children ?? []) {
    const childPath = findPathToTarget(child, target, nextPath);
    if (childPath) {
      return childPath;
    }
  }

  return null;
};

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
    if (!response) {
      return 0;
    }

    const matchedNodesCount = response.matched_nodes?.length ?? 0;

    if (typeof response.nodes_found === 'number') {
      if (response.nodes_found > 0) {
        return response.nodes_found;
      }

      return matchedNodesCount;
    }

    return matchedNodesCount;
  }, [response]);

  const focusPathLabels = useMemo(() => {
    const defaultLabels = ['HTMLDocument', 'html', 'body', 'div.product-card', 'h2.title'];

    if (!response?.full_tree || !response?.matched_nodes?.[0]) {
      return defaultLabels;
    }

    const path = findPathToTarget(response.full_tree, response.matched_nodes[0]);
    if (!path) {
      return defaultLabels;
    }

    return ['HTMLDocument', ...path.map(getNodeLabel)];
  }, [response]);

  const focusTargetText = useMemo(() => {
    const text = response?.matched_nodes?.[0]?.text_content?.trim();
    if (!text) {
      return '"Mechanical Keyboard v2"';
    }

    return `"${text}"`;
  }, [response]);

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
                onChange={(event) => setUrl(event.target.value)}
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
                onChange={(event) => setRawHtml(event.target.value)}
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
                  onChange={(event) => setSelector(event.target.value)}
                  placeholder="div.product-card > h2.title"
                />
              </div>

              <div className="form-field">
                <label htmlFor="algorithm">ALGORITHM</label>
                <select
                  id="algorithm"
                  value={algorithm}
                  onChange={(event) => setAlgorithm(event.target.value as 'BFS' | 'DFS')}
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
                  onChange={(event) => setResultCount(Number(event.target.value))}
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
                <p className="metric-item__value">{Math.max(focusPathLabels.length - 2, 0)}</p>
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
            <div className="path-tree">
              {focusPathLabels.map((label, index) => {
                const isLast = index === focusPathLabels.length - 1;

                return (
                  <React.Fragment key={`${label}-${index}`}>
                    <div className={isLast ? 'path-node path-node--target' : 'path-node'}>
                      {isLast ? (
                        <>
                          <span className="path-node__dot" />
                          <span className="path-node__label">{label}</span>
                          <span className="path-node__text">{focusTargetText}</span>
                        </>
                      ) : (
                        <span className="path-node__label">{label}</span>
                      )}
                    </div>
                    {!isLast && <span className="path-tree__connector" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <footer className="results-panel__status">
            <span>EXECUTION TIME: {response?.execution_time_ms ?? 0}MS</span>
            <span>CHARSET: UTF-8</span>
            <span className="status-ok">TRAVERSAL {response ? 'COMPLETE' : 'IDLE'}</span>
          </footer>
        </section>
      </div>

      {error && <div className="error-banner">{error}</div>}
      
      <div className="sr-only" aria-hidden="true">DOM Traversal & CSS Selector Engine</div>
    </div>
  );
}

export default App;