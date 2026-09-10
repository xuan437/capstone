import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../supabase';
import { Student } from '../types';

export const AdminVotersScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'voted' | 'pending'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVoters();
  }, []);

  const fetchVoters = async () => {
    try {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (error) throw error;
      setStudents(data as Student[]);
    } catch (err) {
      console.error('Error fetching voters:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.includes(searchQuery) ||
      (s.grade && s.grade.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'voted' && s.has_voted) ||
      (statusFilter === 'pending' && !s.has_voted);

    return matchesSearch && matchesStatus;
  });

  const totalVoted = students.filter((s) => s.has_voted).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D7A3E" />
        <Text style={styles.loadingText}>Loading Voter Registry...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Summary */}
      <View style={styles.header}>
        <Text style={styles.title}>Voter Registry Dashboard</Text>
        <Text style={styles.subtitle}>
          Total Registered: <Text style={styles.highlightText}>{students.length}</Text> • Voted:{' '}
          <Text style={styles.highlightGreenText}>{totalVoted}</Text>
        </Text>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Name, LRN, or Grade..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Status Filter Switcher */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
              All ({students.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'voted' && styles.filterChipActive]}
            onPress={() => setStatusFilter('voted')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, statusFilter === 'voted' && styles.filterChipTextActive]}>
              Voted ({totalVoted})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'pending' && styles.filterChipActive]}
            onPress={() => setStatusFilter('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, statusFilter === 'pending' && styles.filterChipTextActive]}>
              Pending ({students.length - totalVoted})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Voters List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.voterCard}>
            <View style={styles.voterInfo}>
              <Text style={styles.voterName}>{item.name}</Text>
              <Text style={styles.voterMeta}>
                LRN: {item.id} • Grade {item.grade || 'N/A'}{' '}
                {item.section ? `(${item.section})` : ''}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                item.has_voted ? styles.votedBadge : styles.pendingBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  item.has_voted ? styles.votedBadgeText : styles.pendingBadgeText,
                ]}
              >
                {item.has_voted ? 'VOTED' : 'PENDING'}
              </Text>
            </View>
          </View>
        )}
      />
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '500',
  },
  highlightText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  highlightGreenText: {
    color: '#10B981',
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#112240',
    borderWidth: 1,
    borderColor: '#233554',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#112240',
    borderWidth: 1,
    borderColor: '#233554',
  },
  filterChipActive: {
    backgroundColor: '#0D7A3E',
    borderColor: '#10B981',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  voterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  voterInfo: {
    flex: 1,
  },
  voterName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  voterMeta: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  votedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  votedBadgeText: {
    color: '#10B981',
  },
  pendingBadgeText: {
    color: '#F59E0B',
  },
});
