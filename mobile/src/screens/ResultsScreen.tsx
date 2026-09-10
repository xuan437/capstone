import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { supabase } from '../supabase';
import { Candidate, POSITIONS } from '../types';

export const ResultsScreen: React.FC = () => {
  const [results, setResults] = useState<{ candidate: Candidate; count: number }[]>([]);
  const [stats, setStats] = useState({ totalRegistered: 0, totalVotesCast: 0, uniqueVoters: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>('All');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const [candidatesRes, votesRes, studentsRes] = await Promise.all([
        supabase.from('candidates').select('*'),
        supabase.from('votes').select('candidate_id, student_id'),
        supabase.from('students').select('id', { count: 'exact' }),
      ]);

      const candidates = (candidatesRes.data || []) as Candidate[];
      const votes = (votesRes.data || []) as any[];
      const totalRegistered = studentsRes.count || 0;

      const tally = candidates
        .map((c) => ({
          candidate: c,
          count: votes.filter((v) => v.candidate_id === c.id).length,
        }))
        .sort((a, b) => b.count - a.count);

      const uniqueVoters = new Set(votes.map((v) => v.student_id).filter(Boolean)).size;

      setResults(tally);
      setStats({ totalRegistered, totalVotesCast: votes.length, uniqueVoters });
    } catch (err) {
      console.error('Fetch mobile results error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchResults();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D7A3E" />
        <Text style={styles.loadingText}>Fetching Live Election Results...</Text>
      </View>
    );
  }

  const turnoutPercent =
    stats.totalRegistered > 0 ? Math.round((stats.uniqueVoters / stats.totalRegistered) * 100) : 0;

  const topCandidate = results[0]?.count > 0 ? results[0] : null;

  const positionsToDisplay =
    selectedPosFilter === 'All'
      ? POSITIONS.filter((p) => results.some((r) => r.candidate.position === p))
      : [selectedPosFilter];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Live Status */}
        <View style={styles.header}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE TABULATION</Text>
          </View>
          <Text style={styles.title}>Election Results & Analytics</Text>
        </View>

        {/* Turnout KPI Grid */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{turnoutPercent}%</Text>
            <Text style={styles.kpiLabel}>Voter Turnout</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats.uniqueVoters}</Text>
            <Text style={styles.kpiLabel}>Ballots Cast</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats.totalRegistered}</Text>
            <Text style={styles.kpiLabel}>Total Registered</Text>
          </View>
        </View>

        {/* Top Overall Leader Spotlight */}
        {topCandidate ? (
          <View style={styles.topLeaderSpotlight}>
            <View style={{ flex: 1 }}>
              <Text style={styles.spotlightTag}>🏆 OVERALL VOTE LEADER</Text>
              <Text style={styles.spotlightName}>{topCandidate.candidate.name}</Text>
              <Text style={styles.spotlightPos}>{topCandidate.candidate.position}</Text>
            </View>
            <View style={styles.spotlightVotePill}>
              <Text style={styles.spotlightVoteCount}>{topCandidate.count}</Text>
              <Text style={styles.spotlightVoteLabel}>Votes</Text>
            </View>
          </View>
        ) : null}

        {/* Position Filter Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedPosFilter === 'All' && styles.filterChipActive]}
            onPress={() => setSelectedPosFilter('All')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, selectedPosFilter === 'All' && styles.filterChipTextActive]}>
              All Positions
            </Text>
          </TouchableOpacity>
          {POSITIONS.map((pos) => (
            <TouchableOpacity
              key={pos}
              style={[styles.filterChip, selectedPosFilter === pos && styles.filterChipActive]}
              onPress={() => setSelectedPosFilter(pos)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, selectedPosFilter === pos && styles.filterChipTextActive]}>
                {pos}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results by Position */}
        {positionsToDisplay.map((pos) => {
          const posResults = results.filter((r) => r.candidate.position === pos);
          if (posResults.length === 0) return null;

          const maxVotesInPos = Math.max(...posResults.map((r) => r.count), 1);

          return (
            <View key={pos} style={styles.positionSection}>
              <Text style={styles.positionHeading}>{pos}</Text>

              {posResults.map((item, idx) => {
                const isLeading = idx === 0 && item.count > 0;
                const votePercent =
                  stats.totalVotesCast > 0 ? Math.round((item.count / maxVotesInPos) * 100) : 0;

                return (
                  <View key={item.candidate.id} style={styles.candidateResultCard}>
                    <View style={styles.candidateHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.candidateName}>{item.candidate.name}</Text>
                        <Text style={styles.voteCountText}>
                          {item.count} votes ({votePercent}%)
                        </Text>
                      </View>
                      {isLeading ? (
                        <View style={styles.leadingBadge}>
                          <Text style={styles.leadingBadgeText}>LEADING</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Vote Progress Bar */}
                    <View style={styles.voteBarBg}>
                      <View
                        style={[
                          styles.voteBarFill,
                          { width: `${votePercent}%` },
                          isLeading && styles.voteBarFillLeading,
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
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
  header: {
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  kpiValue: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  topLeaderSpotlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 122, 62, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  spotlightTag: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  spotlightName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  spotlightPos: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  spotlightVotePill: {
    backgroundColor: '#0D7A3E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  spotlightVoteCount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  spotlightVoteLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  filterScroll: {
    marginBottom: 18,
  },
  filterChip: {
    backgroundColor: '#112240',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#233554',
  },
  filterChipActive: {
    backgroundColor: '#0D7A3E',
    borderColor: '#10B981',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  positionSection: {
    marginBottom: 18,
  },
  positionHeading: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0D7A3E',
    paddingLeft: 8,
  },
  candidateResultCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  candidateName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  voteCountText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  leadingBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  leadingBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  voteBarBg: {
    height: 7,
    backgroundColor: '#0A192F',
    borderRadius: 4,
    overflow: 'hidden',
  },
  voteBarFill: {
    height: '100%',
    backgroundColor: '#64748B',
    borderRadius: 4,
  },
  voteBarFillLeading: {
    backgroundColor: '#10B981',
  },
});
