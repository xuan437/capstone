import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Student } from '../types';

interface VotingPassTicketProps {
  student: Student;
}

export const VotingPassTicket: React.FC<VotingPassTicketProps> = ({ student }) => {
  return (
    <View style={styles.ticketCard}>
      {/* Header Cut Line & SSLG Badge */}
      <View style={styles.ticketHeader}>
        <View style={styles.scissorsRow}>
          <Text style={styles.scissorsIcon}>✂</Text>
          <Text style={styles.ticketHeaderTitle}>SSLG OFFICIAL DIGITAL VOTING PASS</Text>
        </View>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>
            {student.grade ? `${student.grade}${student.section ? `-${student.section}` : ''}` : 'VERIFIED'}
          </Text>
        </View>
      </View>

      {/* Student Details */}
      <View style={styles.studentInfoBox}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentMeta}>
          LRN / Student ID: <Text style={styles.boldWhite}>{student.id}</Text>
        </Text>
      </View>

      {/* Status Verified Box */}
      <View style={styles.passStubBox}>
        <Text style={styles.passStubTitle}>BALLOT STATUS VERIFICATION</Text>
        <View style={styles.votedVerifiedRow}>
          <Text style={styles.votedCheckMark}>✓</Text>
          <Text style={styles.passStubStatus}>BALLOT SECURELY RECORDED</Text>
        </View>
      </View>

      {/* Security Footer Instruction */}
      <Text style={styles.securityFooter}>
        Official SSLG Election Tally Record • One Vote Per Student • Verified
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  ticketCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 18,
    backgroundColor: '#0F261C',
    marginVertical: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.25)',
    paddingBottom: 10,
  },
  scissorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scissorsIcon: {
    fontSize: 16,
    color: '#10B981',
  },
  ticketHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: '#0D7A3E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  studentInfoBox: {
    marginBottom: 14,
  },
  studentName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  studentMeta: {
    color: '#A7F3D0',
    fontSize: 12,
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  passStubBox: {
    backgroundColor: '#064E3B',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  passStubTitle: {
    fontSize: 9,
    color: '#A7F3D0',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  votedVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  votedCheckMark: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '800',
  },
  passStubStatus: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  securityFooter: {
    fontSize: 9.5,
    color: '#6EE7B7',
    textAlign: 'center',
    fontWeight: '600',
  },
});
