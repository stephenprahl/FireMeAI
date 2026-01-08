import React from 'react';
import { View } from 'react-native';
import SchedulingComponent from '../../components/SchedulingComponent';

export default function ScheduleScreen() {
  return (
    <View style={{ flex: 1 }}>
      <SchedulingComponent
        isVisible={true}
        onClose={() => {}}
        useModal={false}
      />
    </View>
  );
}