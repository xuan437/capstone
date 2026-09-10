import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Candidate } from '../types';

interface CandidateProfileScreenProps {
  candidate: Candidate;
  onBack: () => void;
  voteCount?: number;
}

export const CandidateProfileScreen: React.FC<CandidateProfileScreenProps> = ({
  candidate,
  onBack,
  voteCount,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* Top Header Navigation */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Candidate Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {candidate.photo_url ? (
              <Image source={{ uri: candidate.photo_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{getInitials(candidate.name)}</Text>
              </View>
            )}
          </View>

          <View style={styles.positionBadge}>
            <Text style={styles.positionBadgeText}>{candidate.position.toUpperCase()}</Text>
          </View>

          <Text style={styles.candidateName}>{candidate.name}</Text>
          <Text style={styles.metaText}>
            Grade {candidate.grade || 'N/A'} {candidate.section ? `(${candidate.section})` : ''}{' '}
            {candidate.age ? `• Age ${candidate.age}` : ''}
          </Text>

          {voteCount !== undefined ? (
            <View style={styles.voteBox}>
              <Text style={styles.voteBoxNumber}>{voteCount}</Text>
              <Text style={styles.voteBoxLabel}>Total Votes Tally</Text>
            </View>
          ) : null}
        </View>

        {/* Platform Statement */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Campaign Advocacy & Platform</Text>
          <Text style={styles.platformBody}>
            {candidate.platform
              ? `"${candidate.platform}"`
              : 'No official platform statement filed for this candidate.'}
          </Text>
        </View>

        {/* Credentials Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SSLG Filing Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Position Sought:</Text>
            <Text style={styles.infoValue}>{candidate.position}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Grade Level:</Text>
            <Text style={styles.infoValue}>{candidate.grade || 'General List'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValueGreen}>Verified Official Candidate</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#10B981',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0D7A3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  positionBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  positionBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  candidateName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  voteBox: {
    marginTop: 16,
    backgroundColor: '#0A192F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#233554',
  },
  voteBoxNumber: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: '800',
  },
  voteBoxLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0D7A3E',
    paddingLeft: 8,
  },
  platformBody: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoValueGreen: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
});
