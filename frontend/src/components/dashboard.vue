<style>
@import "tailwindcss";
@import "flowbite-vue/index.css";
@plugin "flowbite/plugin";
@source "../../node_modules/flowbite-vue";
</style>
<script setup lang="ts">
import { onMounted, ref, shallowRef, triggerRef } from 'vue'
import type { Ref } from 'vue'
import { initFlowbite } from 'flowbite'
import { FwbButton, FwbModal } from 'flowbite-vue'

import SubUser from "./sub-user.vue"
import Settings from "./subuser-settings.vue"
import UserAction from '../../../modules/CUserAction.ts'
import User from '../../../modules/IUser.ts'
import ws from '../js/webSocket.ts'

const lang = await(await fetch("/lang/en")).json() as { [key: string] : string }

onMounted(initFlowbite)

const isShowModal = ref(false)
const users = shallowRef<Array<Ref<User>>>([])

const closeModal = () => isShowModal.value = false
const showModal = () => isShowModal.value = true

ws.addEventListener("message", ({ data }: any) => {
  const [action, ...obj] : [Number, any] = JSON.parse(data.toString())
  switch (action) {
    case UserAction.get:
      users.value = obj.map((user) => ref<User>(user))
      break
    case UserAction.change:
      const user = users.value.find(user => user.value.id == obj[0].id)
      if(user == undefined) {
        return (users.value.push(obj[0]), triggerRef(users))
      }
      Object.assign(user.value, obj[0])
      break
  }
})

ws.addEventListener("close", ({ code }) => {
  if (code == 4000) {
    document.cookie = `uuid=`
    window.location.replace("/")
  }
})

</script>
<template>
  <div class="w-full flex flex-row-reverse">
  <fwb-button @click="showModal"
    class="p-2 md:p-4 text-heading text-sm border border-default rounded-base shadow hover:text-blue-600" color="transparent"><svg
      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
      class="size-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  </fwb-button>
  </div>
  <span v-for="user in users" class="overflow-x-hidden">
    <SubUser :user="user" />
  </span>
  <fwb-modal @close="closeModal" v-show="isShowModal" header-class="bg-neutral-primary-soft"
    bodyClass="bg-neutral-primary-soft text-white text-right" size="5xl" wrapper-class="max-w-svw md:m-4 m-0">
    <template #body>
      <Settings :closeModal="closeModal" :lang="lang" />
    </template>
  </fwb-modal>
</template>
