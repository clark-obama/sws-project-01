import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: '실제-API-KEY',
  authDomain: '실제-authDomain',
  projectId: '실제-projectId',
  storageBucket: '실제-storageBucket',
  messagingSenderId: '실제-messagingSenderId',
  appId: '실제-appId',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);