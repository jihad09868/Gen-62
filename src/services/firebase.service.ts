import { Injectable, inject } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential, User } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { OllamaService } from './ollama.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private ollamaService = inject(OllamaService);
  private app: any;
  private auth: any;
  private provider: any;

  constructor() {
    const firebaseConfig = {
      apiKey: "AIzaSyBhRWwiL1IA7RrbK_3wPDakT-e82MmMGqM",
      authDomain: "gen-62.firebaseapp.com",
      projectId: "gen-62",
      storageBucket: "gen-62.firebasestorage.app",
      messagingSenderId: "706386555132",
      appId: "1:706386555132:web:0115f82f2b19af933ca779",
      measurementId: "G-04HN83YW5D"
    };

    try {
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.provider = new GoogleAuthProvider();
      getAnalytics(this.app);
    } catch (e) {
      console.error('Firebase Init Error:', e);
    }
  }

  async signInWithGoogle(): Promise<User | null> {
    if (!this.auth) return null;
    try {
      const result: UserCredential = await signInWithPopup(this.auth, this.provider);
      return result.user;
    } catch (error) {
      console.error('Google Sign In Error', error);
      throw error;
    }
  }
}