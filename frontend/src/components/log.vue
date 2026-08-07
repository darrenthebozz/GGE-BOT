<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import ws from '../js/webSocket.ts'
import { FwbModal } from 'flowbite-vue'
import UserAction from '../../../modules/CUserAction.ts'
import type ILog from '../../../modules/ILog.ts'

const { userID } : { readonly userID? : number } = defineProps(['userID']) 

const isShowModal = ref(false)
const closeModal = () => (isShowModal.value = false, ws.send(JSON.stringify([UserAction.log, null])))
const showModal = () => (isShowModal.value = true, ws.send(JSON.stringify([UserAction.log, userID])))

const logs = reactive([]) as Array<ILog>

ws.addEventListener("message", ({ data }: any) => {
  const [action, ...obj] : [Number, any] = JSON.parse(data.toString())
  switch (action) {
    case UserAction.log:
        logs.push(...obj)
        break
  }
})

</script>
<template>
    <svg v-on:click="showModal" class="w-5 h-5 
        hover:text-blue-600" fill="none" viewBox="0 0 16 20">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
            d="M1 17V2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M5 15V1m8 18v-4">
        </path>
    </svg>
    <fwb-modal @close="closeModal" v-show="isShowModal" header-class="bg-neutral-primary-soft"
        bodyClass="bg-neutral-primary-soft text-white text-right" size="5xl" wrapper-class="max-w-svw md:m-4 m-0">
        <template #body>
            <div v-for="log in logs">
                <div class='text-left text-blue-600' v-if="log.loglevel == 'INFO'">{{ log.data.join('') }}</div>
                <div class='text-left text-yellow-600' v-if="log.loglevel == 'WARNING'">{{ log.data.join('') }}</div>
                <div class='text-left text-red-600' v-if="log.loglevel == 'ERROR'">{{ log.data.join('') }}</div>
                <div class='text-left text-green-600' v-if="log.loglevel == 'DEBUG'">{{ log.data.join('') }}</div>
            </div>
        </template>
    </fwb-modal>
</template>