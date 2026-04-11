/**
 * useInteraction — Hook for managing canvas interactions
 *
 * Wraps InteractionManager state and event handlers into a React hook.
 * Handles mouse events, touch events, and keyboard input.
 */

'use client';

import { useRef, useCallback, useState } from 'react';
import type { VisualScene, InteractionResult } from '@skillquest/game-engine';
import {
  type InteractionState,
  createInteractionState,
  handleClick,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
} from '../InteractionManager';

interface UseInteractionOptions {
  scene: VisualScene;
  onResult?: (result: InteractionResult) => void;
}

export function useInteraction({ scene, onResult }: UseInteractionOptions) {
  const [state, setState] = useState<InteractionState>(createInteractionState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const resultCallback = useCallback(
    (result: InteractionResult) => {
      onResult?.(result);
    },
    [onResult],
  );

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const scaleX = scene.viewport.width / rect.width;
      const scaleY = scene.viewport.height / rect.height;
      return {
        mx: (e.clientX - rect.left) * scaleX,
        my: (e.clientY - rect.top) * scaleY,
      };
    },
    [scene.viewport.width, scene.viewport.height],
  );

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { mx, my } = getCanvasCoords(e);
      const newState = handleClick(mx, my, scene, stateRef.current, resultCallback);
      setState(newState);
    },
    [scene, getCanvasCoords, resultCallback],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { mx, my } = getCanvasCoords(e);
      const newState = handleMouseDown(mx, my, scene, stateRef.current);
      setState(newState);
    },
    [scene, getCanvasCoords],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { mx, my } = getCanvasCoords(e);
      const newState = handleMouseMove(mx, my, scene, stateRef.current);
      setState(newState);
      e.currentTarget.style.cursor = newState.cursor;
    },
    [scene, getCanvasCoords],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { mx, my } = getCanvasCoords(e);
      const newState = handleMouseUp(mx, my, scene, stateRef.current, resultCallback);
      setState(newState);
    },
    [scene, getCanvasCoords, resultCallback],
  );

  return {
    state,
    handlers: {
      onClick,
      onMouseDown,
      onMouseMove,
      onMouseUp,
    },
  };
}
