import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { User, Student } from './src/types';
import { AuthScreen } from './src/screens/AuthScreen';
import { BallotScreen } from './src/screens/BallotScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { AdminVotersScreen } from './src/screens/AdminVotersScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'ballot' | 'results' | 'voters'>('ballot');

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if ('isAdmin' in user && user.isAdmin) {
      setActiveTab('results');
    } else {
      setActiveTab('ballot');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('ballot');
  };

  if (!currentUser) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaProvider>
    );
  }

  const isAdmin = 'isAdmin' in currentUser && currentUser.isAdmin;
  const isStudent = !isAdmin;
  const studentUser = currentUser as Student;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.headerTitle}>SSLG Voting System</Text>
            <Text style={styles.headerUserText}>
              Logged in: <Text style={styles.boldText}>{currentUser.name}</Text> ({isAdmin ? 'Admin' : `LRN: ${currentUser.id}`})
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Main Active Screen */}
        <View style={styles.screenContent}>
          {activeTab === 'ballot' && (
            isStudent ? (
              studentUser.has_voted ? (
                <View style={styles.votedNoticeBox}>
                  <Text style={styles.votedNoticeIcon}>✓</Text>
                  <Text style={styles.votedNoticeTitle}>Vote Received!</Text>
                  <Text style={styles.votedNoticeDesc}>
                    Your SSLG election ballot has been securely submitted and counted. Check the Live Results tab to monitor real-time tallying.
                  </Text>
                </View>
              ) : (
                <BallotScreen
                  currentUser={studentUser}
                  onVoteSuccess={() => {
                    setCurrentUser({ ...studentUser, has_voted: true });
                    setActiveTab('results');
                  }}
                />
              )
            ) : (
              <View style={styles.votedNoticeBox}>
                <Text style={styles.votedNoticeTitle}>Faculty Admin View</Text>
                <Text style={styles.votedNoticeDesc}>
                  Use the Live Results tab to monitor election tabulation, or the Voters List tab to view registered student status.
                </Text>
              </View>
            )
          )}

          {activeTab === 'results' && <ResultsScreen />}
          {activeTab === 'voters' && <AdminVotersScreen />}
        </View>

        {/* Navigation Bar */}
        <View style={styles.bottomNav}>
          {isStudent && !studentUser.has_voted && (
            <TouchableOpacity
              style={[styles.navTab, activeTab === 'ballot' && styles.activeNavTab]}
              onPress={() => setActiveTab('ballot')}
            >
              <Text style={[styles.navTabText, activeTab === 'ballot' && styles.activeNavTabText]}>
                Vote Ballot
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'results' && styles.activeNavTab]}
            onPress={() => setActiveTab('results')}
          >
            <Text style={[styles.navTabText, activeTab === 'results' && styles.activeNavTabText]}>
              Live Results
            </Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.navTab, activeTab === 'voters' && styles.activeNavTab]}
              onPress={() => setActiveTab('voters')}
            >
              <Text style={[styles.navTabText, activeTab === 'voters' && styles.activeNavTabText]}>
                Voters Registry
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#112240',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerUserText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  boldText: {
    color: '#10B981',
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  screenContent: {
    flex: 1,
  },
  votedNoticeBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  votedNoticeIcon: {
    fontSize: 48,
    color: '#10B981',
    marginBottom: 12,
  },
  votedNoticeTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  votedNoticeDesc: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#112240',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeNavTab: {
    backgroundColor: '#0D7A3E',
  },
  navTabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeNavTabText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

registerRootComponent(App);
