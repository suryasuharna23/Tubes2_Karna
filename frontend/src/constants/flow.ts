export const MAX_FLOW_NODES = 1200;
export const MAX_LABEL_TEXT_LENGTH = 42;
export const FLOW_NODE_MIN_WIDTH = 140;
export const FLOW_NODE_MAX_WIDTH = 720;
export const FLOW_NODE_CHAR_WIDTH = 7.25;
export const FLOW_NODE_HORIZONTAL_PADDING = 34;

export const EDGE_COLOR_DEFAULT = 'rgba(239, 188, 148, 0.5)';
export const EDGE_COLOR_HIGHLIGHT = '#4ade80';

export const PLAYBACK_SPEED_OPTIONS = [0.5, 0.75, 1, 1.5, 2] as const;
export type PlaybackSpeed = typeof PLAYBACK_SPEED_OPTIONS[number];

export const INITIAL_DEPTH_GAP = 90;
export const INITIAL_ROW_GAP = 70;
export const TARGET_DEPTH_GAP = 180;
export const HORIZONTAL_NODE_GAP = 130;