import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TabBarProps {
    activeTab: string;
    onTabPress: (tab: string) => void;
}

export default function TabLayout({ activeTab, onTabPress }: TabBarProps) {
    const tabs = [
        {
            id: 'home',
            title: 'Home',
            iconName: 'home-outline' as const,
            activeIconName: 'home' as const,
        },
        {
            id: 'camera',
            title: 'Camera',
            iconName: 'camera-outline' as const,
            activeIconName: 'camera' as const,
        },
        {
            id: 'schedule',
            title: 'Schedule',
            iconName: 'calendar-outline' as const,
            activeIconName: 'calendar' as const,
        },
        {
            id: 'clients',
            title: 'Clients',
            iconName: 'people-outline' as const,
            activeIconName: 'people' as const,
        },
        {
            id: 'alerts',
            title: 'Alerts',
            iconName: 'notifications-outline' as const,
            activeIconName: 'notifications' as const,
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
                        name={activeTab === tab.id ? tab.activeIconName : tab.iconName}
                        size={24}
                        color={activeTab === tab.id ? '#ffffff' : '#64748b'}
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
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 12,
        paddingBottom: 24,
        paddingHorizontal: 16,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 12,
        marginHorizontal: 2,
    },
    activeTabItem: {
        backgroundColor: '#2563eb',
        elevation: 4,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    tabText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    activeTabText: {
        color: '#ffffff',
        fontWeight: '600',
    },
});
