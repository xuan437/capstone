import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase, logAuditAction, fetchAuditLogs } from '../supabase';
import { AuditLog } from '../types';

interface AdminSettingsScreenProps {
  onOpenAddCandidate: () => void;
  onLogout: () => void;
}

export const AdminSettingsScreen: React.FC<AdminSettingsScreenProps> = ({
  onOpenAddCandidate,
  onLogout,
}) => {
  const [electionStatus, setElectionStatus] = useState<'OPEN' | 'PAUSED' | 'CLOSED'>('OPEN');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    loadAuditData();
  }, []);

  const loadAuditData = async () => {
    setLoadingLogs(true);
    try {
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.warn('Error loading audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleToggleElection = async (status: 'OPEN' | 'PAUSED' | 'CLOSED') => {
    Alert.alert(
      'Update Election Status',
      `Are you sure you want to set election state to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setElectionStatus(status);
            await logAuditAction(
              'ELECTION_STATUS_CHANGED',
              'Faculty Admin',
              `Election status updated to ${status}`
            );
            Alert.alert('Status Updated', `Election is now ${status}.`);
            loadAuditData();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Admin Settings & Audit Console</Text>
          <Text style={styles.subtitle}>System configuration, election toggles & audit history</Text>
        </View>

        {/* Election Status Control */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Election Status Control</Text>
          <Text style={styles.cardDescription}>
            Current State: <Text style={styles.statusHighlight}>{electionStatus}</Text>
          </Text>

          <View style={styles.statusButtonRow}>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                electionStatus === 'OPEN' && styles.statusBtnOpen,
              ]}
              onPress={() => handleToggleElection('OPEN')}
              activeOpacity={0.8}
            >
              <Text style={styles.statusBtnText}>OPEN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                electionStatus === 'PAUSED' && styles.statusBtnPaused,
              ]}
              onPress={() => handleToggleElection('PAUSED')}
              activeOpacity={0.8}
            >
              <Text style={styles.statusBtnText}>PAUSE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                electionStatus === 'CLOSED' && styles.statusBtnClosed,
              ]}
              onPress={() => handleToggleElection('CLOSED')}
              activeOpacity={0.8}
            >
              <Text style={styles.statusBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Admin Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Administrative Management</Text>
          <TouchableOpacity
            style={styles.actionRowBtn}
            onPress={onOpenAddCandidate}
            activeOpacity={0.85}
          >
            <Text style={styles.actionRowIcon}>➕</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Register New SSLG Candidate</Text>
              <Text style={styles.actionRowSub}>Add candidate details, platform & photo</Text>
            </View>
            <Text style={styles.actionRowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* System Audit Logs */}
        <View style={styles.card}>
          <View style={styles.logsHeader}>
            <Text style={styles.cardTitle}>System Audit Trail</Text>
            <TouchableOpacity onPress={loadAuditData} activeOpacity={0.7}>
              <Text style={styles.refreshLogsText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingLogs ? (
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 14 }} />
          ) : auditLogs.length === 0 ? (
            <Text style={styles.noLogsText}>No audit entries recorded yet.</Text>
          ) : (
            <View>
              {auditLogs.slice(0, 10).map((log, index) => (
                <View key={log.id || index} style={styles.logItem}>
                  <View style={styles.logItemHeader}>
                    <Text style={styles.logAction}>{log.action}</Text>
                    <Text style={styles.logUser}>{log.user_name}</Text>
                  </View>
                  <Text style={styles.logDetails}>{log.details}</Text>
                  {log.created_at ? (
                    <Text style={styles.logTime}>
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Sign Out Action */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <Text style={styles.logoutBtnText}>Sign Out of Admin Console</Text>
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
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
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
  card: {
    backgroundColor: 'rgba(17, 34, 64, 0.85)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDescription: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 14,
  },
  statusHighlight: {
    color: '#10B981',
    fontWeight: '800',
  },
  statusButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    backgroundColor: '#0A192F',
    borderWidth: 1,
    borderColor: '#233554',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBtnOpen: {
    backgroundColor: '#0D7A3E',
    borderColor: '#10B981',
  },
  statusBtnPaused: {
    backgroundColor: '#D97706',
    borderColor: '#FBBF24',
  },
  statusBtnClosed: {
    backgroundColor: '#DC2626',
    borderColor: '#F87171',
  },
  statusBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A192F',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#233554',
  },
  actionRowIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionRowTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRowSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  actionRowArrow: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: '800',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshLogsText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  noLogsText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  logItem: {
    backgroundColor: '#0A192F',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#233554',
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logAction: {
    color: '#10B981',
    fontSize: 11.5,
    fontWeight: '800',
  },
  logUser: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  logDetails: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  logTime: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '800',
  },
});
