import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase, logAuditAction } from '../supabase';
import { PasswordGenerator } from './PasswordGenerator';

interface AdminRegisterVoterModalProps {
  visible: boolean;
  onClose: () => void;
  onVoterAdded: () => void;
}

export const AdminRegisterVoterModal: React.FC<AdminRegisterVoterModalProps> = ({
  visible,
  onClose,
  onVoterAdded,
}) => {
  const [lrn, setLrn] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const cleanLrn = lrn.trim();
    const cleanName = name.trim();
    const cleanGrade = grade.trim();
    const cleanPassword = password.trim();

    if (!/^\d{12}$/.test(cleanLrn)) {
      Alert.alert('Validation Error', 'LRN must be exactly 12 numeric digits.');
      return;
    }

    if (!cleanName) {
      Alert.alert('Validation Error', 'Student full name is required.');
      return;
    }

    if (!cleanPassword) {
      Alert.alert('Validation Error', 'Password is required.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('students').insert([
        {
          id: cleanLrn,
          name: cleanName,
          grade: cleanGrade || '7',
          section: section.trim() || 'Rizal',
          password: cleanPassword,
          has_voted: false,
        },
      ]);

      if (error) throw error;

      await logAuditAction(
        'VOTER_REGISTERED',
        'Faculty Admin',
        `Registered student ${cleanName} (LRN: ${cleanLrn})`,
        cleanLrn
      );

      Alert.alert('Success!', `Student ${cleanName} registered successfully.`);
      setLrn('');
      setName('');
      setGrade('');
      setSection('');
      setPassword('');
      onVoterAdded();
      onClose();
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Unable to register student voter.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>👤 Register New Student Voter</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>12-Digit Student LRN *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 109876543210"
            placeholderTextColor="#64748B"
            value={lrn}
            onChangeText={setLrn}
            keyboardType="number-pad"
            maxLength={12}
          />

          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Maria Santos"
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.inputLabel}>Grade *</Text>
              <TextInput
                style={styles.input}
                placeholder="Grade (e.g. 10)"
                placeholderTextColor="#64748B"
                value={grade}
                onChangeText={setGrade}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Section</Text>
              <TextInput
                style={styles.input}
                placeholder="Section (e.g. Luna)"
                placeholderTextColor="#64748B"
                value={section}
                onChangeText={setSection}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter or generate password"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
          />

          <PasswordGenerator onGenerate={(pwd) => setPassword(pwd)} />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Register Learner Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 47, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#112240',
    borderRadius: 14,
    width: '100%',
    maxWidth: 440,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0A192F',
    borderWidth: 1,
    borderColor: '#233554',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#0D7A3E',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
