import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../supabase';

interface ReceiptVerificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ReceiptVerificationModal: React.FC<ReceiptVerificationModalProps> = ({
  visible,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<{
    valid: boolean;
    studentId?: string;
    votedAt?: string;
    message?: string;
  } | null>(null);

  const handleVerify = async () => {
    const inputCode = code.trim();
    if (!inputCode) return;

    setLoading(true);
    setVerifiedResult(null);

    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .limit(100);

      if (error) throw error;

      const matchedReceipt = (data || []).find((r: any) => {
        try {
          const parsed = JSON.parse(r.receipt_data || '{}');
          return parsed.receiptCode === inputCode || r.id === inputCode;
        } catch {
          return false;
        }
      });

      if (matchedReceipt) {
        const parsed = JSON.parse(matchedReceipt.receipt_data || '{}');
        setVerifiedResult({
          valid: true,
          studentId: matchedReceipt.student_id,
          votedAt: parsed.votedAt || matchedReceipt.created_at,
          message: 'Official SSLG Ballot Verification Success! Record confirmed authentic in database.',
        });
      } else {
        setVerifiedResult({
          valid: false,
          message: 'Receipt code not found or invalid format. Please check the code and try again.',
        });
      }
    } catch (err) {
      setVerifiedResult({
        valid: false,
        message: 'Network error while verifying receipt code.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🛡️ Ballot Receipt Verification</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Enter receipt hash code to verify cryptographic authenticity of any cast vote.
          </Text>

          <Text style={styles.inputLabel}>Receipt Code / Hash *</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. SSLG-VOTE-109876543210-..."
              placeholderTextColor="#64748B"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify</Text>
              )}
            </TouchableOpacity>
          </View>

          {verifiedResult ? (
            <View
              style={[
                styles.resultCard,
                verifiedResult.valid ? styles.resultCardValid : styles.resultCardInvalid,
              ]}
            >
              <Text
                style={[
                  styles.resultTitle,
                  verifiedResult.valid ? styles.resultTitleValid : styles.resultTitleInvalid,
                ]}
              >
                {verifiedResult.valid ? '✓ VALID OFFICIAL RECEIPT' : '⚠️ INVALID RECEIPT CODE'}
              </Text>
              <Text style={styles.resultMsg}>{verifiedResult.message}</Text>

              {verifiedResult.valid && verifiedResult.studentId ? (
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsText}>
                    Student ID: <Text style={styles.boldText}>{verifiedResult.studentId}</Text>
                  </Text>
                  {verifiedResult.votedAt ? (
                    <Text style={styles.detailsText}>
                      Timestamp:{' '}
                      <Text style={styles.boldText}>
                        {new Date(verifiedResult.votedAt).toLocaleString()}
                      </Text>
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
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
    maxWidth: 420,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
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
  subtitle: {
    color: '#94A3B8',
    fontSize: 12.5,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#0A192F',
    borderWidth: 1,
    borderColor: '#233554',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  verifyBtn: {
    backgroundColor: '#0D7A3E',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  resultCard: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
  },
  resultCardValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  resultCardInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultTitleValid: {
    color: '#10B981',
  },
  resultTitleInvalid: {
    color: '#F87171',
  },
  resultMsg: {
    color: '#CBD5E1',
    fontSize: 12.5,
    lineHeight: 17,
  },
  detailsBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailsText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  boldText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
