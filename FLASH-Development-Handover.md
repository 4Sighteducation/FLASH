# FLASH App Development Handover Document

## Project Overview
**App Name:** FLASH - A React Native flashcard learning app  
**Tech Stack:** React Native, Expo SDK 53, TypeScript, Supabase, React Navigation, OpenAI API  
**GitHub Repo:** https://github.com/4Sighteducation/FLASH  
**Database:** Supabase with 22,770 curriculum topics imported from exam board specifications  
**Last Updated:** December 2024 - Added AI Card Generation

## Current Project State

### ✅ Completed Features

#### 1. **Environment Setup**
- Converted `app.json` to `app.config.js` for environment variable support
- Fixed env vars loading issue with dotenv and babel-plugin-inline-dotenv
- Supabase credentials properly configured
- Installed `expo-linear-gradient` for UI enhancements

#### 2. **Database Schema - FULLY PRODUCTION READY**
- Comprehensive schema with all necessary tables
- **Security:** Row Level Security (RLS) enabled on ALL tables with proper policies
- **Data Integrity:** Unique constraints, foreign keys with CASCADE deletes
- **Performance:** Indexes on all foreign keys and commonly queried fields
- **Automation:** Update triggers for `updated_at` timestamps

**Key Database Tables:**
- `users` - Extended auth.users with exam_type, is_onboarded
- `user_subjects` - Stores user's subject selections with exam boards
- `user_custom_topics` - User's customized topic lists
- `user_topics` - Links users to curriculum topics
- `flashcards` - Leitner box system (boxes 1-5)
- `study_sessions`, `card_reviews` - Track study progress
- `achievements`, `user_achievements` - Gamification
- `user_stats` - User statistics and streaks

**Curriculum Tables (Read-only):**
- `exam_boards` - AQA, Edexcel, OCR, etc.
- `exam_board_subjects` - Subjects per exam board
- `curriculum_topics` - 22,770 topics with 3-level hierarchy

#### 3. **Curriculum Import System - COMPLETED**
Successfully imported 22,770 curriculum topics from CSV data into the database:

**Import Results:**
- **A-Level:** 9,888 topics across 158 subjects
  - AQA: 2,897 topics (41 subjects)
  - CCEA: 47 topics (1 subject)
  - EDEXCEL: 1,904 topics (40 subjects)
  - OCR: 3,345 topics (46 subjects)
  - SQA: 449 topics (10 subjects)
  - WJEC: 1,246 topics (20 subjects)

- **GCSE:** 12,882 topics across 188 subjects
  - AQA: 2,294 topics (36 subjects)
  - CCEA: 4,216 topics (47 subjects)
  - EDEXCEL: 2,244 topics (39 subjects)
  - OCR: 1,880 topics (33 subjects)
  - SQA: 504 topics (10 subjects)
  - WJEC: 1,744 topics (23 subjects)

**Import Structure:**
- 3-level hierarchy: Modules → Topics → Sub Topics
- Each exam board has its own curriculum properly isolated
- Topics are linked to specific exam_board_subject combinations
- Handles different exam board terminology variations

**Key Import Scripts (in /supabase/):**
- `COMPLETE-RESET-AND-START-OVER.sql` - Clean start from CSV
- `COMPLETE-IMPORT-ALL-SUBJECTS.sql` - A-Level import
- `COMPLETE-IMPORT-GCSE.sql` - GCSE import
- `VERIFY-ENTIRE-SETUP.sql` - Verification queries
- `IMPORT-SUMMARY.md` - Complete documentation

**Important Notes:**
- The CSV had duplicate rows (same module repeated for each topic/subtopic)
- Used DISTINCT to avoid duplicates during import
- Each topic is properly linked via `exam_board_subject_id`
- The app correctly filters by exam board + qualification type + subject

#### 4. **Authentication System**
- AuthContext for state management
- Login/SignUp screens with styling
- Navigation structure (Stack + Bottom Tabs)
- Database trigger for automatic profile creation on signup
- Email confirmation disabled in Supabase settings

#### 5. **Onboarding Flow**
Complete onboarding system implemented:
- `WelcomeScreen` - App introduction
- `ExamTypeSelectionScreen` - Choose GCSE, A-Level, BTEC, IB, or iGCSE
- `SubjectSelectionScreen` - Select subjects with exam boards
- `TopicCurationScreen` - Customize topic lists per subject
- `OnboardingCompleteScreen` - Success confirmation

#### 6. **Topic List Curation**
- `TopicEditModal` - Full-featured topic editor:
  - Load curriculum topics from database
  - Add/edit/delete topics
  - Hierarchical structure with parent-child relationships
  - Soft delete for curriculum topics
- `ColorPickerModal` - Subject color selection
  - 10 predefined colors
  - Topics inherit lighter shades from parent subjects

