import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Client, ClientManagementService, ServiceHistory } from '../services/clientManagementService';

interface ClientManagementProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function ClientManagementComponent({ isVisible, onClose }: ClientManagementProps) {
  const [clientService] = useState(() => new ClientManagementService());
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'overdue'>('all');

  useEffect(() => {
    if (isVisible) {
      loadClients();
      loadStats();
    }
  }, [isVisible]);

  const loadClients = async () => {
    try {
      const allClients = await clientService.getAllClients();
      setClients(allClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadStats = async () => {
    try {
      const clientStats = await clientService.getClientStats();
      setStats(clientStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadFilteredClients = async (tab: 'all' | 'upcoming' | 'overdue') => {
    try {
      let filteredClients: Client[] = [];
      
      switch (tab) {
        case 'upcoming':
          filteredClients = await clientService.getClientsNeedingService(7);
          break;
        case 'overdue':
          filteredClients = await clientService.getOverdueClients();
          break;
        default:
          filteredClients = await clientService.getAllClients();
      }
      
      setClients(filteredClients);
    } catch (error) {
      console.error('Error loading filtered clients:', error);
    }
  };

  const handleTabChange = (tab: 'all' | 'upcoming' | 'overdue') => {
    setActiveTab(tab);
    loadFilteredClients(tab);
  };

  const handleClientSelect = async (client: Client) => {
    setSelectedClient(client);
    try {
      const history = await clientService.getClientServiceHistory(client.id);
      setServiceHistory(history);
    } catch (error) {
      console.error('Error loading service history:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadClients();
      return;
    }

    try {
      const filteredClients = await clientService.searchClients({ name: searchQuery });
      setClients(filteredClients);
    } catch (error) {
      console.error('Error searching clients:', error);
    }
  };

  const getIndustryColor = (industry: string) => {
    switch (industry) {
      case 'commercial': return '#007AFF';
      case 'industrial': return '#FF9500';
      case 'institutional': return '#34C759';
      case 'government': return '#8E8E93';
      case 'residential': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return '#34C759';
      case 'non_compliant': return '#FF3B30';
      case 'requires_attention': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderClientItem = ({ item: client }: { item: Client }) => (
    <TouchableOpacity 
      style={styles.clientItem}
      onPress={() => handleClientSelect(client)}
    >
      <View style={styles.clientHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{client.name}</Text>
          <Text style={styles.clientAddress}>{client.address}, {client.city}</Text>
          <Text style={styles.clientContact}>{client.contactPerson} • {client.phone}</Text>
        </View>
        <View style={[styles.industryBadge, { backgroundColor: getIndustryColor(client.industry) }]}>
          <Text style={styles.industryText}>{client.industry.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.clientDetails}>
        <View style={styles.systemTypes}>
          {client.systemTypes.map((system, index) => (
            <Text key={index} style={styles.systemType}>{system}</Text>
          ))}
        </View>
        
        {client.nextInspectionDate && (
          <Text style={styles.nextService}>
            Next service: {formatDate(client.nextInspectionDate)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderServiceHistoryItem = ({ item: service }: { item: ServiceHistory }) => (
    <View style={styles.serviceItem}>
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceDate}>{formatDate(service.serviceDate)}</Text>
        <View style={[styles.complianceBadge, { backgroundColor: getServiceStatusColor(service.complianceStatus) }]}>
          <Text style={styles.complianceText}>{service.complianceStatus.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.serviceType}>{service.serviceType.replace('_', ' ').toUpperCase()}</Text>
      <Text style={styles.serviceTechnician}>Technician: {service.technician}</Text>
      {service.cost && <Text style={styles.serviceCost}>Cost: ${service.cost}</Text>}
      <Text style={styles.serviceFindings}>{service.findings}</Text>
    </View>
  );

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Client Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Stats Overview */}
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalClients}</Text>
                <Text style={styles.statLabel}>Total Clients</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.activeClients}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.overdueServices}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.upcomingServices}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Ionicons name="search" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => handleTabChange('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
              onPress={() => handleTabChange('upcoming')}
            >
              <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>Upcoming</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overdue' && styles.activeTab]}
              onPress={() => handleTabChange('overdue')}
            >
              <Text style={[styles.tabText, activeTab === 'overdue' && styles.activeTabText]}>Overdue</Text>
            </TouchableOpacity>
          </View>

          {/* Client List */}
          <FlatList
            data={clients}
            renderItem={renderClientItem}
            keyExtractor={(item) => item.id}
            style={styles.clientList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No clients found</Text>
            }
          />
        </ScrollView>

        {/* Client Detail Modal */}
        {selectedClient && (
          <Modal visible={!!selectedClient} animationType="slide">
            <View style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{selectedClient.name}</Text>
                <TouchableOpacity onPress={() => setSelectedClient(null)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.detailContent}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Contact Information</Text>
                  <Text style={styles.detailText}>{selectedClient.address}</Text>
                  <Text style={styles.detailText}>{selectedClient.city}, {selectedClient.state} {selectedClient.zipCode}</Text>
                  <Text style={styles.detailText}>Phone: {selectedClient.phone}</Text>
                  {selectedClient.email && <Text style={styles.detailText}>Email: {selectedClient.email}</Text>}
                  <Text style={styles.detailText}>Contact: {selectedClient.contactPerson}</Text>
                  {selectedClient.contactTitle && <Text style={styles.detailText}>{selectedClient.contactTitle}</Text>}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Service Information</Text>
                  <Text style={styles.detailText}>Industry: {selectedClient.industry}</Text>
                  <Text style={styles.detailText}>Service Frequency: {selectedClient.serviceFrequency.replace('_', ' ')}</Text>
                  {selectedClient.lastInspectionDate && (
                    <Text style={styles.detailText}>Last Inspection: {formatDate(selectedClient.lastInspectionDate)}</Text>
                  )}
                  {selectedClient.nextInspectionDate && (
                    <Text style={styles.detailText}>Next Inspection: {formatDate(selectedClient.nextInspectionDate)}</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Service History</Text>
                  <FlatList
                    data={serviceHistory}
                    renderItem={renderServiceHistoryItem}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No service history available</Text>
                    }
                  />
                </View>
              </ScrollView>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  searchButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  clientList: {
    flex: 1,
  },
  clientItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  clientContact: {
    fontSize: 12,
    color: '#999',
  },
  industryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  industryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  clientDetails: {
    marginTop: 8,
  },
  systemTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  systemType: {
    fontSize: 10,
    color: '#007AFF',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  nextService: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  serviceItem: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 12,
    color: '#666',
  },
  complianceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  complianceText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  serviceType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  serviceTechnician: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  serviceCost: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  serviceFindings: {
    fontSize: 12,
    color: '#666',
  },
});
