import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';

interface BubbleLoaderProps {
  label?: string;
}

export const BubbleLoader: React.FC<BubbleLoaderProps> = ({ label = 'Loading...' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10B981" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});
