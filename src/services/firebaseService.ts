import { initializeApp } from "firebase/app";
// Analytics is imported but not used in this file
// import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  setDoc,
  limit
} from "firebase/firestore";
import type { Poll } from "../store/slices/pollsSlice";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_apiKey,
  authDomain: import.meta.env.VITE_authDomain,
  projectId: import.meta.env.VITE_projectId,
  storageBucket: import.meta.env.VITE_storageBucket,
  messagingSenderId: import.meta.env.VITE_messagingSenderId,
  appId: import.meta.env.VITE_appId,
  measurementId: import.meta.env.VITE_measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Analytics is not used in this file
// const analytics = getAnalytics(app);
const db = getFirestore(app);

// Collection references
const pollsCollection = collection(db, "polls");

// Helper function to convert Firestore timestamps to strings
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  
  if (typeof data === 'object') {
    const result: any = {};
    Object.keys(data).forEach(key => {
      result[key] = convertTimestamps(data[key]);
    });
    return result;
  }
  
  return data;
};

// Firebase service for polls
const firebaseService = {
  // Create a new poll
  createPoll: async (pollData: Omit<Poll, "id"> & { id?: string }) => {
    try {
      // If an ID is provided, use it instead of letting Firestore generate one
      if (pollData.id) {
        const pollId = pollData.id;
        const docRef = doc(db, "polls", pollId);
        const { id, ...dataWithoutId } = pollData;
        
        // Use set instead of addDoc to create with specific ID
        await setDoc(docRef, {
          ...dataWithoutId,
          createdAt: serverTimestamp()
        });
        
        return { id: pollId, ...dataWithoutId };
      } else {
        // Let Firestore generate an ID
        const docRef = await addDoc(pollsCollection, {
          ...pollData,
          createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...pollData };
      }
    } catch (error) {
      console.error("Error creating poll:", error);
      throw error;
    }
  },

  // Get all polls
  getPolls: async () => {
    try {
      const q = query(pollsCollection, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...convertTimestamps(data)
        };
      }) as Poll[];
    } catch (error) {
      console.error("Error getting polls:", error);
      throw error;
    }
  },

  // Get a specific poll
  getPoll: async (pollId: string) => {
    try {
      const docRef = doc(db, "polls", pollId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return { id: docSnap.id, ...convertTimestamps(data) } as Poll;
      } else {
        throw new Error("Poll not found");
      }
    } catch (error) {
      console.error("Error getting poll:", error);
      throw error;
    }
  },

  // Update a poll
  updatePoll: async (pollId: string, pollData: Partial<Poll>) => {
    try {
      const docRef = doc(db, "polls", pollId);
      await updateDoc(docRef, pollData);
      return { id: pollId, ...pollData };
    } catch (error) {
      console.error("Error updating poll:", error);
      throw error;
    }
  },

  // Delete a poll
  deletePoll: async (pollId: string) => {
    try {
      const docRef = doc(db, "polls", pollId);
      await deleteDoc(docRef);
      return pollId;
    } catch (error) {
      console.error("Error deleting poll:", error);
      throw error;
    }
  },

  // Submit an answer to a poll
  submitAnswer: async (pollId: string, optionId: string) => {
    try {
      // Get the current poll
      const pollRef = doc(db, "polls", pollId);
      const pollSnap = await getDoc(pollRef);
      
      if (pollSnap.exists()) {
        const pollData = convertTimestamps(pollSnap.data()) as Poll;
        
        // Update the votes for the selected option
        const updatedOptions = pollData.options.map(option => 
          option.id === optionId 
            ? { ...option, votes: option.votes + 1 } 
            : option
        );
        
        // Update the poll with new vote counts
        await updateDoc(pollRef, { options: updatedOptions });
        
        return { 
          id: pollId, 
          options: updatedOptions 
        };
      } else {
        throw new Error("Poll not found");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      throw error;
    }
  },

  // Get active polls (multiple)
  getActivePolls: async () => {
    try {
      const q = query(pollsCollection, where("isActive", "==", true), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, ...convertTimestamps(data) } as Poll;
        });
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error getting active polls:", error);
      throw error;
    }
  },
  
  // Get active poll (for backward compatibility)
  getActivePoll: async () => {
    try {
      const q = query(pollsCollection, where("isActive", "==", true), orderBy("createdAt", "desc"), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return { id: doc.id, ...convertTimestamps(data) } as Poll;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error getting active poll:", error);
      throw error;
    }
  },

  // End a poll (set isActive to false)
  endPoll: async (pollId: string) => {
    try {
      const docRef = doc(db, "polls", pollId);
      await updateDoc(docRef, { isActive: false });
      return pollId;
    } catch (error) {
      console.error("Error ending poll:", error);
      throw error;
    }
  }
};

export default firebaseService;
