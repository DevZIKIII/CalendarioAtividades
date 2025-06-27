// App.js - Aplicativo React Native com Expo
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

// ATENÇÃO: Troque 'SEU_IP_LOCAL' pelo IP do seu computador na rede
const API_URL = 'http://SEU_IP_LOCAL:3000/api/activities';

export default function App() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date(),
    time: new Date(),
    subject: '',
    priority: 'medium'
  });

  // Buscar atividades da API
  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Erro de rede ou servidor');
      }
      const data = await response.json();
      setActivities(data);
    } catch (err) {
      Alert.alert('Erro', `Não foi possível carregar as atividades. Verifique sua conexão e o endereço da API. Detalhes: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Criar ou atualizar atividade na API
  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.subject) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }

    const method = editingActivity ? 'PUT' : 'POST';
    const url = editingActivity ? `${API_URL}/${editingActivity._id}` : API_URL;

    const activityData = {
      ...formData,
      date: formData.date.toISOString().split('T')[0], // Formato YYYY-MM-DD
      time: formData.time.toTimeString().split(' ')[0].slice(0, 5), // Formato HH:MM
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar a atividade');
      }
      
      Alert.alert('Sucesso', 'Atividade salva com sucesso!');
      resetForm();
      fetchActivities(); // Atualiza a lista
    } catch (err) {
      Alert.alert('Erro', `Não foi possível salvar a atividade. Detalhes: ${err.message}`);
    }
  };

  // Deletar atividade
  const handleDelete = (id) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta atividade?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
              if (!response.ok) {
                throw new Error('Erro ao excluir');
              }
              // Remove o item da lista localmente para uma resposta visual rápida
              setActivities(prevActivities => prevActivities.filter(activity => activity._id !== id));
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível excluir a atividade.');
            }
          }
        }
      ]
    );
  };

  // Marcar como concluída / Reabrir
  const toggleComplete = async (activity) => {
    const updatedActivityData = { ...activity, completed: !activity.completed };

    try {
      const response = await fetch(`${API_URL}/${activity._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedActivityData),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar');
      }
      
      // Atualiza a lista localmente
      const updatedActivities = activities.map(item =>
        item._id === activity._id ? { ...item, completed: !item.completed } : item
      );
      setActivities(updatedActivities);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar a atividade.');
    }
  };

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date(),
      time: new Date(),
      subject: '',
      priority: 'medium'
    });
    setEditingActivity(null);
    setShowForm(false);
  };

  const handleEdit = (activity) => {
    // Corrige a data para o fuso horário local ao editar
    const dateWithOffset = new Date(activity.date);
    const correctedDate = new Date(dateWithOffset.getTime() + dateWithOffset.getTimezoneOffset() * 60000);
    
    const [hours, minutes] = activity.time.split(':');
    const timeDate = new Date();
    timeDate.setHours(hours, minutes);

    setFormData({
      title: activity.title,
      description: activity.description,
      date: correctedDate,
      time: timeDate,
      subject: activity.subject,
      priority: activity.priority
    });
    setEditingActivity(activity);
    setShowForm(true);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const correctedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return correctedDate.toLocaleDateString('pt-BR');
  };

  // Ordenar atividades por data
  const sortedActivities = [...activities].sort((a, b) =>
    new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)
  );

  // Renderizar item da lista
  const renderActivity = ({ item }) => (
    <TouchableOpacity
      style={[styles.activityCard, item.completed && styles.completedCard]}
      onPress={() => toggleComplete(item)}
    >
      <View style={styles.activityHeader}>
        <Text style={[styles.activityTitle, item.completed && styles.completedText]}>
          {item.title}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>
            {item.priority === 'high' ? 'Alta' :
              item.priority === 'medium' ? 'Média' : 'Baixa'}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.activityDescription, item.completed && styles.completedText]}>
        {item.description}
      </Text>
      
      <View style={styles.activityDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{item.time}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="book-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{item.subject}</Text>
        </View>
      </View>
      
      <View style={styles.activityActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => toggleComplete(item)}
        >
          <Ionicons
            name={item.completed ? "close-circle-outline" : "checkmark-circle-outline"}
            size={20}
            color={item.completed ? "#6b7280" : "#10b981"}
          />
          <Text style={[styles.actionText, { color: item.completed ? "#6b7280" : "#10b981" }]}>
            {item.completed ? 'Reabrir' : 'Concluir'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="create-outline" size={20} color="#3b82f6" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDelete(item._id)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Carregando atividades...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="calendar" size={32} color="#3b82f6" />
          <Text style={styles.headerTitle}>Calendário de Atividades</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm(); 
            setShowForm(true);
          }}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      {/* Lista de Atividades */}
      {sortedActivities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>Nenhuma atividade cadastrada</Text>
          <Text style={styles.emptySubtext}>
            Toque no botão + para adicionar uma nova atividade
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedActivities}
          renderItem={renderActivity}
          keyExtractor={item => item._id} // Usar _id do MongoDB
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Modal de Formulário */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent={true}
        onRequestClose={resetForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingActivity ? 'Editar Atividade' : 'Nova Atividade'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Título</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.title}
                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                    placeholder="Ex: Prova de Matemática"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Descrição</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Ex: Estudar capítulos 5 e 6"
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Data</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                      <Text style={styles.dateButtonText}>
                        {formData.date.toLocaleDateString('pt-BR')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Horário</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={20} color="#6b7280" />
                      <Text style={styles.dateButtonText}>
                        {formData.time.toTimeString().slice(0, 5)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Matéria</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.subject}
                    onChangeText={(text) => setFormData({ ...formData, subject: text })}
                    placeholder="Ex: Matemática"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Prioridade</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Baixa" value="low" />
                      <Picker.Item label="Média" value="medium" />
                      <Picker.Item label="Alta" value="high" />
                    </Picker>
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={resetForm}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.submitButtonText}>
                      {editingActivity ? 'Salvar' : 'Criar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setFormData({ ...formData, date: selectedDate });
            }
          }}
        />
      )}
      
      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={formData.time}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setFormData({ ...formData, time: selectedTime });
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  completedCard: {
    backgroundColor: '#f9f9f9', // Cor mais sutil para item completo
    opacity: 0.8,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  activityDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  activityDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  activityActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  completeButton: {
    backgroundColor: '#f0fdf4',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  rightActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 44 // Altura fixa para alinhar com o input
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});