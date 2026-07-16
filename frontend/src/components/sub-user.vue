<script setup>
import CastleView from "./castle-view.vue";
// import player from "../test-data.json";
const { player } = defineProps(['player'])
const server = "GB1";
import { FwbButton } from 'flowbite-vue'
console.log(player)
</script>
<template>
        <div class="p-2 md:p-4 text-heading text-sm border border-default rounded-base shadow">
                <div class="flex flex-row">
                        <div class="p-2 grid grid-flow-col grid-rows-2 text-left">
                                <dt class="mr-2 text-body">Name</dt>
                                <dd class="mr-2 text-lg font-medium">{{ player.name }}</dd>
                                <dt class="mr-2 text-body">Server</dt>
                                <dd class="mr-2 text-lg font-medium">{{ server }}</dd>
                        </div>
                        <div class="ml-auto mb-auto mt-auto mr-1 whitespace-nowrap">
                                <button><svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                                fill="none" viewBox="0 0 16 20">
                                                <path stroke="currentColor" stroke-linecap="round"
                                                        stroke-linejoin="round" stroke-width="2"
                                                        d="M1 17V2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M5 15V1m8 18v-4">
                                                </path>
                                        </svg>
                                </button>
                                <fwb-button color="transparent">
                                        <svg class="w-5 h-5 hover:text-blue-600" aria-hidden="true"
                                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                                <path stroke="currentColor" stroke-linecap="round"
                                                        stroke-linejoin="round" stroke-width="2"
                                                        d="M4 12.25V1m0 11.25a2.25 2.25 0 0 0 0 4.5m0-4.5a2.25 2.25 0 0 1 0 4.5M4 19v-2.25m6-13.5V1m0 2.25a2.25 2.25 0 0 0 0 4.5m0-4.5a2.25 2.25 0 0 1 0 4.5M10 19V7.75m6 4.5V1m0 11.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM16 19v-2">
                                                </path>
                                        </svg></fwb-button>
                                <button><svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                                                fill="none" viewBox="0 0 10 16">
                                                <path stroke="currentColor" stroke-linecap="round"
                                                        stroke-linejoin="round" stroke-width="2"
                                                        d="m2.707 14.293 5.586-5.586a1 1 0 0 0 0-1.414L2.707 1.707A1 1 0 0 0 1 2.414v11.172a1 1 0 0 0 1.707.707Z">
                                                </path>
                                        </svg></button>
                        </div>
                </div>
                <!-- <CastleView :player="player" /> -->
        </div>
</template>