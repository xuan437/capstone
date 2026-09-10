import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '../supabase';
import { User, Student, ADMIN_IDENTIFIER, ADMIN_PASSWORD } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'faculty'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStudentLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please enter both your LRN / ID and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', identifier.trim())
        .single();

      if (error || !data) {
        setErrorMsg('Invalid LRN / Student ID or account not found.');
        setLoading(false);
        return;
      }

      const student = data as Student;

      // Validate password
      if (student.password && student.password !== password.trim()) {
        setErrorMsg('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }

      onLoginSuccess(student);
    } catch (err) {
      setErrorMsg('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacultyLogin = () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please enter faculty credentials.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    if (
      identifier.trim().toLowerCase() === 'admin' ||
      identifier.trim().toLowerCase() === 'faculty@school.edu'
    ) {
      if (password.trim() === 'admin123') {
        onLoginSuccess({
          id: 'ADMIN-001',
          name: 'Faculty Admin',
          email: 'admin@school.edu',
          isAdmin: true,
        });
        setLoading(false);
        return;
      }
    }

    setErrorMsg('Invalid faculty credentials.');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerBox}>
          <View style={styles.badgeRow}>
            <View style={styles.livePulseDot} />
            <Text style={styles.badgeText}>SSLG ELECTION PORTAL</Text>
          </View>
          <Text style={styles.title}>Supreme Student Learners Government</Text>
          <Text style={styles.subtitle}>Official Mobile Voting Application</Text>
        </View>

        {/* Auth Glass Card */}
        <View style={styles.card}>
          {/* Segmented Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'student' && styles.activeTab]}
              onPress={() => {
                setActiveTab('student');
                setErrorMsg('');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'student' && styles.activeTabText]}>
                Student Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'faculty' && styles.activeTab]}
              onPress={() => {
                setActiveTab('faculty');
                setErrorMsg('');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'faculty' && styles.activeTabText]}>
                Faculty / Admin
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <Text style={styles.inputLabel}>
            {activeTab === 'student' ? 'LRN / Student Number' : 'Admin Username / Email'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={activeTab === 'student' ? 'Enter your 12-digit LRN' : 'Enter admin username'}
            placeholderTextColor="#94A3B8"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType={activeTab === 'student' ? 'number-pad' : 'default'}
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Password / Access Key</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={activeTab === 'student' ? handleStudentLogin : handleFacultyLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {activeTab === 'student' ? 'Sign In & Cast Vote' : 'Access Admin Console'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#112240',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0A192F',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#0D7A3E',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0A192F',
    borderWidth: 1,
    borderColor: '#233554',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: '#0D7A3E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
