/* SQB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/sqb/
 */

/* Internal module dependencies. */

const SqlObject = require('./sqlobject');
const Condition = require('./condition');

/**
 * @class
 * @public
 */

class ConditionGroup extends SqlObject {

  constructor(...src) {
    super();
    this.type = 'conditiongroup';
    this._items = [];
    this.logicalOperator = 'and';
    if (arguments.length > 0)
      this.add(...src);
  }

  /**
   *
   * @param {...SqlObject|string} item
   * @return {ConditionGroup}
   */
  add(...item) {
    if (!item.length) return this;
    const self = this;
    if (typeof item[0] === 'string') {
      self._items.push(new Condition(...item));
      return self;
    }

    let logop = self.logicalOperator;
    for (const arg of item) {
      // Process array argument
      if (Array.isArray(arg)) {
        if (arg.length) {
          // if First item is array, it is a group
          if (Array.isArray(arg[0])) {
            const c = Reflect.construct(ConditionGroup, arg);
            c.logicalOperator = logop;
            self._items.push(c);
          } else if (typeof arg[0] === 'string' || arg[0].type === 'select' ||
              arg[0].type === 'raw') {
            const c = Reflect.construct(Condition, arg);
            c.logicalOperator = logop;
            self._items.push(c);
          } else throw new TypeError('Invalid argument');
        }
      } else if (arg === 'and' || arg === 'or') {
        logop = arg;
      } else if (arg.type === 'raw') {
        //noinspection JSUndefinedPropertyAssignment
        arg.logicalOperator = logop;
        self._items.push(arg);
      } else if (arg)
        throw new TypeError('Invalid argument');
    }
  }

  get length() {
    return this._items.length;
  }

  item(index) {
    return this._items[index];
  }

}

module.exports = ConditionGroup;
