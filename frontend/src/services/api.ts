import type { TraversalRequest, TraversalResponse } from '../types';

const API_URL = 'http://localhost:8080/api/traverse';

export const traverseDOM = async (requestData: TraversalRequest): Promise<TraversalResponse> => {
  const response = await fetch(API_URL, {
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