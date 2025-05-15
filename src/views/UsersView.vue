<template>
  <v-layout>
    <v-main>
      <div v-if="isLoading" class="users-container">
        <v-progress-circular indeterminate></v-progress-circular>
      </div>
      <div v-else-if="hasAccess" class="users-container">
        <h1>Users Management</h1>
        <!-- Add your users management content here -->
      </div>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { useAdminAccess } from '@/composables/useAdminAccess'

const { hasAccess, isLoading } = useAdminAccess()
</script>

<style scoped>
.users-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
</style> 