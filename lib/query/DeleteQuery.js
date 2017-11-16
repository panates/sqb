/* SQB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/sqb/
 */

/**
 * Module dependencies.
 * @private
 */
const Query = require('./Query');
const Table = require('../sqlobject/tablename');
const ConditionGroup = require('../sqlobject/ConditionGroup');

/**
 * Expose `DeleteQuery`.
 */
module.exports = DeleteQuery;

/**
 * @param {String} table
 * @constructor
 * @public
 */
function DeleteQuery(table) {
  Query.call(this);
  this.type = 'delete';
  this.clearFrom();
  this.clearWhere();
  this.from(table);
}

Object.setPrototypeOf(DeleteQuery.prototype, Query.prototype);

/**
 *
 * @return {DeleteQuery}
 * @public
 */
DeleteQuery.prototype.clearFrom = function() {
  this._tables = [];
  return this;
};

/**
 *
 * @return {DeleteQuery}
 * @public
 */
DeleteQuery.prototype.clearWhere = function() {
  this._where = new ConditionGroup();
  return this;
};

/**
 *
 * @param {...string|Raw} table
 * @return {DeleteQuery}
 */
DeleteQuery.prototype.from = function(table) {
  if (table) {
    this._table = table.isRaw ? table : new Table(String(table));
  }
  return this;
};

/**
 *
 * @param {...Condition} condition
 * @return {DeleteQuery}
 * @public
 */
DeleteQuery.prototype.where = function(condition) {
  this._where.add.apply(this._where, arguments);
  return this;
};