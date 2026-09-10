import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { supabase } from '../supabase';
import { Candidate, POSITIONS, Student } from '../types';
import { CandidateProfileScreen } from './CandidateProfileScreen';

interface BallotScreenProps {
  currentUser: Student;
  onVoteSuccess: () => void;
}

export const BallotScreen: React.FC<BallotScreenProps> = ({ currentUser, onVoteSuccess }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeProfileCandidate, setActiveProfileCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase.from('candidates').select('*');
      if (error) throw error;
      setCandidates(data as Candidate[]);
    } catch (err) {
      Alert.alert('Error', 'Unable to fetch ballot candidates.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (position: string, candidateId: string) => {
    setSelectedVotes((prev) => {
      const updated = { ...prev };
      if (updated[position] === candidateId) {
        delete updated[position];
      } else {
        updated[position] = candidateId;
      }
      return updated;
    });
  };

  const handleSubmitBallot = async () => {
    if (Object.keys(selectedVotes).length === 0) {
      Alert.alert('Empty Ballot', 'Please select at least one candidate before submitting.');
      return;
    }

    Alert.alert(
      'Confirm Vote Submission',
      `You are submitting votes for ${Object.keys(selectedVotes).length} position(s). This action cannot be undone.`,
      [
        { text: 'Review Ballot', style: 'cancel' },
        {
          text: 'Confirm & Submit',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              // Insert vote records
              const voteRows = Object.entries(selectedVotes).map(([pos, candidateId]) => ({
                student_id: currentUser.id,
                candidate_id: candidateId,
                created_at: new Date().toISOString(),
              }));

              const { error: voteErr } = await supabase.from('votes').insert(voteRows);
              if (voteErr) throw voteErr;

              // Update student has_voted status
              const { error: studentErr } = await supabase
                .from('students')
                .update({ has_voted: true })
                .eq('id', currentUser.id);

              if (studentErr) throw studentErr;

              Alert.alert('Success!', 'Your SSLG official ballot has been recorded.', [
                { text: 'OK', onPress: onVoteSuccess },
              ]);
            } catch (err) {
              Alert.alert('Error', 'Failed to submit vote. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D7A3E" />
        <Text style={styles.loadingText}>Loading Official SSLG Ballot...</Text>
      </View>
    );
  }

  const positionsWithCandidates = POSITIONS.filter((pos) =>
    candidates.some((c) => c.position === pos)
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Header */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Official SSLG Ballot</Text>
          <Text style={styles.bannerSubtitle}>
            Voter LRN: <Text style={styles.boldWhite}>{currentUser.id}</Text> • Grade{' '}
            <Text style={styles.boldWhite}>{currentUser.grade}</Text>
          </Text>
        </View>

        {/* Position Sections */}
        {positionsWithCandidates.map((position) => {
          const posCandidates = candidates.filter((c) => c.position === position);
          const currentSelected = selectedVotes[position];

          return (
            <View key={position} style={styles.positionCard}>
              <View style={styles.positionHeader}>
                <Text style={styles.positionTitle}>{position}</Text>
                <Text style={styles.positionSubtitle}>Select 1 Candidate</Text>
              </View>

              {posCandidates.map((candidate) => {
                const isSelected = currentSelected === candidate.id;

                return (
                  <View key={candidate.id} style={[styles.candidateItem, isSelected && styles.selectedCandidateItem]}>
                    <TouchableOpacity
                      style={styles.candidateSelectTouchable}
                      onPress={() => handleSelectCandidate(position, candidate.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.candidateRadio, isSelected && styles.selectedRadio]}>
                        <View style={[styles.radioDot, isSelected && styles.radioDotActive]} />
                      </View>

                      <View style={styles.candidateInfo}>
                        <Text style={[styles.candidateName, isSelected && styles.selectedText]}>
                          {candidate.name}
                        </Text>
                        {candidate.platform ? (
                          <Text style={styles.platformText} numberOfLines={2}>
                            "{candidate.platform}"
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    {/* View Profile Action */}
                    <TouchableOpacity
                      style={styles.profileInfoBtn}
                      onPress={() => setActiveProfileCandidate(candidate)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.profileInfoBtnText}>Profile</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Submit Action */}
        <TouchableOpacity
          style={styles.submitBallotBtn}
          onPress={handleSubmitBallot}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBallotBtnText}>Submit Official Votes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Candidate Profile Modal */}
      <Modal visible={!!activeProfileCandidate} animationType="slide" onRequestClose={() => setActiveProfileCandidate(null)}>
        {activeProfileCandidate && (
          <CandidateProfileScreen
            candidate={activeProfileCandidate}
            onBack={() => setActiveProfileCandidate(null)}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A192F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: 'rgba(13, 122, 62, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    color: '#94A3B8',
    fontSize: 12.5,
    marginTop: 4,
    fontWeight: '500',
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  positionCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  positionHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 8,
  },
  positionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  positionSubtitle: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  candidateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A192F',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#233554',
  },
  selectedCandidateItem: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  candidateSelectTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  candidateRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedRadio: {
    borderColor: '#10B981',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  radioDotActive: {
    backgroundColor: '#10B981',
  },
  candidateInfo: {
    flex: 1,
    paddingRight: 8,
  },
  candidateName: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  selectedText: {
    color: '#10B981',
    fontWeight: '800',
  },
  platformText: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  profileInfoBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  profileInfoBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  submitBallotBtn: {
    backgroundColor: '#0D7A3E',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0D7A3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBallotBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
