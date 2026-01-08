import React from 'react';
import { View } from 'react-native';
import CameraGaugeReader from '../../components/CameraGaugeReader';

export default function CameraScreen() {
  return (
    <View style={{ flex: 1 }}>
      <CameraGaugeReader
        onGaugeRead={(reading) => {
          console.log('Gauge reading:', reading);
        }}
        onClose={() => {
          // Handle navigation back if needed
        }}
      />
    </View>
  );
}