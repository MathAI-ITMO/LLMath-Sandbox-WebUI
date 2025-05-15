<template>
  <v-layout>
    <v-main>
      <div v-if="isLoading" class="invite-codes-container">
        <v-progress-circular indeterminate></v-progress-circular>
      </div>
      <div v-else-if="hasAccess" class="invite-codes-container">
        <h1>Коды приглашений</h1>
        <!-- Add your invitation codes management content here -->
      </div>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { useAdminAccess } from '@/composables/useAdminAccess'

const { hasAccess, isLoading } = useAdminAccess()
</script>

<style scoped>
.invite-codes-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 200px;
}
</style> 