import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBaE9hyVuW2l4L788lWsmO4zz3RMIBkXds',
  authDomain: 'packastock.firebaseapp.com',
  projectId: 'packastock',
  storageBucket: 'packastock.firebasestorage.app',
  messagingSenderId: '904557345729',
  appId: '1:904557345729:web:6877efb5f6f333b9190d40',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
