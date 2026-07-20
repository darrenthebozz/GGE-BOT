<style>
@import "tailwindcss";
@import "flowbite-vue/index.css";
@plugin "flowbite/plugin";
@source "../../node_modules/flowbite-vue";
</style>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { initFlowbite } from 'flowbite'
import { FwbButton, FwbModal } from 'flowbite-vue'
import ReconnectingWebSocket from "reconnecting-websocket"

import SubUser from "./sub-user.vue"
import Settings from "./subuser-settings.vue"

onMounted(initFlowbite)

const isShowModal = ref(false)
const users = ref([])

const closeModal = () => isShowModal.value = false
const showModal = () => isShowModal.value = true

const ws = new ReconnectingWebSocket(`${window.location.protocol === 'https:' ? "wss" : "ws"}://${window.location.hostname}:${window.location.port}`, [], { WebSocket: WebSocket, minReconnectionDelay: 3000 })

enum ActionType {
  GetUsers,
  Error
}

ws.addEventListener("message", ({data} : any) => {
  const [action, ...obj] = JSON.parse(data.toString())
  switch (action) {
      case ActionType.GetUsers:
        console.log(obj)
          users.value = obj[0]
          break
      case ActionType.Error:
      switch(obj[0]) {
        case "unauthenticated":
          window.location.href = "/"
        default:
          //print error
      } 
      break
  }
})
// ws.onclose()

</script>
<template>
  <fwb-button @click="showModal" color="transparent"
    class="p-2 md:p-4 text-heading text-sm border border-default rounded-base shadow w-full"><svg
      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
      class="size-6 ml-auto hover:text-blue-600">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  </fwb-button>
  <span v-for="user in users" class="overflow-x-hidden">
    <SubUser :user="user" />
  </span>
  <fwb-modal @close="closeModal" v-show="isShowModal" header-class="bg-neutral-primary-soft"
    bodyClass="bg-neutral-primary-soft text-white text-right" size="5xl"
    wrapper-class="max-w-svw md:m-4 m-0">
    <template #body>
      <Settings :close="closeModal" />
    </template>
  </fwb-modal>
</template>
