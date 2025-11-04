import Navbar from '@/src/components/Navbar';
import { colors, spacing } from '@/src/themes';
import { Slot, usePathname } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabsLayout() {
    const path = usePathname();
    return (
        <SafeAreaView style={{...layoutStyles.container, ...layoutStyles.view}}>
            <View style={layoutStyles.container}>
                <Slot></Slot>
            </View>
            <Navbar>
            </Navbar> 
        </SafeAreaView>
    );
}

const layoutStyles = {
    container: {
        flex: 1,
    },
    view: {
        padding: spacing.md,
        backgroundColor: colors.background
    }
}