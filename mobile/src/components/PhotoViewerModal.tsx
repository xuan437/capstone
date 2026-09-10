import React from 'react';
import { StyleSheet, View, Image, Text, TouchableOpacity, Modal } from 'react-native';

interface PhotoViewerModalProps {
  visible: boolean;
  imageUrl?: string;
  candidateName?: string;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  visible,
  imageUrl,
  candidateName,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>{candidateName || 'Candidate Photo'}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.imageBox}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>📷 No Photo Provided</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 47, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#112240',
    borderRadius: 14,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '700',
  },
  imageBox: {
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A192F',
    padding: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
