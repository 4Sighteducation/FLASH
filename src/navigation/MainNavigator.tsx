import React from 'react';
import { Alert, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/main/HomeScreen';
import StudyScreen from '../screens/main/StudyScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import TopicSelectorScreen from '../screens/topics/TopicSelectorScreen';
import TopicListScreen from '../screens/topics/TopicListScreen';
import CreateCardScreen from '../screens/cards/CreateCardScreen';
import AIGeneratorScreen from '../screens/cards/AIGeneratorScreen';
import FlashcardsScreen from '../screens/cards/FlashcardsScreen';
import StudyModal from '../screens/cards/StudyModal';
import CardCreationChoice from '../screens/cards/CardCreationChoice';
import ManageTopicScreen from '../screens/cards/ManageTopicScreen';
import ManageAllCardsScreen from '../screens/cards/ManageAllCardsScreen';
import APISettingsScreen from '../screens/settings/APISettingsScreen';
import PaywallScreen from '../screens/paywall/PaywallScreen';
import RedeemCodeScreen from '../screens/paywall/RedeemCodeScreen';
import { useSubscription } from '../contexts/SubscriptionContext';
import { showUpgradePrompt } from '../utils/upgradePrompt';
import SubjectSearchScreen from '../screens/onboarding/SubjectSearchScreen';
import ExamTypeSelectionScreen from '../screens/onboarding/ExamTypeSelectionScreen';
import CardSubjectSelector from '../screens/cards/CardSubjectSelector';
import CardTopicSelector from '../screens/cards/CardTopicSelector';
import ColorPickerScreen from '../screens/settings/ColorPickerScreen';
import TopicHubScreen from '../screens/topics/TopicHubScreen';
import ImageCardGeneratorScreen from '../screens/cards/ImageCardGeneratorScreen';
import SmartTopicDiscoveryScreen from '../screens/topics/SmartTopicDiscoveryScreen';
import SubjectProgressScreen from '../screens/subjects/SubjectProgressScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import UserManagement from '../screens/admin/UserManagement';
import TestTools from '../screens/admin/TestTools';
import AdminFeedbackScreen from '../screens/admin/AdminFeedbackScreen';
import PastPapersLibraryScreen from '../screens/papers/PastPapersLibraryScreen';
import PaperDetailScreen from '../screens/papers/PaperDetailScreen';
import QuestionPracticeScreen from '../screens/papers/QuestionPracticeScreen';
import PaperCompletionScreen from '../screens/papers/PaperCompletionScreen';
import StatisticsScreen from '../screens/main/StatisticsScreen';
import PrioritySupportFab from '../components/support/PrioritySupportFab';
import ParentInviteFab from '../components/support/ParentInviteFab';
import DeleteAccountScreen from '../screens/settings/DeleteAccountScreen';
import InteractiveWalkthroughScreen from '../screens/walkthrough/InteractiveWalkthroughScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ExamTypeSelection"
        component={ExamTypeSelectionScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="SubjectSelection"
        component={SubjectSearchScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      {/* Alias: some flows navigate to SubjectSearch (onboarding stack name). Keep this here to avoid "not handled" hangs. */}
      <Stack.Screen
        name="SubjectSearch"
        component={SubjectSearchScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="CardSubjectSelector"
        component={CardSubjectSelector}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="SubjectProgress"
        component={SubjectProgressScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SmartTopicDiscovery"
        component={SmartTopicDiscoveryScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="CardTopicSelector"
        component={CardTopicSelector}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="TopicSelector"
        component={TopicSelectorScreen}
        options={{ headerShown: true, headerTitle: '' }}
      />
      <Stack.Screen name="TopicList" component={TopicListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Flashcards" component={FlashcardsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateCard"
        component={CreateCardScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="AIGenerator"
        component={AIGeneratorScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="StudyModal"
        component={StudyModal}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="ManageTopic"
        component={ManageTopicScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ManageAllCards"
        component={ManageAllCardsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CardCreationChoice"
        component={CardCreationChoice}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="TopicHub"
        component={TopicHubScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ColorPicker"
        component={ColorPickerScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ImageCardGenerator"
        component={ImageCardGeneratorScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

// Study Stack
function StudyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudyMain" component={StudyScreen} />
      <Stack.Screen
        name="StudyModal"
        component={StudyModal}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}

// Papers Stack
function PapersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PapersMain" component={PastPapersLibraryScreen} />
      <Stack.Screen name="PaperDetail" component={PaperDetailScreen} />
      <Stack.Screen name="QuestionPractice" component={QuestionPracticeScreen} />
      <Stack.Screen name="PaperCompletion" component={PaperCompletionScreen} />
    </Stack.Navigator>
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Walkthrough" component={InteractiveWalkthroughScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="RedeemCode" component={RedeemCodeScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="APISettings"
        component={APISettingsScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="AdminUserManagement"
        component={UserManagement}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="AdminTestTools"
        component={TestTools}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="AdminFeedback"
        component={AdminFeedbackScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  const { tier } = useSubscription();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }: any) => ({
          tabBarIcon: ({ focused, color, size }: any) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Study') {
              iconName = focused ? 'book' : 'book-outline';
            } else if (route.name === 'Papers') {
              iconName = focused ? 'document-text' : 'document-text-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#6366F1',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Study" component={StudyStack} />
        <Tab.Screen
          name="Papers"
          component={PapersStack}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              if (tier !== 'pro') {
                e.preventDefault();
                showUpgradePrompt({
                  title: 'Pro feature',
                  message: 'Past Papers are available on Pro. Keep studying like a Pro to unlock them.',
                  navigation,
                  ctaLabel: 'View plans',
                  paywallParams: { initialBilling: 'annual', highlightOffer: true, source: 'papers_tab' },
                });
              }
            },
          })}
        />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>

      {/* Pro-only floating button for priority support */}
      <PrioritySupportFab />

      {/* Free-only floating CTA to invite a parent/guardian */}
      <ParentInviteFab />
    </View>
  );
}

