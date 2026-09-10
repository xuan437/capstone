import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDarkMode, onToggle }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onToggle} activeOpacity={0.8}>
      <Text style={styles.icon}>{isDarkMode ? '🌙' : '☀️'}</Text>
      <Text style={styles.text}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  icon: {
    fontSize: 12,
    marginRight: 6,
  },
  text: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
});
