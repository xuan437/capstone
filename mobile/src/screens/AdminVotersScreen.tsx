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

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.includes(searchQuery) ||
      (s.grade && s.grade.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          Total Registered: {students.length} • Voted: {totalVoted}
        </Text>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Name, LRN, or Grade..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Voters List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.voterCard}>
            <View style={styles.voterInfo}>
              <Text style={styles.voterName}>{item.name}</Text>
              <Text style={styles.voterMeta}>
                LRN: {item.id} • Grade {item.grade || 'N/A'} {item.section ? `(${item.section})` : ''}
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
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  searchInput: {
    backgroundColor: '#112240',
    borderWidth: 1,
    borderColor: '#233554',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  voterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#112240',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
  },
  votedBadgeText: {
    color: '#10B981',
  },
  pendingBadgeText: {
    color: '#F59E0B',
  },
});
