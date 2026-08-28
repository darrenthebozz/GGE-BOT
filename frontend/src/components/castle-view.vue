<script setup lang="ts">
import { ref } from 'vue'
import { computedAsync } from '@vueuse/core'
import VueCountdown from '@chenfengyuan/vue-countdown'
import {
  FwbTab,
  FwbTabs,
  FwbAccordion,
  FwbAccordionContent,
  FwbAccordionHeader,
  FwbAccordionPanel,
} from 'flowbite-vue'

import type User from '../../../modules/IUser.ts'

const { user } = defineProps({
  user: {
    type : Object,
    required : true
  }
})
const activePlugins = [
  "Barrons",
  "Fortress",
  "Flee",
  "The Another plugin",
  "Butt face :P",
];
const resources = Object.entries(user.resources ?? {}).map(([name, amount]) => ({ name, amount }))
const activeTab = ref("0")
const capitalizeFirstLetter = o =>
  String(o).charAt(0).toLocaleUpperCase() + String(o).slice(1)
import assets from '../assets.json'

const items = computedAsync(() => fetch("/items").then(a => a.json()))
</script>
<template>
  <fwb-tabs v-model="activeTab"
    ulClass="flex-nowrap overflow-x-auto max-w-svw whitespace-nowrap scrollbar-color scrollbar-thumb-[#2D2E36] scrollbar-track-[#05040C] scrollbar-thin"
    buttonClass="p-0 ml-2 mr-2 mb-2 mt-1 border-b-2 rounded-t-base" variant="underline">
    <fwb-tab v-for="(castle, index) in user.castles" :name="String(index)" :title="castle.areaInfo.extraData[7]"
      class="md:p-3">
      <dt class="text-body">Plugins</dt>
      <div
        class="grid grid-row grid-flow-col grid-rows-1 scrollbar-color scrollbar-thumb-[#2D2E36] scrollbar-track-[#05040C] scrollbar-thin overflow-x-auto max-w-svw">

        <div class="pl-2 pr-2 pt-1 pb-2 m-1 border border-default rounded-base whitespace-nowrap"
          v-for="value in activePlugins">
          {{ value }}
        </div>
      </div>
      <div class="flex flex-col md:flex-row">
        <div class="flex-1">
          <dt class="text-body">Movements</dt>
          <fwb-accordion flushed persistent>
            <fwb-accordion-panel
              class="max-h-96 md:h-96 w-full scrollbar-color scrollbar-thumb-[#2D2E36] scrollbar-track-[#05040C] scrollbar-thin overflow-y-scroll rounded-base border border-default">
              <fwb-accordion-header class="relative p-0 justify-center">
                <vue-countdown class="text-center absolute m-auto ml-2" :time="2 * 60 * 60 * 60 * 1000" v-slot="{ hours, minutes, seconds }">
                  {{ hours }}H {{ minutes }}M {{ seconds }}S
                </vue-countdown>
              </fwb-accordion-header>
              <fwb-accordion-content class="bg-transparent p-0">
                <div class="min-h-48">
                  <div class="backdrop-brightness-70 flex flex-row">
                    <div class="text-body ml-auto mr-auto">Left</div>
                    <div class="text-body ml-auto mr-auto">Center</div>
                    <div class="text-body ml-auto mr-auto">Right</div>
                  </div>
                </div>
                <div class="text-body min-h-32">
                  <div class="ml-auto mr-auto backdrop-brightness-70">Courtyard</div>
                </div>
              </fwb-accordion-content>
            </fwb-accordion-panel>
          </fwb-accordion>
        </div>
        <div class="flex-1">
          <dt class="text-body">Resources</dt>
          <div
            class="grid auto-rows-min grid-flow-row overflow-y-scroll max-h-96 md:h-96 gap-1 rounded-base border border-default p-2 ml-1"
            style="scrollbar-width: thin; scrollbar-color: rgb(45, 46, 54) rgb(5, 4, 12);
                        grid-template-columns: repeat( auto-fit, minmax(32px, 1fr) );">
            <div class="flex flex-col" v-for="({ name, amount }) in resources">
              <img :src="`/ggeimg/${assets['Collectable_Currency_' + capitalizeFirstLetter(name)]}.webp`" width="26px" class="m-auto mt-0" />
              <div class="m-auto mb-0">{{ new Intl.NumberFormat("en", {
                notation:
                  'compact'
              }).format(amount) }}</div>
            </div>
          </div> 
        </div>
        <div class="flex-1">
          <dt class="text-body">Soldiers & Tools</dt>
          <div
            class="grid auto-rows-min grid-flow-row overflow-y-scroll max-h-96 md:h-96 gap-1 rounded-base border border-default p-2 ml-1"
            style="scrollbar-width: thin; scrollbar-color: rgb(45, 46, 54) rgb(5, 4, 12);
                        grid-template-columns: repeat( auto-fit, minmax(38px, 1fr) );">
            <div class="flex flex-col" v-if="items?.units != undefined" v-for="({ unitInfo, amount }) in castle.unitInventory.map(({wodID,amount}) => ({ unitInfo : items.units.find(e => e.wodID == wodID), amount}))">
              <img :src="`/ggeimg/${assets[unitInfo?.name + '_' + unitInfo?.group + '_' + unitInfo?.type]}.webp`" width="32px" class="m-auto mt-0" />
              <div class="m-auto mb-0">{{ new Intl.NumberFormat("en", {
                notation:
                  'compact'
              }).format(amount) }}</div>
            </div>
          </div> 
        </div>
      </div>
    </fwb-tab>
  </fwb-tabs>
</template>