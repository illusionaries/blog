<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CloudflareServerLocations } from 'cloudflare-server-locations'

const message = ref('')

onMounted(async () => {
  try {
    const response = await (await fetch('/cdn-cgi/trace')).text()
    const match = response.match(/^colo=(.*)$/m)
    if (match) {
      const colo = match[1]!
      if (colo in CloudflareServerLocations)
        message.value = `Your request is being served by the Cloudflare CDN location: ${CloudflareServerLocations[colo as keyof typeof CloudflareServerLocations]}.`
      else
        message.value = `We are unable to determine the Cloudflare CDN serving your request: The colo code is ${colo}, which is not found in our database.`
    } else {
      message.value =
        'We are unable to determine the Cloudflare CDN serving your request: No colo information found.'
    }
  } catch (e) {
    message.value = `We are unable to determine the Cloudflare CDN serving your request: ${e}.`
  }
})
</script>

<template>
  <span class="slide-in" :key="message">{{ message }}</span>
</template>
