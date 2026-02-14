import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OllamaService } from '../../services/ollama.service';

@Component({
  selector: 'app-url-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full max-w-[340px] mx-auto perspective-1000 px-4">
      
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

      <!-- Main Card -->
      <div 
        class="bg-[#121212]/90 backdrop-blur-3xl rounded-[36px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] border border-white/5 flex flex-col items-center p-8 relative overflow-hidden transition-all"
        [class.animate-slow-enter]="!isExiting()"
        [class.animate-box-shrink]="isExiting()"
      >
        
        <!-- Subtle Glow Background -->
        <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent opacity-20 pointer-events-none"></div>

        <!-- Fullscreen Toggle (Hidden on exit) -->
        <button 
          (click)="toggleFullscreen()"
          class="absolute top-6 right-6 p-2.5 text-zinc-500 hover:text-white transition-all duration-300 rounded-full hover:bg-white/10 active:scale-90 outline-none z-20"
          [class.opacity-0]="isExiting()"
        >
          @if (!isFullscreen()) {
              <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          } @else {
              <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
          }
        </button>

        <!-- Logo Image -->
        <!-- When exiting, we scale it up slightly and move it down to center it in the shrunk box -->
        <div 
            class="mb-8 mt-2 relative z-10 pointer-events-none select-none transition-transform duration-1000 ease-[cubic-bezier(0.7,0,0.3,1)]"
            [class.translate-y-[70px]]="isExiting()"
            [class.scale-125]="isExiting()"
        >
          <div class="w-[84px] h-[84px] rounded-[26px] overflow-hidden border border-white/10 shadow-2xl bg-black relative flex items-center justify-center">
              <img 
                  [src]="currentLogoSrc()"
                  alt="Gen-62 Logo" 
                  class="w-full h-full object-cover mix-blend-luminosity scale-110 opacity-80 transition-opacity duration-75"
              />
          </div>
        </div>
        
        <!-- Form Content Wrapper - Fades out on exit -->
        <div class="w-full flex flex-col items-center transition-opacity duration-500" [class.opacity-0]="isExiting()">
            
            <!-- Typography Title -->
            <h2 class="text-[32px] font-wet text-white tracking-widest mb-10 relative z-10 select-none flex items-baseline justify-center">
            <span class="inline-block w-[70px] text-right mr-1">{{ genText() }}</span>
            -
            <span class="inline-block tabular-nums w-[54px] text-left">{{ counter() }}</span>
            </h2>
            
            <!-- Input -->
            <div class="w-full relative mb-5 group z-10">
            <input 
                type="text" 
                [(ngModel)]="urlInput"
                (keydown.enter)="handleConnect()"
                placeholder="Invitation link"
                class="w-full bg-[#1A1A1A] text-white text-[13px] placeholder-zinc-500 border border-transparent rounded-full px-6 py-[16px] focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-[#222] transition-all text-center shadow-inner group-hover:bg-[#222]"
                [disabled]="isLoading() || isVerified() || isExiting()"
            />
            </div>

            <!-- Connect Button -->
            <div class="w-full h-[52px] flex justify-center z-10 relative">
            <button 
                (click)="handleConnect()"
                [disabled]="!urlInput() || isLoading() || isVerified() || isExiting()"
                class="h-[52px] bg-white text-black font-semibold text-[14px] rounded-full hover:bg-[#F2F2F2] active:scale-[0.98] transition-all ease-in-out disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl overflow-hidden flex items-center justify-center relative"
                [class.duration-700]="isLoading()" 
                [class.duration-500]="!isLoading()"
                [class.w-full]="!isLoading()"
                [class.w-[52px]]="isLoading()"
            >
                <!-- Content Wrapper -->
                <div class="absolute inset-0 flex items-center justify-center">
                    
                    <!-- State 3: Verified Checkmark -->
                    @if (isVerified()) {
                    <div class="animate-enter-check">
                        <div class="w-6 h-6 rounded-full border-[2.5px] border-black flex items-center justify-center">
                            <svg stroke="currentColor" fill="none" stroke-width="3" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-black"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                    </div>
                    }

                    <!-- State 2: Loading Spinner -->
                    @if (isLoading() && !isVerified()) {
                    <svg class="animate-spin text-black w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    } 
                    
                    <!-- State 1: Normal Text + Arrow -->
                    @if (!isLoading() && !isVerified()) {
                    <div class="flex items-center gap-2">
                        <span class="transition-opacity duration-300" [class.opacity-0]="isArrowExiting()">Connect</span>
                        <div class="relative w-4 h-4 overflow-visible">
                            <svg 
                                stroke="currentColor" 
                                fill="none" 
                                stroke-width="2.5" 
                                viewBox="0 0 24 24" 
                                stroke-linecap="round" 
                                stroke-linejoin="round" 
                                class="absolute top-0 left-0 w-4 h-4 transition-transform duration-500 ease-in-out"
                                [class.translate-x-[24px]]="isArrowExiting()"
                                [class.opacity-0]="isArrowExiting()"
                            >
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </div>
                    </div>
                    }

                </div>
            </button>
            </div>
        </div>

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
      color: #ffffff; 
    }

    .animate-slow-enter {
      animation: enter 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    .animate-box-shrink {
      animation: boxShrink 1.0s cubic-bezier(0.7, 0, 0.3, 1) both;
    }

    @keyframes enter {
      0% { opacity: 0; transform: scale(0.92) translateY(30px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes boxShrink {
      0% { transform: scale(1); }
      100% { transform: scale(0.25); }
    }

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

    .animate-enter-check {
        animation: checkEnter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    }
    @keyframes checkEnter {
        0% { transform: scale(0) rotate(-45deg); opacity: 0; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
  `]
})
export class UrlConfigComponent implements OnInit, OnDestroy {
  public ollamaService = inject(OllamaService);
  
  // UI State Signals
  urlInput = signal('');
  isFullscreen = signal(false);
  
  // Button Animation States
  isArrowExiting = signal(false); 
  isLoading = signal(false);      
  isVerified = signal(false);     
  isExiting = signal(false);      

  // Toast State
  showToast = signal(false);
  isToastExiting = signal(false);
  toastMessage = signal('');
  
  // Intro State
  counter = signal(1);
  genText = signal(''); 
  
  // Logo Logic
  currentLogoSrc = signal('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqKHjp3pWE2RUSEF-L3NvqOmk5joQXh7tMQA&s');
  
  private introInterval: any;
  private readonly finalLogo = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqKHjp3pWE2RUSEF-L3NvqOmk5joQXh7tMQA&s';
  private readonly randomLogos = [
    'https://picsum.photos/id/20/200/200',
    'https://picsum.photos/id/26/200/200',
    'https://picsum.photos/id/36/200/200',
    'https://picsum.photos/id/48/200/200',
    'https://picsum.photos/id/54/200/200',
    'https://picsum.photos/id/60/200/200',
    'https://picsum.photos/id/96/200/200',
  ];

  constructor() {
     document.addEventListener('fullscreenchange', () => {
        this.isFullscreen.set(!!document.fullscreenElement);
     });
  }

  ngOnInit() {
    this.runIntroSync();
  }

  ngOnDestroy() {
    if (this.introInterval) clearInterval(this.introInterval);
  }

  runIntroSync() {
    const duration = 2000;
    const startTime = Date.now();
    
    const targetGen = ['G', 'e', 'n'];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    this.introInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1); 

      const currentCount = Math.floor(1 + (61 * progress));
      this.counter.set(currentCount);

      let scrambled = '';
      for (let i = 0; i < 3; i++) {
          const lockThreshold = (i + 1) * 0.33; 
          
          if (progress >= lockThreshold || progress === 1) {
              scrambled += targetGen[i];
          } else {
              scrambled += chars.charAt(Math.floor(Math.random() * chars.length));
          }
      }
      this.genText.set(scrambled);

      if (progress < 1) {
         if (this.randomLogos && this.randomLogos.length > 0) {
             const randomIndex = Math.floor(Math.random() * this.randomLogos.length);
             this.currentLogoSrc.set(this.randomLogos[randomIndex]);
         }
      } else {
         this.currentLogoSrc.set(this.finalLogo);
      }

      if (progress === 1) {
        clearInterval(this.introInterval);
        this.counter.set(62);
        this.genText.set('Gen');
        this.currentLogoSrc.set(this.finalLogo);
      }
    }, 40); 
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  }

  async handleConnect() {
    if (!this.urlInput()) return;
    
    this.hideErrorToast();

    this.isArrowExiting.set(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.isLoading.set(true);
    this.isArrowExiting.set(false); 
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const isValid = await this.ollamaService.checkConnection(this.urlInput());

    if (isValid) {
      this.isLoading.set(false); 
      this.isVerified.set(true); 
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      this.isExiting.set(true);
      
      setTimeout(() => {
           this.ollamaService.configureUrl(this.urlInput());
      }, 2000);

    } else {
      this.isLoading.set(false);
      this.isVerified.set(false);
      this.showErrorToast('Invalid Invitation Link. Access Denied.');
    }
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