import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../Icon';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { navigate } from '../../navigation/RootNavigation';

export default function ParentInviteFab() {
  const { tier } = useSubscription();

  if (tier !== 'free') return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          navigate('Profile', { screen: 'ProfileMain', params: { openParentInvite: true } });
        }}
      >
        <LinearGradient
          colors={['#FF006E', '#00F5FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fab}
        >
          <Icon name="mail-outline" size={18} color="#0B1020" />
          <Text style={styles.text}>Ask a parent</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 86, // sits above tab bar
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#00F5FF',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: {
    color: '#0B1020',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});

