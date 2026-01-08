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
        {/* Professional Header */}
        <View style={styles.professionalHeader}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#1a365d" />
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Client Management</Text>
                <Text style={styles.headerSubtitle}>Manage client relationships</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddClient(true)}>
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Enhanced Stats Dashboard */}
          {stats && (
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="people" size={24} color="#2563eb" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.totalClients}</Text>
                    <Text style={styles.statLabel}>Total Clients</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.activeClients}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="warning" size={24} color="#d97706" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.overdueServices}</Text>
                    <Text style={styles.statLabel}>Overdue</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <Ionicons name="calendar" size={24} color="#7c3aed" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.upcomingServices}</Text>
                    <Text style={styles.statLabel}>Upcoming</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Enhanced Search */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients by name, address, or contact..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Professional Tab Navigation */}
          <View style={styles.tabSection}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                onPress={() => handleTabChange('all')}
              >
                <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All Clients</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
                onPress={() => handleTabChange('upcoming')}
              >
                <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'overdue' && styles.tabActive]}
                onPress={() => handleTabChange('overdue')}
              >
                <Text style={[styles.tabText, activeTab === 'overdue' && styles.tabTextActive]}>Overdue</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Client List */}
          <View style={styles.clientListSection}>
            <FlatList
              data={clients}
              renderItem={renderClientItem}
              keyExtractor={(item) => item.id}
              style={styles.clientList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No clients found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery ? 'Try adjusting your search terms' : 'Add your first client to get started'}
                  </Text>
                </View>
              }
            />
          </View>
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
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },

  // Professional Header
  professionalHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: 50,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a365d',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Stats Section
  statsSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },

  // Tab Section
  tabSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },

  // Client List Section
  clientListSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  clientList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },

  // Client Item (keeping existing styles for now)
  clientItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
    lineHeight: 20,
  },
  clientContact: {
    fontSize: 12,
    color: '#94a3b8',
  },
  industryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  industryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientDetails: {
    marginTop: 8,
  },
  systemTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  systemType: {
    fontSize: 11,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
    fontWeight: '500',
  },
  nextService: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '600',
  },

  // Detail Modal (keeping existing styles)
  detailContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  serviceItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 12,
    color: '#64748b',
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
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  serviceTechnician: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  serviceCost: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceFindings: {
    fontSize: 12,
    color: '#64748b',
  },
  closeButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
    fontStyle: 'italic',
    marginVertical: 20,
  },
});
