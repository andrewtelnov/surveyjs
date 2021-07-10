<template>
  <div :class="question.cssClasses.tableWrapper">
    <fieldset>
      <legend v-bind:aria-label="question.locTitle.renderedHtml"></legend>
      <table :class="question.cssClasses.root">
        <thead v-if="question.showHeader">
          <tr>
            <td v-show="question.hasRows"></td>
            <th
              v-for="(column, columnIndex) in question.visibleColumns"
              :key="columnIndex"
              :class="question.cssClasses.headerCell"
            >
              <survey-string :locString="column.locText" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in question.visibleRows"
            :key="'row-' + row.name + '-' + rowIndex"
            :class="row.rowClasses"
          >
            <td :class="question.cssClasses.cell" v-show="question.hasRows">
              <survey-string :locString="row.locText" />
            </td>
            <td
              v-if="question.hasCellText"
              v-for="(column, columnIndex) in question.visibleColumns"
              :key="columnIndex"
              :class="question.getItemClass(row, column)"
              v-on:click="cellClick(row, column)"
            >
              <survey-string
                :locString="question.getCellDisplayLocText(row.name, column)"
              ></survey-string>
            </td>
            <td
              v-if="!question.hasCellText"
              v-for="(column, columnIndex) in question.visibleColumns"
              :key="columnIndex"
              :title="column.locText.renderedHtml"
              :class="question.cssClasses.cell"
              v-on:click="cellClick(row, column)"
            >
              <label :class="question.getItemClass(row, column)">
                <input
                  type="radio"
                  :class="question.cssClasses.itemValue"
                  :name="row.fullName"
                  :value="column.value"
                  :disabled="question.isInputReadOnly"
                  :id="question.inputId + '_' + row.name + '_' + columnIndex"
                  v-bind:aria-required="question.isRequired"
                  :aria-label="question.locTitle.renderedHtml"
                />
                <span :class="question.cssClasses.materialDecorator">
                  <svg
                    :class="question.cssClasses.itemDecorator"
                    viewBox="-12 -12 24 24"
                  >
                    <circle r="6" cx="0" cy="0" />
                  </svg>
                </span>
                <span class="circle"></span>
                <span class="check"></span>
                <span :style="{ display: 'none' }">{{
                  question.locTitle.renderedHtml
                }}</span>
              </label>
            </td>
          </tr>
        </tbody>
      </table>
    </fieldset>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";
import { default as QuestionVue } from "./question";
import { QuestionMatrixModel } from "survey-core";

@Component
export class Matrix extends QuestionVue<QuestionMatrixModel> {
  cellClick(row: any, column: any) {
    if (this.question.isInputReadOnly) return;
    row.value = column.value;
  }
}
Vue.component("survey-matrix", Matrix);
export default Matrix;
</script>
