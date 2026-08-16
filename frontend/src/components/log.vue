<script setup lang="ts">
import { ref, reactive } from 'vue'
import ws from '../js/webSocket.ts'
import { FwbModal } from 'flowbite-vue'
import UserAction from '../../../modules/CUserAction.ts'
import type ILog from '../../../modules/ILog.ts'

const { userID } : { readonly userID? : number } = defineProps(['userID']) 

const isShowModal = ref(false)
const closeModal = () => (isShowModal.value = false, ws.send(JSON.stringify([UserAction.log, null])))
const showModal = () => (isShowModal.value = true, ws.send(JSON.stringify([UserAction.log, userID])))
const logs = reactive<Array<ILog>>([]) 
const maxLogSize = 6
ws.addEventListener("message", ({ data }: any) => {
  const [action, ...obj] : [Number, ...Array<ILog>] = JSON.parse(data.toString())
  switch (action) {
    case UserAction.log:
        obj.forEach((log) => {
            // if(logs.length > maxLogSize)
                // logs.shift()
            logs.push(log)
        })
        // obj.sort(({timestamp : a}, {timestamp : b}) => new Date(a).getTime() - new Date(b).getTime()).forEach((log) => {
        //     // if(logs.length > 12)
        //     //     logs.shift()
            
        //     // logs.push( log)
            
        //     // logs.splice(index, 1, log)
        // })
        break
  }
})
let i = 0
const logColors = {
    "INFO": "green",
    "WARNING": "yellow",
    "ERROR": "red",
    "DEBUG": "green"
}
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
            <div v-for="{data, sequence, loglevel, id} in logs" :class='`text-left text-${logColors[loglevel]}-600`' :key="id">
                <li>{{ sequence }} {{ i++ }}</li>

                <!-- {{ data.join('') }}  -->
            </div>
        </template>
    </fwb-modal>
</template>