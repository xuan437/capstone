import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '../supabase';
import { User, Student } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'faculty'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      identifier.trim().toLowerCase() === 'faculty@school.edu' ||
      identifier.trim().toLowerCase() === 'admin@gmail.com'
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Branding */}
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
              activeOpacity={0.8}
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
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'faculty' && styles.activeTabText]}>
                Faculty / Admin
              </Text>
            </TouchableOpacity>
          </View>

          {/* Identifier Input */}
          <Text style={styles.inputLabel}>
            {activeTab === 'student' ? 'LRN / Student Number' : 'Admin Username / Email'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={activeTab === 'student' ? 'Enter 12-digit LRN (e.g. 109876543210)' : 'Enter admin username'}
            placeholderTextColor="#64748B"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType={activeTab === 'student' ? 'number-pad' : 'default'}
            autoCapitalize="none"
          />

          {/* Password Input with Eye Toggle */}
          <Text style={styles.inputLabel}>Password / Access Key</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeToggleBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Text style={styles.eyeToggleText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
            </TouchableOpacity>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Submit Action */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={activeTab === 'student' ? handleStudentLogin : handleFacultyLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {activeTab === 'student' ? 'Sign In & Cast Vote' : 'Access Admin Console'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              🔒 SSLG Official Voter Authentication • Encrypted Connection
            </Text>
          </View>
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
    marginBottom: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  livePulseDot: {
    width: 7,
    height: 7,
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
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13.5,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    borderRadius: 12,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0A192F',
    borderRadius: 8,
    padding: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#233554',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
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
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#0A192F',
    borderWidth: 1,
    borderColor: '#233554',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A192F',
    borderWidth: 1,
    borderColor: '#233554',
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  eyeToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  eyeToggleText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  submitBtn: {
    backgroundColor: '#0D7A3E',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#0D7A3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  securityNote: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  securityNoteText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
});
