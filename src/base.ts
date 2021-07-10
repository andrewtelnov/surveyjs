import { ILocalizableOwner, LocalizableString } from "./localizablestring";
import { Helpers } from "./helpers";
import {
  CustomPropertiesCollection,
  JsonObject,
  JsonObjectProperty,
  Serializer,
} from "./jsonobject";
import { settings } from "./settings";
import { ItemValue } from "./itemvalue";
import { IFindElement, IProgressInfo, ISurvey } from "./base-interfaces";

export class Bindings {
  private properties: Array<JsonObjectProperty> = null;
  private values: any = null;
  constructor(private obj: Base) {}
  public getType(): string {
    return "bindings";
  }
  public getNames(): Array<string> {
    var res: Array<string> = [];
    this.fillProperties();
    for (var i = 0; i < this.properties.length; i++) {
      if (this.properties[i].isVisible("", this.obj)) {
        res.push(this.properties[i].name);
      }
    }
    return res;
  }
  public getProperties(): Array<JsonObjectProperty> {
    var res: Array<JsonObjectProperty> = [];
    this.fillProperties();
    for (var i = 0; i < this.properties.length; i++) {
      res.push(this.properties[i]);
    }
    return res;
  }
  public setBinding(propertyName: string, valueName: string) {
    if (!this.values) this.values = {};
    if (!!valueName) {
      this.values[propertyName] = valueName;
    } else {
      delete this.values[propertyName];
      if (Object.keys(this.values).length == 0) {
        this.values = null;
      }
    }
  }
  public clearBinding(propertyName: string) {
    this.setBinding(propertyName, "");
  }
  public isEmpty(): boolean {
    return !this.values;
  }
  public getValueNameByPropertyName(propertyName: string): string {
    if (!this.values) return undefined;
    return this.values[propertyName];
  }
  public getPropertiesByValueName(valueName: string): Array<string> {
    if (!this.values) return [];
    var res: Array<string> = [];
    for (var key in this.values) {
      if (this.values[key] == valueName) {
        res.push(key);
      }
    }
    return res;
  }
  public getJson(): any {
    if (this.isEmpty()) return null;
    var res: any = {};
    for (var key in this.values) {
      res[key] = this.values[key];
    }
    return res;
  }
  public setJson(value: any) {
    this.values = null;
    if (!value) return;
    this.values = {};
    for (var key in value) {
      this.values[key] = value[key];
    }
  }
  private fillProperties() {
    if (this.properties !== null) return;
    this.properties = [];
    var objProperties = Serializer.getPropertiesByObj(this.obj);
    for (var i = 0; i < objProperties.length; i++) {
      if (objProperties[i].isBindable) {
        this.properties.push(objProperties[i]);
      }
    }
  }
}
/**
 * The base class for SurveyJS objects.
 */
export class Base {
  public static get commentPrefix(): string {
    return settings.commentPrefix;
  }
  public static set commentPrefix(val: string) {
    settings.commentPrefix = val;
  }
  public static createItemValue: (item: any, type?: string) => any;
  public static itemValueLocStrChanged: (arr: Array<any>) => void;
  /**
   * Returns true if a value undefined, null, empty string or empty array.
   *
   * @param value
   * @param trimString a boolean parameter, default value true. If true then it trims the string and functions returns true for a string that contains white spaces only.
   */
  public isValueEmpty(value: any, trimString: boolean = true): boolean {
    if (trimString) {
      value = this.trimValue(value);
    }
    return Helpers.isValueEmpty(value);
  }
  protected trimValue(value: any): any {
    if (!!value && (typeof value === "string" || value instanceof String))
      return value.trim();
    return value;
  }
  protected IsPropertyEmpty(value: any): boolean {
    return value !== "" && this.isValueEmpty(value);
  }

  private propertyHash: { [index: string]: any } = {};
  private localizableStrings: { [index: string]: LocalizableString };
  private arraysInfo: { [index: string]: any };
  private eventList: Array<EventBase<any>> = [];
  private bindingsValue: Bindings;
  private isDisposedValue: boolean;
  private onPropChangeFunctions: Array<{
    name: string;
    func: (...args: any[]) => void;
    key: string;
  }>;
  protected isLoadingFromJsonValue: boolean = false;
  public loadingOwner: Base = null;
  /**
   * Event that raise on property change of the sender object
   * sender - the object that owns the property
   * options.name - the property name that has been changed
   * options.oldValue - old value. Please note, it equals to options.newValue if property is an array
   * options.newValue - new value.
   */
  public onPropertyChanged: EventBase<Base> = this.addEvent<Base>();
  /**
   * Event that raised on changing property of the ItemValue object.
   * sender - the object that owns the property
   * options.propertyName - the property name to which ItemValue array is belong. It can be "choices" for dropdown question
   * options.obj - the instance of ItemValue object which property has been changed
   * options.name - the property of ItemObject that has been changed
   * options.oldValue - old value
   * options.newValue - new value
   */
  public onItemValuePropertyChanged: Event<
    (sender: Base, options: any) => any,
    any
  > = this.addEvent<Base>();

