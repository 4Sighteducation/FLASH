import React from 'react';
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
import APISettingsScreen from '../screens/settings/APISettingsScreen';
import TopicEditModal from '../components/TopicEditModal';
import SubjectSelectionScreen from '../screens/onboarding/SubjectSelectionScreen';
import ExamTypeSelectionScreen from '../screens/onboarding/ExamTypeSelectionScreen';
import TopicCurationScreen from '../screens/onboarding/TopicCurationScreen';
import CardSubjectSelector from '../screens/cards/CardSubjectSelector';
import CardTopicSelector from '../screens/cards/CardTopicSelector';
import ColorPickerScreen from '../screens/settings/ColorPickerScreen';
import TopicHubScreen from '../screens/topics/TopicHubScreen';
import ImageCardGeneratorScreen from '../screens/cards/ImageCardGeneratorScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import UserManagement from '../screens/admin/UserManagement';
import TestTools from '../screens/admin/TestTools';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen 
        name="ExamTypeSelection" 
        component={ExamTypeSelectionScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="SubjectSelection" 
        component={SubjectSelectionScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="TopicCuration" 
        component={TopicCurationScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="CardSubjectSelector" 
        component={CardSubjectSelector}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="CardTopicSelector" 
        component={CardTopicSelector}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="TopicSelector" 
        component={TopicSelectorScreen}
        options={{ headerShown: true, headerTitle: '' }}
      />
      <Stack.Screen 
        name="TopicList" 
        component={TopicListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Flashcards" 
        component={FlashcardsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateCard" 
        component={CreateCardScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="AIGenerator" 
        component={AIGeneratorScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="StudyModal" 
        component={StudyModal}
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom'
        }}
      />
      <Stack.Screen 
        name="CardCreationChoice" 
        component={CardCreationChoice}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="TopicHub" 
        component={TopicHubScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="ColorPicker" 
        component={ColorPickerScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="ImageCardGenerator" 
        component={ImageCardGeneratorScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
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
          animation: 'slide_from_bottom'
        }}
      />
    </Stack.Navigator>
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen 
        name="APISettings" 
        component={APISettingsScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboard}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="AdminUserManagement" 
        component={UserManagement}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="AdminTestTools" 
        component={TestTools}
        options={{ 
          headerShown: false,
          presentation: 'modal'
        }}
      />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Study') {
            iconName = focused ? 'book' : 'book-outline';
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
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
} 