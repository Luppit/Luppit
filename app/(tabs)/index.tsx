import Button from '@/src/components/button/Button'
import ProductCard from '@/src/components/ProductCard'
import { signOut } from '@/src/lib/supabase'
import React from 'react'
import { ScrollView } from 'react-native'


export default function index() {
  return (
  <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
    <Button title="Sign Out" onPress={signOut} />
        <ProductCard
          title="Compresor Sentra 2023"
          subtitle="Sistema de A/C"
          views={12}
          rating={4.5}
          ratingCount={16}
          timestamp="Justo ahora"
        />

        <ProductCard
          title="Filtro de aceite"
          subtitle="Nissan"
          views={35}
          rating={4.8}
          ratingCount={102}
          timestamp="Hace 5 min"
        /> 

           <ProductCard
          title="Filtro de aceite"
          subtitle="Nissan"
          views={35}
          rating={4.8}
          ratingCount={102}
          timestamp="Hace 5 min"
        /> 

           <ProductCard
          title="Filtro de aceite"
          subtitle="Nissan"
          views={35}
          rating={4.8}
          ratingCount={102}
          timestamp="Hace 5 min"
        /> 
               <ProductCard
          title="Filtro de aceite"
          subtitle="Nissan"
          views={35}
          rating={4.8}
          ratingCount={102}
          timestamp="Hace 5 min"
        /> 
               <ProductCard
          title="Filtro de aceite"
          subtitle="Nissan"
          views={35}
          rating={4.8}
          ratingCount={102}
          timestamp="Hace 5 min"
        /> 
               <ProductCard
          title="Filtro de aceite"
          subtitle="Nissan"
          views={35}
          rating={4.8}
          ratingCount={102}
          timestamp="Hace 5 min"
        /> 
               <ProductCard
          title="Filtro de aceite"
          subtitle="Nissan"
          views={35}
          rating={4.8}
          ratingCount={102}
          timestamp="Hace 5 min"
        /> 
               <ProductCard
          title="Filtro de aceite"
          subtitle="Nissan"
          views={35}
          rating={4.8}
          ratingCount={102}
          timestamp="Hace 5 min"
        /> 
      </ScrollView>   
  )
}