  getPropertyValueCoreHandler: (propertiesHash: any, name: string) => any;

  setPropertyValueCoreHandler: (
    propertiesHash: any,
    name: string,
    val: any
  ) => void;
  createArrayCoreHandler: (propertiesHash: any, name: string) => Array<any>;
  surveyChangedCallback: () => void;

  private isCreating = true;

  public constructor() {
    this.bindingsValue = new Bindings(this);
    CustomPropertiesCollection.createProperties(this);
    this.onBaseCreating();
    this.isCreating = false;
  }
  public dispose() {
    for (var i = 0; i < this.eventList.length; i++) {
      this.eventList[i].clear();
    }
    this.isDisposedValue = true;
  }
  public get isDisposed() {
    return this.isDisposedValue === true;
  }
  protected addEvent<T>(): EventBase<T> {
    var res = new EventBase<T>();
    this.eventList.push(res);
    return res;
  }
  protected onBaseCreating() {}
  /**
   * Returns the type of the object as a string as it represents in the json. It should be in lowcase.
   */
  public getType(): string {
    return "base";
  }
  public getSurvey(isLive: boolean = false): ISurvey {
    return null;
  }
  /**
   * Returns true if the object is inluded into survey, otherwise returns false.
   */
  public get inSurvey(): boolean {
    return !!this.getSurvey(true);
  }
  public get bindings(): Bindings {
    return this.bindingsValue;
  }
  checkBindings(valueName: string, value: any) {}
  protected updateBindings(propertyName: string, value: any) {
    var valueName = this.bindings.getValueNameByPropertyName(propertyName);
    if (!!valueName) {
      this.updateBindingValue(valueName, value);
    }
  }
  protected updateBindingValue(valueName: string, value: any) {}
  /**
   * Returns the element template name without prefix. Typically it equals to getType().
   * @see getType
   */
  public getTemplate(): string {
    return this.getType();
  }
  /**
   * Returns true if the object is loading from Json at the current moment.
   */
  public get isLoadingFromJson(): boolean {
    return this.getIsLoadingFromJson();
  }
  protected getIsLoadingFromJson(): boolean {
    if (!!this.loadingOwner && this.loadingOwner.isLoadingFromJson) return true;
    return this.isLoadingFromJsonValue;
  }

