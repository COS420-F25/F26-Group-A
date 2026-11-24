import { moveStudent, nextGroup } from "@groups/groupRounds";

export const initialState = { round: null, history: [] };

const HISTORY_LIMIT = 50;

function withChange(state, round) {
  return {
    round,
    history: [...state.history, state.round].slice(-HISTORY_LIMIT),
  };
}

export function roundReducer(state, action) {
  const round = state.round;

  switch (action.type) {
    case "load":
      return { round: action.round, history: [] };

    case "rematch":
      return withChange(state, {
        ...round,
        groups: action.groups,
        unplaced: mergeAsked(action.unplaced, round?.unplaced ?? []),
        lastChange: "Ran matching again",
      });

    case "move": {
      const target = round.groups.find((g) => g.id === action.toGroupId);
      if (!target) return state;
      return withChange(state, {
        ...round,
        groups: moveStudent(round.groups, action.uid, action.toGroupId),
        unplaced: round.unplaced.filter((u) => u.uid !== action.uid),
        lastChange: `Moved ${action.name} to ${target.name}`,
      });
    }

    case "remove":
      return withChange(state, {
        ...round,
        groups: moveStudent(round.groups, action.uid, null),
        unplaced: round.unplaced.filter((u) => u.uid !== action.uid),
        removed: [...new Set([...(round.removed ?? []), action.uid])],
        lastChange: `Removed ${action.name} from this round`,
      });

    case "addGroup": {
      const group = nextGroup(round.groups);
      return withChange(state, {
        ...round,
        groups: [...round.groups, group],
        lastChange: `Added ${group.name}`,
      });
    }

    case "toggleReviewed": {
      const group = round.groups.find((g) => g.id === action.groupId);
      if (!group) return state;
      return withChange(state, {
        ...round,
        groups: round.groups.map((g) =>
          g.id === action.groupId ? { ...g, reviewed: !g.reviewed } : g,
        ),
        lastChange: `${group.reviewed ? "Unmarked" : "Marked"} ${group.name} as reviewed`,
      });
    }

    case "askedForHours":
      return {
        ...state,
        round: {
          ...round,
          unplaced: round.unplaced.map((u) =>
            u.uid === action.uid ? { ...u, askedAt: action.askedAt } : u,
          ),
        },
      };

    case "undo": {
      if (state.history.length === 0) return state;
      return {
        round: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
      };
    }

    case "published":
      return {
        round: {
          ...round,
          status: "published",
          lastChange: "Published groups",
        },
        history: [],
      };

    default:
      return state;
  }
}

function mergeAsked(unplaced, before) {
  return unplaced.map((u) => {
    const old = before.find((b) => b.uid === u.uid);
    return old?.askedAt ? { ...u, askedAt: old.askedAt } : u;
  });
}
