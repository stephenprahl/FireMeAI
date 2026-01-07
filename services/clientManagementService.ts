export interface Client {
  id: string;
  name: string;
  businessName?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email?: string;
  contactPerson: string;
  contactTitle?: string;
  industry: 'commercial' | 'industrial' | 'residential' | 'institutional' | 'government';
  systemTypes: ('sprinkler' | 'fire_alarm' | 'fire_pump' | 'emergency_lighting' | 'kitchen_hood' | 'other')[];
  serviceFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'as_needed';
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
  isActive: boolean;
  notes?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  billingAddress?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceHistory {
  id: string;
  clientId: string;
  serviceDate: Date;
  serviceType: 'inspection' | 'maintenance' | 'repair' | 'installation' | 'emergency_service';
  technician: string;
  findings: string;
  recommendations: string;
  complianceStatus: 'compliant' | 'non_compliant' | 'requires_attention';
  nextServiceDate?: Date;
  cost?: number;
  invoiceId?: string;
  notes?: string;
  createdAt: Date;
}

export interface ClientSearchFilters {
  name?: string;
  city?: string;
  industry?: Client['industry'];
  systemType?: Client['systemTypes'][0];
  isActive?: boolean;
  serviceOverdue?: boolean;
}

export class ClientManagementService {
  private clients: Map<string, Client> = new Map();
  private serviceHistory: Map<string, ServiceHistory[]> = new Map();
  
  constructor() {
    this.initializeSampleClients();
  }

  private initializeSampleClients(): void {
    // Initialize with sample K&E Fire clients
    const sampleClients: Client[] = [
      {
        id: 'client-1',
        name: 'ABC Corporation',
        businessName: 'ABC Corporation',
        address: '123 Main Street',
        city: 'Wahl',
        state: 'NJ',
        zipCode: '07076',
        phone: '(555) 123-4567',
        email: 'facilities@abccorp.com',
        contactPerson: 'John Smith',
        contactTitle: 'Facilities Manager',
        industry: 'commercial',
        systemTypes: ['sprinkler', 'fire_alarm'],
        serviceFrequency: 'quarterly',
        lastInspectionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        nextInspectionDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        isActive: true,
        emergencyContact: {
          name: 'Jane Doe',
          phone: '(555) 987-6543',
          relationship: 'Assistant Manager'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'client-2',
        name: 'XYZ Manufacturing',
        businessName: 'XYZ Manufacturing LLC',
        address: '456 Industrial Way',
        city: 'Newark',
        state: 'NJ',
        zipCode: '07102',
        phone: '(555) 234-5678',
        email: 'safety@xyzmfg.com',
        contactPerson: 'Mike Johnson',
        contactTitle: 'Safety Director',
        industry: 'industrial',
        systemTypes: ['sprinkler', 'fire_pump', 'emergency_lighting'],
        serviceFrequency: 'monthly',
        lastInspectionDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        nextInspectionDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        isActive: true,
        notes: 'High-priority client with critical systems',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'client-3',
        name: 'St. Mary\'s Hospital',
        businessName: 'St. Mary\'s Medical Center',
        address: '789 Healthcare Blvd',
        city: 'Paterson',
        state: 'NJ',
        zipCode: '07501',
        phone: '(555) 345-6789',
        email: 'maintenance@stmarys.org',
        contactPerson: 'Sarah Wilson',
        contactTitle: 'Maintenance Supervisor',
        industry: 'institutional',
        systemTypes: ['sprinkler', 'fire_alarm', 'emergency_lighting', 'kitchen_hood'],
        serviceFrequency: 'monthly',
        lastInspectionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        nextInspectionDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23 days from now
        isActive: true,
        emergencyContact: {
          name: 'Dr. Robert Chen',
          phone: '(555) 876-5432',
          relationship: 'Chief Medical Officer'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    sampleClients.forEach(client => {
      this.clients.set(client.id, client);
      this.serviceHistory.set(client.id, this.generateSampleServiceHistory(client.id));
    });
  }

  private generateSampleServiceHistory(clientId: string): ServiceHistory[] {
    const client = this.clients.get(clientId);
    if (!client) return [];

    const history: ServiceHistory[] = [
      {
        id: `service-${clientId}-1`,
        clientId,
        serviceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        serviceType: 'inspection',
        technician: 'John Smith',
        findings: 'All systems operational. Minor corrosion noted on riser 2.',
        recommendations: 'Monitor corrosion, schedule maintenance in 6 months.',
        complianceStatus: 'compliant',
        nextServiceDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        cost: 450,
        invoiceId: `INV-${Date.now()}-1`,
        notes: 'Annual NFPA 25 inspection completed.',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: `service-${clientId}-2`,
        clientId,
        serviceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        serviceType: 'maintenance',
        technician: 'Mike Johnson',
        findings: 'Fire alarm battery replacement completed.',
        recommendations: 'Replace batteries annually.',
        complianceStatus: 'compliant',
        cost: 275,
        invoiceId: `INV-${Date.now()}-2`,
        notes: 'Routine maintenance performed.',
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      }
    ];

    return history;
  }

  async createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const client: Client = {
      ...clientData,
      id: `client-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.clients.set(client.id, client);
    this.serviceHistory.set(client.id, []);
    
    return client;
  }

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    const updatedClient = {
      ...client,
      ...updates,
      updatedAt: new Date()
    };

    this.clients.set(clientId, updatedClient);
    return updatedClient;
  }

  async getClient(clientId: string): Promise<Client | null> {
    return this.clients.get(clientId) || null;
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async searchClients(filters: ClientSearchFilters): Promise<Client[]> {
    const clients = Array.from(this.clients.values());
    
    return clients.filter(client => {
      if (filters.name && !client.name.toLowerCase().includes(filters.name.toLowerCase()) &&
          !client.businessName?.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      
      if (filters.city && !client.city.toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
      
      if (filters.industry && client.industry !== filters.industry) {
        return false;
      }
      
      if (filters.systemType && !client.systemTypes.includes(filters.systemType)) {
        return false;
      }
      
      if (filters.isActive !== undefined && client.isActive !== filters.isActive) {
        return false;
      }
      
      if (filters.serviceOverdue && client.nextInspectionDate) {
        const now = new Date();
        if (client.nextInspectionDate > now) {
          return false;
        }
      }
      
      return true;
    });
  }

  async getClientServiceHistory(clientId: string): Promise<ServiceHistory[]> {
    return this.serviceHistory.get(clientId) || [];
  }

  async addServiceHistory(serviceData: Omit<ServiceHistory, 'id' | 'createdAt'>): Promise<ServiceHistory> {
    const service: ServiceHistory = {
      ...serviceData,
      id: `service-${Date.now()}`,
      createdAt: new Date()
    };

    const history = this.serviceHistory.get(serviceData.clientId) || [];
    history.push(service);
    this.serviceHistory.set(serviceData.clientId, history);

    // Update client's last inspection date if this was an inspection
    if (serviceData.serviceType === 'inspection') {
      const client = this.clients.get(serviceData.clientId);
      if (client) {
        await this.updateClient(serviceData.clientId, {
          lastInspectionDate: serviceData.serviceDate,
          nextInspectionDate: serviceData.nextServiceDate
        });
      }
    }

    return service;
  }

  async getClientsNeedingService(daysAhead: number = 7): Promise<Client[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    return Array.from(this.clients.values()).filter(client => {
      if (!client.isActive || !client.nextInspectionDate) return false;
      return client.nextInspectionDate >= now && client.nextInspectionDate <= futureDate;
    });
  }

  async getOverdueClients(): Promise<Client[]> {
    const now = new Date();
    
    return Array.from(this.clients.values()).filter(client => {
      if (!client.isActive || !client.nextInspectionDate) return false;
      return client.nextInspectionDate < now;
    });
  }

  async getClientStats(): Promise<{
    totalClients: number;
    activeClients: number;
    overdueServices: number;
    upcomingServices: number;
    clientsByIndustry: Record<Client['industry'], number>;
  }> {
    const clients = Array.from(this.clients.values());
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.isActive).length,
      overdueServices: clients.filter(c => 
        c.isActive && c.nextInspectionDate && c.nextInspectionDate < now
      ).length,
      upcomingServices: clients.filter(c => 
        c.isActive && c.nextInspectionDate && 
        c.nextInspectionDate >= now && 
        c.nextInspectionDate <= weekFromNow
      ).length,
      clientsByIndustry: clients.reduce((acc, client) => {
        acc[client.industry] = (acc[client.industry] || 0) + 1;
        return acc;
      }, {} as Record<Client['industry'], number>)
    };

    return stats;
  }

  async deleteClient(clientId: string): Promise<void> {
    this.clients.delete(clientId);
    this.serviceHistory.delete(clientId);
  }

  async getClientByPhone(phone: string): Promise<Client | null> {
    const normalizedPhone = phone.replace(/\D/g, '');
    
    for (const client of this.clients.values()) {
      const clientPhone = client.phone.replace(/\D/g, '');
      if (clientPhone === normalizedPhone) {
        return client;
      }
    }
    
    return null;
  }

  async getRecentServiceHistory(days: number = 30): Promise<ServiceHistory[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const allHistory: ServiceHistory[] = [];
    
    for (const history of this.serviceHistory.values()) {
      allHistory.push(...history.filter(service => service.serviceDate >= cutoffDate));
    }
    
    return allHistory.sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime());
  }
}