  startLoadingFromJson() {
    this.isLoadingFromJsonValue = true;
  }
  endLoadingFromJson() {
    this.isLoadingFromJsonValue = false;
  }
  /**
   * Deserialized the current object into JSON
   * @see fromJSON
   */
  public toJSON(): any {
    return new JsonObject().toJsonObject(this);
  }
  /**
   * Load object properties and elements. It doesn't reset properties that was changed before and they are not defined in the json parameter.
   * @param json the object JSON definition
   * @see toJSON
   */
  public fromJSON(json: any) {
    return new JsonObject().toObject(json, this);
  }
  /**
   * Make a clone of the existing object. Create a new object of the same type and load all properties into it.
   */
  public clone(): Base {
    var clonedObj = <Base>Serializer.createClass(this.getType());
    clonedObj.fromJSON(this.toJSON());
    return clonedObj;
  }
  public static createProgressInfo(): IProgressInfo {
    return {
      questionCount: 0,
      answeredQuestionCount: 0,
      requiredQuestionCount: 0,
      requiredAnsweredQuestionCount: 0,
    };
  }
  public getProgressInfo(): IProgressInfo {
    return Base.createProgressInfo();
  }
  public localeChanged() {}
  public locStrsChanged() {
    if (!!this.arraysInfo) {
      for (let key in this.arraysInfo) {
        let item = this.arraysInfo[key];
        if (item && item.isItemValues) {
          var arr = this.getPropertyValue(key);
          if (arr && !!Base.itemValueLocStrChanged)
            Base.itemValueLocStrChanged(arr);
        }
      }
    }
    if (!!this.localizableStrings) {
      for (let key in this.localizableStrings) {
        let item = this.getLocalizableString(key);
        if (item) item.strChanged();
      }
    }
  }
  /**
   * Returns the property value by name
   * @param name property name
   */
  public getPropertyValue(name: string, defaultValue: any = null): any {
    var res = this.getPropertyValueCore(this.propertyHash, name);
    if (this.IsPropertyEmpty(res)) {
      if (defaultValue != null) return defaultValue;
      var prop = Serializer.findProperty(this.getType(), name);
      if (!!prop && (!prop.isCustom || !this.isCreating)) {
        if (
          !this.IsPropertyEmpty(prop.defaultValue) &&
          !Array.isArray(prop.defaultValue)
        )
          return prop.defaultValue;
        if (prop.type == "boolean" || prop.type == "switch") return false;
        if (prop.isCustom && !!prop.onGetValue) return prop.onGetValue(this);
      }
    }
    return res;
  }
  protected getPropertyValueCore(propertiesHash: any, name: string) {
    if (this.getPropertyValueCoreHandler)
      return this.getPropertyValueCoreHandler(propertiesHash, name);
    else return propertiesHash[name];
  }
  public geValueFromHash(): any {
    return this.propertyHash["value"];
  }
  protected setPropertyValueCore(propertiesHash: any, name: string, val: any) {
    if (this.setPropertyValueCoreHandler && !this.isDisposedValue)
      this.setPropertyValueCoreHandler(propertiesHash, name, val);
    else propertiesHash[name] = val;
  }
  protected get isEditingSurveyElement(): boolean {
    var survey = this.getSurvey();
    return !!survey && survey.isEditingSurveyElement;
  }
  public iteratePropertiesHash(func: (hash: any, key: any) => void) {
    var keys: any[] = [];
    for (var key in this.propertyHash) {
      if (
        key === "value" &&
        this.isEditingSurveyElement &&
        Array.isArray((<any>this).value)
      )
        continue;

      keys.push(key);
    }
    keys.forEach((key) => func(this.propertyHash, key));
  }
  /**
   * set property value
   * @param name property name
   * @param val new property value
   */
  public setPropertyValue(name: string, val: any) {
    var oldValue = this.getPropertyValue(name);
    if (oldValue && Array.isArray(oldValue)) {
      if (this.isTwoValueEquals(oldValue, val)) return;
      var arrayInfo = this.arraysInfo && this.arraysInfo[name];
      this.setArray(
        name,
        oldValue,
        val,
        arrayInfo ? arrayInfo.isItemValues : false,
        arrayInfo ? arrayInfo.onPush : null
      );
    } else {
      this.setPropertyValueCore(this.propertyHash, name, val);
      if (!this.isDisposedValue && !this.isTwoValueEquals(oldValue, val)) {
        this.propertyValueChanged(name, oldValue, val);
      }
    }
  }
  protected clearPropertyValue(name: string) {
    this.setPropertyValueCore(this.propertyHash, name, null);
    delete this.propertyHash[name];
  }
  public onPropertyValueChangedCallback(
    name: string,
    oldValue: any,
    newValue: any,
    sender: Base,
    arrayChanges: ArrayChanges
  ) {}
  public itemValuePropertyChanged(
    item: ItemValue,
    name: string,
    oldValue: any,
    newValue: any
  ) {
    this.onItemValuePropertyChanged.fire(this, {
      obj: item,
      name: name,
      oldValue: oldValue,
      newValue: newValue,
      propertyName: item.ownerPropertyName,
    });
  }
  protected onPropertyValueChanged(
    name: string,
    oldValue: any,
    newValue: any
  ) {}
  protected propertyValueChanged(
    name: string,
    oldValue: any,
    newValue: any,
    arrayChanges?: ArrayChanges,
    target?: Base
  ) {
    if (this.isLoadingFromJson) return;
    this.updateBindings(name, newValue);
    this.onPropertyValueChanged(name, oldValue, newValue);
    this.onPropertyChanged.fire(this, {
      name: name,
      oldValue: oldValue,
      newValue: newValue,
    });

    this.doPropertyValueChangedCallback(
      name,
      oldValue,
      newValue,
      arrayChanges,
      this
    );

    if (!this.onPropChangeFunctions) return;
    for (var i = 0; i < this.onPropChangeFunctions.length; i++) {
      if (this.onPropChangeFunctions[i].name == name)
        this.onPropChangeFunctions[i].func(newValue);
    }
  }
  protected get isInternal(): boolean {
    return false;
  }
  private doPropertyValueChangedCallback(
    name: string,
    oldValue: any,
    newValue: any,
    arrayChanges?: ArrayChanges,
    target?: Base
  ) {
    if (this.isInternal) return;
    if (!target) target = this;
    var notifier: any = this.getSurvey();
    if (!notifier) notifier = this;
    if (!!notifier.doPropertyValueChangedCallback) {
      notifier.onPropertyValueChangedCallback(
        name,
        oldValue,
        newValue,
        target,
        arrayChanges
      );
    }
  }
  /**
   * Register a function that will be called on a property value changed.
   * @param name the property name
   * @param func the function with no parameters that will be called on property changed.
   * @param key an optional parameter. If there is already a registered function for this property with the same key, it will be overwritten.
   */
  public registerFunctionOnPropertyValueChanged(
    name: string,
    func: any,
    key: string = null
  ) {
    if (!this.onPropChangeFunctions) {
      this.onPropChangeFunctions = [];
    }
    if (key) {
      for (var i = 0; i < this.onPropChangeFunctions.length; i++) {
        var item = this.onPropChangeFunctions[i];
        if (item.name == name && item.key == key) {
          item.func = func;
          return;
        }
      }
    }
    this.onPropChangeFunctions.push({ name: name, func: func, key: key });
  }
  /**
   * Register a function that will be called on a property value changed from the names list.
   * @param names the list of properties names
   * @param func the function with no parameters that will be called on property changed.
   * @param key an optional parameter. If there is already a registered function for this property with the same key, it will be overwritten.
   */
  public registerFunctionOnPropertiesValueChanged(
    names: Array<string>,
    func: any,
    key: string = null
  ) {
    for (var i = 0; i < names.length; i++) {
      this.registerFunctionOnPropertyValueChanged(names[i], func, key);
    }
  }
  /**
   * Unregister notification on property value changed
   * @param name the property name
   * @param key the key with which you have registered the notification for this property. It can be null.
   */
  public unRegisterFunctionOnPropertyValueChanged(
    name: string,
    key: string = null
  ) {
    if (!this.onPropChangeFunctions) return;
    for (var i = 0; i < this.onPropChangeFunctions.length; i++) {
      var item = this.onPropChangeFunctions[i];
      if (item.name == name && item.key == key) {
        this.onPropChangeFunctions.splice(i, 1);
        return;
      }
    }
  }
  /**
   * Unregister notification on property value changed for all properties in the names list.
   * @param names the list of properties names
   * @param key the key with which you have registered the notification for this property. It can be null.
   */
  public unRegisterFunctionOnPropertiesValueChanged(
    names: Array<string>,
    key: string = null
  ) {
    for (var i = 0; i < names.length; i++) {
      this.unRegisterFunctionOnPropertyValueChanged(names[i], key);
    }
  }
  public createCustomLocalizableObj(name: string) {
    var locStr = this.getLocalizableString(name);
    if (locStr || !(<any>this).getLocale) return;
    this.createLocalizableString(name, <ILocalizableOwner>(<any>this));
  }
  protected createLocalizableString(
    name: string,
    owner: ILocalizableOwner,
    useMarkDown: boolean = false
  ): LocalizableString {
    var locStr = new LocalizableString(owner, useMarkDown, name);
    locStr.onStrChanged = (oldValue: string, newValue: string) => {
      this.propertyValueChanged(name, oldValue, newValue);
    };
    if (!this.localizableStrings) {
      this.localizableStrings = {};
    }
    this.localizableStrings[name] = locStr;
    return locStr;
  }
  public getLocalizableString(name: string): LocalizableString {
    return !!this.localizableStrings ? this.localizableStrings[name] : null;
  }
  public getLocalizableStringText(
    name: string,
    defaultStr: string = ""
  ): string {
    var locStr = this.getLocalizableString(name);
    if (!locStr) return "";
    var res = locStr.text;
    return res ? res : defaultStr;
  }
  public setLocalizableStringText(name: string, value: string) {
    var locStr = this.getLocalizableString(name);
    if (!locStr) return;
    locStr.text = value;
  }
  public addUsedLocales(locales: Array<string>) {
    if (!!this.localizableStrings) {
      for (let key in this.localizableStrings) {
        let item = this.getLocalizableString(key);
        if (item) this.AddLocStringToUsedLocales(item, locales);
      }
    }
    if (!!this.arraysInfo) {
      for (let key in this.arraysInfo) {
        let items = this.getPropertyValue(key);
        if (!items || !items.length) continue;
        for (let i = 0; i < items.length; i++) {
          let item = items[i];
          if (item && item.addUsedLocales) {
            item.addUsedLocales(locales);
          }
        }
      }
    }
  }
  public searchText(text: string, founded: Array<IFindElement>) {
    var strs: Array<LocalizableString> = [];
    this.getSearchableLocalizedStrings(strs);
    for (var i = 0; i < strs.length; i++) {
      if (strs[i].setFindText(text)) {
        founded.push({ element: this, str: strs[i] });
      }
    }
  }
  private getSearchableLocalizedStrings(arr: Array<LocalizableString>) {
    if (!!this.localizableStrings) {
      let keys: Array<string> = [];
      this.getSearchableLocKeys(keys);
      for (var i = 0; i < keys.length; i++) {
        let item = this.getLocalizableString(keys[i]);
        if (item) arr.push(item);
      }
    }
    if (!this.arraysInfo) return;
    let keys: Array<string> = [];
    this.getSearchableItemValueKeys(keys);
    for (var i = 0; i < keys.length; i++) {
      var items = this.getPropertyValue(keys[i]);
      if (!items) continue;
      for (var j = 0; j < items.length; j++) {
        arr.push(items[j].locText);
      }
    }
  }
  protected getSearchableLocKeys(keys: Array<string>) {}
  protected getSearchableItemValueKeys(keys: Array<string>) {}
  protected AddLocStringToUsedLocales(
    locStr: LocalizableString,
    locales: Array<string>
  ) {
    var locs = locStr.getLocales();
    for (var i = 0; i < locs.length; i++) {
      if (locales.indexOf(locs[i]) < 0) {
        locales.push(locs[i]);
      }
    }
  }
  protected createItemValues(name: string): Array<any> {
    var self = this;
    var result = this.createNewArray(name, function(item: any) {
      item.locOwner = self;
      item.ownerPropertyName = name;
    });
    this.arraysInfo[name].isItemValues = true;
    return result;
  }
  private notifyArrayChanged(ar: any, arrayChanges: ArrayChanges) {
    !!ar.onArrayChanged && ar.onArrayChanged(arrayChanges);
  }
  protected createNewArrayCore(name: string): Array<any> {
    var res = null;
    if (!!this.createArrayCoreHandler) {
      res = this.createArrayCoreHandler(this.propertyHash, name);
    }
    if (!res) {
      res = new Array<any>();
      this.setPropertyValueCore(this.propertyHash, name, res);
    }
    return res;
  }
  protected ensureArray(
    name: string,
    onPush: any = null,
    onRemove: any = null
  ) {
    if (this.arraysInfo && this.arraysInfo[name]) {
      return;
    }

    return this.createNewArray(name, onPush, onRemove);
  }

