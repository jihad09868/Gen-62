import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OllamaService } from '../../services/ollama.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full max-w-[340px] mx-auto perspective-1000 px-4 animate-slow-enter">
      
      <!-- Error Toast -->
      @if (showToast()) {
        <div 
          class="absolute -top-40 left-0 right-0 z-50 flex justify-center pointer-events-none"
          [class.animate-ios-pop]="!isToastExiting()"
          [class.animate-ios-pop-out]="isToastExiting()"
        >
           <div class="bg-[#191919]/90 backdrop-blur-md text-white pl-3 pr-4 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center gap-3 text-[13px] font-sans border border-white/10 pointer-events-auto">
             <div class="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
             </div>
             <span class="opacity-90 font-medium tracking-wide">{{ toastMessage() }}</span>
           </div>
        </div>
      }

      <!-- UID Popup Modal (Access Card) -->
      @if (isUidModalOpen()) {
         <div class="absolute inset-0 z-50 flex items-center justify-center animate-fade-in-fast">
             <!-- Backdrop -->
             <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="closeUidModal()"></div>
             
             <!-- Card -->
             <div class="relative w-[90%] bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col items-center animate-pop-up">
                 <div class="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-3">
                     <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                 </div>
                 <h3 class="text-white font-bold text-lg mb-1">Identity Verified</h3>
                 <p class="text-zinc-500 text-[12px] text-center mb-4 leading-relaxed">
                     Secure session established via Firebase.<br/>Copy your Unique ID below to enter.
                 </p>
                 
                 <!-- UID Display -->
                 <div class="w-full bg-[#151515] rounded-lg border border-white/5 p-3 flex flex-col gap-1 mb-4 relative group">
                     <span class="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">Session UID (Passkey)</span>
                     <div class="text-white font-mono text-[13px] break-all">{{ authorizedUid() }}</div>
                     
                     <!-- Copy Button -->
                     <button (click)="copyUid()" class="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors">
                        @if(uidCopied()) {
                            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-green-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        } @else {
                            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        }
                     </button>
                 </div>

                 <button (click)="closeUidModal()" class="w-full py-2.5 bg-white text-black font-bold text-[13px] rounded-lg hover:bg-gray-200 transition-colors">
                     Proceed to Login
                 </button>
             </div>
         </div>
      }

      <!-- Main Card -->
      <div 
        class="bg-[#121212]/90 backdrop-blur-3xl rounded-[36px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] border border-white/5 flex flex-col items-center p-8 relative overflow-hidden transition-all duration-500"
        [class.opacity-50]="isUidModalOpen()"
        [class.blur-sm]="isUidModalOpen()"
      >
        
        <!-- Subtle Glow -->
        <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-500/5 to-transparent opacity-20 pointer-events-none"></div>

        <!-- Fullscreen Toggle -->
        <button 
          (click)="toggleFullscreen()"
          class="absolute top-6 right-6 p-2.5 text-zinc-500 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 active:scale-90 outline-none z-20"
        >
          @if (!isFullscreen()) {
              <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          } @else {
              <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
          }
        </button>

        <!-- Logo -->
        <div class="mb-6 relative z-10 pointer-events-none select-none">
          <div class="w-[72px] h-[72px] rounded-[22px] overflow-hidden border border-white/10 shadow-2xl bg-black relative flex items-center justify-center">
              <img 
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqKHjp3pWE2RUSEF-L3NvqOmk5joQXh7tMQA&s"
                  alt="Gen-62 Logo" 
                  class="w-full h-full object-cover mix-blend-luminosity scale-110 opacity-80"
              />
          </div>
        </div>
        
        <h2 class="text-[28px] font-wet text-white tracking-widest mb-2 relative z-10 select-none">Welcome Back</h2>
        <p class="text-zinc-500 text-[11px] font-mono tracking-widest uppercase mb-8 relative z-10">NoT FoR EveryOnE</p>
        
        <!-- Input Group -->
        <div class="w-full flex flex-col gap-4 relative z-10">
            
            <!-- Email -->
            <div class="relative group">
                <input 
                    type="email" 
                    [(ngModel)]="email"
                    (input)="validateEmail()"
                    placeholder="Enter gmail..."
                    class="w-full bg-[#1A1A1A] text-white text-[13px] placeholder-zinc-500 border rounded-2xl px-5 py-[14px] focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-[#222] transition-all"
                    [class.border-red-500]="validationError()"
                    [class.border-transparent]="!validationError()"
                />
                @if(validationError()) {
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 text-[10px]">{{validationError()}}</div>
                }
            </div>

             <!-- Password (UID) -->
            <div class="relative group">
                <input 
                    type="password" 
                    [(ngModel)]="password"
                    placeholder="Paste Session UID"
                    class="w-full bg-[#1A1A1A] text-white text-[13px] placeholder-zinc-500 border border-transparent rounded-2xl px-5 py-[14px] focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-[#222] transition-all"
                />
            </div>
        </div>

        <!-- Submit Button (macOS style animation) -->
        <div class="w-full mt-6 relative z-10 flex justify-center h-[52px]">
            <button 
                (click)="handleLogin()"
                [disabled]="!isValid() || isLoading || isVerified"
                class="bg-white hover:bg-[#F2F2F2] text-black font-semibold text-[14px] rounded-full active:scale-[0.98] transition-all ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-lg overflow-hidden flex items-center justify-center relative"
                [class.duration-700]="isLoading" 
                [class.duration-500]="!isLoading"
                [class.w-full]="!isLoading"
                [class.w-[52px]]="isLoading"
            >
               <!-- Content Wrapper -->
               <div class="absolute inset-0 flex items-center justify-center">
                   
                   <!-- Verified State -->
                   @if (isVerified) {
                       <div class="animate-enter-check">
                           <div class="w-6 h-6 rounded-full border-[2.5px] border-black flex items-center justify-center">
                               <svg stroke="currentColor" fill="none" stroke-width="3" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-black"><polyline points="20 6 9 17 4 12"></polyline></svg>
                           </div>
                       </div>
                   }

                   <!-- Loading State -->
                   @if (isLoading && !isVerified) {
                        <svg class="animate-spin text-black w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                           <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                   }

                   <!-- Normal State -->
                   @if (!isLoading && !isVerified) {
                        <div class="flex items-center gap-2">
                             <span>Login</span>
                             <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </div>
                   }
               </div>
            </button>
        </div>

        <!-- Separator -->
        <div class="flex items-center gap-3 w-full my-6 relative z-10">
            <div class="h-px bg-white/10 flex-1"></div>
            <span class="text-[10px] text-zinc-600 font-mono">OR</span>
            <div class="h-px bg-white/10 flex-1"></div>
        </div>

        <!-- Google Sign In -->
        <button 
            (click)="handleGoogleLogin()"
            class="w-full h-[52px] bg-[#1a1a1a] hover:bg-[#252525] border border-white/5 text-white font-medium text-[13px] rounded-full active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-md relative z-10"
        >
             <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
             <span>Sign in with Google</span>
        </button>

      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Rubik+Wet+Paint&display=swap');

    :host {
      display: contents;
    }
    
    .font-wet {
      font-family: 'Rubik Wet Paint', system-ui, cursive;
    }

    .animate-slow-enter {
      animation: enter 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    .animate-fade-in-fast {
        animation: fadeIn 0.3s ease-out both;
    }

    .animate-pop-up {
        animation: popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    }
    
    .animate-enter-check {
        animation: checkEnter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    }

    @keyframes enter {
      0% { opacity: 0; transform: scale(0.92) translateY(30px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    
    @keyframes popUp {
        0% { opacity: 0; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1); }
    }
    
    @keyframes checkEnter {
        0% { transform: scale(0) rotate(-45deg); opacity: 0; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }

    /* Toast Animations */
    .animate-ios-pop {
      animation: iosPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    }
    @keyframes iosPop {
      0% { opacity: 0; transform: scale(0.8) translateY(-20px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-ios-pop-out {
      animation: iosPopOut 0.4s cubic-bezier(0.32, 0, 0.67, 0) both;
    }
    @keyframes iosPopOut {
      0% { opacity: 1; transform: scale(1) translateY(0); }
      100% { opacity: 0; transform: scale(0.8) translateY(-20px); }
    }
  `]
})
export class LoginComponent {
  ollamaService = inject(OllamaService);
  firebaseService = inject(FirebaseService);
  
  email = signal('');
  password = signal('');
  validationError = signal('');
  
  // Animation & Logic State
  isLoading = false;
  isVerified = false;
  isFullscreen = signal(false);
  
  // Auth Flow State
  authorizedEmail = signal<string | null>(null);
  authorizedUid = signal<string | null>(null);
  isUidModalOpen = signal(false);
  uidCopied = signal(false);

  // Toast
  showToast = signal(false);
  isToastExiting = signal(false);
  toastMessage = signal('');

  constructor() {
    document.addEventListener('fullscreenchange', () => {
        this.isFullscreen.set(!!document.fullscreenElement);
    });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  sanitizeInput(input: string): string {
    return input.replace(/[<>'"--;=]/g, '');
  }

  validateEmail() {
    const val = this.email();
    if (!val) {
        this.validationError.set('');
        return;
    }
    const regex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!regex.test(val)) {
        if (!val.includes('@')) this.validationError.set('Missing @');
        else if (!val.includes('gmail')) this.validationError.set('Must be gmail');
        else if (!val.endsWith('.com')) this.validationError.set('Must end .com');
        else this.validationError.set('Invalid format');
    } else {
        this.validationError.set('');
    }
  }

  isValid() {
    return this.email() && !this.validationError() && this.password();
  }

  async handleGoogleLogin() {
     try {
         const user = await this.firebaseService.signInWithGoogle();
         if (user) {
             this.authorizedEmail.set(user.email);
             this.authorizedUid.set(user.uid);
             // Pre-fill email for convenience, but they must type password/UID
             if (user.email) this.email.set(user.email); 
             this.isUidModalOpen.set(true);
         }
     } catch (e) {
         this.showErrorToast("Google Sign-In connection failed.");
     }
  }

  closeUidModal() {
      this.isUidModalOpen.set(false);
      this.uidCopied.set(false);
  }

  copyUid() {
      if (this.authorizedUid()) {
          navigator.clipboard.writeText(this.authorizedUid()!);
          this.uidCopied.set(true);
          setTimeout(() => this.uidCopied.set(false), 2000);
      }
  }

  handleLogin() {
    if (!this.isValid()) return;
    
    // Hide toast if existing
    this.hideErrorToast();

    // Start Loading Animation
    this.isLoading = true;
    
    setTimeout(() => {
        // STRICT CHECK:
        // 1. Must have signed in via Google (authorizedUid exists)
        // 2. Email must match authorized email
        // 3. Password must match authorized UID
        
        const isEmailMatch = this.email() === this.authorizedEmail();
        const isPassMatch = this.password().trim() === this.authorizedUid();

        if (this.authorizedUid() && isEmailMatch && isPassMatch) {
            // Success Animation
            this.isLoading = true; // Keep button small
            this.isVerified = true; // Show checkmark

            setTimeout(() => {
                const cleanName = this.sanitizeInput(this.email().split('@')[0]);
                this.ollamaService.loginUser(cleanName);
            }, 1000); 
        } else {
            // Fail
            this.isLoading = false;
            this.isVerified = false;
            
            if (!this.authorizedUid()) {
                this.showErrorToast("Session expired. Please Sign In with Google first.");
            } else {
                this.showErrorToast("Invalid Credentials. Check Email & UID Passkey.");
            }
        }
    }, 1500); 
  }

  showErrorToast(msg: string) {
    this.toastMessage.set(msg);
    this.showToast.set(true);
    this.isToastExiting.set(false);
    setTimeout(() => { this.hideErrorToast(); }, 4000);
  }

  hideErrorToast() {
    if (!this.showToast()) return;
    this.isToastExiting.set(true);
    setTimeout(() => {
        this.showToast.set(false);
        this.isToastExiting.set(false); 
    }, 400);
  }
}