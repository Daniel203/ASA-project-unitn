/**
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Me
 * @property {string} id
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {number} score
 */

/**
 * @typedef {Object} Option
 * @property {string} id
 * @property {string} action
 * @property {number} x
 * @property {number} y
 * @property {number} value
 * @property {OptionMoreArg} args
 */

/**
 * @typedef {Object} OptionMoreArg
 * @property {number | undefined} maxSteps - the maximum number of steps to reach the target before the target value is 0
 * @property {Array<Point> | undefined} path
 * @property {String | undefined} pddlGoal
 * @property {String | undefined} parcelId
 * @property {String[] | undefined} parcelsToDeliver
 */

/**
 * @typedef {Object} Parcel
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {string} carriedBy
 * @property {number} reward
 * @property {Array<Point>} path
 */

/**
 * @typedef {Object} Delivery
 * @property {number} x
 * @property {number} y
 * @property {Array<Point>} path
 * @property {boolean} isBlocked
 */

/**
 * @typedef {Object} Rival
 * @property {string} id
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {number} score
 */

/**
 * @typedef {object} PddlPlanStep
 * @property {boolean} parallel
 * @property {string} action
 * @property {string[]} args
 */
