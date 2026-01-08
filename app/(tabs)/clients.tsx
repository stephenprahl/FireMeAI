import React from 'react';
import { View } from 'react-native';
import ClientManagementComponent from '../../components/ClientManagementComponent';

export default function ClientsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ClientManagementComponent
        isVisible={true}
        onClose={() => {}}
        useModal={false}
      />
    </View>
  );
}