import { doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from '../types';

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
};

export const createUserProfile = async (uid: string, name: string, email: string): Promise<UserProfile> => {
  const path = `users/${uid}`;
  const isOwner = email === "waseemsaiyed@gmail.com";
  
  const newProfile: UserProfile = {
    uid,
    name: name || "Anonymous Clinician",
    email,
    subscriptionStatus: isOwner ? 'active' : 'pending',
    role: isOwner ? 'admin' : 'clinician',
    requestedAt: new Date().toISOString(),
    approvedAt: isOwner ? new Date().toISOString() : undefined,
  };

  try {
    await setDoc(doc(db, 'users', uid), newProfile);
    return newProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
};

export const listenToUserProfile = (userId: string, callback: (profile: UserProfile | null) => void, onError?: (err: Error) => void) => {
  const path = `users/${userId}`;
  const docRef = doc(db, 'users', userId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      callback(null);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
    if (onError) onError(err);
  });
};

export const getPendingUsers = async (): Promise<UserProfile[]> => {
  const path = 'users';
  try {
    const q = collection(db, 'users');
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      users.push(docSnap.data() as UserProfile);
    });
    return users;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
};

export const listenToAllUsers = (callback: (users: UserProfile[]) => void) => {
  const path = 'users';
  const colRef = collection(db, 'users');
  return onSnapshot(colRef, (querySnapshot) => {
    const list: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as UserProfile);
    });
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
};

export const updateUserSubscriptionStatus = async (userId: string, status: 'active' | 'pending' | 'suspended') => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const updateData: Partial<UserProfile> = {
      subscriptionStatus: status,
    };
    if (status === 'active') {
      updateData.approvedAt = new Date().toISOString();
    }
    await updateDoc(docRef, updateData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'clinician') => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { role });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};
