import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

export default function TabBar({ activeTab, onTabPress }: TabBarProps) {
  const tabs = [
    {
      id: 'home',
      title: 'Home',
      iconName: 'home' as const,
      color: '#007AFF'
    },
    {
      id: 'camera',
      title: 'Camera',
      iconName: 'camera' as const,
      color: '#34C759'
    },
    {
      id: 'schedule',
      title: 'Schedule',
      iconName: 'calendar' as const,
      color: '#FF9500'
    },
    {
      id: 'clients',
      title: 'Clients',
      iconName: 'people' as const,
      color: '#5856D6'
    },
    {
      id: 'alerts',
      title: 'Alerts',
      iconName: 'notifications' as const,
      color: '#FF3B30'
    }
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tabItem,
            activeTab === tab.id && styles.activeTabItem
          ]}
          onPress={() => onTabPress(tab.id)}
        >
          <Ionicons
            name={tab.iconName}
            size={24}
            color={activeTab === tab.id ? '#fff' : tab.color}
          />
          <Text style={[
            styles.tabText,
            activeTab === tab.id && styles.activeTabText
          ]}>
            {tab.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTabItem: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
