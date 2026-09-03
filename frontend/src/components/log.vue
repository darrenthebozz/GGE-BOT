<script setup lang="ts">
import { ref, reactive } from 'vue'
import ws from '../js/webSocket.ts'
import { FwbModal } from 'flowbite-vue'
import UserAction from '../../../modules/CUserAction.ts'
import type { ILog } from '../../../types.d.ts'

const { userID } : { readonly userID? : number } = defineProps(['userID']) 

const closeModal = () => (isShowModal.value = false, logs.length = 0, ws.send(JSON.stringify([UserAction.log])))
const showModal = () => (isShowModal.value = true, ws.send(JSON.stringify([UserAction.log, userID])))

const isShowModal = ref(false)
const logs = reactive<Array<ILog>>([]) 
const maxLogSize = 128
const logColors = {
    "INFO": "green",
    "WARNING": "yellow",
    "ERROR": "red",
    "DEBUG": "green"
}

ws.addEventListener("open", () => {
    if(!isShowModal.value)
        ws.send(JSON.stringify([UserAction.log, userID]))
})
ws.addEventListener("message", ({ data }: any) => {
  let [action, ...obj] : [number, ...Array<ILog>] = JSON.parse(data.toString())
    if (action == UserAction.log) {
        obj.sort((a,b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).forEach(log => {
            let time = new Date(log.timestamp)
            log.timestamp = `${time.getHours()}:${time.getMinutes()}`
            
            if (logs.length > maxLogSize)
                logs.shift()

            logs.push(log)
        })
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
            <div v-for="{data, loglevel, timestamp} in logs" :class='`text-left text-${logColors[loglevel]}-600`'>
                [{{timestamp}}] {{ data.join('') }}
            </div>
        </template>
    </fwb-modal>
</template>