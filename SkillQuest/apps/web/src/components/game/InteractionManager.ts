/**
 * InteractionManager — Handles user interactions on the game canvas
 *
 * Supports all 5 InteractionTypes:
 * - click: tap entity → validate
 * - connect: drag from entity A to entity B → validate pair
 * - drag: drag entity to a target slot → validate placement
 * - sequence: tap entities in order → validate sequence
 * - input: text input on an entity → validate value
 *
 * Returns InteractionResult for each action and manages visual state
 * (hovered entity, selected entity, pending connection, drag preview).
 */

import type {
  VisualScene,
  VisualEntity,
  InteractionResult,
  InteractionRule,
} from '@skillquest/game-engine';
import { hitTestEntity, isEntityClickable } from './EntityRenderer';

export interface InteractionState {
  /** Currently hovered entity ID */
  hoveredId: string | null;
  /** Selected entity ID (for connect/sequence mode) */
  selectedId: string | null;
  /** Current mouse/touch position for pending connection line */
  pendingLine: { fromX: number; fromY: number; toX: number; toY: number } | null;
  /** Entity being dragged */
  draggingId: string | null;
  /** Drag offset from entity center */
  dragOffset: { dx: number; dy: number };
  /** Ordered selection for sequence interaction */
  sequenceIds: string[];
  /** Cursor style */
  cursor: string;
}

export function createInteractionState(): InteractionState {
  return {
    hoveredId: null,
    selectedId: null,
    pendingLine: null,
    draggingId: null,
    dragOffset: { dx: 0, dy: 0 },
    sequenceIds: [],
    cursor: 'default',
  };
}

type InteractionCallback = (result: InteractionResult) => void;

/** Process a mouse/touch click on the canvas */
export function handleClick(
  mx: number,
  my: number,
  scene: VisualScene,
  state: InteractionState,
  onResult: InteractionCallback,
): InteractionState {
  const newState = { ...state };
  const entity = findEntityAt(mx, my, scene.entities);

  if (!entity || !isEntityClickable(entity)) {
    // Click on empty space → cancel any pending selection
    newState.selectedId = null;
    newState.pendingLine = null;
    newState.sequenceIds = [];
    return newState;
  }

  // Try each interaction rule
  for (const rule of scene.interactions) {
    switch (rule.type) {
      case 'click': {
        if (rule.sourceFilter && entity.group !== rule.sourceFilter) continue;
        const result = rule.validate({ entityId: entity.id });
        onResult(result);
        return newState;
      }

      case 'connect': {
        if (!state.selectedId) {
          // First click → select source
          if (rule.sourceFilter && entity.group !== rule.sourceFilter) continue;
          newState.selectedId = entity.id;
          return newState;
        }
        // Second click → validate connection
        if (rule.targetFilter && entity.group !== rule.targetFilter) continue;
        const result = rule.validate({
          fromId: state.selectedId,
          toId: entity.id,
        });
        onResult(result);
        newState.selectedId = null;
        newState.pendingLine = null;
        return newState;
      }

      case 'sequence': {
        if (rule.sourceFilter && entity.group !== rule.sourceFilter) continue;
        // Add to sequence
        if (!newState.sequenceIds.includes(entity.id)) {
          newState.sequenceIds = [...newState.sequenceIds, entity.id];

          // Check if we have enough selections to validate
          const totalSteps = scene.entities.filter(
            (e) => e.group === rule.sourceFilter || (!rule.sourceFilter && e.draggable),
          ).length;

          if (newState.sequenceIds.length >= totalSteps) {
            const result = rule.validate({ orderedIds: newState.sequenceIds });
            onResult(result);
            newState.sequenceIds = [];
          }
        }
        return newState;
      }

      default:
        break;
    }
  }

  return newState;
}

/** Process mouse down for drag interactions */
export function handleMouseDown(
  mx: number,
  my: number,
  scene: VisualScene,
  state: InteractionState,
): InteractionState {
  const entity = findEntityAt(mx, my, scene.entities);
  if (!entity) return state;

  // Check for drag interaction
  const hasDrag = scene.interactions.some((r) => r.type === 'drag');
  if (hasDrag && entity.draggable) {
    return {
      ...state,
      draggingId: entity.id,
      dragOffset: {
        dx: mx - entity.position.x,
        dy: my - entity.position.y,
      },
    };
  }

  // Check for connect interaction — start pending line
  const hasConnect = scene.interactions.some((r) => r.type === 'connect');
  if (hasConnect && state.selectedId) {
    return {
      ...state,
      pendingLine: {
        fromX: entity.position.x,
        fromY: entity.position.y,
        toX: mx,
        toY: my,
      },
    };
  }

  return state;
}

/** Process mouse move */
export function handleMouseMove(
  mx: number,
  my: number,
  scene: VisualScene,
  state: InteractionState,
): InteractionState {
  const entity = findEntityAt(mx, my, scene.entities);
  const newState = { ...state };

  newState.hoveredId = entity?.id ?? null;
  newState.cursor = entity
    ? isEntityClickable(entity)
      ? entity.draggable ? 'grab' : 'pointer'
      : 'not-allowed'
    : 'default';

  // Update pending connection line
  if (state.selectedId) {
    const sourceEntity = scene.entities.find((e) => e.id === state.selectedId);
    if (sourceEntity) {
      newState.pendingLine = {
        fromX: sourceEntity.position.x,
        fromY: sourceEntity.position.y,
        toX: mx,
        toY: my,
      };
    }
  }

  return newState;
}

/** Process mouse up for drag interactions */
export function handleMouseUp(
  mx: number,
  my: number,
  scene: VisualScene,
  state: InteractionState,
  onResult: InteractionCallback,
): InteractionState {
  if (!state.draggingId) return state;

  const target = findEntityAt(mx, my, scene.entities);

  // Find the drag rule and validate
  for (const rule of scene.interactions) {
    if (rule.type !== 'drag') continue;
    if (target && rule.targetFilter && target.group !== rule.targetFilter) continue;

    if (target && target.id !== state.draggingId) {
      const result = rule.validate({
        entityId: state.draggingId,
        targetSlot: target.id,
      });
      onResult(result);
    }
  }

  return {
    ...state,
    draggingId: null,
    dragOffset: { dx: 0, dy: 0 },
  };
}

/** Process text input for input interaction */
export function handleInput(
  entityId: string,
  value: string,
  scene: VisualScene,
  onResult: InteractionCallback,
): void {
  for (const rule of scene.interactions) {
    if (rule.type !== 'input') continue;
    const result = rule.validate({ entityId, value });
    onResult(result);
    return;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function findEntityAt(
  mx: number,
  my: number,
  entities: VisualEntity[],
): VisualEntity | null {
  // Reverse order so top-rendered entities get priority
  for (let i = entities.length - 1; i >= 0; i--) {
    if (hitTestEntity(entities[i], mx, my)) {
      return entities[i];
    }
  }
  return null;
}

/** Get all interaction types used in the scene */
export function getActiveInteractionTypes(scene: VisualScene): Set<string> {
  return new Set(scene.interactions.map((r: InteractionRule) => r.type));
}
