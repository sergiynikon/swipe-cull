import { useCallback, useEffect, useReducer } from 'react';

import { clearStoredDecisions, loadDecisions, saveDecisions } from '../lib/storage';

export type Direction = 'left' | 'right';

type Decision = { assetId: string; direction: Direction };

type State = {
  pastDecidedIds: string[];
  sessionDecisions: Decision[];
  pendingDeleteIds: string[];
  loaded: boolean;
};

type Action =
  | { type: 'init'; pastDecidedIds: string[]; pendingDeleteIds: string[] }
  | { type: 'swipe'; assetId: string; direction: Direction }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'commitSessionToPast' };

const initialState: State = {
  pastDecidedIds: [],
  sessionDecisions: [],
  pendingDeleteIds: [],
  loaded: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'init':
      return {
        pastDecidedIds: action.pastDecidedIds,
        sessionDecisions: [],
        pendingDeleteIds: action.pendingDeleteIds,
        loaded: true,
      };
    case 'swipe': {
      const decision: Decision = { assetId: action.assetId, direction: action.direction };
      const pendingDeleteIds =
        action.direction === 'left'
          ? [...state.pendingDeleteIds, action.assetId]
          : state.pendingDeleteIds;
      return {
        ...state,
        sessionDecisions: [...state.sessionDecisions, decision],
        pendingDeleteIds,
      };
    }
    case 'undo': {
      if (state.sessionDecisions.length === 0) return state;
      const last = state.sessionDecisions[state.sessionDecisions.length - 1];
      const sessionDecisions = state.sessionDecisions.slice(0, -1);
      const pendingDeleteIds =
        last.direction === 'left'
          ? state.pendingDeleteIds.filter((id) => id !== last.assetId)
          : state.pendingDeleteIds;
      return { ...state, sessionDecisions, pendingDeleteIds };
    }
    case 'reset':
      return {
        pastDecidedIds: [],
        sessionDecisions: [],
        pendingDeleteIds: [],
        loaded: true,
      };
    case 'commitSessionToPast':
      return {
        pastDecidedIds: [
          ...state.pastDecidedIds,
          ...state.sessionDecisions.map((d) => d.assetId),
        ],
        sessionDecisions: [],
        pendingDeleteIds: [],
        loaded: true,
      };
  }
}

export function useDecisions() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    loadDecisions().then((stored) => {
      dispatch({
        type: 'init',
        pastDecidedIds: stored.decidedIds,
        pendingDeleteIds: stored.pendingDeleteIds,
      });
    });
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    const decidedIds = [
      ...state.pastDecidedIds,
      ...state.sessionDecisions.map((d) => d.assetId),
    ];
    saveDecisions({ decidedIds, pendingDeleteIds: state.pendingDeleteIds });
  }, [state.pastDecidedIds, state.sessionDecisions, state.pendingDeleteIds, state.loaded]);

  const swipe = useCallback((assetId: string, direction: Direction) => {
    dispatch({ type: 'swipe', assetId, direction });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);

  const commitSessionToPast = useCallback(
    () => dispatch({ type: 'commitSessionToPast' }),
    []
  );

  const reset = useCallback(async () => {
    await clearStoredDecisions();
    dispatch({ type: 'reset' });
  }, []);

  return {
    pastDecidedIds: state.pastDecidedIds,
    sessionDecisions: state.sessionDecisions,
    pendingDeleteIds: state.pendingDeleteIds,
    loaded: state.loaded,
    pastDecidedCount: state.pastDecidedIds.length,
    sessionProcessedCount: state.sessionDecisions.length,
    totalProcessedCount: state.pastDecidedIds.length + state.sessionDecisions.length,
    canUndo: state.sessionDecisions.length > 0,
    swipe,
    undo,
    reset,
    commitSessionToPast,
  };
}