  protected createNewArray(
    name: string,
    onPush: any = null,
    onRemove: any = null
  ): Array<any> {
    var newArray = this.createNewArrayCore(name);
    if (!this.arraysInfo) {
      this.arraysInfo = {};
    }
    this.arraysInfo[name] = { onPush: onPush, isItemValues: false };
    var self = this;
    newArray.push = function(value): number {
      var result = Object.getPrototypeOf(newArray).push.call(newArray, value);
      if (!self.isDisposedValue) {
        if (onPush) onPush(value, newArray.length - 1);
        const arrayChanges = new ArrayChanges(
          newArray.length - 1,
          0,
          [value],
          []
        );
        self.propertyValueChanged(name, newArray, newArray, arrayChanges);
        self.notifyArrayChanged(newArray, arrayChanges);
      }
      return result;
    };
    newArray.unshift = function(value): number {
      var result = Object.getPrototypeOf(newArray).unshift.call(
        newArray,
        value
      );
      if (!self.isDisposedValue) {
        if (onPush) onPush(value, newArray.length - 1);
        const arrayChanges = new ArrayChanges(0, 0, [value], []);
        self.propertyValueChanged(name, newArray, newArray, arrayChanges);
        self.notifyArrayChanged(newArray, arrayChanges);
      }
      return result;
    };
    newArray.pop = function(): number {
      var result = Object.getPrototypeOf(newArray).pop.call(newArray);
      if (!self.isDisposedValue) {
        if (onRemove) onRemove(result);
        const arrayChanges = new ArrayChanges(newArray.length - 1, 1, [], []);
        self.propertyValueChanged(name, newArray, newArray, arrayChanges);
        self.notifyArrayChanged(newArray, arrayChanges);
      }
      return result;
    };
    newArray.splice = function(
      start?: number,
      deleteCount?: number,
      ...items: any[]
    ): any[] {
      if (!start) start = 0;
      if (!deleteCount) deleteCount = 0;
      var result = Object.getPrototypeOf(newArray).splice.call(
        newArray,
        start,
        deleteCount,
        ...items
      );
      if (!items) items = [];
      if (!self.isDisposedValue) {
        if (onRemove && result) {
          for (var i = 0; i < result.length; i++) {
            onRemove(result[i]);
          }
        }
        if (onPush) {
          for (var i = 0; i < items.length; i++) {
            onPush(items[i], start + i);
          }
        }
        const arrayChanges = new ArrayChanges(
          start,
          deleteCount,
          items,
          result
        );
        self.propertyValueChanged(name, newArray, newArray, arrayChanges);
        self.notifyArrayChanged(newArray, arrayChanges);
      }
      return result;
    };

    return newArray;
  }
  protected getItemValueType(): string {
    return undefined;
  }
  protected setArray(
    name: string,
    src: any[],
    dest: any[],
    isItemValues: boolean,
    onPush: any
  ) {
    var deletedItems = [].concat(src);
    Object.getPrototypeOf(src).splice.call(src, 0, src.length);
    if (!!dest) {
      for (var i = 0; i < dest.length; i++) {
        var item = dest[i];
        if (isItemValues) {
          if (!!Base.createItemValue) {
            item = Base.createItemValue(item, this.getItemValueType());
          }
        }
        Object.getPrototypeOf(src).push.call(src, item);
        if (onPush) onPush(src[i]);
      }
    }
    const arrayChanges = new ArrayChanges(
      0,
      deletedItems.length,
      src,
      deletedItems
    );
    this.propertyValueChanged(name, deletedItems, src, arrayChanges);
    this.notifyArrayChanged(src, arrayChanges);
  }
  protected isTwoValueEquals(
    x: any,
    y: any,
    caseInSensitive: boolean = false,
    trimString: boolean = false
  ): boolean {
    if (caseInSensitive) {
      x = this.getValueInLowCase(x);
      y = this.getValueInLowCase(y);
    }
    if (trimString) {
      x = this.trimValue(x);
      y = this.trimValue(y);
    }
    return Helpers.isTwoValueEquals(x, y);
  }
  private static copyObject(dst: any, src: any) {
    for (var key in src) {
      var source = src[key];
      if (typeof source === "object") {
        source = {};
        this.copyObject(source, src[key]);
      }
      dst[key] = source;
    }
  }
  protected copyCssClasses(dest: any, source: any) {
    if (!source) return;
    if (typeof source === "string" || source instanceof String) {
      dest["root"] = source;
    } else {
      Base.copyObject(dest, source);
    }
  }
  private getValueInLowCase(val: any): any {
    if (!!val && typeof val == "string") return val.toLowerCase();
    return val;
  }
}

