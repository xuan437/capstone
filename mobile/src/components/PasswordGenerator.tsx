import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';

interface PasswordGeneratorProps {
  onGenerate?: (password: string) => void;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onGenerate }) => {
  const [generatedPassword, setGeneratedPassword] = useState('');

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(pwd);
    if (onGenerate) onGenerate(pwd);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🔐 Password Generator Tool</Text>
      <Text style={styles.desc}>Generate a secure temporary password for voter registration.</Text>

      {generatedPassword ? (
        <View style={styles.pwdBox}>
          <Text style={styles.pwdText}>{generatedPassword}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.btn} onPress={generatePassword} activeOpacity={0.8}>
        <Text style={styles.btnText}>Generate Secure Password</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#112240',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  desc: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 10,
  },
  pwdBox: {
    backgroundColor: '#0A192F',
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  pwdText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  btn: {
    backgroundColor: '#0D7A3E',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
