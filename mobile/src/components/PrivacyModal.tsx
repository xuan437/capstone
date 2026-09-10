import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📜 SSLG Privacy & Election Guidelines</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeading}>1. Ballot Anonymity & Secret Voting</Text>
            <Text style={styles.paragraph}>
              All votes cast in the Supreme Secondary Learner Government (SSLG) election are encrypted and tabulated anonymously. Individual candidate selections are disconnected from your personal LRN profile to maintain vote confidentiality.
            </Text>

            <Text style={styles.sectionHeading}>2. One Vote Per Learner</Text>
            <Text style={styles.paragraph}>
              Each registered student is allocated exactly one official digital ballot. Once your ballot is submitted and recorded, your account status is updated to VOTED and cannot be cast again.
            </Text>

            <Text style={styles.sectionHeading}>3. Verification & Digital Receipts</Text>
            <Text style={styles.paragraph}>
              Upon ballot submission, a unique cryptographic voting pass stub code is generated. This code allows voters and election officers to verify vote record presence without revealing candidate selections.
            </Text>

            <Text style={styles.sectionHeading}>4. Data Protection Compliance</Text>
            <Text style={styles.paragraph}>
              All student LRN data, grades, and section registries are kept securely within school database servers in accordance with Department of Education (DepEd) learner data protection directives.
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.acceptBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.acceptBtnText}>I Understand & Agree</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 47, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#112240',
    borderRadius: 14,
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollBody: {
    marginBottom: 14,
  },
  sectionHeading: {
    color: '#10B981',
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    color: '#CBD5E1',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 10,
  },
  acceptBtn: {
    backgroundColor: '#0D7A3E',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