export class ArrayChanges {
  constructor(
    public index: number,
    public deleteCount: number,
    public itemsToAdd: any[],
    public deletedItems: any[]
  ) {}
}

export class Event<T extends Function, Options> {
  public onCallbacksChanged: () => void;
  protected callbacks: Array<T>;
  public get isEmpty(): boolean {
    return !this.callbacks || this.callbacks.length == 0;
  }
  public fire(sender: any, options: Options) {
    if (!this.callbacks) return;
    for (var i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i](sender, options);
      if (!this.callbacks) return;
    }
  }
  public clear() {
    this.callbacks = undefined;
  }
  public add(func: T) {
    if (this.hasFunc(func)) return;
    if (!this.callbacks) {
      this.callbacks = new Array<T>();
    }
    this.callbacks.push(func);
    this.fireCallbackChanged();
  }
  public remove(func: T) {
    if (this.hasFunc(func)) {
      var index = this.callbacks.indexOf(func, 0);
      this.callbacks.splice(index, 1);
      this.fireCallbackChanged();
    }
  }
  public hasFunc(func: T): boolean {
    if (this.callbacks == null) return false;
    return this.callbacks.indexOf(func, 0) > -1;
  }
  private fireCallbackChanged() {
    if (!!this.onCallbacksChanged) {
      this.onCallbacksChanged();
    }
  }
}

export class EventBase<T> extends Event<
  (sender: T, options: any) => any,
  any
> {}
