import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { supabase, logAuditAction } from '../supabase';
import { POSITIONS } from '../types';
import { COLORS, RADIUS } from '../theme';

interface AdminAddCandidateModalProps {
  visible: boolean;
  onClose: () => void;
  onCandidateAdded: () => void;
}

export const AdminAddCandidateModal: React.FC<AdminAddCandidateModalProps> = ({
  visible,
  onClose,
  onCandidateAdded,
}) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<string>(POSITIONS[0]);
  const [platform, setPlatform] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddCandidate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Candidate full name is required.');
      return;
    }

    setLoading(true);
    try {
      const candidateId = `cand_${Date.now()}`;
      const { error } = await supabase.from('candidates').insert([
        {
          id: candidateId,
          name: name.trim(),
          position,
          platform: platform.trim(),
          grade: grade.trim() || 'N/A',
          section: section.trim() || 'N/A',
        },
      ]);

      if (error) throw error;

      await logAuditAction('CANDIDATE_ADDED', 'Faculty Admin', `Added candidate ${name} for ${position}`);

      Alert.alert('Success!', `Candidate ${name} registered for ${position}.`);
      setName('');
      setPlatform('');
      setGrade('');
      setSection('');
      onCandidateAdded();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to add candidate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Candidate</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Candidate Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Juan dela Cruz"
              placeholderTextColor={COLORS.textSubtle}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Position Sought *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posScroll}>
              {POSITIONS.map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.posChip, position === pos && styles.posChipActive]}
                  onPress={() => setPosition(pos)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.posChipText, position === pos && styles.posChipTextActive]}>
                    {pos}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Grade Level & Section</Text>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Grade (e.g. 10)"
                placeholderTextColor={COLORS.textSubtle}
                value={grade}
                onChangeText={setGrade}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Section (e.g. Rizal)"
                placeholderTextColor={COLORS.textSubtle}
                value={section}
                onChangeText={setSection}
              />
            </View>

            <Text style={styles.inputLabel}>Campaign Advocacy & Platform Statement</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe candidate's platform and key advocacies..."
              placeholderTextColor={COLORS.textSubtle}
              value={platform}
              onChangeText={setPlatform}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAddCandidate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textMain} />
              ) : (
                <Text style={styles.submitBtnText}>Register Candidate</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryNavy,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cancelBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.glassBg,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  inputLabel: {
    color: COLORS.textMain,
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textMain,
    fontSize: 14,
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  posScroll: {
    marginBottom: 16,
  },
  posChip: {
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  posChipActive: {
    backgroundColor: COLORS.primaryEmerald,
    borderColor: COLORS.primaryMint,
  },
  posChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  posChipTextActive: {
    color: COLORS.textMain,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: COLORS.primaryEmerald,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: COLORS.textMain,
    fontSize: 15,
    fontWeight: '800',
  },
});
