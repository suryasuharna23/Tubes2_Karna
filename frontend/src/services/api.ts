import type { TraversalRequest, TraversalResponse, LCARequest, LCAResponse } from '../types';

const TRAVERSE_URL = 'http://localhost:8080/api/traverse';
const LCA_URL = 'http://localhost:8080/api/lca';

export const traverseDOM = async (requestData: TraversalRequest): Promise<TraversalResponse> => {
  const response = await fetch(TRAVERSE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${errorText}`);
  }

  return response.json();
};

export const findLCA = async (requestData: LCARequest): Promise<LCAResponse> => {
  const response = await fetch(LCA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${errorText}`);
  }

  return response.json();
};