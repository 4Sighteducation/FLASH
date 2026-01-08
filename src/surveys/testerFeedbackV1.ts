export type SurveyQuestionType = 'rating_1_7' | 'text' | 'single_choice' | 'multi_choice' | 'boolean';

export type SurveyQuestion = {
  id: string;
  type: SurveyQuestionType;
  prompt: string;
  description?: string;
  required?: boolean;
  options?: string[];
};

export type SurveySection = {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
};

export type SurveyDefinition = {
  key: string;
  title: string;
  intro?: string;
  sections: SurveySection[];
};

export const testerFeedbackV1: SurveyDefinition = {
  key: 'tester_feedback_v1',
  title: 'FLASH Tester Feedback',
  intro:
    'Thanks for helping test FLASH. Please answer as many questions as you can. If something breaks, include steps to reproduce.',
  sections: [
    {
      id: 'context',
      title: 'Tester context',
      questions: [
        { id: 'platform', type: 'single_choice', prompt: 'Platform', required: true, options: ['iOS', 'Android', 'Web'] },
        { id: 'device_model', type: 'text', prompt: 'Device model (e.g., iPhone 15, Pixel 8, Windows laptop)', required: false },
        { id: 'os_version', type: 'text', prompt: 'OS version', required: false },
        { id: 'app_build', type: 'text', prompt: 'App version/build (if known)', required: false },
        {
          id: 'plan',
          type: 'single_choice',
          prompt: 'Current plan',
          required: false,
          options: ['Free', 'Premium', 'Pro', 'Not sure'],
        },
        {
          id: 'goals',
          type: 'multi_choice',
          prompt: 'What are you trying to do in FLASH today?',
          required: false,
          options: [
            'Create flashcards with AI',
            'Create flashcards manually',
            'Create flashcards From Image (OCR)',
            'Study (Leitner boxes / spaced repetition)',
            'Use Study Bank',
            'Use Past Papers (Pro)',
            'Test paywall / purchases / restore',
            'Other',
          ],
        },
        {
          id: 'consent',
          type: 'boolean',
          prompt: 'I agree my feedback may be stored and used to improve the product.',
          required: true,
        },
        { id: 'follow_up_ok', type: 'boolean', prompt: 'Can we follow up with you if needed?', required: false },
        { id: 'follow_up_email', type: 'text', prompt: 'Email for follow-up (optional)', required: false },
      ],
    },
    {
      id: 'overall',
      title: 'Overall',
      questions: [
        { id: 'overall_understood', type: 'rating_1_7', prompt: 'I immediately understood what FLASH is for.', required: true },
        { id: 'overall_polished', type: 'rating_1_7', prompt: 'The app feels polished and trustworthy.', required: true },
        { id: 'overall_navigation', type: 'rating_1_7', prompt: 'Navigation is clear (Home / Study / Papers / Profile).', required: true },
        { id: 'overall_fast', type: 'rating_1_7', prompt: 'The app feels fast and responsive.', required: true },
        { id: 'overall_loved', type: 'text', prompt: 'One thing you loved', required: false },
        { id: 'overall_change_first', type: 'text', prompt: 'One thing you would change first', required: false },
      ],
    },
    {
      id: 'auth',
      title: 'Login / Sign Up / Password reset',
      questions: [
        { id: 'auth_signup_easy', type: 'rating_1_7', prompt: 'Sign up was straightforward.', required: false },
        { id: 'auth_terms_clear', type: 'rating_1_7', prompt: 'Terms & Privacy agreement step was clear.', required: false },
        { id: 'auth_login_errors', type: 'rating_1_7', prompt: 'Login errors were clear and helpful.', required: false },
        { id: 'auth_forgot_password', type: 'rating_1_7', prompt: 'Forgot password flow worked as expected.', required: false },
        { id: 'auth_social_login', type: 'rating_1_7', prompt: 'Social login (Google/Microsoft/Apple) worked smoothly (if tried).', required: false },
        { id: 'auth_issues', type: 'text', prompt: 'If you hit any auth issue, describe what happened + steps + severity', required: false },
      ],
    },
    {
      id: 'onboarding',
      title: 'Onboarding',
      questions: [
        { id: 'onboarding_clear', type: 'rating_1_7', prompt: 'Onboarding flow was clear (Welcome → exam type → subjects).', required: false },
        { id: 'onboarding_subject_search', type: 'rating_1_7', prompt: 'SubjectSearch made it easy to find/select subjects.', required: false },
        {
          id: 'onboarding_matches_reality',
          type: 'rating_1_7',
          prompt: '“Search a topic → AI generates cards → you study with spaced repetition” matched reality.',
          required: false,
        },
        { id: 'onboarding_confusing', type: 'text', prompt: 'Where did you hesitate or feel unsure?', required: false },
      ],
    },
    {
      id: 'home',
      title: 'Home tab',
      questions: [
        { id: 'home_next_steps', type: 'rating_1_7', prompt: 'Home helped me understand what to do today.', required: false },
        { id: 'home_cards_due', type: 'rating_1_7', prompt: 'Cards Due reminders/notifications were helpful (not annoying).', required: false },
        { id: 'home_progress', type: 'rating_1_7', prompt: 'Subject progress info was easy to interpret.', required: false },
        { id: 'home_gamification', type: 'rating_1_7', prompt: 'XP/points/streak felt motivating (not distracting).', required: false },
      ],
    },
    {
      id: 'topics_tree',
      title: 'Topic tree & discovery',
      questions: [
        { id: 'tree_understand', type: 'rating_1_7', prompt: 'The topic hierarchy/tree was easy to understand.', required: false },
        { id: 'tree_reveal_context', type: 'rating_1_7', prompt: 'I understood what “Reveal Context” does.', required: false },
        { id: 'tree_add_to_tree', type: 'rating_1_7', prompt: 'I understood what “Add to Tree” does.', required: false },
        { id: 'tree_overview_cards', type: 'rating_1_7', prompt: 'I understood what “Create Overview Cards” are for.', required: false },
        { id: 'tree_manage_prioritize', type: 'rating_1_7', prompt: '“Manage & Prioritize” was useful and clear.', required: false },
        { id: 'tree_confusing', type: 'text', prompt: 'What was confusing about the tree/discovery flow?', required: false },
      ],
    },
    {
      id: 'smart_topic_discovery',
      title: 'Smart Topic Discovery',
      questions: [
        { id: 'std_helpful', type: 'rating_1_7', prompt: 'Smart Topic Discovery helped me find the right topic quickly.', required: false },
        { id: 'std_results', type: 'rating_1_7', prompt: 'Search results matched my intent.', required: false },
        { id: 'std_suggestions', type: 'rating_1_7', prompt: 'Smart suggestions were relevant.', required: false },
        { id: 'std_queries', type: 'text', prompt: 'What search queries did you try?', required: false },
        { id: 'std_best_worst', type: 'text', prompt: 'Best result / worst result examples', required: false },
      ],
    },
    {
      id: 'create_cards',
      title: 'Create Flashcards (AI / manual / From Image)',
      questions: [
        {
          id: 'create_choice_clear',
          type: 'rating_1_7',
          prompt: '“Create Flashcards” options were clear (AI Generated / Create Manually / From Image).',
          required: false,
        },
        { id: 'create_ai_types', type: 'rating_1_7', prompt: 'AI card types were clear (MCQ / Short Answer / Essay / Acronym).', required: false },
        { id: 'create_ai_quality', type: 'text', prompt: 'AI quality: what was great / what was wrong? (examples)', required: false },
        { id: 'create_ai_failures', type: 'text', prompt: 'If AI failed or partially succeeded, what happened?', required: false },
        { id: 'create_image_ocr', type: 'rating_1_7', prompt: 'From Image (OCR) worked well (if tried).', required: false },
      ],
    },
    {
      id: 'study',
      title: 'Study (Study tab / StudyModal / Leitner / Study Bank)',
      questions: [
        { id: 'study_bank_understand', type: 'rating_1_7', prompt: 'I understand Card Bank vs Study Bank.', required: false },
        { id: 'study_leitner_fair', type: 'rating_1_7', prompt: 'Leitner boxes + Cards Due feel fair and motivating.', required: false },
        { id: 'study_smooth', type: 'rating_1_7', prompt: 'Study sessions were smooth (no lag/freezes).', required: false },
        { id: 'study_intuitive', type: 'rating_1_7', prompt: 'Answering cards felt intuitive.', required: false },
        { id: 'study_confusing', type: 'text', prompt: 'Most confusing part of study (and why)', required: false },
      ],
    },
    {
      id: 'papers',
      title: 'Past Papers (Pro)',
      questions: [
        { id: 'papers_clarity', type: 'rating_1_7', prompt: 'It was clear that Past Papers is a Pro feature.', required: false },
        { id: 'papers_upgrade_prompt', type: 'rating_1_7', prompt: 'The upgrade prompt was clear and fair.', required: false },
        { id: 'papers_value', type: 'text', prompt: 'What would make Past Papers feel worth Pro immediately?', required: false },
      ],
    },
    {
      id: 'profile_settings_paywall',
      title: 'Profile / Settings / Paywall',
      questions: [
        {
          id: 'profile_subscription_clear',
          type: 'rating_1_7',
          prompt: 'Subscription area was clear (View plans / Restore Purchases / Redeem code / Invite parent/guardian).',
          required: false,
        },
        { id: 'profile_notifications_clear', type: 'rating_1_7', prompt: 'Notifications settings were clear (Push vs Cards Due Reminders).', required: false },
        { id: 'paywall_understand', type: 'rating_1_7', prompt: 'I understood Free vs Premium vs Pro.', required: false },
        {
          id: 'paywall_offer_clear',
          type: 'rating_1_7',
          prompt: 'The “Launch offer: Premium Annual includes Pro features for a limited time” message was clear.',
          required: false,
        },
        { id: 'upgrade_reason', type: 'text', prompt: 'What would convince you to upgrade?', required: false },
      ],
    },
    {
      id: 'bugs',
      title: 'Bug report (if any)',
      questions: [
        { id: 'bug_title', type: 'text', prompt: 'Bug title', required: false },
        {
          id: 'bug_area',
          type: 'single_choice',
          prompt: 'Where in the app?',
          required: false,
          options: ['Auth', 'Onboarding', 'Home', 'Topic tree', 'Smart Topic Discovery', 'Create Flashcards', 'Study', 'Past Papers', 'Profile/Settings', 'Paywall', 'Other'],
        },
        { id: 'bug_steps', type: 'text', prompt: 'Steps to reproduce', required: false },
        { id: 'bug_expected_actual', type: 'text', prompt: 'Expected vs actual', required: false },
        { id: 'bug_severity', type: 'single_choice', prompt: 'Severity', required: false, options: ['Low', 'Medium', 'High', 'Blocking'] },
        { id: 'bug_frequency', type: 'single_choice', prompt: 'Frequency', required: false, options: ['Once', 'Sometimes', 'Often', 'Always'] },
      ],
    },
    {
      id: 'wrap',
      title: 'Wrap-up',
      questions: [
        { id: 'overall_satisfaction_1_10', type: 'single_choice', prompt: 'Overall satisfaction (1–10)', required: true, options: ['1','2','3','4','5','6','7','8','9','10'] },
        { id: 'nps_0_10', type: 'single_choice', prompt: 'Likelihood to recommend (0–10)', required: true, options: ['0','1','2','3','4','5','6','7','8','9','10'] },
        { id: 'top_3_improvements', type: 'text', prompt: 'Top 3 improvements (ranked)', required: false },
        { id: 'top_3_great', type: 'text', prompt: 'Top 3 things already great', required: false },
        { id: 'anything_else', type: 'text', prompt: 'Anything else?', required: false },
      ],
    },
  ],
};

