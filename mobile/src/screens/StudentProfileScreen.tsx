import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Student } from '../types';
import { VotingPassTicket } from '../components/VotingPassTicket';

interface StudentProfileScreenProps {
  student: Student;
  onLogout: () => void;
  onGoToBallot?: () => void;
}

export const StudentProfileScreen: React.FC<StudentProfileScreenProps> = ({
  student,
  onLogout,
  onGoToBallot,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Student Voter Profile</Text>
          <Text style={styles.subtitle}>Official SSLG Learner Identity & Verification Stub</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
          </View>

          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.studentLrn}>LRN / ID: {student.id}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeLabel}>Grade Level</Text>
              <Text style={styles.metaBadgeValue}>{student.grade || 'N/A'}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeLabel}>Section</Text>
              <Text style={styles.metaBadgeValue}>{student.section || 'Unassigned'}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeLabel}>Voter Status</Text>
              <Text
                style={[
                  styles.metaBadgeValue,
                  { color: student.has_voted ? '#10B981' : '#F59E0B' },
                ]}
              >
                {student.has_voted ? 'VOTED' : 'PENDING'}
              </Text>
            </View>
          </View>
        </View>

        {/* Digital Voting Pass Ticket Stub */}
        {student.has_voted ? (
          <View style={styles.passSection}>
            <Text style={styles.sectionHeader}>Verified Digital Receipt</Text>
            <VotingPassTicket student={student} />
          </View>
        ) : (
          <View style={styles.pendingBallotBox}>
            <Text style={styles.pendingTitle}>Ballot Outstanding</Text>
            <Text style={styles.pendingText}>
              You have not yet submitted your official SSLG election ballot. Please proceed to the ballot screen to cast your votes.
            </Text>
            {onGoToBallot ? (
              <TouchableOpacity style={styles.goToBallotBtn} onPress={onGoToBallot} activeOpacity={0.85}>
                <Text style={styles.goToBallotBtnText}>Proceed to Official Ballot</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out of the SSLG Election app?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: onLogout },
            ]);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutBtnText}>Sign Out of SSLG Portal</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  scrollContent: {
    padding: 18,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0D7A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  studentName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  studentLrn: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  metaBadge: {
    flex: 1,
    backgroundColor: '#0A192F',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#233554',
  },
  metaBadgeLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  metaBadgeValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  passSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  pendingBallotBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pendingTitle: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  pendingText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  goToBallotBtn: {
    backgroundColor: '#0D7A3E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  goToBallotBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '800',
  },
});
