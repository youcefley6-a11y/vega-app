import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' }}>
          <Text style={{ color: '#e50914', fontSize: 28, fontWeight: 'bold' }}>Vega</Text>
        </View>

        {/* Message principal */}
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
            No Provider Installed
          </Text>
          <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
            You need to install at least one provider to start watching content.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#e50914',
              paddingVertical: 12,
              paddingHorizontal: 32,
              borderRadius: 6,
            }}
            onPress={() => {
              // À connecter plus tard
              console.log('Install providers');
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Install Providers</Text>
          </TouchableOpacity>
        </View>

        {/* Barre du bas simulée */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#333' }}>
          <Text style={{ color: '#fff' }}>🏠 Home</Text>
          <Text style={{ color: '#888' }}>🔍 Search</Text>
          <Text style={{ color: '#888' }}>📥 Downloads</Text>
          <Text style={{ color: '#888' }}>👤 Profile</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
