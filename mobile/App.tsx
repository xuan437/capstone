import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { User, Student } from './src/types';
import { AuthScreen } from './src/screens/AuthScreen';
import { BallotScreen } from './src/screens/BallotScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { AdminVotersScreen } from './src/screens/AdminVotersScreen';
import { StudentProfileScreen } from './src/screens/StudentProfileScreen';
import { AdminSettingsScreen } from './src/screens/AdminSettingsScreen';
import { AdminAddCandidateModal } from './src/screens/AdminAddCandidateModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'ballot' | 'results' | 'voters' | 'profile' | 'settings'>('ballot');
  const [addCandidateModalVisible, setAddCandidateModalVisible] = useState(false);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if ('isAdmin' in user && user.isAdmin) {
      setActiveTab('results');
    } else {
      const student = user as Student;
      setActiveTab(student.has_voted ? 'profile' : 'ballot');
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

        {/* Executive Header Bar */}
        <View style={styles.topHeader}>
          <View>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerDot} />
              <Text style={styles.headerTitle}>SSLG Election Portal</Text>
            </View>
            <Text style={styles.headerUserText}>
              User: <Text style={styles.boldText}>{currentUser.name}</Text> ({isAdmin ? 'Faculty Admin' : `LRN: ${currentUser.id}`})
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Alert.alert('Sign Out', 'Sign out of SSLG Voting Session?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: handleLogout },
              ]);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <View style={styles.screenContent}>
          {activeTab === 'ballot' && (
            isStudent ? (
              <BallotScreen
                currentUser={studentUser}
                onVoteSuccess={() => {
                  setCurrentUser({ ...studentUser, has_voted: true });
                  setActiveTab('profile');
                }}
              />
            ) : (
              <ResultsScreen />
            )
          )}

          {activeTab === 'results' && <ResultsScreen />}
          {activeTab === 'voters' && <AdminVotersScreen />}
          {activeTab === 'profile' && isStudent && (
            <StudentProfileScreen
              student={studentUser}
              onLogout={handleLogout}
              onGoToBallot={() => setActiveTab('ballot')}
            />
          )}
          {activeTab === 'settings' && isAdmin && (
            <AdminSettingsScreen
              onOpenAddCandidate={() => setAddCandidateModalVisible(true)}
              onLogout={handleLogout}
            />
          )}
        </View>

        {/* Executive Bottom Tab Navigation Bar */}
        <View style={styles.bottomNav}>
          {isStudent && (
            <TouchableOpacity
              style={[styles.navTab, activeTab === 'ballot' && styles.activeNavTab]}
              onPress={() => setActiveTab('ballot')}
              activeOpacity={0.8}
            >
              <Text style={styles.navIcon}>🗳️</Text>
              <Text style={[styles.navTabText, activeTab === 'ballot' && styles.activeNavTabText]}>
                Ballot
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'results' && styles.activeNavTab]}
            onPress={() => setActiveTab('results')}
            activeOpacity={0.8}
          >
            <Text style={styles.navIcon}>📊</Text>
            <Text style={[styles.navTabText, activeTab === 'results' && styles.activeNavTabText]}>
              Tabulation
            </Text>
          </TouchableOpacity>

          {isStudent && (
            <TouchableOpacity
              style={[styles.navTab, activeTab === 'profile' && styles.activeNavTab]}
              onPress={() => setActiveTab('profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.navIcon}>🎟️</Text>
              <Text style={[styles.navTabText, activeTab === 'profile' && styles.activeNavTabText]}>
                Profile Pass
              </Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity
              style={[styles.navTab, activeTab === 'voters' && styles.activeNavTab]}
              onPress={() => setActiveTab('voters')}
              activeOpacity={0.8}
            >
              <Text style={styles.navIcon}>👥</Text>
              <Text style={[styles.navTabText, activeTab === 'voters' && styles.activeNavTabText]}>
                Voters Registry
              </Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity
              style={[styles.navTab, activeTab === 'settings' && styles.activeNavTab]}
              onPress={() => setActiveTab('settings')}
              activeOpacity={0.8}
            >
              <Text style={styles.navIcon}>⚙️</Text>
              <Text style={[styles.navTabText, activeTab === 'settings' && styles.activeNavTabText]}>
                Settings
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Add Candidate Modal */}
        <AdminAddCandidateModal
          visible={addCandidateModalVisible}
          onClose={() => setAddCandidateModalVisible(false)}
          onCandidateAdded={() => {
            Alert.alert('Success', 'Candidate added successfully!');
          }}
        />
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
    backgroundColor: 'rgba(17, 34, 64, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 34, 64, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeNavTab: {
    backgroundColor: '#0D7A3E',
  },
  navIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  navTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeNavTabText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

registerRootComponent(App);