#### 7. **Main App Updates**
- `HomeScreen` - Displays user's subjects with exam boards and colors
- `TopicListScreen` - Shows customized topics with expand/collapse
  - Added AI Generate button (sparkles icon) for each topic
  - Added manual create card button
- Navigation checks onboarding status and routes accordingly

#### 8. **AI Card Generation System - NEW**
Complete AI-powered flashcard generation system implemented:

**Features:**
- **4 Card Types Supported:**
  - Multiple Choice - 4 options with correct answer tracking
  - Short Answer - Key points and detailed explanations
  - Essay Style - Essay structure guidance and key arguments
  - Acronym - Memory aids with full explanations
  - "Create from Notes" - Marked as coming soon

- **AI Service (`aiService.ts`):**
  - OpenAI API integration with function calling
  - Exam board-specific prompts
  - Difficulty adjustment based on exam type (GCSE vs A-Level)
  - Batch generation support (1-20 cards)
  - Smart card processing with metadata

- **AI Generator Screen (`AIGeneratorScreen.tsx`):**
  - Beautiful card type selection UI with icons
  - Number of cards input
  - Optional additional guidance for AI
  - Live preview of generated cards
  - Save all functionality
  - Multi-step workflow (Select → Options → Preview)

- **API Settings Screen (`APISettingsScreen.tsx`):**
  - Secure OpenAI API key management
  - Per-user key storage in database
  - API key validation/testing
  - Eye icon to show/hide key
  - Security indicators

- **Database Updates:**
  - `app_settings` table for storing API keys with RLS
  - Updated `flashcards` table with AI-specific columns:
    - `card_type` - Enum for card types
    - `options` - JSONB for multiple choice options
    - `correct_answer` - For multiple choice
    - `key_points` - JSONB for short answer/essay
    - `detailed_answer` - Extended explanations
    - `subject_name` and `topic` - Metadata storage
  - `flashcards_with_details` view for comprehensive card data

- **Navigation Integration:**
  - Added AIGenerator to HomeStack
  - Added APISettings to ProfileStack
  - Sparkles button in TopicListScreen links to AI generator

**Usage Flow:**
1. User clicks sparkles icon on any topic
2. Selects card type (MC, Short Answer, Essay, Acronym)
3. Sets number of cards and optional guidance
4. AI generates cards with exam board-specific content
5. Preview all cards with detailed formatting
6. Save all cards to study later

### 📁 Key Files

```
/app.config.js                          - Expo config with env vars
/src/lib/supabase.ts                   - Supabase client (OLD - needs update)
/src/services/supabase.ts              - Supabase client (CURRENT)
/src/contexts/AuthContext.tsx          - Auth state management
/src/navigation/AppNavigator.tsx       - Main navigation with onboarding check
/src/navigation/MainNavigator.tsx      - Bottom tab navigation

/src/screens/auth/
  - LoginScreen.tsx
  - SignUpScreen.tsx

/src/screens/onboarding/
  - WelcomeScreen.tsx
  - ExamTypeSelectionScreen.tsx
  - SubjectSelectionScreen.tsx
  - TopicCurationScreen.tsx
  - OnboardingCompleteScreen.tsx

/src/screens/main/
  - HomeScreen.tsx                     - Updated with subjects display
  - StudyScreen.tsx
  - ProfileScreen.tsx

/src/screens/topics/
  - TopicSelectorScreen.tsx
  - TopicListScreen.tsx               - Updated: AI generate button added

/src/screens/cards/
  - CreateCardScreen.tsx              - Manual card creation
  - AIGeneratorScreen.tsx             - NEW: AI card generation interface

/src/screens/settings/
  - APISettingsScreen.tsx             - NEW: OpenAI API key management

/src/services/
  - supabase.ts                       - Supabase client
  - aiService.ts                      - NEW: OpenAI API integration

/src/components/
  - TopicEditModal.tsx                - Topic curation modal
  - ColorPickerModal.tsx              - Color selection modal

/src/types/index.ts                   - TypeScript interfaces

/supabase/
  - schema.sql                        - Original schema
  - add-user-metadata.sql            - Added user metadata fields
  - fix-users-rls.sql                - RLS fixes for user creation
  - Various improvement files         - Schema optimizations
  
  AI-Related Scripts (NEW):
  - create-api-settings-table.sql     - Store OpenAI API keys
  - update-flashcards-for-ai-corrected.sql - Add AI card columns
  
  Import Scripts (50 files total):
  - COMPLETE-RESET-AND-START-OVER.sql - Reset and recreate cleaned_topics
  - COMPLETE-IMPORT-ALL-SUBJECTS.sql  - Import all A-Level subjects
  - COMPLETE-IMPORT-GCSE.sql         - Import all GCSE subjects
  - VERIFY-ENTIRE-SETUP.sql          - Verify schema and data integrity
  - FRESH-START-VERIFIED.sql         - Clean start with test import
  - CONTINUE-TEST-IMPORT.sql         - Test import for AQA Mathematics
  - Various debug and fix scripts     - Troubleshooting utilities
```

