import { StyleSheet } from 'react-native';

// UI and interaction constants
export const UI_CONSTANTS = {
  // Timing
  DOUBLE_TAP_THRESHOLD: 250, // ms
  SHAKE_VELOCITY_THRESHOLD: 6000, // velocity units

  // Zoom and scaling
  ZOOM_LIMITS: {
    MIN: 0.5,
    MAX: 3,
    DEFAULT: 1
  },

  // Grid dimensions
  CELL_DIMENSIONS: {
    WIDTH: 96,
    HEIGHT: 48
  },

  // Grid bounds
  GRID_BOUNDS: {
    MIN: -12,
    MAX: 12
  },

  // Z-index layers
  Z_INDEX: {
    DEFAULT: 0,
    HAS_CONTENT: 1,
    REFERENCED: 2,
    FOCUSED: 3
  },

  // Border styles
  BORDER_WIDTH: {
    DEFAULT: StyleSheet.hairlineWidth,
    HAS_CONTENT: 1,
    FOCUSED_OR_REFERENCED: 2
  },

  // Colors
  COLORS: {
    BORDER_DEFAULT: '#bbb',
    BORDER_HAS_CONTENT: '#666',
    BORDER_FOCUSED: '#000',
    CELL_BACKGROUND: 'transparent'
  }
};

// Formula evaluation constants
export const FORMULA_CONSTANTS = {
  ERROR_VALUE: '#ERROR',
  DEFAULT_NUMERIC_VALUE: 0,
  MAX_RECURSION_DEPTH: 100
};

// Storage constants
export const STORAGE_KEYS = {
  INDEX: 'napkin:index'
};

// Gesture constants
export const GESTURE_CONSTANTS = {
  VELOCITY_THRESHOLD_SHAKE: 6000
};
