<template>
  <button
    class="sv-action-bar-item"
    v-on:click="
      () => {
        item.action();
      }
    "
    v-bind:class="[
      { 'sv-action-bar-item--active': item.isActive },
      item.innerCss,
    ]"
    v-bind:disabled="item.enabled !== undefined && item.enabled"
    v-bind:title="item.tooltip || item.title"
  >
    <sv-svg-icon
      v-if="item.iconName"
      class="sv-action-bar-item__icon"
      :iconName="item.iconName"
      :size="24"
    ></sv-svg-icon>

    <span
      v-if="item.showTitle === undefined || item.showTitle || !item.iconName"
      class="sv-action-bar-item__title"
      v-bind:class="{ 'sv-action-bar-item__title--with-icon': !!item.iconName }"
      >{{ item.title }}</span
    >
    <sv-popup :model="item.popupModel"></sv-popup>
  </button>
</template>

<script lang="ts">
import { Component } from "vue-property-decorator";
import Vue from "vue";
import ActionBarItemViewModel from "./action-bar-item.vue";

@Component
export class ActionBarItemDropdownViewModel extends ActionBarItemViewModel {}
Vue.component("sv-action-bar-item-dropdown", ActionBarItemDropdownViewModel);
export default ActionBarItemDropdownViewModel;
</script>
