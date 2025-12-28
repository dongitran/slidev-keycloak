---
theme: default
title: Keycloak Protected Slides
keycloak:
  url: https://demo.com
  realm: demo
  clientId: demo
---

# Welcome to Slidev with Keycloak

This presentation is protected by Keycloak authentication.

---

# Slide 2

You can only see this if you're authenticated!

---

# Using Keycloak in Slides

```vue
<script setup>
import { useKeycloak } from '@slidev/client/composables/useKeycloak'

const { isAuthenticated, user, logout } = useKeycloak()
</script>

<template>
  <div v-if="isAuthenticated">
    Welcome, {{ user?.fullName }}!
    <button @click="logout">Logout</button>
  </div>
</template>
```

---

# Thank You!

Authentication powered by Keycloak
