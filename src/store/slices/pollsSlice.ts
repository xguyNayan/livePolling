import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import firebaseService from '../../services/firebaseService';
import socketService from '../../services/socketService';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  timer: number;
  isActive: boolean;
  createdAt: string;
  correctOptionId?: string | null;
}

interface PollsState {
  polls: Poll[];
  currentPoll: Poll | null;
  activePolls: Poll[];
  selectedOption: string | null;
  showResults: boolean;
  studentName: string;
  timeRemaining: number;
  loading: boolean;
  error: string | null;
  showNewPollForm?: boolean;
}

// Async thunks for Firebase operations
export const fetchPolls = createAsyncThunk(
  'polls/fetchPolls',
  async () => {
    return await firebaseService.getPolls();
  }
);

export const fetchActivePoll = createAsyncThunk(
  'polls/fetchActivePoll',
  async (_, { getState }) => {
    // Get current state to check if we already have poll data
    const state = getState() as { polls: PollsState };
    const currentPoll = state.polls.currentPoll;
    
    // If we already have poll data and it's a silent refresh, don't set loading state
    const response = await firebaseService.getActivePoll();
    return { data: response, silentRefresh: !!currentPoll };
  }
);

export const fetchActivePolls = createAsyncThunk(
  'polls/fetchActivePolls',
  async () => {
    return await firebaseService.getActivePolls();
  }
);

export const createPollAsync = createAsyncThunk(
  'polls/createPoll',
  async (pollData: Omit<Poll, 'id'>) => {
    return await firebaseService.createPoll(pollData);
  }
);

export const submitAnswerAsync = createAsyncThunk(
  'polls/submitAnswer',
  async ({ pollId, optionId }: { pollId: string; optionId: string }, { rejectWithValue }) => {
    try {
      return await firebaseService.submitAnswer(pollId, optionId);
    } catch (error) {
     
      return rejectWithValue((error as Error).message);
    }
  }
);

export const endPollAsync = createAsyncThunk(
  'polls/endPoll',
  async (pollId: string, { rejectWithValue }) => {
    try {
      // Emit socket event to immediately end poll on all clients
      socketService.getSocket()?.emit('end_poll', pollId);
      
      // Update the poll in Firebase
      return await firebaseService.endPoll(pollId);
    } catch (error) {
      
      return rejectWithValue((error as Error).message);
    }
  }
);

const initialState: PollsState = {
  polls: [],
  currentPoll: null,
  activePolls: [],
  selectedOption: null,
  showResults: false,
  studentName: '',
  timeRemaining: 30,
  loading: false,
  error: null,
  showNewPollForm: false
};

const pollsSlice = createSlice({
  name: 'polls',
  initialState,
  reducers: {
    createPoll: (state, action: PayloadAction<Poll>) => {
      state.polls.push(action.payload);
      state.currentPoll = action.payload;
      state.selectedOption = null;
      state.showResults = false;
    },
    selectOption: (state, action: PayloadAction<string>) => {
      state.selectedOption = action.payload;
    },
    submitAnswer: (state) => {
      if (state.currentPoll && state.selectedOption) {
        const option = state.currentPoll.options.find(o => o.id === state.selectedOption);
        if (option) {
          option.votes += 1;
        }
        state.showResults = true;
      }
    },
    setStudentName: (state, action: PayloadAction<string>) => {
      state.studentName = action.payload;
    },
    resetPoll: (state) => {
      state.currentPoll = null;
      state.selectedOption = null;
      state.showResults = false;
    },
    resetState: (state) => {
      state.currentPoll = null;
      state.selectedOption = null;
      state.timeRemaining = 0;
      state.showResults = false;
    },
    prepareNewPoll: (state) => {
      // This action allows creating a new poll without resetting the current one
      // We'll use this to keep showing poll results while creating a new poll
      // The UI will use this flag to determine whether to show the poll creation form
      state.showNewPollForm = true;
    },
    updatePollResults: (state, action: PayloadAction<{pollId: string, options: PollOption[]}>) => {
      // Update poll results in real-time when a student submits an answer
      const { pollId, options } = action.payload;
      
      // Skip setting loading state for real-time updates
      state.loading = false;
      
      // Update the current poll if it matches the pollId
      if (state.currentPoll && state.currentPoll.id === pollId) {
        state.currentPoll.options = options;
      }
      
      // Also update the poll in the polls array
      const pollIndex = state.polls.findIndex(poll => poll.id === pollId);
      if (pollIndex !== -1) {
        state.polls[pollIndex].options = options;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchPolls
      .addCase(fetchPolls.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPolls.fulfilled, (state, action) => {
        state.loading = false;
        state.polls = action.payload;
      })
      .addCase(fetchPolls.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch polls';
      })
      
      // Handle fetchActivePoll with silent refresh support
      .addCase(fetchActivePoll.pending, (state, action) => {
        // Only set loading if it's not a silent refresh
        const meta = action.meta as any;
        if (!meta.arg?.silentRefresh) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchActivePoll.fulfilled, (state, action) => {
        // Always turn off loading
        state.loading = false;
        
        // Extract data from payload
        const { data, silentRefresh } = action.payload;
        
        if (data) {
          // Update poll data without any visual indicators if it's a silent refresh
          state.currentPoll = data;
          state.timeRemaining = data.timer;
        }
      })
      .addCase(fetchActivePoll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch active poll';
      })
      
      // Handle fetchActivePolls
      .addCase(fetchActivePolls.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivePolls.fulfilled, (state, action) => {
        state.loading = false;
        state.activePolls = action.payload;
        // If there's at least one active poll and no current poll, set the first one as current
        if (action.payload.length > 0 && !state.currentPoll) {
          state.currentPoll = action.payload[0];
          state.timeRemaining = action.payload[0].timer;
        }
      })
      .addCase(fetchActivePolls.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch active polls';
      })
      
      // Handle createPollAsync
      .addCase(createPollAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPollAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.polls.unshift(action.payload);
        state.currentPoll = action.payload;
        state.selectedOption = null;
        state.showResults = false;
        state.timeRemaining = action.payload.timer;
        state.showNewPollForm = false; // Reset the flag after creating a new poll
      })
      .addCase(createPollAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create poll';
      })
      
      // Handle submitAnswerAsync
      .addCase(submitAnswerAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitAnswerAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentPoll && action.payload.options) {
          state.currentPoll.options = action.payload.options;
          state.showResults = true;
        }
      })
      .addCase(submitAnswerAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to submit answer';
      })
      
      // Handle endPollAsync
      .addCase(endPollAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(endPollAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentPoll && state.currentPoll.id === action.payload) {
          state.currentPoll.isActive = false;
        }
        // Find the poll in the polls array and update it
        const pollIndex = state.polls.findIndex(poll => poll.id === action.payload);
        if (pollIndex !== -1) {
          state.polls[pollIndex].isActive = false;
        }
      })
      .addCase(endPollAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to end poll';
      });
  },
});

export const { createPoll, selectOption, submitAnswer, setStudentName, resetPoll, prepareNewPoll, updatePollResults } = pollsSlice.actions;

export default pollsSlice.reducer;