### 🔧 Environment Variables
Required in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note:** OpenAI API key is stored per-user in the database via the API Settings screen, not in environment variables.

### 🚨 Known Issues
1. **TypeScript Linter Warnings** - Module resolution warnings for React Native packages (doesn't affect functionality)
2. **Duplicate supabase.ts files** - `/src/lib/supabase.ts` is old, use `/src/services/supabase.ts`
3. **Asset warning** - Missing icon.png (non-critical)
4. **AI Generation** - Requires user to configure OpenAI API key before use
5. **Topic ID** - AI cards can be created without a topic_id (general cards)

### 📱 Current User Flow
1. User signs up → Profile automatically created via trigger
2. First login → Redirected to onboarding flow
3. Select exam type → Select subjects/exam boards → Customize topics → Choose colors
4. Main app → See subjects on home screen → Click subject to see topics
5. Topics screen → Hierarchical view with expand/collapse → Two action buttons per topic:
   - Sparkles icon → AI card generation
   - Plus icon → Manual card creation
6. AI Generation flow:
   - First use → Prompted to set API key in Profile → API Settings
   - Select card type → Set options → Preview generated cards → Save all

### 🔮 Next Steps Recommendations
1. **Flashcard Creation** ✅ PARTIALLY COMPLETE
   - ✅ AI generation implemented with 4 card types
   - ✅ Manual create screen exists (needs completion)
   - ⏳ Need to complete manual card creation UI
   - ⏳ Add image/diagram support

2. **Study Mode** - PRIORITY
   - Implement Leitner box algorithm
   - Create card review interface with flip animation
   - Handle multiple choice vs text answers
   - Track study session progress
   - Update box numbers based on performance

3. **Progress Tracking**
   - Implement statistics dashboard
   - Add achievement unlocking
   - Create streak tracking
   - Show cards due for review

4. **UI Polish**
   - Add loading states throughout
   - Implement comprehensive error handling
   - Add success animations
   - Improve card flip animations

5. **AI Enhancements**
   - Add "Create from Notes" feature (OCR)
   - Implement batch operations
   - Add card quality rating
   - Allow regeneration of individual cards

### 💡 Important Notes
- Always prefix env vars with `EXPO_PUBLIC_` for client access
- The app uses Expo Go for development
- Database uses UUID for all IDs
- Curriculum topics use `curriculum_topics` table (not `topics`)
- User customizations stored separately from curriculum data
- OpenAI API keys are stored per-user in the database (not in env vars)
- AI-generated cards are marked with `is_ai_generated = true`

### 🗄️ Required SQL Scripts for AI Feature
If you haven't run these yet, execute in Supabase SQL editor:
1. `create-api-settings-table.sql` - Creates app_settings table for API keys
2. `update-flashcards-for-ai-corrected.sql` - Adds AI columns to flashcards table

### 🛠️ Development Commands
```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
```

### 📊 Database Query Examples
```sql
-- Get user's subjects
SELECT * FROM user_subjects WHERE user_id = auth.uid();

-- Get user's custom topics for a subject
SELECT * FROM user_custom_topics 
WHERE user_id = auth.uid() 
AND subject_id = 'subject_uuid'
AND is_deleted = false
ORDER BY sort_order;

-- Get curriculum topics for a subject
SELECT * FROM curriculum_topics
WHERE exam_board_subject_id = 'subject_uuid'
ORDER BY sort_order;

-- Get user's API key
SELECT setting_value FROM app_settings 
WHERE user_id = auth.uid() 
AND setting_key = 'openai_api_key';

-- Get AI-generated flashcards
SELECT * FROM flashcards 
WHERE user_id = auth.uid() 
AND is_ai_generated = true
AND card_type != 'manual';

-- Get flashcards with full details
SELECT * FROM flashcards_with_details
WHERE user_id = auth.uid();
```

### 🎯 Current State Summary
The app has a solid foundation with:
- ✅ Complete authentication system
- ✅ Full onboarding flow
- ✅ Topic curation system
- ✅ Production-ready database
- ✅ Secure RLS policies
- ✅ Beautiful UI with gradients
- ✅ AI card generation with 4 types
- ✅ Secure API key management
- ✅ Exam board-specific content generation

**Latest Achievement:** Full AI card generation system with OpenAI integration, supporting multiple choice, short answer, essay, and acronym card types. Cards are generated with exam board and qualification-specific content.

Ready for study mode implementation with Leitner box algorithm! 