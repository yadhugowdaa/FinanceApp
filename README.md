# FinPace - Your Intelligent Financial Companion

FinPace, anoffline-first personal finance application with a focus on privacy, behavioral "pacing," and GenAI receipt parsing. 

---

## ⚠️ Important Installation Notes

### 1. Google Play Protect Bypass
Because this app is manually side-loaded via an APK and not downloaded from the Google Play Store, Android will flag it. 
**To install successfully:**
1. Open the **Google Play Store** app.
2. Tap your **Profile Picture** (top right).
3. Select **Play Protect** -> Tap the **Settings Gear** (top right).
4. Turn **OFF** "Scan apps with Play Protect".
5. Install the APK. *(You can turn Play Protect back on immediately after!).*

### 2. Backend Cold Start (Render Free Tier)
Our AI Microservice (which powers the Receipt Scanner) is hosted on the free tier of [Render.com](https://render.com). 
- **The Catch:** If the backend hasn't received a request in 15 minutes, it "goes to sleep".
- **Impact:** The very first time you scan a receipt after a long break, it may take **30 to 50 seconds** for the AI to respond while the server wakes up. Subsequent scans will be fast (~3-5 seconds).

---

## 🚀 Tech Stack & Core Decisions

### 1. Frontend Framework: React Native with TypeScript
Chose React Native for its rapid unified cross-platform development while maintaining native-like feel. TypeScript enforces strict schema typing across all database models and services, ensuring zero runtime crashes for null financial values.

### 2. State Management: Zustand (`useAppStore`)
We completely avoided Redux to prevent boilerplate bloat. Zustand provides a decentralized, lightning-fast store instance perfect for holding global session values (like Authentication state, active user profile, and globally selected bank accounts) without triggering massive DOM re-renders.

### 3. Data Persistence (Crucial): WatermelonDB
Financial data requires strict privacy. Instead of depending on Firebase or Supabase (where user data sits on external servers), we implemented an **Offline-First SQLite architecture via WatermelonDB**. 
- **Trade-off:** No out-of-the-box cross-device syncing, BUT it guarantees 100% privacy and zero-latency UI interaction. 
- **Why WatermelonDB?** It uses lazy-loading Observables. Even if the user has 10,000 transactions, the UI stays pinned at 60 FPS because it only loads the data actively shown on the screen.

### 4. UI / Animations: Reanimated & Liquid Glass
We avoided massive UI kits like NativeBase or UI Kitten. Instead, we built a bespoke **Apple Liquid Glass** design system using `react-native-linear-gradient` and `@react-native-community/blur`, powered by `react-native-reanimated` for frictionless 60fps micro-animations (like The Domino Effect slider).

### 5. Backend: Stateless Express Microservice
Instead of adding a massive python AI environment to the app, we built a lightweight Node.js/Express backend. 
- **Stateless:** It has absolutely no database. It accepts an image upload, proxies a secure call to the **Nvidia Llama 3.2 90B Vision API**, formats the result into JSON, and destroys the image. All actual transaction-saving happens safely on the mobile device.

---

## 📂 Project Architecture

We follow a strict **Feature-Based Modular Architecture**. Business logic is entirely decoupled from the UI.

```text
FinanceApp/
├── App.tsx                 # Root bootstrap (Splash Screen delays, Engine Triggers)
├── backend/                # The complete stateless Express server
│   ├── server.ts           # Nvidia integration logic
│   └── package.json
├── src/
│   ├── assets/             # Branding (FinPace Logo, Fonts)
│   ├── database/           # All WatermelonDB infrastructure
│   │   ├── index.ts        # Database instantiation
│   │   ├── schema.ts       # Local SQLite table structures
│   │   └── models/         # ORM Classes (Transaction, Loan, Account, etc.)
│   ├── features/           # Grouped by business domain (Screens + Data hooks)
│   │   ├── auth/           # Login & Onboarding flows
│   │   ├── dashboard/      # Core Ledger, Pacing Visualizations
│   │   ├── insights/       # The Domino Effect Simulator
│   │   ├── loans/          # EMI Amortization UI & Modals
│   │   └── transactions/   # Add Transaction sheets, Receipt Uploaders
│   ├── services/           # Heavy Business Logic (Zero UI)
│   │   ├── MLKitService.ts # API fetchers for Render Backend
│   │   ├── PacingEngine.ts # Calculates "Safe to Spend" daily limits
│   │   └── RecurringService# Boot sequence trigger that checks Auto-Pay dates
│   ├── ui/                 # Reusable Design System (Dumb Components)
│   │   ├── Button.tsx      # Standardized brand gradient interactive buttons
│   │   ├── LiquidGlass.tsx # Wrapper component pushing the dark-glass aesthetic
│   │   └── EmptyState.tsx  # Standalone graphics for empty lists
│   └── utils/
│       └── CategoryImages  # Mapping logic for Doodles vs Categories
```

---

## 💾 Core Database Model

1. **`users`**: Singleton profile tracking Onboarding status and global base currency.
2. **`accounts`**: "Wallets" mapped with custom colors. Ensures money is categorized by source (e.g. HDFC Bank, Cash).
3. **`categories`**: Spending buckets.
4. **`transactions`**: The master ledger. Connects a Category to an Account.
5. **`recurring_transactions`**: Rule-sets (e.g. "Every 15th of month, deduct 500"). Evaluated instantly when the user opens the app via `RecurringService`.
6. **`loans` & `loan_payments`**: Custom subsystem handling complex Principal vs EMI interest tracking inside the isolated debt sector.

---

## 🔧 Developer Quick Start

**1. Running the Mobile App:**
```bash
npm install
# For Android:
npx react-native run-android
# For iOS:
cd ios && pod install && cd ..
npx react-native run-ios
```

**2. Running the Local Backend (Optional):**
If you want to run the AI features locally rather than hitting the live Render app:
```bash
cd backend
npm install
# Ensure you have your private key!
echo "NVIDIA_API_KEY=your_key_here" > .env
npx tsx server.ts
```
*(You will need to update the `BACKEND_URL` in `src/services/MLKitService.ts` back to `localhost:3000` to test locally)*
