import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData, Document } from '../contexts/DataContext';
import { GradientBackground } from '../components/GradientBackground';
import { Card } from '../components/Card';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { FormSelect } from '../components/FormSelect';
import { Button } from '../components/Button';
import {
  generateId,
  getDaysUntilExpiry,
  getExpiryStatus,
  getStatusColor,
  formatDate,
  documentCategories,
} from '../utils/helpers';

export const DocumentsScreen: React.FC = () => {
  const { state, addDocument, updateDocument, deleteDocument } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [form, setForm] = useState<Partial<Document>>({});
  const isDark = state.theme === 'dark';

  const categoryOptions = documentCategories.map(c => ({ label: c.name, value: c.id }));

  const openAddModal = () => {
    setEditingDoc(null);
    setForm({ category: 'passport' });
    setModalVisible(true);
  };

  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
    setForm(doc);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.name || !form.category) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    const docData: Document = {
      id: editingDoc?.id || generateId(),
      category: form.category || 'passport',
      name: form.name || '',
      number: form.number || '',
      issueDate: form.issueDate || '',
      expiryDate: form.expiryDate || '',
      issuePlace: form.issuePlace || '',
      notes: form.notes || '',
    };

    if (editingDoc) {
      updateDocument(docData);
    } else {
      addDocument(docData);
    }
    setModalVisible(false);
  };

  const handleDelete = (doc: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteDocument(doc.id) },
      ]
    );
  };

  const getExpiringCount = () => {
    return state.documents.filter(d => {
      const days = getDaysUntilExpiry(d.expiryDate);
      return days >= 0 && days <= 90;
    }).length;
  };

  const renderCategory = (categoryId: string, categoryName: string) => {
    const docs = state.documents.filter(d => d.category === categoryId);
    if (docs.length === 0) return null;

    return (
      <View key={categoryId} style={styles.category}>
        <Text style={[styles.categoryTitle, isDark ? styles.textLight : styles.textDark]}>
          {categoryName}
        </Text>
        {docs.map(doc => {
          const days = getDaysUntilExpiry(doc.expiryDate);
          const status = getExpiryStatus(days);
          return (
            <Card
              key={doc.id}
              statusColor={getStatusColor(status)}
              onEdit={() => openEditModal(doc)}
              onDelete={() => handleDelete(doc)}
            >
              <Text style={[styles.docName, isDark ? styles.textLight : styles.textDark]}>
                {doc.name}
              </Text>
              <Text style={[styles.docInfo, isDark ? styles.textMuted : styles.textMutedLight]}>
                {doc.number || 'No number'} • Expires: {formatDate(doc.expiryDate)}
              </Text>
              {days >= 0 && days <= 90 && (
                <Text style={[styles.expiryWarning, { color: getStatusColor(status) }]}>
                  {days === 0 ? 'Expires today!' : `${days} days left`}
                </Text>
              )}
              {days < 0 && (
                <Text style={styles.expiredText}>Expired</Text>
              )}
            </Card>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {getExpiringCount() > 0 && (
        <View style={styles.alert}>
          <Ionicons name="warning" size={20} color="#FF9800" />
          <Text style={styles.alertText}>
            {getExpiringCount()} document(s) expiring within 90 days
          </Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {state.documents.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
            <Text style={[styles.emptyText, isDark ? styles.textMuted : styles.textMutedLight]}>
              No documents added yet
            </Text>
            <Text style={[styles.emptyHint, isDark ? styles.textMuted : styles.textMutedLight]}>
              Tap the + button to add your first document
            </Text>
          </View>
        ) : (
          documentCategories.map(cat => renderCategory(cat.id, cat.name))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <FormModal
        visible={modalVisible}
        title={editingDoc ? 'Edit Document' : 'Add Document'}
        onClose={() => setModalVisible(false)}
      >
        <FormSelect
          label="Category"
          value={form.category || ''}
          options={categoryOptions}
          onChange={(v) => setForm({ ...form, category: v })}
          required
        />
        <FormInput
          label="Document Name"
          value={form.name || ''}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="e.g., Passport"
          required
        />
        <FormInput
          label="Document Number"
          value={form.number || ''}
          onChangeText={(v) => setForm({ ...form, number: v })}
          placeholder="e.g., AB1234567"
        />
        <FormInput
          label="Issue Date (YYYY-MM-DD)"
          value={form.issueDate || ''}
          onChangeText={(v) => setForm({ ...form, issueDate: v })}
          placeholder="2023-01-15"
        />
        <FormInput
          label="Expiry Date (YYYY-MM-DD)"
          value={form.expiryDate || ''}
          onChangeText={(v) => setForm({ ...form, expiryDate: v })}
          placeholder="2033-01-15"
        />
        <FormInput
          label="Place of Issue"
          value={form.issuePlace || ''}
          onChangeText={(v) => setForm({ ...form, issuePlace: v })}
          placeholder="e.g., Manila, Philippines"
        />
        <FormInput
          label="Notes"
          value={form.notes || ''}
          onChangeText={(v) => setForm({ ...form, notes: v })}
          placeholder="Additional notes..."
          multiline
          numberOfLines={3}
        />
        <Button title="Save Document" onPress={handleSave} style={{ marginTop: 10 }} />
      </FormModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  alert: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 10,
  },
  alertText: {
    color: '#FF9800',
    fontWeight: '600',
  },
  category: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#333',
  },
  textMuted: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  textMutedLight: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  docName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  docInfo: {
    fontSize: 13,
  },
  expiryWarning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    color: '#F44336',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
